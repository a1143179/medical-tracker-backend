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
using Backend.Services;

namespace Backend;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ILogger<AuthController> _logger;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    private readonly IJwtService _jwtService;

    public AuthController(AppDbContext context, ILogger<AuthController> logger, IConfiguration configuration, IWebHostEnvironment environment, IJwtService jwtService)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
        _environment = environment;
        _jwtService = jwtService;
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
            _logger.LogInformation("OAuth callback received with query parameters: {QueryString}", Request.QueryString);
            
            var frontendUrl = _configuration["Frontend:Url"] ?? "http://localhost:3000";
            
            // Check if this is a valid OAuth callback with required parameters
            var code = Request.Query["code"].ToString();
            var error = Request.Query["error"].ToString();
            
            _logger.LogInformation("OAuth callback parameters - code: {Code}, error: {Error}", 
                !string.IsNullOrEmpty(code) ? "present" : "missing", error);
            
            if (!string.IsNullOrEmpty(error))
            {
                _logger.LogError("OAuth error received: {Error}", error);
                return Redirect($"{frontendUrl}/login?error=oauth_error&message={error}");
            }
            
            if (string.IsNullOrEmpty(code))
            {
                _logger.LogWarning("OAuth callback missing authorization code");
                return Redirect($"{frontendUrl}/login?error=missing_code");
            }
            

            
            if (User?.Identity?.IsAuthenticated != true)
            {
                _logger.LogWarning("User is not authenticated in callback");
                return Redirect($"{frontendUrl}/login?error=not_authenticated");
            }

            var email = User?.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
            var name = User?.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;
            var googleId = User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(email))
            {
                _logger.LogError("Email claim not found in OAuth callback");
                return Redirect($"{frontendUrl}/login?error=no_email");
            }

            _logger.LogInformation("Processing OAuth callback for user: {Email}, GoogleId: {GoogleId}", email, googleId);

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

            var (accessToken, refreshToken) = _jwtService.GenerateTokenPair(user, false);
            
            _logger.LogInformation("OAuth callback successful for user: {Email}, JWT token pair generated", email);
            
            var googleTokenExpiresIn = 3600; // Default 1 hour in seconds
            try
            {
                var googleTokenInfo = await GetGoogleTokenInfo(code);
                if (googleTokenInfo?.expires_in != null)
                {
                    googleTokenExpiresIn = googleTokenInfo.expires_in;
                    _logger.LogInformation("Google token expires in {ExpiresIn} seconds", googleTokenExpiresIn);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not get Google token info, using default expiration");
            }
            
            var accessTokenExpires = DateTime.UtcNow.AddSeconds(googleTokenExpiresIn);
            var accessTokenOptions = new CookieOptions
            {
                HttpOnly = false, // Accessible by JavaScript
                Secure = !_environment.IsDevelopment(),
                SameSite = SameSiteMode.Lax,
                MaxAge = TimeSpan.FromSeconds(googleTokenExpiresIn),
                Expires = accessTokenExpires
            };
            
            var refreshTokenOptions = new CookieOptions
            {
                HttpOnly = true, // Not accessible by JavaScript
                Secure = !_environment.IsDevelopment(),
                SameSite = SameSiteMode.Lax,
                MaxAge = TimeSpan.FromHours(24), // 24 hours
                Expires = DateTime.UtcNow.AddHours(24)
            };
            
            Response.Cookies.Append(_jwtService.GetAccessTokenCookieName(), accessToken, accessTokenOptions);
            Response.Cookies.Append(_jwtService.GetRefreshTokenCookieName(), refreshToken, refreshTokenOptions);
            
            var redirectUrl = $"{frontendUrl}/dashboard";
            
            _logger.LogInformation("Redirecting to frontend: {RedirectUrl}, access token expires: {AccessExpires}", redirectUrl, accessTokenExpires);
            
            return Redirect(redirectUrl);
        }
        catch (Exception ex)
        {
            var frontendUrl = _configuration["Frontend:Url"] ?? "http://localhost:3000";
            _logger.LogError(ex, "Error in OAuth callback");
            return Redirect($"{frontendUrl}/login?error=callback_failed");
        }
    }

    private async Task<dynamic?> GetGoogleTokenInfo(string code)
    {
        try
        {
            var clientId = _configuration["Google:ClientId"] ?? Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID");
            var clientSecret = _configuration["Google:ClientSecret"] ?? Environment.GetEnvironmentVariable("GOOGLE_CLIENT_SECRET");
            
            if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
            {
                return null;
            }
            
            using var httpClient = new HttpClient();
            var tokenRequest = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("client_id", clientId),
                new KeyValuePair<string, string>("client_secret", clientSecret),
                new KeyValuePair<string, string>("code", code),
                new KeyValuePair<string, string>("grant_type", "authorization_code"),
                new KeyValuePair<string, string>("redirect_uri", "/api/auth/callback")
            });
            
            var response = await httpClient.PostAsync("https://oauth2.googleapis.com/token", tokenRequest);
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                return System.Text.Json.JsonSerializer.Deserialize<dynamic>(content);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get Google token info");
        }
        
        return null;
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        // Clear both JWT cookies
        Response.Cookies.Delete(_jwtService.GetAccessTokenCookieName());
        Response.Cookies.Delete(_jwtService.GetRefreshTokenCookieName());
        return Ok(new { message = "Logged out successfully" });
    }

    [HttpPost("refresh")]
    public IActionResult RefreshToken()
    {
        try
        {
            // Get refresh token from HTTP-only cookie
            var refreshToken = Request.Cookies[_jwtService.GetRefreshTokenCookieName()];
            
            if (string.IsNullOrEmpty(refreshToken))
            {
                _logger.LogWarning("No refresh token found in request");
                return Unauthorized(new { message = "No refresh token provided" });
            }
            
            // Validate refresh token and generate new access token
            var newAccessToken = _jwtService.GenerateAccessTokenFromRefreshToken(refreshToken);
            
            // Set new access token as normal cookie
            var accessTokenOptions = new CookieOptions
            {
                HttpOnly = false, // Accessible by JavaScript
                Secure = !_environment.IsDevelopment(),
                SameSite = SameSiteMode.Lax,
                MaxAge = TimeSpan.FromHours(1), // 1 hour
                Expires = DateTime.UtcNow.AddHours(1)
            };
            
            Response.Cookies.Append(_jwtService.GetAccessTokenCookieName(), newAccessToken, accessTokenOptions);
            
            _logger.LogInformation("Access token refreshed successfully");
            
            return Ok(new { 
                message = "Access token refreshed successfully",
                accessToken = newAccessToken,
                expiresIn = 3600 // 1 hour in seconds
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to refresh access token");
            return Unauthorized(new { message = "Invalid refresh token" });
        }
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        // Get token from Authorization header or access token cookie
        var token = Request.Headers["Authorization"].FirstOrDefault()?.Replace("Bearer ", "") 
                   ?? Request.Cookies[_jwtService.GetAccessTokenCookieName()];
        
        if (string.IsNullOrEmpty(token))
        {
            return Unauthorized(new { message = "No access token provided" });
        }

        var email = _jwtService.GetUserEmailFromToken(token);
        if (string.IsNullOrEmpty(email))
        {
            return Unauthorized(new { message = "Invalid access token" });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
        {
            return Unauthorized(new { message = "User not found" });
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
            isAuthenticated = User?.Identity?.IsAuthenticated ?? false,
            userAgent = Request.Headers["User-Agent"].ToString(),
            cookies = Request.Cookies.Keys.ToList()
        });
    }

    [HttpGet("test-jwt")]
    public IActionResult TestJwt()
    {
        var jwtKey = _configuration["Jwt:Key"] ?? Environment.GetEnvironmentVariable("JWT_KEY");
        var jwtIssuer = _configuration["Jwt:Issuer"] ?? Environment.GetEnvironmentVariable("JWT_ISSUER");
        var jwtAudience = _configuration["Jwt:Audience"] ?? Environment.GetEnvironmentVariable("JWT_AUDIENCE");
        var frontendUrl = _configuration["Frontend:Url"] ?? Environment.GetEnvironmentVariable("FRONTEND_URL");
        
        return Ok(new 
        { 
            hasJwtKey = !string.IsNullOrEmpty(jwtKey),
            hasJwtIssuer = !string.IsNullOrEmpty(jwtIssuer),
            hasJwtAudience = !string.IsNullOrEmpty(jwtAudience),
            frontendUrl = frontendUrl,
            jwtKeyLength = jwtKey?.Length ?? 0,
            environment = _environment.EnvironmentName,
            accessTokenCookieName = _jwtService.GetAccessTokenCookieName(),
            refreshTokenCookieName = _jwtService.GetRefreshTokenCookieName()
        });
    }

    [HttpGet("debug-oauth")]
    public IActionResult DebugOAuth()
    {
        var googleClientId = _configuration["Google:ClientId"] ?? Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID");
        var googleClientSecret = _configuration["Google:ClientSecret"] ?? Environment.GetEnvironmentVariable("GOOGLE_CLIENT_SECRET");
        var frontendUrl = _configuration["Frontend:Url"] ?? Environment.GetEnvironmentVariable("FRONTEND_URL");
        
        var request = HttpContext.Request;
        var currentUrl = $"{request.Scheme}://{request.Host}{request.PathBase}";
        var callbackUrl = $"{currentUrl}/api/auth/callback";
        
        return Ok(new 
        { 
            hasGoogleClientId = !string.IsNullOrEmpty(googleClientId),
            hasGoogleClientSecret = !string.IsNullOrEmpty(googleClientSecret),
            googleClientIdLength = googleClientId?.Length ?? 0,
            frontendUrl = frontendUrl,
            currentUrl = currentUrl,
            callbackUrl = callbackUrl,
            environment = _environment.EnvironmentName,
            isDevelopment = _environment.IsDevelopment(),
            userAgent = Request.Headers["User-Agent"].ToString(),
            cookies = Request.Cookies.Keys.ToList(),
            sessionId = HttpContext.Session.Id
        });
    }
} 