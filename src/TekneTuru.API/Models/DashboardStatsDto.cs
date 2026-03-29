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
    List<FutureDayCountDto> Next15Days,
    List<TodayCustomerDto> TodayCustomers
);

public record DayCountDto(string Date, int Total, int CheckedIn);

/// <summary>Dashboard: seçilen tarihten sonraki günler için kayıtlı kişi sayısı (tur tarihi bazlı).</summary>
public record FutureDayCountDto(string Date, int RegisteredCount);

public record TodayCustomerDto(string FullName, string? Phone, bool CheckedIn, string? AgencyName);

/// <summary>Servis listesi: her günlük rezervasyon (yolcu) için bir satır.</summary>
public record ServiceListItemDto(string FullName, string? Phone, string? Hotel, string? PickupTime, string? AgencyName);
