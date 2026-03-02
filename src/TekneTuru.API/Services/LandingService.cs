using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TekneTuru.API.Data;
using TekneTuru.API.Models;
using TekneTuru.Core.Entities;

namespace TekneTuru.API.Services;

public class LandingService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public LandingService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<string?> CreateTokenForBookingAsync(int bookingId, CancellationToken ct = default)
    {
        var b = await _db.DailyBookings.Include(b => b.Customer).FirstOrDefaultAsync(b => b.Id == bookingId, ct);
        if (b?.Customer == null) return null;
        return CreateToken(bookingId, b.Customer.FullName);
    }

    public string CreateToken(int bookingId, string customerName)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(GetKey()));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim("bookingId", bookingId.ToString()),
            new Claim(ClaimTypes.Name, customerName),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };
        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: "TekneTuru.Landing",
            claims,
            expires: DateTime.UtcNow.AddHours(48),
            signingCredentials: creds
        );
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public (int BookingId, string Name)? ValidateToken(string? token)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;
        try
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(GetKey()));
            var handler = new JwtSecurityTokenHandler();
            handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidIssuer = _config["Jwt:Issuer"],
                ValidAudience = "TekneTuru.Landing",
                IssuerSigningKey = key
            }, out var validated);
            var jwt = (JwtSecurityToken)validated;
            var bookingIdStr = jwt.Claims.FirstOrDefault(c => c.Type == "bookingId")?.Value;
            var name = jwt.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Name)?.Value ?? "";
            if (string.IsNullOrEmpty(bookingIdStr) || !int.TryParse(bookingIdStr, out var bookingId))
                return null;
            return (bookingId, name);
        }
        catch
        {
            return null;
        }
    }

    public async Task<LandingDataDto?> GetLandingDataAsync(int bookingId, CancellationToken ct = default)
    {
        var booking = await _db.DailyBookings
            .AsNoTracking()
            .Include(b => b.Customer)
            .FirstOrDefaultAsync(b => b.Id == bookingId, ct);
        if (booking?.Customer == null) return null;

        var tour = await _db.TourInfos.AsNoTracking().FirstOrDefaultAsync(ct);
        var stops = await _db.Stops.AsNoTracking()
            .Where(s => s.IsActive)
            .OrderBy(s => s.OrderIndex)
            .ToListAsync(ct);
        var docs = await _db.Documents.AsNoTracking().ToListAsync(ct);
        var settings = await _db.Settings.AsNoTracking().ToDictionaryAsync(s => s.Key, s => s.Value, ct);

        var menuTr = docs.FirstOrDefault(d => d.DocType == "menu" && d.Language == "TR")?.FileUrl;
        var menuEn = docs.FirstOrDefault(d => d.DocType == "menu" && d.Language == "EN")?.FileUrl;
        var rulesTr = docs.FirstOrDefault(d => d.DocType == "rules" && d.Language == "TR")?.FileUrl;
        var rulesEn = docs.FirstOrDefault(d => d.DocType == "rules" && d.Language == "EN")?.FileUrl;

        var tourDto = tour == null ? null : new LandingTourDto(
            tour.Title,
            tour.Description,
            tour.StartTime?.ToString("HH:mm"),
            tour.EndTime?.ToString("HH:mm"),
            tour.DurationMinutes,
            tour.DeparturePoint,
            tour.ImageUrl
        );

        var stopDtos = stops.Select(s => new LandingStopDto(s.Name, s.Description, s.ImageUrl)).ToList();

        return new LandingDataDto(
            booking.Customer.FullName,
            tourDto,
            stopDtos,
            menuTr,
            menuEn,
            rulesTr,
            rulesEn,
            settings.GetValueOrDefault("InstagramUrl"),
            settings.GetValueOrDefault("GoogleReviewsUrl"),
            settings.GetValueOrDefault("TripAdvisorUrl")
        );
    }

    private string GetKey() => _config["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key gerekli.");
}
