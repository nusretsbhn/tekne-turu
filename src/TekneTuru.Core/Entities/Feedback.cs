namespace TekneTuru.Core.Entities;

public class Feedback
{
    public int Id { get; set; }
    /// <summary>Dilek, İstek, Şikayet</summary>
    public string Type { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public int? CustomerId { get; set; }
    public int? BookingId { get; set; }
    /// <summary>Yeni, İşleme alındı</summary>
    public string Status { get; set; } = "Yeni";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
}
