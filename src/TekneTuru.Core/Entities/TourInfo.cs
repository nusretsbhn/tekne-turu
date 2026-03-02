namespace TekneTuru.Core.Entities;

public class TourInfo
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public TimeOnly? StartTime { get; set; }
    public TimeOnly? EndTime { get; set; }
    public int? DurationMinutes { get; set; }
    public string? DeparturePoint { get; set; }
    public string? ImageUrl { get; set; }
    public string? DepartureMapUrl { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
