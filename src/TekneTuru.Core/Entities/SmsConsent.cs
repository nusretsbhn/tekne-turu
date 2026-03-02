namespace TekneTuru.Core.Entities;

/// <summary>Müşterinin SMS izni ve İYS bildirim sürecini takip eder.</summary>
public class SmsConsent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public int CustomerId { get; set; }
    public string Phone { get; set; } = string.Empty;
    /// <summary>Approved, Rejected, Withdrawn</summary>
    public string ConsentStatus { get; set; } = "Approved";
    public DateTime ConsentDate { get; set; } = DateTime.UtcNow;
    public string ConsentChannel { get; set; } = "WEB";
    public DateTime? IysSentAt { get; set; }
    /// <summary>Netgsm İYS submitid (izin paketi ID - teslimat sorgusu için).</summary>
    public string? IysSubmitId { get; set; }
    public string? IysResponseCode { get; set; }
    public string? IysResponseMessage { get; set; }
    /// <summary>Pending, Sent, Failed</summary>
    public string IysStatus { get; set; } = "Pending";
    public DateTime? WebhookReceivedAt { get; set; }
    public string? WebhookStatus { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    /// <summary>İYS bildirim deneme sayısı (max 3).</summary>
    public int IysRetryCount { get; set; }
    public DateTime? IysLastAttemptAt { get; set; }
}
