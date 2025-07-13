using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Backend.Models;

namespace Backend.Services;

public interface IJwtService
{
    (string accessToken, string refreshToken) GenerateTokenPair(User user, bool rememberMe = false);
    ClaimsPrincipal? ValidateAccessToken(string token);
    ClaimsPrincipal? ValidateRefreshToken(string token);
    string? GetUserEmailFromToken(string token);
    string GenerateAccessTokenFromRefreshToken(string refreshToken);
}

public class JwtService : IJwtService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<JwtService> _logger;

    public JwtService(IConfiguration configuration, ILogger<JwtService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public (string accessToken, string refreshToken) GenerateTokenPair(User user, bool rememberMe = false)
    {
        var jwtKey = _configuration["Jwt:Key"] ?? Environment.GetEnvironmentVariable("JWT_KEY");
        var jwtIssuer = _configuration["Jwt:Issuer"] ?? Environment.GetEnvironmentVariable("JWT_ISSUER");
        var jwtAudience = _configuration["Jwt:Audience"] ?? Environment.GetEnvironmentVariable("JWT_AUDIENCE");

        if (string.IsNullOrEmpty(jwtKey) || string.IsNullOrEmpty(jwtIssuer) || string.IsNullOrEmpty(jwtAudience))
        {
            _logger.LogError("JWT configuration is missing. Key: {HasKey}, Issuer: {HasIssuer}, Audience: {HasAudience}", 
                !string.IsNullOrEmpty(jwtKey), !string.IsNullOrEmpty(jwtIssuer), !string.IsNullOrEmpty(jwtAudience));
            throw new InvalidOperationException("JWT configuration is incomplete");
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var userClaims = new List<Claim>
        {
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.Name ?? user.Email),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new("google_id", user.GoogleId ?? ""),
            new("remember_me", rememberMe.ToString().ToLower())
        };

        // Access token - short lived (1 hour)
        var accessTokenExpires = DateTime.UtcNow.AddHours(1);
        var accessToken = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: userClaims,
            expires: accessTokenExpires,
            signingCredentials: credentials
        );

        // Refresh token - longer lived (7 days for remember me, 24 hours otherwise)
        var refreshTokenExpires = rememberMe ? DateTime.UtcNow.AddDays(7) : DateTime.UtcNow.AddHours(24);
        var refreshTokenClaims = new List<Claim>
        {
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new("token_type", "refresh"),
            new("remember_me", rememberMe.ToString().ToLower())
        };

        var refreshToken = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: refreshTokenClaims,
            expires: refreshTokenExpires,
            signingCredentials: credentials
        );

        var accessTokenString = new JwtSecurityTokenHandler().WriteToken(accessToken);
        var refreshTokenString = new JwtSecurityTokenHandler().WriteToken(refreshToken);
        
        _logger.LogInformation("Generated JWT token pair for user {Email}, access expires: {AccessExpires}, refresh expires: {RefreshExpires}, rememberMe: {RememberMe}", 
            user.Email, accessTokenExpires, refreshTokenExpires, rememberMe);
        
        return (accessTokenString, refreshTokenString);
    }

    public ClaimsPrincipal? ValidateAccessToken(string token)
    {
        return ValidateToken(token, "access");
    }

    public ClaimsPrincipal? ValidateRefreshToken(string token)
    {
        return ValidateToken(token, "refresh");
    }

    private ClaimsPrincipal? ValidateToken(string token, string expectedTokenType = null)
    {
        try
        {
            var jwtKey = _configuration["Jwt:Key"] ?? Environment.GetEnvironmentVariable("JWT_KEY");
            var jwtIssuer = _configuration["Jwt:Issuer"] ?? Environment.GetEnvironmentVariable("JWT_ISSUER");
            var jwtAudience = _configuration["Jwt:Audience"] ?? Environment.GetEnvironmentVariable("JWT_AUDIENCE");

            if (string.IsNullOrEmpty(jwtKey) || string.IsNullOrEmpty(jwtIssuer) || string.IsNullOrEmpty(jwtAudience))
            {
                _logger.LogWarning("JWT configuration is missing for token validation");
                return null;
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var tokenHandler = new JwtSecurityTokenHandler();

            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ValidateIssuer = true,
                ValidIssuer = jwtIssuer,
                ValidateAudience = true,
                ValidAudience = jwtAudience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            };

            var principal = tokenHandler.ValidateToken(token, validationParameters, out var validatedToken);
            
            // Check token type if specified
            if (!string.IsNullOrEmpty(expectedTokenType))
            {
                var tokenType = principal.FindFirst("token_type")?.Value;
                if (tokenType != expectedTokenType)
                {
                    _logger.LogWarning("Token type mismatch. Expected: {Expected}, Got: {Actual}", expectedTokenType, tokenType);
                    return null;
                }
            }
            
            _logger.LogDebug("JWT token validated successfully for user {Email}", 
                principal.FindFirst(ClaimTypes.Email)?.Value);
            
            return principal;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to validate JWT token");
            return null;
        }
    }

    public string? GetUserEmailFromToken(string token)
    {
        var principal = ValidateAccessToken(token);
        return principal?.FindFirst(ClaimTypes.Email)?.Value;
    }

    public string GenerateAccessTokenFromRefreshToken(string refreshToken)
    {
        var principal = ValidateRefreshToken(refreshToken);
        if (principal == null)
        {
            throw new InvalidOperationException("Invalid refresh token");
        }

        var email = principal.FindFirst(ClaimTypes.Email)?.Value;
        var userId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var rememberMe = principal.FindFirst("remember_me")?.Value == "true";

        if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(userId))
        {
            throw new InvalidOperationException("Invalid refresh token claims");
        }

        var jwtKey = _configuration["Jwt:Key"] ?? Environment.GetEnvironmentVariable("JWT_KEY");
        var jwtIssuer = _configuration["Jwt:Issuer"] ?? Environment.GetEnvironmentVariable("JWT_ISSUER");
        var jwtAudience = _configuration["Jwt:Audience"] ?? Environment.GetEnvironmentVariable("JWT_AUDIENCE");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.Email, email),
            new(ClaimTypes.NameIdentifier, userId),
            new("remember_me", rememberMe.ToString().ToLower())
        };

        var expiresIn = TimeSpan.FromHours(1); // Access token expires in 1 hour
        var expiresAt = DateTime.UtcNow.Add(expiresIn);

        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials
        );

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        
        _logger.LogInformation("Generated new access token from refresh token for user {Email}, expires: {ExpiresAt}", 
            email, expiresAt);
        
        return tokenString;
    }
} 