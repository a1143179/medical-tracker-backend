using Microsoft.EntityFrameworkCore;
using Backend.Data;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add Entity Framework - use PostgreSQL if connection string is available, otherwise in-memory
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (!string.IsNullOrEmpty(connectionString))
{
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(connectionString));
}
else
{
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseInMemoryDatabase("BloodSugarHistoryDb"));
}

// Add session support
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Serve static files from wwwroot in production
if (!app.Environment.IsDevelopment())
{
    app.UseStaticFiles();
    
    // Fallback to index.html for client-side routing
    app.MapFallbackToFile("index.html");
}

app.UseSession();
app.UseAuthorization();
app.MapControllers();

// Proxy all non-API requests to frontend dev server on port 3001 (development only)
if (app.Environment.IsDevelopment())
{
    var httpClient = new HttpClient();
    app.Use(async (context, next) =>
    {
        if (context.Request.Path.StartsWithSegments("/api"))
        {
            await next();
            return;
        }
        
        try
        {
            // Forward to the actual path for static assets, or index.html for client-side routing
            var path = context.Request.Path.Value;
            var frontendUrl = "http://localhost:3001" + path + context.Request.QueryString;
            var frontendResponse = await httpClient.GetAsync(frontendUrl);
            
            // If the specific path doesn't exist, fall back to index.html for client-side routing
            if (frontendResponse.StatusCode == System.Net.HttpStatusCode.NotFound && 
                !path.StartsWith("/api") && 
                !path.StartsWith("/static") && 
                !path.StartsWith("/favicon") &&
                !path.StartsWith("/manifest") &&
                !path.StartsWith("/logo"))
            {
                frontendUrl = "http://localhost:3001/index.html";
                frontendResponse = await httpClient.GetAsync(frontendUrl);
            }
            
            context.Response.StatusCode = (int)frontendResponse.StatusCode;
            
            // Copy headers
            foreach (var header in frontendResponse.Headers)
            {
                context.Response.Headers[header.Key] = header.Value.ToArray();
            }
            foreach (var header in frontendResponse.Content.Headers)
            {
                context.Response.Headers[header.Key] = header.Value.ToArray();
            }
            
            // Remove problematic headers
            context.Response.Headers.Remove("transfer-encoding");
            
            // Stream the content instead of loading it all into memory
            var content = await frontendResponse.Content.ReadAsStreamAsync();
            await content.CopyToAsync(context.Response.Body);
        }
        catch (Exception ex)
        {
            // If frontend is not available, return a simple error page
            context.Response.StatusCode = 503;
            context.Response.ContentType = "text/html";
            var errorHtml = $@"
                <html>
                    <head><title>Frontend Not Available</title></head>
                    <body>
                        <h1>Frontend Development Server Not Running</h1>
                        <p>The React development server on port 3001 is not available.</p>
                        <p>Please start the frontend with: <code>npm start</code> in the frontend directory</p>
                        <p>Error: {ex.Message}</p>
                    </body>
                </html>";
            await context.Response.WriteAsync(errorHtml);
        }
    });
}

app.Run();
