using Microsoft.EntityFrameworkCore;
using TekneTuru.API.Data;
using TekneTuru.Core.Entities;

namespace TekneTuru.API.Services;

/// <summary>Müşteri SMS onay kaydı, İYS bildirimi ve webhook işlemleri.</summary>
public class SmsConsentService
{
    private readonly AppDbContext _db;

    public SmsConsentService(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>Müşteri onay kaydı oluşturur (kayıt/check-in sırasında SmsConsent=true ise).</summary>
    public async Task<SmsConsent> CreateConsentAsync(int customerId, string phone, string consentStatus = "Approved", CancellationToken ct = default)
    {
        var consent = new SmsConsent
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            Phone = NormalizePhone(phone),
            ConsentStatus = consentStatus,
            ConsentDate = DateTime.UtcNow,
            ConsentChannel = "WEB",
            IysStatus = "Pending",
            CreatedAt = DateTime.UtcNow
        };
        _db.SmsConsents.Add(consent);
        await _db.SaveChangesAsync(ct);
        return consent;
    }

    /// <summary>Netgsm'e İYS bildirimi gönderir (stub: gerçek entegrasyonda Netgsm İYS API çağrılır).</summary>
    public async Task SendIysToNetgsmAsync(Guid consentId, CancellationToken ct = default)
    {
        var consent = await _db.SmsConsents.FirstOrDefaultAsync(c => c.Id == consentId, ct);
        if (consent == null) return;
        consent.IysRetryCount++;
        consent.IysLastAttemptAt = DateTime.UtcNow;
        try
        {
            // TODO: Netgsm İYS API çağrısı; dönüşte submitid, resultstatus, errcode, errmsg loglanacak. Şimdilik stub.
            consent.IysSentAt = DateTime.UtcNow;
            consent.IysSubmitId = "STUB_SUBMITID";
            consent.IysResponseCode = null;
            consent.IysResponseMessage = null;
            consent.IysStatus = "Sent";
        }
        catch (Exception ex)
        {
            consent.IysSentAt = DateTime.UtcNow;
            consent.IysResponseCode = "ERR";
            consent.IysResponseMessage = ex.Message;
            consent.IysStatus = "Failed";
        }
        await _db.SaveChangesAsync(ct);
    }

    /// <summary>İYS webhook ile gelen sonucu günceller.</summary>
    public async Task<bool> HandleIysWebhookAsync(Guid? consentId, string? phone, string? webhookStatus, CancellationToken ct = default)
    {
        SmsConsent? consent = null;
        if (consentId.HasValue)
            consent = await _db.SmsConsents.FirstOrDefaultAsync(c => c.Id == consentId.Value, ct);
        if (consent == null && !string.IsNullOrWhiteSpace(phone))
            consent = await _db.SmsConsents.OrderByDescending(c => c.CreatedAt).FirstOrDefaultAsync(c => c.Phone == phone, ct);
        if (consent == null) return false;
        consent.WebhookReceivedAt = DateTime.UtcNow;
        consent.WebhookStatus = webhookStatus;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    /// <summary>IysStatus=Pending, retry &lt; maxRetries ve son deneme 5 dk önce olan kayıtları döner.</summary>
    public async Task<List<SmsConsent>> GetPendingIysConsentsAsync(int maxRetries = 3, CancellationToken ct = default)
    {
        var fiveMinutesAgo = DateTime.UtcNow.AddMinutes(-5);
        return await _db.SmsConsents
            .Where(c => c.IysStatus == "Pending" && c.IysRetryCount < maxRetries && (c.IysLastAttemptAt == null || c.IysLastAttemptAt < fiveMinutesAgo))
            .OrderBy(c => c.CreatedAt)
            .Take(50)
            .ToListAsync(ct);
    }

    private static string NormalizePhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return "";
        var p = new string(phone.Where(char.IsDigit).ToArray());
        if (p.Length >= 10 && p.StartsWith("0")) p = p[1..];
        return p;
    }
}
