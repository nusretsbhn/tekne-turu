namespace TekneTuru.API.Models;

public record BilgiLandingDto(
    string TourTitle,
    string? BannerUrl,
    string? BarMenuPdfUrlTr,
    string? BarMenuPdfUrlEn,
    string? GoogleReviewsUrl
);
