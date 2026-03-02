namespace TekneTuru.API.Models;

public record TourUpdateDto(
    string? Title,
    string? Description,
    string? StartTime,
    string? EndTime,
    double? DurationHours,
    int? DurationMinutes,
    string? DeparturePoint,
    string? ImageUrl);
