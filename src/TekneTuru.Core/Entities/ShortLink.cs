namespace TekneTuru.Core.Entities;

public class ShortLink
{
    public int Id { get; set; }
    public string ShortCode { get; set; } = string.Empty; // base62, unique
    public int BookingId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int ClickCount { get; set; }
}
