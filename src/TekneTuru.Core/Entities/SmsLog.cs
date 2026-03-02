namespace TekneTuru.Core.Entities;

public class SmsLog
{
    public int Id { get; set; }
    public int? CustomerId { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string TemplateKey { get; set; } = string.Empty;
    public string? MessageBody { get; set; } // Gönderilen SMS metni
    public string Status { get; set; } = string.Empty; // Sent, Failed
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
    public string? ResponseCode { get; set; }
}
