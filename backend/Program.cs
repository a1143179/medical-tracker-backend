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
        // Only proxy requests that are not API calls and not static files
        if (!context.Request.Path.StartsWithSegments("/api") && 
            !context.Request.Path.StartsWithSegments("/_framework") &&
            !context.Request.Path.StartsWithSegments("/static") &&
            !context.Request.Path.StartsWithSegments("/favicon.ico") &&
            !context.Request.Path.StartsWithSegments("/logo") &&
            !context.Request.Path.StartsWithSegments("/manifest.json") &&
            !context.Request.Path.StartsWithSegments("/robots.txt"))
        {
            try
            {
                using var httpClient = new HttpClient();
                var reactDevServerUrl = "http://localhost:3001";
                var targetUrl = $"{reactDevServerUrl}{context.Request.Path}{context.Request.QueryString}";
                
                app.Logger.LogInformation($"[DEV PROXY] Proxying {context.Request.Path} to {targetUrl}");
                
                // Forward the request to React dev server
                var response = await httpClient.GetAsync(targetUrl);
                var content = await response.Content.ReadAsStringAsync();
                
                // Set response headers
                context.Response.StatusCode = (int)response.StatusCode;
                context.Response.ContentType = response.Content.Headers.ContentType?.ToString() ?? "text/html";
                
                // Forward important headers
                if (response.Headers.Contains("Cache-Control"))
                {
                    context.Response.Headers["Cache-Control"] = new Microsoft.Extensions.Primitives.StringValues(response.Headers.GetValues("Cache-Control").ToArray());
                }
                
                await context.Response.WriteAsync(content);
                return;
            }
            catch (Exception ex)
            {
                app.Logger.LogError(ex, "[DEV PROXY] Failed to proxy request to React dev server");
                // For React Router, always serve index.html for non-API routes
                var indexPath = Path.Combine(app.Environment.WebRootPath, "index.html");
                if (File.Exists(indexPath))
                {
                    context.Response.ContentType = "text/html";
                    await context.Response.SendFileAsync(indexPath);
                    return;
                }
            }
        }
        
        await next();
    });
}

// Configure static files to serve from frontend build directory
app.UseStaticFiles(); // Serve from wwwroot by default

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

app.UseSession();

// Add fallback to serve index.html for client-side routing
app.MapFallbackToFile("index.html");

// 3. define API endpoints (before authentication middleware)
var api = app.MapGroup("/api/records");
var authApi = app.MapGroup("/api/auth");

// Health check endpoint
app.MapGet("/api/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();

// Google OAuth login endpoint
authApi.MapGet("/login", (HttpContext context) =>
{
    var returnUrl = context.Request.Query["returnUrl"].ToString();
    if (string.IsNullOrEmpty(returnUrl))
    {
        returnUrl = "/";
    }
    
    // Build Google OAuth URL manually
    var clientId = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID") ?? app.Configuration["Google:ClientId"] ?? "";
    
    // Force scheme based on environment
    var scheme = app.Environment.IsProduction() ? "https" : "http";
    var host = context.Request.Host.Value;
    var redirectUri = $"{scheme}://{host}/api/auth/callback";

    app.Logger.LogInformation($"[GOOGLE OAUTH] Using redirectUri: {redirectUri}");
    
    var scope = "openid email profile";
    var responseType = "code";
    
    // Create a state parameter that includes the return URL
    var stateData = $"{Guid.NewGuid()}|{returnUrl}";
    var state = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(stateData));
    
    var googleAuthUrl = $"https://accounts.google.com/o/oauth2/auth?client_id={Uri.EscapeDataString(clientId)}&redirect_uri={Uri.EscapeDataString(redirectUri)}&scope={Uri.EscapeDataString(scope)}&response_type={responseType}&state={Uri.EscapeDataString(state)}";
    
    return Results.Redirect(googleAuthUrl);
});

