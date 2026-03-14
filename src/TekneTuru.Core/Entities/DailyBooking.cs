namespace TekneTuru.Core.Entities;

public class DailyBooking
{
    public int Id { get; set; }
    public DateOnly TourDate { get; set; }
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public string AgeCategory { get; set; } = "Yetişkin"; // Yetişkin, Çocuk, Bebek
    public bool CheckedIn { get; set; }
    public DateTime? CheckedInAt { get; set; }
    public string? AgencyName { get; set; }
    public bool UseShuttle { get; set; }
    public string? ServicePickupTime { get; set; }
}
