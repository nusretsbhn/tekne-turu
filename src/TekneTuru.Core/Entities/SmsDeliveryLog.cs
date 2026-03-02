namespace TekneTuru.Core.Entities;

/// <summary>Her SMS gönderiminin kaydı (İYS uyumlu log).</summary>
public class SmsDeliveryLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public int? CustomerId { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string TemplateKey { get; set; } = string.Empty;
    public string MessageContent { get; set; } = string.Empty;
    public string? NetgsmMessageId { get; set; }
    /// <summary>Netgsm anlık dönüş kodu: 00=başarılı, 30=hatalı (kesin loglanır).</summary>
    public string? NetgsmResponseCode { get; set; }
    /// <summary>Pending, Sent, Delivered, Failed</summary>
    public string Status { get; set; } = "Pending";
    public DateTime? SentAt { get; set; }
    public DateTime? DeliveryReportAt { get; set; }
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
