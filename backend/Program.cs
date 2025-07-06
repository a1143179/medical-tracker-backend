using System.Collections;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);

// 1. config services
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:3000") // 允许你的 React 开发服务器访问
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// 2. middleware
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseCors("AllowReactApp"); // 在开发环境中启用 CORS
}

// React files
app.UseDefaultFiles();
app.UseStaticFiles();

// database migration
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.Migrate();
}

// Password hashing utilities
string HashPassword(string password)
{
    using var sha256 = SHA256.Create();
    var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
    return Convert.ToBase64String(hashedBytes);
}

bool VerifyPassword(string password, string hash)
{
    return HashPassword(password) == hash;
}

// Remember token utilities
string GenerateRememberToken()
{
    var randomBytes = new byte[32];
    using var rng = RandomNumberGenerator.Create();
    rng.GetBytes(randomBytes);
    return Convert.ToBase64String(randomBytes);
}

bool IsRememberTokenValid(string token, DateTime? expiry)
{
    return !string.IsNullOrEmpty(token) && 
           expiry.HasValue && 
           expiry.Value > DateTime.UtcNow;
}

// 3. define API endpoints
var api = app.MapGroup("/api/records");
var authApi = app.MapGroup("/api/auth");

// Authentication endpoints
authApi.MapPost("/login", async (LoginDto loginDto, HttpContext context, AppDbContext db) =>
{
    var user = await db.Users.FirstOrDefaultAsync(u => u.Email == loginDto.Email);
    if (user == null || !VerifyPassword(loginDto.Password, user.PasswordHash))
    {
        return Results.BadRequest(new { message = "Invalid email or password" });
    }

    // Always create a session token, but with different expiration times
    var rememberToken = GenerateRememberToken();
    var tokenExpiry = loginDto.RememberMe 
        ? DateTime.UtcNow.AddMonths(3) // 3 months for "remember me"
        : DateTime.UtcNow.AddHours(24); // 24 hours for regular login
    
    user.RememberToken = rememberToken;
    user.RememberTokenExpiry = tokenExpiry;
    await db.SaveChangesAsync();
    
    // Set HTTP-only cookie
    context.Response.Cookies.Append("remember_token", rememberToken, new CookieOptions
    {
        HttpOnly = true,
        Secure = !app.Environment.IsDevelopment(), // Only use Secure in production
        SameSite = SameSiteMode.Strict,
        Expires = tokenExpiry,
        Path = "/"
    });

    var userDto = new UserDto
    {
        Id = user.Id,
        Email = user.Email,
        Name = user.Name,
        CreatedAt = user.CreatedAt,
        IsEmailVerified = user.IsEmailVerified,
        LanguagePreference = user.LanguagePreference
    };

    return Results.Ok(userDto);
});

authApi.MapPost("/register", async (RegisterDto registerDto, AppDbContext db) =>
{
    if (registerDto.Password != registerDto.ConfirmPassword)
    {
        return Results.BadRequest(new { message = "Passwords do not match" });
    }

    if (registerDto.Password.Length < 6)
    {
        return Results.BadRequest(new { message = "Password must be at least 6 characters long" });
    }

    var existingUser = await db.Users.FirstOrDefaultAsync(u => u.Email == registerDto.Email);
    
    if (existingUser != null)
    {
        // Check if user is already fully registered (has password)
        if (!string.IsNullOrEmpty(existingUser.PasswordHash))
        {
            return Results.BadRequest(new { message = "User with this email already exists" });
        }
        
        // User exists but doesn't have password (created during verification code sending)
        // Update with password and complete registration
        existingUser.PasswordHash = HashPassword(registerDto.Password);
        existingUser.VerificationCode = null;
        existingUser.VerificationCodeExpiry = null;
        
        await db.SaveChangesAsync();
        
        var userDto = new UserDto
        {
            Id = existingUser.Id,
            Email = existingUser.Email,
            Name = existingUser.Name,
            CreatedAt = existingUser.CreatedAt,
            IsEmailVerified = existingUser.IsEmailVerified,
            LanguagePreference = existingUser.LanguagePreference
        };
        
        return Results.Created($"/api/auth/users/{existingUser.Id}", userDto);
    }

    // Create new user (this shouldn't happen in normal flow, but handle it)
    var user = new User
    {
        Email = registerDto.Email,
        PasswordHash = HashPassword(registerDto.Password),
        Name = registerDto.Email.Split('@')[0],
        CreatedAt = DateTime.UtcNow,
        IsEmailVerified = false
    };

    db.Users.Add(user);
    await db.SaveChangesAsync();

    var newUserDto = new UserDto
    {
        Id = user.Id,
        Email = user.Email,
        Name = user.Name,
        CreatedAt = user.CreatedAt,
        IsEmailVerified = user.IsEmailVerified,
        LanguagePreference = user.LanguagePreference
    };

    return Results.Created($"/api/auth/users/{user.Id}", newUserDto);
});

