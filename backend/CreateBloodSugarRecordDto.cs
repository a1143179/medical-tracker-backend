using System.ComponentModel.DataAnnotations;

public class CreateBloodSugarRecordDto
{
    public DateTime MeasurementTime { get; set; }
    
    [Range(0.1, 100, ErrorMessage = "Blood sugar level must be between 0.1 and 100 mmol/L")]
    public double Level { get; set; }
    
    [MaxLength(1000, ErrorMessage = "Notes cannot exceed 1000 characters")]
    public string? Notes { get; set; }
}

public class UserDto
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string LanguagePreference { get; set; } = "en";
}

public class UpdateLanguagePreferenceDto
{
    [Required(ErrorMessage = "Language preference is required")]
    [RegularExpression("^(en|zh)$", ErrorMessage = "Language preference must be 'en' or 'zh'")]
    public string LanguagePreference { get; set; } = string.Empty;
}