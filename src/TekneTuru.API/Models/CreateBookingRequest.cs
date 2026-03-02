namespace TekneTuru.API.Models;

public record CreateBookingRequest(
    DateOnly? TourDate,  // null = bugün
    List<BookingPersonDto> Persons,
    string? AgencyName   // opsiyonel; acenta masasından doldurulur
);
