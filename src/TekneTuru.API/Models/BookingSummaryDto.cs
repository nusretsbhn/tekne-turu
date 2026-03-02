namespace TekneTuru.API.Models;

public record BookingSummaryDto(
    int AdultTotal,
    int AdultCheckedIn,
    int ChildTotal,
    int ChildCheckedIn,
    int BabyTotal,
    int BabyCheckedIn,
    int Total,
    int TotalCheckedIn
);
