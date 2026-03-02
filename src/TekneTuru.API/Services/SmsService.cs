using Microsoft.EntityFrameworkCore;
using TekneTuru.API.Data;
using TekneTuru.Core.Entities;

namespace TekneTuru.API.Services;

public class SmsService
{
    private readonly AppDbContext _db;
    private readonly ISmsSender _sender;

    public SmsService(AppDbContext db, ISmsSender sender)
    {
        _db = db;
        _sender = sender;
    }

    /// <summary>
    /// Şablonu yükler, placeholders'ı değiştirir ve SMS gönderir. SmsDeliveryLog kaydı oluşturulur.
    /// </summary>
    public async Task<(bool Sent, string? ResponseCode)> SendWithTemplateAsync(
        string phone,
        string templateKey,
        IReadOnlyDictionary<string, string>? replacements,
        int? customerId,
        CancellationToken ct = default)
    {
        var template = await _db.SmsTemplates
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.TemplateKey == templateKey && t.IsActive, ct);
        var content = template?.ContentTR ?? template?.ContentEN;
        if (string.IsNullOrWhiteSpace(content))
            return (false, "NO_TEMPLATE");

        var message = ReplacePlaceholders(content, replacements);
        if (string.IsNullOrWhiteSpace(message))
            return (false, "EMPTY_MESSAGE");

        var log = new SmsDeliveryLog
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            Phone = phone,
            TemplateKey = templateKey,
            MessageContent = message,
            Status = "Pending",
            CreatedAt = DateTime.UtcNow
        };
        _db.SmsDeliveryLogs.Add(log);
        await _db.SaveChangesAsync(ct);

        var (success, responseCode, bulkId, errorMessage) = await _sender.SendAsync(phone, message, ct);

        log.Status = success ? "Sent" : "Failed";
        log.SentAt = DateTime.UtcNow;
        log.NetgsmResponseCode = responseCode;
        log.NetgsmMessageId = bulkId;
        log.ErrorCode = responseCode;
        if (!success) log.ErrorMessage = errorMessage ?? responseCode;
        await _db.SaveChangesAsync(ct);

        return (success, responseCode);
    }

    /// <summary>
    /// Şablonsuz, doğrudan metin ile SMS gönderir (örn. admin toplu SMS). SmsDeliveryLog'a TemplateKey "manual" ile yazılır.
    /// </summary>
    public async Task<(bool Sent, string? ResponseCode)> SendRawAsync(string phone, string message, int? customerId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(message))
            return (false, "EMPTY_MESSAGE");

        var log = new SmsDeliveryLog
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            Phone = phone,
            TemplateKey = "manual",
            MessageContent = message.Trim(),
            Status = "Pending",
            CreatedAt = DateTime.UtcNow
        };
        _db.SmsDeliveryLogs.Add(log);
        await _db.SaveChangesAsync(ct);

        var (success, responseCode, bulkId, errorMessage) = await _sender.SendAsync(phone, message.Trim(), ct);

        log.Status = success ? "Sent" : "Failed";
        log.SentAt = DateTime.UtcNow;
        log.NetgsmResponseCode = responseCode;
        log.NetgsmMessageId = bulkId;
        log.ErrorCode = responseCode;
        if (!success) log.ErrorMessage = errorMessage ?? responseCode;
        await _db.SaveChangesAsync(ct);
        return (success, responseCode);
    }

    /// <summary>Netgsm delivery report webhook ile log durumunu günceller.</summary>
    public async Task<bool> HandleDeliveryWebhookAsync(string? netgsmMessageId, string? status, string? errorCode, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(netgsmMessageId)) return false;
        var log = await _db.SmsDeliveryLogs.FirstOrDefaultAsync(l => l.NetgsmMessageId == netgsmMessageId, ct);
        if (log == null) return false;
        log.DeliveryReportAt = DateTime.UtcNow;
        var isDelivered = string.Equals(status, "1", StringComparison.OrdinalIgnoreCase) || string.Equals(status, "Delivered", StringComparison.OrdinalIgnoreCase);
        log.Status = isDelivered ? "Delivered" : "Failed";
        if (!string.IsNullOrWhiteSpace(errorCode)) log.ErrorCode = errorCode;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    private static string ReplacePlaceholders(string text, IReadOnlyDictionary<string, string>? replacements)
    {
        if (replacements == null) return text;
        foreach (var (key, value) in replacements)
        {
            var placeholder = "{" + key + "}";
            text = text.Replace(placeholder, value ?? "");
        }
        return text;
    }
}