// Google OAuth callback endpoint
authApi.MapGet("/callback", async (HttpContext context, AppDbContext db, ILogger<Program> logger, IConfiguration config) =>
{
    try
    {
        // Get parameters from Google callback
        var code = context.Request.Query["code"].ToString();
        var state = context.Request.Query["state"].ToString();
        var error = context.Request.Query["error"].ToString();
        
        if (!string.IsNullOrEmpty(error))
        {
            logger.LogError($"[CALLBACK] Google OAuth error: {error}");
            return Results.Redirect("/login?error=oauth_error");
        }
        
        if (string.IsNullOrEmpty(code))
        {
            logger.LogError("[CALLBACK] No authorization code received");
            return Results.Redirect("/login?error=no_code");
        }
        
        // Decode state parameter to get return URL
        string returnUrl = "/";
        try
        {
            var decodedState = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(state));
            var stateParts = decodedState.Split('|');
            if (stateParts.Length == 2)
            {
                returnUrl = stateParts[1];
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "[CALLBACK] Failed to decode state parameter");
            return Results.Redirect("/login?error=invalid_state");
        }
        
        // Exchange authorization code for tokens
        var clientId = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID") ?? app.Configuration["Google:ClientId"] ?? "";
        var clientSecret = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_SECRET") ?? app.Configuration["Google:ClientSecret"] ?? "";
        
        // In the /callback endpoint, also force the scheme for redirectUri
        var scheme = app.Environment.IsProduction() ? "https" : "http";
        var host = context.Request.Host.Value;
        var redirectUri = $"{scheme}://{host}/api/auth/callback";

        logger.LogInformation($"[GOOGLE OAUTH CALLBACK] Using redirectUri: {redirectUri}");
        
        using var httpClient = new HttpClient();
        var tokenRequest = new FormUrlEncodedContent(new[]
        {
            new KeyValuePair<string, string>("client_id", clientId),
            new KeyValuePair<string, string>("client_secret", clientSecret),
            new KeyValuePair<string, string>("code", code),
            new KeyValuePair<string, string>("grant_type", "authorization_code"),
            new KeyValuePair<string, string>("redirect_uri", redirectUri)
        });
        
        var tokenResponse = await httpClient.PostAsync("https://oauth2.googleapis.com/token", tokenRequest);
        var tokenContent = await tokenResponse.Content.ReadAsStringAsync();
        
        if (!tokenResponse.IsSuccessStatusCode)
        {
            logger.LogError($"[CALLBACK] Token exchange failed: {tokenContent}");
            return Results.Redirect("/login?error=token_exchange_failed");
        }
        
        // Parse token response (simplified - you might want to use a JSON library)
        var accessToken = ExtractValue(tokenContent, "access_token");
        var idToken = ExtractValue(tokenContent, "id_token");
        
        if (string.IsNullOrEmpty(accessToken))
        {
            logger.LogError("[CALLBACK] No access token received");
            return Results.Redirect("/login?error=no_access_token");
        }
        
        // Get user info from Google
        httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
        var userInfoResponse = await httpClient.GetAsync("https://www.googleapis.com/oauth2/v2/userinfo");
        var userInfoContent = await userInfoResponse.Content.ReadAsStringAsync();
        
        if (!userInfoResponse.IsSuccessStatusCode)
        {
            logger.LogError($"[CALLBACK] User info request failed: {userInfoContent}");
            return Results.Redirect("/login?error=user_info_failed");
        }
        
        // Parse user info (simplified)
        var email = ExtractValue(userInfoContent, "email");
        var name = ExtractValue(userInfoContent, "name");
        var googleId = ExtractValue(userInfoContent, "id");
        
        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(googleId))
        {
            logger.LogError("[CALLBACK] Google OAuth: Missing email or Google ID");
            return Results.Redirect($"{returnUrl}?error=missing_user_info");
        }
        
        // Find or create user in database
        var existingUser = await db.Users.FirstOrDefaultAsync(u => u.GoogleId == googleId);
        if (existingUser == null)
        {
            // Check if email already exists (in case user registered with email before)
            existingUser = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (existingUser != null)
            {
                // Update existing user with Google ID
                existingUser.GoogleId = googleId;
                existingUser.Name = name ?? email;
            }
            else
            {
                // Create new user
                existingUser = new User
                {
                    Email = email,
                    Name = name ?? email,
                    GoogleId = googleId,
                    CreatedAt = DateTime.UtcNow,
                    LanguagePreference = "en"
                };
                db.Users.Add(existingUser);
            }
            await db.SaveChangesAsync();
        }
        
        // Set session
        context.Session.SetString("UserId", existingUser.Id.ToString());
        context.Session.SetString("UserEmail", existingUser.Email);
        context.Session.SetString("UserName", existingUser.Name);
        
        // Commit session changes
        await context.Session.CommitAsync();
        
        // Redirect to dashboard using relative path
        return Results.Redirect("/dashboard");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "[CALLBACK] Google OAuth callback error");
        return Results.Redirect("/login?error=callback_error");
    }
});

// Helper method to extract values from JSON-like strings
static string ExtractValue(string json, string key)
{
    var pattern = $"\"{key}\"\\s*:\\s*\"([^\"]*)\"";
    var match = System.Text.RegularExpressions.Regex.Match(json, pattern);
    return match.Success ? match.Groups[1].Value : "";
}

// Note: /login route is handled by frontend React router

