using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Hosting;
using Moq;
using Xunit;
using Backend.Models;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using Backend.Tests;

namespace TestMinimal;

public class AuthControllerTests
{
    private readonly DbContextOptions<Backend.Data.AppDbContext> _options;
    private readonly Mock<ILogger<Backend.AuthController>> _mockLogger;
    private readonly Mock<IConfiguration> _mockConfig;
    private readonly Mock<IWebHostEnvironment> _mockEnv;

    public AuthControllerTests()
    {
        _options = new DbContextOptionsBuilder<Backend.Data.AppDbContext>()
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
    public async Task Me_WithValidSession_ReturnsUserDto()
    {
        // Arrange
        using var dbContext = new Backend.Data.AppDbContext(_options);
        var logger = _mockLogger.Object;
        var config = _mockConfig.Object;
        var env = _mockEnv.Object;
        var controller = new Backend.AuthController(dbContext, logger, config, env);

        var user = new User { Id = 1, Email = "test@example.com", Name = "Test User", CreatedAt = DateTime.UtcNow, LanguagePreference = "en" };
        dbContext.Users.Add(user);
        dbContext.SaveChanges();

        var httpContext = new DefaultHttpContext();
        httpContext.Session = CreateSessionWithUserId("1");
        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

        // Act
        var result = await controller.Me();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var userDto = Assert.IsType<UserDto>(okResult.Value);
        Assert.Equal(1, userDto.Id);
        Assert.Equal("test@example.com", userDto.Email);
        Assert.Equal("Test User", userDto.Name);
    }

    [Fact]
    public async Task Me_WithNoSession_ReturnsUnauthorized()
    {
        // Arrange
        using var dbContext = new Backend.Data.AppDbContext(_options);
        var logger = _mockLogger.Object;
        var config = _mockConfig.Object;
        var env = _mockEnv.Object;
        var controller = new Backend.AuthController(dbContext, logger, config, env);

        var httpContext = new DefaultHttpContext();
        httpContext.Session = new TestSession(); // No UserId set
        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

        // Act
        var result = await controller.Me();

        // Assert
        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task Me_WithUserNotFound_ReturnsNotFound()
    {
        // Arrange
        using var dbContext = new Backend.Data.AppDbContext(_options);
        var logger = _mockLogger.Object;
        var config = _mockConfig.Object;
        var env = _mockEnv.Object;
        var controller = new Backend.AuthController(dbContext, logger, config, env);

        var httpContext = new DefaultHttpContext();
        httpContext.Session = CreateSessionWithUserId("1");
        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

        // Act
        var result = await controller.Me();

        // Assert
        Assert.IsType<NotFoundResult>(result);
    }
} 