namespace TekneTuru.API.Models;

public record OtherActivityMediaDto(string Url, string Kind, bool IsCover);

public record OtherActivityListItemDto(
    int Id,
    string Name,
    string? TripTimes,
    string? DeparturePoint,
    string? Duration,
    string? Description,
    string? Inclusions,
    string? Price,
    bool HidePrice,
    string? MediaJson,
    int OrderIndex,
    bool IsActive
);

public record OtherActivityLandingDto(
    int Id,
    string Name,
    string? TripTimes,
    string? DeparturePoint,
    string? Duration,
    string? Description,
    string? Inclusions,
    string? Price,
    bool HidePrice,
    List<OtherActivityMediaDto> Media,
    string? CoverUrl
);

public class OtherActivityCreateDto
{
    public string? Name { get; set; }
    public string? TripTimes { get; set; }
    public string? DeparturePoint { get; set; }
    public string? Duration { get; set; }
    public string? Description { get; set; }
    public string? Inclusions { get; set; }
    public string? Price { get; set; }
    public bool? HidePrice { get; set; }
    public string? MediaJson { get; set; }
    public bool? IsActive { get; set; }
}

public class OtherActivityUpdateDto : OtherActivityCreateDto
{
    public int? OrderIndex { get; set; }
}

public record ReorderOtherActivitiesRequest(List<int> OrderedIds);
