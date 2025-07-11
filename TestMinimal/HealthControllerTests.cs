using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace TestMinimal;

public class HealthControllerTests
{
    [Fact]
    public void Get_ReturnsOkResult()
    {
        // Arrange
        var controller = new Backend.HealthController();

        // Act
        var result = controller.Get();

        // Assert
        Assert.IsType<OkObjectResult>(result);
        var okResult = result as OkObjectResult;
        Assert.Equal(200, okResult?.StatusCode);
        Assert.NotNull(okResult?.Value);
        var value = okResult.Value;
        Assert.Equal("ok", value?.GetType().GetProperty("status")?.GetValue(value));
    }
} 