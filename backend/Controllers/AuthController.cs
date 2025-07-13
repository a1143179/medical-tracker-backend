using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Hosting;
using Backend.Data;
using Backend.Models;
using Backend.DTOs;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

namespace Backend;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<AuthController> _logger;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;

    public AuthController(AppDbContext context, ILogger<AuthController> logger, IConfiguration configuration, IWebHostEnvironment environment)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
        _environment = environment;
    }

    [HttpGet("login")]
    public IActionResult Login(string returnUrl = "/")
    {
        // Check if Google OAuth is configured
        var googleClientId = _configuration["Google:ClientId"] ?? Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID");
        var googleClientSecret = _configuration["Google:ClientSecret"] ?? Environment.GetEnvironmentVariable("GOOGLE_CLIENT_SECRET");
        
        _logger.LogInformation("Google OAuth configuration check - ClientId: {HasClientId}, ClientSecret: {HasClientSecret}, Environment: {Environment}", 
            !string.IsNullOrEmpty(googleClientId), 
            !string.IsNullOrEmpty(googleClientSecret), 
            _environment.EnvironmentName);
        
        if (string.IsNullOrEmpty(googleClientId) || string.IsNullOrEmpty(googleClientSecret))
        {
            _logger.LogError("Google OAuth is not configured. ClientId: {HasClientId}, ClientSecret: {HasClientSecret}", 
                !string.IsNullOrEmpty(googleClientId), 
                !string.IsNullOrEmpty(googleClientSecret));
            
            // Return a proper HTML error page for browser requests
            if (Request.Headers["Accept"].ToString().Contains("text/html"))
            {
                return Content(@"
                    <html>
                        <head><title>OAuth Configuration Error</title></head>
                        <body>
                            <h1>Google OAuth Not Configured</h1>
                            <p>The application is not properly configured for Google OAuth authentication.</p>
                            <p>Please contact the administrator to set up Google OAuth credentials.</p>
                            <p><a href='/login'>Back to Login</a></p>
                        </body>
                    </html>", "text/html");
            }
            
            return BadRequest(new { message = "Google OAuth is not configured. Please add Google:ClientId and Google:ClientSecret to your configuration." });
        }

        // Ensure session is available for OAuth state
        if (!HttpContext.Session.IsAvailable)
        {
            _logger.LogWarning("Session is not available for OAuth login");
        }

        var properties = new AuthenticationProperties
        {
            RedirectUri = "/api/auth/callback",
            Items =
            {
                { "returnUrl", returnUrl },
                { "correlationId", Guid.NewGuid().ToString() }
            },
            // Ensure OAuth state is properly maintained
            IsPersistent = true,
            ExpiresUtc = DateTimeOffset.UtcNow.AddMinutes(30)
        };

        // In production, ensure the redirect URI uses HTTPS
        if (!_environment.IsDevelopment())
        {
            var request = HttpContext.Request;
            var scheme = request.Scheme; // Will be "https" in production
            var host = request.Host.Value ?? "localhost";
            var redirectUri = $"{scheme}://{host}/api/auth/callback";
            properties.RedirectUri = redirectUri;
        }

        _logger.LogInformation("Starting Google OAuth challenge with redirect URI: {RedirectUri}", properties.RedirectUri);

        try
        {
            return Challenge(properties, GoogleDefaults.AuthenticationScheme);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initiate Google OAuth challenge");
            
            // Return a proper HTML error page for browser requests
            if (Request.Headers["Accept"].ToString().Contains("text/html"))
            {
                return Content($@"
                    <html>
                        <head><title>OAuth Error</title></head>
                        <body>
                            <h1>Google OAuth Error</h1>
                            <p>Failed to initiate Google OAuth authentication.</p>
                            <p>Error: {ex.Message}</p>
                            <p><a href='/login'>Back to Login</a></p>
                        </body>
                    </html>", "text/html");
            }
            
            return BadRequest(new { message = "Failed to initiate Google OAuth authentication", error = ex.Message });
        }
    }

    [HttpGet("callback")]
    public async Task<IActionResult> Callback()
    {
        try
        {
            _logger.LogInformation("OAuth callback received");
            
            // Check if this is a valid OAuth callback with required parameters
            var state = Request.Query["state"].ToString();
            var code = Request.Query["code"].ToString();
            
            if (string.IsNullOrEmpty(state) || string.IsNullOrEmpty(code))
            {
                _logger.LogWarning("OAuth callback missing required parameters - state: {HasState}, code: {HasCode}", 
                    !string.IsNullOrEmpty(state), !string.IsNullOrEmpty(code));
                
                // If user is already authenticated, redirect to dashboard
                if (User.Identity?.IsAuthenticated == true)
                {
                    _logger.LogInformation("User already authenticated, redirecting to dashboard");
                    return Redirect("/dashboard");
                }
                
                // Otherwise redirect to login
                return Redirect("/login?error=invalid_callback");
            }
            
            // Check if user is authenticated
            if (!User.Identity.IsAuthenticated)
            {
                _logger.LogWarning("User is not authenticated in callback");
                return Redirect("/login?error=not_authenticated");
            }

            // Get user info from claims
            var email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
            var name = User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;
            var googleId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(email))
            {
                _logger.LogError("Email claim not found in OAuth callback");
                return Redirect("/login?error=no_email");
            }

            // Find or create user
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            
            if (user == null)
            {
                user = new Backend.Models.User
                {
                    Email = email,
                    Name = name ?? email,
                    GoogleId = googleId
                };
                _context.Users.Add(user);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Created new user: {Email}", email);
            }
            else if (!string.IsNullOrEmpty(googleId) && user.GoogleId != googleId)
            {
                user.GoogleId = googleId;
                if (!string.IsNullOrEmpty(name))
                {
                    user.Name = name;
                }
                await _context.SaveChangesAsync();
                _logger.LogInformation("Updated existing user: {Email}", email);
            }

            // Set session
            HttpContext.Session.SetString("UserId", user.Id.ToString());
            
            _logger.LogInformation("OAuth callback successful for user: {Email}", email);
            
            // Redirect to dashboard
            return Redirect("/dashboard");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in OAuth callback");
            return Redirect("/login?error=callback_failed");
        }
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        HttpContext.Session.Clear();
        return Ok(new { message = "Logged out successfully" });
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var userId = HttpContext.Session.GetString("UserId");
        if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out var id))
        {
            return Unauthorized();
        }

        var user = await _context.Users.FindAsync(id);
        if (user == null)
        {
            return Unauthorized();
        }

        var userDto = new UserDto
        {
            Id = user.Id,
            Email = user.Email,
            Name = user.Name
        };

        return Ok(userDto);
    }

    [HttpGet("test")]
    public IActionResult Test()
    {
        var googleClientId = _configuration["Google:ClientId"] ?? Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID");
        var googleClientSecret = _configuration["Google:ClientSecret"] ?? Environment.GetEnvironmentVariable("GOOGLE_CLIENT_SECRET");
        
        return Ok(new 
        { 
            hasClientId = !string.IsNullOrEmpty(googleClientId),
            hasClientSecret = !string.IsNullOrEmpty(googleClientSecret),
            environment = _environment.EnvironmentName,
            sessionAvailable = HttpContext.Session.IsAvailable,
            isAuthenticated = User.Identity?.IsAuthenticated ?? false,
            userAgent = Request.Headers["User-Agent"].ToString(),
            cookies = Request.Cookies.Keys.ToList()
        });
    }
} 