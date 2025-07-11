using System.Collections;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Backend.Models;
using Backend.DTOs;
using Backend.Data;
using Serilog;
using Microsoft.AspNetCore.Http.Extensions;
using System.IO;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using System.Net.Http;

// Add file logging with Serilog
Directory.CreateDirectory("logs");
Directory.CreateDirectory("keys");
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File("logs/log.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

// Simple in-memory state storage for OAuth
var oauthStateStorage = new Dictionary<string, (string State, string ReturnUrl, DateTime Expires)>();

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog();

// 1. config services
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add validation services
builder.Services.AddControllers();

// CORS - Not needed since frontend and backend are on same origin
// builder.Services.AddCors(options =>
// {
//     options.AddPolicy("AllowReactApp", policy =>
//     {
//         policy.WithOrigins("http://localhost:3000")
//               .AllowAnyHeader()
//               .AllowAnyMethod()
//               .AllowCredentials();
//     });
// });

// Add session services
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.IdleTimeout = TimeSpan.FromHours(24);
    
    // Auto-detect environment for security settings
    var isProduction = builder.Environment.IsProduction();
    if (isProduction)
    {
        // For production (https):
        options.Cookie.SameSite = SameSiteMode.None;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    }
    else
    {
        // For local development (http):
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = CookieSecurePolicy.None;
    }
    
    options.Cookie.Name = ".AspNetCore.Session";
    options.Cookie.MaxAge = TimeSpan.FromHours(24);
    options.Cookie.Domain = null;
});

// Add Google OAuth authentication
builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultSignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
})
.AddCookie(options =>
{
    options.LoginPath = "/api/auth/login";
    options.LogoutPath = "/api/auth/logout";
    options.ExpireTimeSpan = TimeSpan.FromHours(24);
    
    // Auto-detect environment for security settings
    var isProduction = builder.Environment.IsProduction();
    if (isProduction)
    {
        // For production (https):
        options.Cookie.SameSite = SameSiteMode.None;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    }
    else
    {
        // For local development (http):
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = CookieSecurePolicy.None;
    }
});

var app = builder.Build();

// Add Forwarded Headers middleware to respect X-Forwarded-Proto (for correct scheme in Azure)
app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedFor,
    KnownNetworks = { }, // Clear the default to trust Azure proxy
    KnownProxies = { }   // Clear the default to trust Azure proxy
});

// Add Serilog request logging for full integration with ASP.NET Core
app.UseSerilogRequestLogging();

// Development proxy middleware
if (app.Environment.IsDevelopment())
{
    app.Use(async (context, next) =>
    {
        // Handle API routes - let them continue to the next middleware
        if (context.Request.Path.StartsWithSegments("/api"))
        {
            await next();
            return;
        }
        
        // Proxy all non-API requests to frontend dev server
        using var httpClient = new HttpClient();
        var reactDevServerUrl = "http://localhost:3001";
        var targetUrl = $"{reactDevServerUrl}{context.Request.Path}{context.Request.QueryString}";
        app.Logger.LogInformation($"[DEV PROXY] Proxying {context.Request.Path} to {targetUrl}");
        
        try
        {
            var response = await httpClient.GetAsync(targetUrl);
            var content = await response.Content.ReadAsStringAsync();
            
            // If frontend returns 404, serve index.html for SPA fallback
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                app.Logger.LogInformation($"[DEV PROXY] Frontend returned 404 for {context.Request.Path}, serving index.html");
                var indexResponse = await httpClient.GetAsync($"{reactDevServerUrl}/");
                var indexContent = await indexResponse.Content.ReadAsStringAsync();
                context.Response.StatusCode = 200;
                context.Response.ContentType = "text/html";
                await context.Response.WriteAsync(indexContent);
                return;
            }
            
            context.Response.StatusCode = (int)response.StatusCode;
            context.Response.ContentType = response.Content.Headers.ContentType?.ToString() ?? "text/html";
            await context.Response.WriteAsync(content);
            return;
        }
        catch (Exception ex)
        {
            app.Logger.LogWarning($"[DEV PROXY] Failed to proxy to {targetUrl}: {ex.Message}");
            // Fallback: fetch and serve the frontend's root (index.html) for SPA routes
            try
            {
                var indexResponse = await httpClient.GetAsync($"{reactDevServerUrl}/");
                var indexContent = await indexResponse.Content.ReadAsStringAsync();
                context.Response.StatusCode = 200;
                context.Response.ContentType = "text/html";
                await context.Response.WriteAsync(indexContent);
                return;
            }
            catch
            {
                // If the request is for a static file (e.g., favicon.ico, .well-known/*), return 404
                var path = context.Request.Path.Value ?? "";
                if (path.StartsWith("/.well-known/") || path.EndsWith(".ico") || path.Contains(".") )
                {
                    context.Response.StatusCode = 404;
                    context.Response.ContentType = "text/plain";
                    await context.Response.WriteAsync($"Not found: {path}");
                    return;
                }
                // Otherwise, return 500 for root or unknown errors
                context.Response.StatusCode = 500;
                context.Response.ContentType = "text/plain";
                await context.Response.WriteAsync("Frontend dev server is not running and fallback failed.");
                return;
            }
        }
    });
}
else
{
    // Only use static files and fallback in production
    app.UseStaticFiles();
    app.MapFallbackToFile("index.html");
}

// Log the current ASPNETCORE_ENVIRONMENT value
var env = app.Environment.EnvironmentName;
app.Logger.LogInformation("ASPNETCORE_ENVIRONMENT: {env}", env);

// 2. middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    // app.UseCors("AllowReactApp"); // Not needed since same origin
}

app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.UseSession();
app.MapControllers();

// React files - serve static files from wwwroot
// app.UseDefaultFiles(new DefaultFilesOptions
// {
//     DefaultFileNames = new List<string> { "index.html" }
// }); // This line is now handled by the new_code

// database migration
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.Migrate();
}

// Ensure the app listens on the correct port
var port = Environment.GetEnvironmentVariable("PORT") ?? "3000";
app.Urls.Clear();
app.Urls.Add($"http://0.0.0.0:{port}");

app.Run();