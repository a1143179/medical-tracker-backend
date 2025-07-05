using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class SeedMoreRecords : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Sample notes for variety
            var sampleNotes = new[]
            {
                "Before breakfast",
                "After breakfast", 
                "Before lunch",
                "After lunch",
                "Before dinner",
                "After dinner",
                "Before bed",
                "Fasting",
                "Post-exercise",
                "Stressful day",
                "Good sleep",
                "Missed medication",
                "Extra exercise",
                "High carb meal",
                "Low carb meal",
                "Sick day",
                "Travel day",
                "Work stress",
                "Weekend relaxation",
                "Holiday meal"
            };

            var random = new Random(42); // Fixed seed for reproducible results
            var baseDate = DateTime.UtcNow.AddDays(-30); // Start from 30 days ago

            // Generate 100 records
            for (int i = 0; i < 100; i++)
            {
                var recordDate = baseDate.AddDays(random.Next(0, 31)); // Random day in the past 30 days
                var recordTime = recordDate.AddHours(random.Next(0, 24)).AddMinutes(random.Next(0, 60));
                
                // Generate realistic blood sugar levels based on time of day
                double bloodSugarLevel;
                var timeOfDay = recordTime.Hour;
                
                if (timeOfDay >= 6 && timeOfDay <= 9) // Morning fasting
                {
                    bloodSugarLevel = random.NextDouble() * 2 + 4.0; // 4.0-6.0 mmol/L
                }
                else if (timeOfDay >= 12 && timeOfDay <= 14) // Lunch time
                {
                    bloodSugarLevel = random.NextDouble() * 4 + 6.0; // 6.0-10.0 mmol/L
                }
                else if (timeOfDay >= 18 && timeOfDay <= 20) // Dinner time
                {
                    bloodSugarLevel = random.NextDouble() * 4 + 6.0; // 6.0-10.0 mmol/L
                }
                else if (timeOfDay >= 22 || timeOfDay <= 5) // Night time
                {
                    bloodSugarLevel = random.NextDouble() * 2 + 3.5; // 3.5-5.5 mmol/L
                }
                else // Other times
                {
                    bloodSugarLevel = random.NextDouble() * 3 + 5.0; // 5.0-8.0 mmol/L
                }
                
                // Add some variation and occasional spikes/drops
                if (random.Next(100) < 10) // 10% chance of high reading
                {
                    bloodSugarLevel += random.NextDouble() * 3 + 2; // Add 2-5 mmol/L
                }
                else if (random.Next(100) < 5) // 5% chance of low reading
                {
                    bloodSugarLevel -= random.NextDouble() * 2 + 1; // Subtract 1-3 mmol/L
                }
                
                // Ensure blood sugar stays within realistic bounds
                bloodSugarLevel = Math.Max(2.5, Math.Min(15.0, bloodSugarLevel));
                
                var note = sampleNotes[random.Next(sampleNotes.Length)];
                
                migrationBuilder.InsertData(
                    table: "BloodSugarRecords",
                    columns: new[] { "MeasurementTime", "Level", "Notes" },
                    values: new object[] { recordTime, Math.Round(bloodSugarLevel, 1), note }
                );
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Remove the seeded data by deleting records with specific notes
            var sampleNotes = new[]
            {
                "Before breakfast",
                "After breakfast", 
                "Before lunch",
                "After lunch",
                "Before dinner",
                "After dinner",
                "Before bed",
                "Fasting",
                "Post-exercise",
                "Stressful day",
                "Good sleep",
                "Missed medication",
                "Extra exercise",
                "High carb meal",
                "Low carb meal",
                "Sick day",
                "Travel day",
                "Work stress",
                "Weekend relaxation",
                "Holiday meal"
            };

            foreach (var note in sampleNotes)
            {
                migrationBuilder.DeleteData(
                    table: "BloodSugarRecords",
                    keyColumn: "Notes",
                    keyValue: note
                );
            }
        }
    }
} 