using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
// ======================= 调试代码开始 =======================
Console.WriteLine("--- DUMPING ENVIRONMENT VARIABLES ---");
var envVars = Environment.GetEnvironmentVariables();
foreach (DictionaryEntry de in envVars)
{
    Console.WriteLine("  {0} = {1}", de.Key, de.Value);
}
Console.WriteLine("--- END OF DUMP ---");
// ======================= 调试代码结束 =======================

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

// 3. define API endpoints
var api = app.MapGroup("/api/records");

api.MapGet("/", async (AppDbContext db) => await db.BloodSugarRecords.ToListAsync());

api.MapGet("/{id}", async (int id, AppDbContext db) =>
    await db.BloodSugarRecords.FindAsync(id) is { } record ? Results.Ok(record) : Results.NotFound());

api.MapPost("/", async (BloodSugarRecord record, AppDbContext db) =>
{
    db.BloodSugarRecords.Add(record);
    await db.SaveChangesAsync();
    return Results.Created($"/api/records/{record.Id}", record);
});

api.MapPut("/{id}", async (int id, BloodSugarRecord inputRecord, AppDbContext db) =>
{
    var record = await db.BloodSugarRecords.FindAsync(id);
    if (record is null) return Results.NotFound();
    
    record.MeasurementTime = inputRecord.MeasurementTime;
    record.Level = inputRecord.Level;
    record.Notes = inputRecord.Notes;

    await db.SaveChangesAsync();
    return Results.NoContent();
});

api.MapDelete("/{id}", async (int id, AppDbContext db) =>
{
    var record = await db.BloodSugarRecords.FindAsync(id);
    if (record is null) return Results.NotFound();
    
    db.BloodSugarRecords.Remove(record);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.Run();