using Xunit;
using Moq;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Hosting;
using Backend.Models;
using Backend.Data;
using Backend.Tests;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Backend.DTOs;

namespace Backend.Tests;

public class AuthControllerTests
{
    private readonly DbContextOptions<AppDbContext> _options;
    private readonly Mock<ILogger<Backend.AuthController>> _mockLogger;
    private readonly Mock<IConfiguration> _mockConfig;
    private readonly Mock<IWebHostEnvironment> _mockEnv;

    public AuthControllerTests()
    {
        _options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _mockLogger = new Mock<ILogger<Backend.AuthController>>();
        _mockConfig = new Mock<IConfiguration>();
        _mockEnv = new Mock<IWebHostEnvironment>();
    }

    private static ISession CreateSessionWithUserId(string userId)
    {
        var session = new TestSession();
        session.SetString("UserId", userId);
        return session;
    }

    [Fact]
    public async Task Me_ReturnsUser_WhenAuthenticated()
    {
        using var context = new AppDbContext(_options);
        var controller = new Backend.AuthController(context, _mockLogger.Object, _mockConfig.Object, _mockEnv.Object);
        var user = new User { Id = 1, Email = "test@example.com", Name = "Test User" };
        context.Users.Add(user);
        await context.SaveChangesAsync();
        var httpContext = new DefaultHttpContext();
        httpContext.Session = CreateSessionWithUserId("1");
        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        var result = await controller.Me();
        var okResult = Assert.IsType<OkObjectResult>(result);
        var userDto = Assert.IsType<UserDto>(okResult.Value);
        Assert.Equal("test@example.com", userDto.Email);
    }

    [Fact]
    public async Task Me_ReturnsUnauthorized_WhenNotAuthenticated()
    {
        using var context = new AppDbContext(_options);
        var controller = new Backend.AuthController(context, _mockLogger.Object, _mockConfig.Object, _mockEnv.Object);
        var httpContext = new DefaultHttpContext();
        httpContext.Session = new TestSession(); // Ensure session is configured
        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        var result = await controller.Me();
        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task GoogleLoginCallback_SetsCookiesAndRedirects()
    {
        using var context = new AppDbContext(_options);
        var mockJwtService = new Mock<Backend.Services.IJwtService>();
        var controller = new Backend.AuthController(context, _mockLogger.Object, _mockConfig.Object, _mockEnv.Object, mockJwtService.Object);

        // Arrange: Simulate Google claims
        var user = new User { Id = 2, Email = "googleuser@example.com", Name = "Google User", GoogleId = "google-123" };
        context.Users.Add(user);
        await context.SaveChangesAsync();
        var httpContext = new DefaultHttpContext();
        var claims = new List<System.Security.Claims.Claim>
        {
            new(System.Security.Claims.ClaimTypes.Email, user.Email),
            new(System.Security.Claims.ClaimTypes.Name, user.Name),
            new(System.Security.Claims.ClaimTypes.NameIdentifier, user.GoogleId ?? "google-123")
        };
        var identity = new System.Security.Claims.ClaimsIdentity(claims, "Google");
        httpContext.User = new System.Security.Claims.ClaimsPrincipal(identity);
        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

        // Mock JWT service
        mockJwtService.Setup(s => s.GenerateTokenPair(It.IsAny<User>(), false))
            .Returns(("access-token-mock", "refresh-token-mock"));
        mockJwtService.Setup(s => s.GetAccessTokenCookieName()).Returns("access_token");
        mockJwtService.Setup(s => s.GetRefreshTokenCookieName()).Returns("refresh_token");
        _mockConfig.Setup(c => c["Frontend:Url"]).Returns("http://localhost:3000");
        _mockEnv.Setup(e => e.IsDevelopment()).Returns(true);

        // Act
        var result = await controller.Callback();

        // Assert
        Assert.IsType<RedirectResult>(result);
        var redirect = result as RedirectResult;
        Assert.Contains("/dashboard", redirect.Url);
        Assert.Contains("access_token", httpContext.Response.Headers["Set-Cookie"]);
        Assert.Contains("refresh_token", httpContext.Response.Headers["Set-Cookie"]);
    }

    [Fact]
    public void RefreshToken_WithValidRefreshToken_SetsNewAccessTokenCookie()
    {
        using var context = new AppDbContext(_options);
        var mockJwtService = new Mock<Backend.Services.IJwtService>();
        var controller = new Backend.AuthController(context, _mockLogger.Object, _mockConfig.Object, _mockEnv.Object, mockJwtService.Object);
        var httpContext = new DefaultHttpContext();
        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

        // Arrange: Set valid refresh token in cookie
        httpContext.Request.Cookies = new TestRequestCookieCollection(new Dictionary<string, string>
        {
            { "refresh_token", "valid-refresh-token" }
        });
        mockJwtService.Setup(s => s.GetRefreshTokenCookieName()).Returns("refresh_token");
        mockJwtService.Setup(s => s.GetAccessTokenCookieName()).Returns("access_token");
        mockJwtService.Setup(s => s.GenerateAccessTokenFromRefreshToken("valid-refresh-token"))
            .Returns("new-access-token");
        _mockEnv.Setup(e => e.IsDevelopment()).Returns(true);

        // Act
        var result = controller.RefreshToken();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Contains("access_token", httpContext.Response.Headers["Set-Cookie"]);
        Assert.Equal("Access token refreshed successfully", ((dynamic)okResult.Value).message);
    }
} 