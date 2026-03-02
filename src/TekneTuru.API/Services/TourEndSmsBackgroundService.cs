using Microsoft.EntityFrameworkCore;
using TekneTuru.API.Data;
using TekneTuru.Core.Entities;

namespace TekneTuru.API.Services;

/// <summary>
/// Her gün saat 15:00'te (Türkiye saati) o günkü tura katılan ve SMS onayı olan kişilere "tur sonu teşekkür" SMS'i gönderir.
/// </summary>
public class TourEndSmsBackgroundService : BackgroundService
{
    private readonly IServiceProvider _services;
    private static DateOnly _lastRunDate = DateOnly.MinValue;

    public TourEndSmsBackgroundService(IServiceProvider services) => _services = services;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var turkeyTz = GetTurkeyTimeZone();
                var turkeyNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, turkeyTz);
                var today = DateOnly.FromDateTime(turkeyNow);
                var isFifteen = turkeyNow.Hour == 15 && turkeyNow.Minute < 5; // 15:00–15:04 arası tetikle

                if (isFifteen && _lastRunDate != today)
                {
                    _lastRunDate = today;
                    await SendTourEndSmsForDateAsync(today, stoppingToken);
                }
            }
            catch
            {
                // Hata olsa bile servis çalışmaya devam etsin
            }

            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }

    private static TimeZoneInfo GetTurkeyTimeZone()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("Europe/Istanbul"); }
        catch { }
        try { return TimeZoneInfo.FindSystemTimeZoneById("Turkey Standard Time"); }
        catch { }
        return TimeZoneInfo.Utc; // fallback
    }

    private async Task SendTourEndSmsForDateAsync(DateOnly tourDate, CancellationToken ct)
    {
        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sms = scope.ServiceProvider.GetRequiredService<SmsService>();

        var thanksUrl = (await db.Settings.AsNoTracking().FirstOrDefaultAsync(s => s.Key == "ThanksPageUrl", ct))?.Value ?? "";

        var bookings = await db.DailyBookings
            .AsNoTracking()
            .Include(b => b.Customer)
            .Where(b => b.TourDate == tourDate)
            .ToListAsync(ct);

        foreach (var b in bookings)
        {
            var isTr = string.Equals(b.Customer.Nationality?.Trim(), "TR", StringComparison.OrdinalIgnoreCase);
            if (!isTr || !b.Customer.SmsConsent || string.IsNullOrWhiteSpace(b.Customer.Phone))
                continue;
            try
            {
                await sms.SendWithTemplateAsync(
                    b.Customer.Phone,
                    "tour-end-thanks",
                    new Dictionary<string, string>
                    {
                        ["Name"] = b.Customer.FullName ?? "",
                        ["TourDate"] = tourDate.ToString("dd.MM.yyyy"),
                        ["ThanksPageUrl"] = thanksUrl
                    },
                    b.Customer.Id,
                    ct);
            }
            catch
            {
                // Bir kişiye gönderim hatası diğerlerini engellemesin
            }
        }
    }
}
