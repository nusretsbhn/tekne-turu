using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using TekneTuru.API.Data;
using TekneTuru.Core.Entities;

namespace TekneTuru.API.Services;

public class ShortLinkService
{
    private const string Base62Chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    private const int ShortCodeLength = 6;
    private readonly AppDbContext _db;

    public ShortLinkService(AppDbContext db) => _db = db;

    /// <summary>
    /// Rezervasyon için kısa kod oluşturur ve kaydeder. Benzersiz base62 kod döner.
    /// </summary>
    public async Task<string> CreateForBookingAsync(int bookingId, CancellationToken ct = default)
    {
        var code = await GenerateUniqueShortCodeAsync(ct);
        _db.ShortLinks.Add(new ShortLink { ShortCode = code, BookingId = bookingId, CreatedAt = DateTime.UtcNow });
        await _db.SaveChangesAsync(ct);
        return code;
    }

    /// <summary>
    /// Kısa kodu çözer; booking id döner. "thanks" özel kodu için null döner (teşekkür sayfası).
    /// Tıklama kaydı ve sayacı günceller.
    /// </summary>
    public async Task<int?> ResolveAndRecordClickAsync(string shortCode, string? userAgent, string? ipAddress, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(shortCode)) return null;
        var code = shortCode.Trim();
        if (code.Equals("thanks", StringComparison.OrdinalIgnoreCase)) return null; // özel: teşekkür sayfası

        var link = await _db.ShortLinks.FirstOrDefaultAsync(s => s.ShortCode == code, ct);
        if (link == null) return null;

        link.ClickCount++;
        _db.ShortLinkClicks.Add(new ShortLinkClick
        {
            ShortLinkId = link.Id,
            ClickedAt = DateTime.UtcNow,
            UserAgent = userAgent,
            IpAddress = ipAddress
        });
        await _db.SaveChangesAsync(ct);
        return link.BookingId;
    }

    private async Task<string> GenerateUniqueShortCodeAsync(CancellationToken ct)
    {
        for (var attempt = 0; attempt < 50; attempt++)
        {
            var code = GenerateRandomBase62(ShortCodeLength);
            if (!await _db.ShortLinks.AnyAsync(s => s.ShortCode == code, ct))
                return code;
        }
        return GenerateRandomBase62(ShortCodeLength + 2); // çakışma olursa daha uzun
    }

    private static string GenerateRandomBase62(int length)
    {
        var bytes = new byte[length];
        RandomNumberGenerator.Fill(bytes);
        var result = new char[length];
        for (var i = 0; i < length; i++)
            result[i] = Base62Chars[bytes[i] % Base62Chars.Length];
        return new string(result);
    }
}
