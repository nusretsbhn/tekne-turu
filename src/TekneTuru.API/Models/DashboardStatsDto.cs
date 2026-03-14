namespace TekneTuru.API.Models;

public record DashboardStatsDto(
    int TotalRegistered,
    int TotalCheckedIn,
    int AdultTotal,
    int AdultCheckedIn,
    int ChildTotal,
    int ChildCheckedIn,
    int BabyTotal,
    int BabyCheckedIn,
    List<DayCountDto> Last7Days,
    List<TodayCustomerDto> TodayCustomers
);

public record DayCountDto(string Date, int Total, int CheckedIn);

public record TodayCustomerDto(string FullName, string? Phone, bool CheckedIn, string? AgencyName);

public record ServiceListItemDto(string FullName, string? Phone, string? Hotel, int PersonCount, string? PickupTime);
