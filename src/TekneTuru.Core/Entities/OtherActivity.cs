namespace TekneTuru.Core.Entities;

public class OtherActivity
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? TripTimes { get; set; }
    public string? DeparturePoint { get; set; }
    public string? Duration { get; set; }
    public string? Description { get; set; }
    public string? Inclusions { get; set; }
    public string? Price { get; set; }
    public bool HidePrice { get; set; }
    /// <summary>JSON: [{ url, kind: image|video, isCover }]</summary>
    public string? MediaJson { get; set; }
    public int OrderIndex { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
