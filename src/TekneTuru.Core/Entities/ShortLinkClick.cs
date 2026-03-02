namespace TekneTuru.Core.Entities;

public class ShortLinkClick
{
    public int Id { get; set; }
    public int ShortLinkId { get; set; }
    public DateTime ClickedAt { get; set; } = DateTime.UtcNow;
    public string? UserAgent { get; set; }
    public string? IpAddress { get; set; }
}
