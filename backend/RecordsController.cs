using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Backend.Models;
using Backend.DTOs;
using System.ComponentModel.DataAnnotations;
using Backend.Data;

namespace Backend
{
    [ApiController]
    [Route("api/[controller]")]
    public class RecordsController : ControllerBase
    {
        private readonly AppDbContext _db;
        public RecordsController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var userId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out var id))
            {
                return Unauthorized();
            }
            var records = await _db.BloodSugarRecords
                .Where(r => r.UserId == id)
                .OrderByDescending(r => r.MeasurementTime)
                .ToListAsync();
            return Ok(records);
        }

        [HttpPost]
        public async Task<IActionResult> Post([FromBody] CreateBloodSugarRecordDto dto)
        {
            var userId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out var id))
            {
                return Unauthorized();
            }
            var validationResults = new List<ValidationResult>();
            var validationContext = new ValidationContext(dto);
            if (!Validator.TryValidateObject(dto, validationContext, validationResults, true))
            {
                var errors = validationResults.Select(v => v.ErrorMessage).ToList();
                return BadRequest(new { message = string.Join("; ", errors) });
            }
            var record = new BloodSugarRecord
            {
                MeasurementTime = dto.MeasurementTime,
                Level = dto.Level,
                Notes = dto.Notes,
                UserId = id
            };
            _db.BloodSugarRecords.Add(record);
            await _db.SaveChangesAsync();
            return Created($"/api/records/{record.Id}", record);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Put(int id, [FromBody] CreateBloodSugarRecordDto dto)
        {
            var userId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out var userIdInt))
            {
                return Unauthorized();
            }
            var record = await _db.BloodSugarRecords.FirstOrDefaultAsync(r => r.Id == id && r.UserId == userIdInt);
            if (record == null)
            {
                return NotFound();
            }
            var validationResults = new List<ValidationResult>();
            var validationContext = new ValidationContext(dto);
            if (!Validator.TryValidateObject(dto, validationContext, validationResults, true))
            {
                var errors = validationResults.Select(v => v.ErrorMessage).ToList();
                return BadRequest(new { message = string.Join("; ", errors) });
            }
            record.MeasurementTime = dto.MeasurementTime;
            record.Level = dto.Level;
            record.Notes = dto.Notes;
            await _db.SaveChangesAsync();
            return Ok(record);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var userId = HttpContext.Session.GetString("UserId");
            if (string.IsNullOrEmpty(userId) || !int.TryParse(userId, out var userIdInt))
            {
                return Unauthorized();
            }
            var record = await _db.BloodSugarRecords.FirstOrDefaultAsync(r => r.Id == id && r.UserId == userIdInt);
            if (record == null)
            {
                return NotFound();
            }
            _db.BloodSugarRecords.Remove(record);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Record deleted successfully" });
        }
    }
} 