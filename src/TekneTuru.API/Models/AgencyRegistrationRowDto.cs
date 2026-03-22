namespace TekneTuru.API.Models;

/// <summary>Acenta üzerinden yapılan desk kayıtları — bir satır = bir kişi (DailyBooking).</summary>
public record AgencyRegistrationRowDto(
    string FullName,
    string IdNumber,
    string? Phone,
    string TourDate,
    int PersonCount,
    string RegistrationDate
);
