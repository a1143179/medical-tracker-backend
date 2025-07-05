using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace backend.Migrations
{
    /// <inheritdoc />
    public partial class UpdateAllUsersLanguagePreferenceToEnglish : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Update all existing users to have English as their language preference
            migrationBuilder.Sql("UPDATE \"Users\" SET \"LanguagePreference\" = 'en' WHERE \"LanguagePreference\" IS NULL OR \"LanguagePreference\" = ''");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
