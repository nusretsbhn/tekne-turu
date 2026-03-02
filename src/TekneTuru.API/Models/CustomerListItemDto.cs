namespace TekneTuru.API.Models;

public record CustomerListItemDto(
    int Id,
    string FullName,
    string IdNumber,
    string? Phone,
    string? Email,
    string Nationality,
    bool KvkkConsent,
    bool SmsConsent,
    DateTime CreatedAt,
    string? AgencyName
);
