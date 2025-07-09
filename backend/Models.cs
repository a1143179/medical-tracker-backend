using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class User
    {
        public int Id { get; set; }
        
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
        
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
        
        public string? GoogleId { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string LanguagePreference { get; set; } = "en";
    }

    public class BloodSugarRecord
    {
        public int Id { get; set; }
        
        [Required]
        public DateTime MeasurementTime { get; set; }
        
        [Required]
        [Range(0.1, 100, ErrorMessage = "Blood sugar level must be between 0.1 and 100 mmol/L")]
        public double Level { get; set; }
        
        [MaxLength(1000, ErrorMessage = "Notes cannot exceed 1000 characters")]
        public string? Notes { get; set; }
        
        [Required]
        public int UserId { get; set; }
        public User User { get; set; } = null!;
    }
}