authApi.MapPost("/send-verification", async (SendVerificationDto dto, AppDbContext db) =>
{
    // Allow sending code to any email (registration or password reset)
    var code = Random.Shared.Next(100000, 999999).ToString();
    var expiryTime = DateTime.UtcNow.AddMinutes(10); // Code expires in 10 minutes

    // Check if user exists
    var existingUser = await db.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
    
    if (existingUser == null)
    {
        // Create new user record for registration
        var newUser = new User
        {
            Email = dto.Email,
            Name = dto.Email.Split('@')[0],
            CreatedAt = DateTime.UtcNow,
            IsEmailVerified = false,
            VerificationCode = code,
            VerificationCodeExpiry = expiryTime
        };
        
        db.Users.Add(newUser);
    }
    else
    {
        // Update existing user's verification code (for password reset or re-verification)
        existingUser.VerificationCode = code;
        existingUser.VerificationCodeExpiry = expiryTime;
    }
    
    await db.SaveChangesAsync();

    if (app.Environment.IsDevelopment())
    {
        return Results.Ok(new { message = "Verification code sent", code = code });
    }

    // TODO: Send email in production
    return Results.Ok(new { message = "Verification code sent" });
});

authApi.MapPost("/verify-code", async (VerifyCodeDto dto, AppDbContext db) =>
{
    var user = await db.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
    if (user == null)
    {
        return Results.BadRequest(new { message = "User not found" });
    }

    if (user.VerificationCode != dto.Code)
    {
        return Results.BadRequest(new { message = "Invalid verification code" });
    }

    if (user.VerificationCodeExpiry < DateTime.UtcNow)
    {
        return Results.BadRequest(new { message = "Verification code has expired" });
    }

    user.IsEmailVerified = true;
    user.VerificationCode = null;
    user.VerificationCodeExpiry = null;
    
    await db.SaveChangesAsync();

    return Results.Ok(new { message = "Email verified successfully" });
});

// Validate remember token and auto-login
authApi.MapGet("/validate-remember-token", async (HttpContext context, AppDbContext db) =>
{
    var rememberToken = context.Request.Cookies["remember_token"];
    if (string.IsNullOrEmpty(rememberToken))
    {
        return Results.Unauthorized();
    }

    var user = await db.Users.FirstOrDefaultAsync(u => u.RememberToken == rememberToken);
    if (user == null || !IsRememberTokenValid(user.RememberToken ?? "", user.RememberTokenExpiry))
    {
        // Clear invalid cookie
        context.Response.Cookies.Delete("remember_token");
        return Results.Unauthorized();
    }

    // Renew token if it's still valid (extend by 3 months from now)
    var newExpiry = DateTime.UtcNow.AddMonths(3);
    user.RememberTokenExpiry = newExpiry;
    await db.SaveChangesAsync();

    // Update cookie expiry
    context.Response.Cookies.Append("remember_token", rememberToken, new CookieOptions
    {
        HttpOnly = true,
        Secure = !app.Environment.IsDevelopment(),
        SameSite = SameSiteMode.Strict,
        Expires = newExpiry,
        Path = "/"
    });

    var userDto = new UserDto
    {
        Id = user.Id,
        Email = user.Email,
        Name = user.Name,
        CreatedAt = user.CreatedAt,
        IsEmailVerified = user.IsEmailVerified,
        LanguagePreference = user.LanguagePreference
    };

    return Results.Ok(userDto);
});

// Logout - clear remember token
authApi.MapPost("/logout", async (HttpContext context, AppDbContext db) =>
{
    var rememberToken = context.Request.Cookies["remember_token"];
    if (!string.IsNullOrEmpty(rememberToken))
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.RememberToken == rememberToken);
        if (user != null)
        {
            user.RememberToken = null;
            user.RememberTokenExpiry = null;
            await db.SaveChangesAsync();
        }
    }

    // Clear the cookie
    context.Response.Cookies.Delete("remember_token");
    
    return Results.Ok(new { message = "Logged out successfully" });
});

