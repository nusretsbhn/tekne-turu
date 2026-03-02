namespace TekneTuru.API.Models;

public record UpdateCustomerRequest(
    string FullName,
    string IdNumber,
    string? Phone,
    string? Email,
    DateTime? BirthDate,
    string Nationality,
    string? AccommodationPlace,
    bool KvkkConsent,
    bool SmsConsent
);
