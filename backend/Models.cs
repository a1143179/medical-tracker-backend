public class User
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsEmailVerified { get; set; } = false;
    public string? VerificationCode { get; set; }
    public DateTime? VerificationCodeExpiry { get; set; }
    public string? RememberToken { get; set; }
    public DateTime? RememberTokenExpiry { get; set; }
    public string LanguagePreference { get; set; } = "en";
}

public class BloodSugarRecord
{
    public int Id { get; set; }
    public DateTime MeasurementTime { get; set; }
    public double Level { get; set; }
    public string? Notes { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
}