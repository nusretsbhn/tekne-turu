namespace TekneTuru.API.Models;

/// <summary>Tanıtım sayfası fiyatları (admin ayrı alanlar + geçerlilik aralığı).</summary>
public record MarketingPricingDto(
    string? Adult,
    string? Child,
    string? Baby,
    /// <summary>yyyy-MM-dd — boşsa başlangıç sınırı yok.</summary>
    string? ValidFrom,
    /// <summary>yyyy-MM-dd — boşsa bitiş sınırı yok.</summary>
    string? ValidTo
);
