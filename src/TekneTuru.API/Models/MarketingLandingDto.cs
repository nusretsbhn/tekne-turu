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
    string? ServicesEn,
    string? ServicesNote,
    string? ServicesNoteEn,
    /// <summary>Eski tek alan; yeni <see cref="Pricing"/> doluysa boş döner.</summary>
    string? Price,
    MarketingPricingDto? Pricing,
    string? BannerUrl,
    List<MarketingGalleryItemDto> Gallery,
    string? VideoUrl,
    string? BarMenuPdfUrl,
    string? BarMenuPdfUrlEn,
    string? InstagramUrl,
    string? TripAdvisorUrl,
    string? YoutubeUrl,
    string? GoogleReviewsUrl,
    string? LocationMapUrl,
    string? LocationMapEmbedUrl,
    string? RulesPdfUrl,
    string? RulesPdfUrlEn,
    string? ServiceLocationMapUrl,
    string? ServiceLocationMapEmbedUrl,
    string? RedbookUrl,
    string? CompanyName,
    string? CompanyIban,
    List<OtherActivityLandingDto> OtherActivities,
    string? MarketingWhatsAppPhone
);

