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
        var properties = new AuthenticationProperties
        {
            RedirectUri = Url.Action(nameof(Callback), "Auth", new { returnUrl }),
            Items =
            {
                { "returnUrl", returnUrl }
            }
        };

        return Challenge(properties, GoogleDefaults.AuthenticationScheme);
    }

    [HttpGet("callback")]
    public async Task<IActionResult> Callback(string returnUrl = "/")
    {
        var result = await HttpContext.AuthenticateAsync(GoogleDefaults.AuthenticationScheme);
        
        if (!result.Succeeded)
        {
            _logger.LogWarning("Google authentication failed");
            return Redirect("/login?error=auth_failed");
        }

        var claims = result.Principal.Claims;
        var email = claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value;
        var name = claims.FirstOrDefault(c => c.Type == ClaimTypes.Name)?.Value;
        var googleId = claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(email))
        {
            _logger.LogWarning("No email found in Google claims");
            return Redirect("/login?error=no_email");
        }

        // Find or create user
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        
        if (user == null)
        {
            user = new User
            {
                Email = email,
                Name = name ?? email,
                GoogleId = googleId
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
        }
        else if (!string.IsNullOrEmpty(googleId) && user.GoogleId != googleId)
        {
            // Update Google ID if it changed
            user.GoogleId = googleId;
            if (!string.IsNullOrEmpty(name))
            {
                user.Name = name;
            }
            await _context.SaveChangesAsync();
        }

        // Set session
        HttpContext.Session.SetString("UserId", user.Id.ToString());

        // Sign out the external cookie
        await HttpContext.SignOutAsync(GoogleDefaults.AuthenticationScheme);

        return Redirect(returnUrl);
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
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
} 