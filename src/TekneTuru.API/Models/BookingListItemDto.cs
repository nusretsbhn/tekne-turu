namespace TekneTuru.API.Models;

public record BookingListItemDto(
    int Id,
    int CustomerId,
    string FullName,
    string IdNumber,
    DateTime? BirthDate,
    string AgeCategory,
    bool CheckedIn,
    DateTime? CheckedInAt
);
