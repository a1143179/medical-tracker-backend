using Xunit;
using Microsoft.AspNetCore.Mvc;
using Backend.Data;
using Backend.Tests;
using Microsoft.EntityFrameworkCore;

namespace Backend.Tests;

public class HealthControllerTests
{
    [Fact]
    public void Get_ReturnsOk()
    {
        var controller = new Backend.HealthController();
        var result = controller.Get();
        Assert.IsType<OkObjectResult>(result);
    }
} 