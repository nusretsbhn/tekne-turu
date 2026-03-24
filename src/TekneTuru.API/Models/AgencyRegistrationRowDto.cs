namespace TekneTuru.API.Models;

/// <summary>Acenta üzerinden yapılan desk kayıtları — bir satır = bir kişi (DailyBooking).</summary>
public record AgencyRegistrationRowDto(
    string TourDate,
    string FullName,
    string? Phone,
    int PersonCount,
    string? Hotel,
    bool UseShuttle,
    string RegistrationDate
);
