namespace TekneTuru.API.Models;

public record LandingDataDto(
    string CustomerName,
    LandingTourDto? Tour,
    List<LandingStopDto> Stops,
    string? MenuPdfTr,
    string? MenuPdfEn,
    string? RulesPdfTr,
    string? RulesPdfEn,
    string? InstagramUrl,
    string? GoogleReviewsUrl,
    string? TripAdvisorUrl
);

public record LandingTourDto(
    string Title,
    string? Description,
    string? StartTime,
    string? EndTime,
    int? DurationMinutes,
    string? DeparturePoint,
    string? ImageUrl
);

public record LandingStopDto(string Name, string? Description, string? ImageUrl);