// Logout endpoint
authApi.MapPost("/logout", async (HttpContext context) =>
{
    await context.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    context.Session.Clear();
    return Results.Ok(new { message = "Logged out successfully" });
});

// Get current user info
authApi.MapGet("/me", async (HttpContext context, AppDbContext db) =>
{
    var userId = context.Session.GetString("UserId");
    
    if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out var id))
    {
        return Results.Unauthorized();
    }

    var user = await db.Users.FindAsync(id);
    if (user == null)
    {
        return Results.NotFound();
    }

    return Results.Ok(new UserDto
    {
        Id = user.Id,
        Email = user.Email,
        Name = user.Name,
        CreatedAt = user.CreatedAt,
        LanguagePreference = user.LanguagePreference
    });
});

// Update language preference
authApi.MapPost("/language", async (UpdateLanguagePreferenceDto dto, HttpContext context, AppDbContext db) =>
{
    var userId = context.Session.GetString("UserId");
    if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out var id))
    {
        return Results.Unauthorized();
    }

    var user = await db.Users.FindAsync(id);
    if (user == null)
    {
        return Results.NotFound();
    }

    user.LanguagePreference = dto.LanguagePreference;
    await db.SaveChangesAsync();

    return Results.Ok(new { message = "Language preference updated" });
});

// Blood sugar records endpoints
api.MapGet("/", async (HttpContext context, AppDbContext db) =>
{
    var userId = context.Session.GetString("UserId");
    if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out var id))
    {
        return Results.Unauthorized();
    }

    var records = await db.BloodSugarRecords
        .Where(r => r.UserId == id)
        .OrderByDescending(r => r.MeasurementTime)
        .ToListAsync();

    return Results.Ok(records);
});

api.MapPost("/", async (CreateBloodSugarRecordDto dto, HttpContext context, AppDbContext db) =>
{
    var userId = context.Session.GetString("UserId");
    if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out var id))
    {
        return Results.Unauthorized();
    }

    // Validate model
    var validationResults = new List<ValidationResult>();
    var validationContext = new ValidationContext(dto);
    if (!Validator.TryValidateObject(dto, validationContext, validationResults, true))
    {
        var errors = validationResults.Select(v => v.ErrorMessage).ToList();
        return Results.BadRequest(new { message = string.Join("; ", errors) });
    }

    var record = new BloodSugarRecord
    {
        MeasurementTime = dto.MeasurementTime,
        Level = dto.Level,
        Notes = dto.Notes,
        UserId = id
    };

    db.BloodSugarRecords.Add(record);
    await db.SaveChangesAsync();

    return Results.Created($"/api/records/{record.Id}", record);
});

api.MapPut("/{id}", async (int id, CreateBloodSugarRecordDto dto, HttpContext context, AppDbContext db) =>
{
    var userId = context.Session.GetString("UserId");
    if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out var userIdInt))
    {
        return Results.Unauthorized();
    }

    var record = await db.BloodSugarRecords.FirstOrDefaultAsync(r => r.Id == id && r.UserId == userIdInt);
    if (record == null)
    {
        return Results.NotFound();
    }

    // Validate model
    var validationResults = new List<ValidationResult>();
    var validationContext = new ValidationContext(dto);
    if (!Validator.TryValidateObject(dto, validationContext, validationResults, true))
    {
        var errors = validationResults.Select(v => v.ErrorMessage).ToList();
        return Results.BadRequest(new { message = string.Join("; ", errors) });
    }

    record.MeasurementTime = dto.MeasurementTime;
    record.Level = dto.Level;
    record.Notes = dto.Notes;

    await db.SaveChangesAsync();
    return Results.Ok(record);
});

api.MapDelete("/{id}", async (int id, HttpContext context, AppDbContext db) =>
{
    var userId = context.Session.GetString("UserId");
    if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out var userIdInt))
    {
        return Results.Unauthorized();
    }

    var record = await db.BloodSugarRecords.FirstOrDefaultAsync(r => r.Id == id && r.UserId == userIdInt);
    if (record == null)
    {
        return Results.NotFound();
    }

    db.BloodSugarRecords.Remove(record);
    await db.SaveChangesAsync();

    return Results.Ok(new { message = "Record deleted successfully" });
});

app.UseAuthentication();
app.UseAuthorization();

// React files - serve static files from wwwroot
app.UseDefaultFiles(new DefaultFilesOptions
{
    DefaultFileNames = new List<string> { "index.html" }
});

// database migration
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.Migrate();
}

// Ensure the app listens on the correct port for Azure
var port = Environment.GetEnvironmentVariable("PORT") ?? "5000";
app.Urls.Clear();
app.Urls.Add($"http://0.0.0.0:{port}");

app.Run();