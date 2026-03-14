namespace TekneTuru.API.Models;

public record CreateBookingRequest(
    DateOnly? TourDate,  // null = bugün
    List<BookingPersonDto> Persons,
    string? AgencyName,  // opsiyonel; acenta masasından doldurulur
    bool? UseShuttle,    // servis alınacak mı (acenta desk)
    string? ServicePickupTime  // servis alınış saati (örn. "09:00")
);
