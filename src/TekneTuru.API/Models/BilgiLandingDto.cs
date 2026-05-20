namespace TekneTuru.API.Models;

public record BilgiLandingDto(
    string TourTitle,
    string? TourImageUrl,
    string? BarMenuPdfUrlTr,
    string? BarMenuPdfUrlEn,
    string? GoogleReviewsUrl
);
