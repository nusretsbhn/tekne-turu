namespace TekneTuru.API.Models;

public record MarketingGalleryItemDto(string Url, string? Title);

public record MarketingLandingDto(
    string TourTitle,
    string? StartTime,
    string? EndTime,
    string? DeparturePoint,
    string? DepartureMapUrl,
    List<LandingStopDto> Stops,
    string? Services,
    string? Price,
    string? BannerUrl,
    List<MarketingGalleryItemDto> Gallery,
    string? VideoUrl,
    string? BarMenuPdfUrl,
    string? InstagramUrl,
    string? TripAdvisorUrl,
    string? GoogleReviewsUrl,
    string? LocationMapUrl,
    string? LocationMapEmbedUrl,
    string? RulesPdfUrl,
    string? ServiceLocationMapUrl,
    string? ServiceLocationMapEmbedUrl,
    string? RedbookUrl
);

