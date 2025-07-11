using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.DTOs;
using System.Text;
using System.Text.RegularExpressions;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Backend;
using Backend.Data;

namespace Backend
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly ILogger<AuthController> _logger;
        private readonly IConfiguration _config;
        private readonly IWebHostEnvironment _env;

        public AuthController(AppDbContext db, ILogger<AuthController> logger, IConfiguration config, IWebHostEnvironment env)
        {
            _db = db;
            _logger = logger;
            _config = config;
            _env = env;
        }

        [HttpGet("login")]
        public IActionResult Login([FromQuery] string? returnUrl)
        {
            returnUrl ??= "/";
            var clientId = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID") ?? _config["Google:ClientId"] ?? "";
            var scheme = _env.IsProduction() ? "https" : "http";
            var host = Request.Host.Value;
            var redirectUri = $"{scheme}://{host}/api/auth/callback";
            _logger.LogInformation($"[GOOGLE OAUTH] Using redirectUri: {redirectUri}");
            var scope = "openid email profile";
            var responseType = "code";
            var stateData = $"{Guid.NewGuid()}|{returnUrl}";
            var state = Convert.ToBase64String(Encoding.UTF8.GetBytes(stateData));
            var googleAuthUrl = $"https://accounts.google.com/o/oauth2/auth?client_id={Uri.EscapeDataString(clientId)}&redirect_uri={Uri.EscapeDataString(redirectUri)}&scope={Uri.EscapeDataString(scope)}&response_type={responseType}&state={Uri.EscapeDataString(state)}";
            return Redirect(googleAuthUrl);
        }

        [HttpGet("callback")]
        public async Task<IActionResult> Callback()
        {
            var context = HttpContext;
            try
            {
                var code = context.Request.Query["code"].ToString();
                var state = context.Request.Query["state"].ToString();
                var error = context.Request.Query["error"].ToString();
                if (!string.IsNullOrEmpty(error))
                {
                    _logger.LogError($"[CALLBACK] Google OAuth error: {error}");
                    return Redirect("/login?error=oauth_error");
                }
                if (string.IsNullOrEmpty(code))
                {
                    _logger.LogError("[CALLBACK] No authorization code received");
                    return Redirect("/login?error=no_code");
                }
                string returnUrl = "/";
                try
                {
                    var decodedState = Encoding.UTF8.GetString(Convert.FromBase64String(state));
                    var stateParts = decodedState.Split('|');
                    if (stateParts.Length == 2)
                    {
                        returnUrl = stateParts[1];
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[CALLBACK] Failed to decode state parameter");
                    return Redirect("/login?error=invalid_state");
                }
                var clientId = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID") ?? _config["Google:ClientId"] ?? "";
                var clientSecret = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_SECRET") ?? _config["Google:ClientSecret"] ?? "";
                var scheme = _env.IsProduction() ? "https" : "http";
                var host = context.Request.Host.Value;
                var redirectUri = $"{scheme}://{host}/api/auth/callback";
                _logger.LogInformation($"[GOOGLE OAUTH CALLBACK] Using redirectUri: {redirectUri}");
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
                    _logger.LogError($"[CALLBACK] Token exchange failed: {tokenContent}");
                    return Redirect("/login?error=token_exchange_failed");
                }
                var accessToken = ExtractValue(tokenContent, "access_token");
                var idToken = ExtractValue(tokenContent, "id_token");
                if (string.IsNullOrEmpty(accessToken))
                {
                    _logger.LogError("[CALLBACK] No access token received");
                    return Redirect("/login?error=no_access_token");
                }
                httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
                var userInfoResponse = await httpClient.GetAsync("https://www.googleapis.com/oauth2/v2/userinfo");
                var userInfoContent = await userInfoResponse.Content.ReadAsStringAsync();
                if (!userInfoResponse.IsSuccessStatusCode)
                {
                    _logger.LogError($"[CALLBACK] User info request failed: {userInfoContent}");
                    return Redirect("/login?error=user_info_failed");
                }
                var email = ExtractValue(userInfoContent, "email");
                var name = ExtractValue(userInfoContent, "name");
                var googleId = ExtractValue(userInfoContent, "id");
                if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(googleId))
                {
                    _logger.LogError("[CALLBACK] Google OAuth: Missing email or Google ID");
                    return Redirect($"{returnUrl}?error=missing_user_info");
                }
                var existingUser = await _db.Users.FirstOrDefaultAsync(u => u.GoogleId == googleId);
                if (existingUser == null)
                {
                    existingUser = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
                    if (existingUser != null)
                    {
                        existingUser.GoogleId = googleId;
                        existingUser.Name = name ?? email;
                    }
                    else
                    {
                        existingUser = new User
                        {
                            Email = email,
                            Name = name ?? email,
                            GoogleId = googleId,
                            CreatedAt = DateTime.UtcNow,
                            LanguagePreference = "en"
                        };
                        _db.Users.Add(existingUser);
                    }
                    await _db.SaveChangesAsync();
                }
                context.Session.SetString("UserId", existingUser.Id.ToString());
                context.Session.SetString("UserEmail", existingUser.Email);
                context.Session.SetString("UserName", existingUser.Name);
                await context.Session.CommitAsync();
                return Redirect("/dashboard");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[CALLBACK] Google OAuth callback error");
                return Redirect("/login?error=callback_error");
            }
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
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
            var user = await _db.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound();
            }
            return Ok(new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                Name = user.Name,
                CreatedAt = user.CreatedAt,
                LanguagePreference = user.LanguagePreference
            });
        }

        [HttpPost("language")]
        public async Task<IActionResult> UpdateLanguage([FromBody] UpdateLanguagePreferenceDto dto)
        {
            var userId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out var id))
            {
                return Unauthorized();
            }
            var user = await _db.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound();
            }
            user.LanguagePreference = dto.LanguagePreference;
            await _db.SaveChangesAsync();
            return Ok(new { message = "Language preference updated" });
        }

        private static string ExtractValue(string json, string key)
        {
            var pattern = $"\"{key}\"\\s*:\\s*\"([^\"]*)\"";
            var match = Regex.Match(json, pattern);
            return match.Success ? match.Groups[1].Value : "";
        }
    }
} 