namespace TekneTuru.API.Models;

public record BookingPersonDto(
    string FullName,
    string IdNumber,
    string Nationality,      // TR | Diğer
    DateTime? BirthDate,
    string AgeCategory,      // Yetişkin | Çocuk | Bebek
    string? Phone,
    string? Email,
    string? AccommodationPlace,
    bool KvkkConsent,
    bool SmsConsent
);