// Language preference endpoints
authApi.MapGet("/language-preference", async (HttpContext context, AppDbContext db) =>
{
    var rememberToken = context.Request.Cookies["remember_token"];
    if (string.IsNullOrEmpty(rememberToken))
    {
        return Results.Unauthorized();
    }

    var user = await db.Users.FirstOrDefaultAsync(u => u.RememberToken == rememberToken);
    if (user == null || !IsRememberTokenValid(user.RememberToken ?? "", user.RememberTokenExpiry))
    {
        return Results.Unauthorized();
    }

    return Results.Ok(new { languagePreference = user.LanguagePreference });
});

authApi.MapPut("/language-preference", async (UpdateLanguagePreferenceDto dto, HttpContext context, AppDbContext db) =>
{
    var rememberToken = context.Request.Cookies["remember_token"];
    if (string.IsNullOrEmpty(rememberToken))
    {
        return Results.Unauthorized();
    }

    var user = await db.Users.FirstOrDefaultAsync(u => u.RememberToken == rememberToken);
    if (user == null || !IsRememberTokenValid(user.RememberToken ?? "", user.RememberTokenExpiry))
    {
        return Results.Unauthorized();
    }

    // Validate language preference
    if (dto.LanguagePreference != "en" && dto.LanguagePreference != "zh")
    {
        return Results.BadRequest(new { message = "Invalid language preference. Must be 'en' or 'zh'" });
    }

    user.LanguagePreference = dto.LanguagePreference;
    await db.SaveChangesAsync();

    return Results.Ok(new { message = "Language preference updated successfully" });
});

// Blood sugar records endpoints (now with user filtering)
api.MapGet("/", async (HttpContext context) =>
{
    var db = context.RequestServices.GetRequiredService<AppDbContext>();
    var userId = context.Request.Query["userId"].ToString();
    if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out int userIdInt))
    {
        return Results.BadRequest(new { message = "Invalid user ID" });
    }
    var records = await db.BloodSugarRecords.Where(r => r.UserId == userIdInt).ToListAsync();
    return Results.Ok(records);
});

api.MapGet("/{id}", async (int id, HttpContext context) =>
{
    var db = context.RequestServices.GetRequiredService<AppDbContext>();
    var record = await db.BloodSugarRecords.FindAsync(id);
    return record is not null ? Results.Ok(record) : Results.NotFound();
});

api.MapPost("/", async (CreateBloodSugarRecordDto recordDto, HttpContext context) =>
{
    var db = context.RequestServices.GetRequiredService<AppDbContext>();
    var userId = context.Request.Query["userId"].ToString();
    if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out int userIdInt))
    {
        return Results.BadRequest(new { message = "Invalid user ID" });
    }

    if (recordDto == null)
    {
        return Results.BadRequest(new { message = "Invalid request body" });
    }

    var newRecord = new BloodSugarRecord
    {
        MeasurementTime = recordDto.MeasurementTime,
        Level = recordDto.Level,
        Notes = recordDto.Notes,
        UserId = userIdInt
    };
    db.BloodSugarRecords.Add(newRecord);
    await db.SaveChangesAsync();
    return Results.Created($"/api/records/{newRecord.Id}", newRecord);
});

api.MapPut("/{id}", async (int id, BloodSugarRecord inputRecord, HttpContext context) =>
{
    var db = context.RequestServices.GetRequiredService<AppDbContext>();
    var userId = context.Request.Query["userId"].ToString();
    if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out int userIdInt))
    {
        return Results.BadRequest(new { message = "Invalid user ID" });
    }

    if (inputRecord == null)
    {
        return Results.BadRequest(new { message = "Invalid request body" });
    }

    var record = await db.BloodSugarRecords.FindAsync(id);
    if (record is null) return Results.NotFound();
    
    // Ensure user can only update their own records
    if (record.UserId != userIdInt)
    {
        return Results.Forbid();
    }
    
    record.MeasurementTime = inputRecord.MeasurementTime;
    record.Level = inputRecord.Level;
    record.Notes = inputRecord.Notes;

    await db.SaveChangesAsync();
    return Results.NoContent();
});

api.MapDelete("/{id}", async (int id, HttpContext context) =>
{
    var db = context.RequestServices.GetRequiredService<AppDbContext>();
    var userId = context.Request.Query["userId"].ToString();
    if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out int userIdInt))
    {
        return Results.BadRequest(new { message = "Invalid user ID" });
    }

    var record = await db.BloodSugarRecords.FindAsync(id);
    if (record is null) return Results.NotFound();
    
    // Ensure user can only delete their own records
    if (record.UserId != userIdInt)
    {
        return Results.Forbid();
    }
    
    db.BloodSugarRecords.Remove(record);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.Run();