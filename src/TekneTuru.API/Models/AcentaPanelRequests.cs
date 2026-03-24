namespace TekneTuru.API.Models;

public record AcentaChangePasswordRequest(string CurrentPassword, string NewPassword, string ConfirmNewPassword);

public record AcentaUpdatePassengerRequest(
    DateOnly TourDate,
    string FullName,
    string IdNumber,
    string Nationality,
    DateTime? BirthDate,
    string AgeCategory,
    string? Phone,
    string? Email,
    string? AccommodationPlace,
    bool KvkkConsent,
    bool SmsConsent,
    bool UseShuttle
);
