namespace TekneTuru.Core.Entities;

public class PreReservation
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? HotelName { get; set; }
    public int AdultCount { get; set; }
    public int ChildCount { get; set; }
    public int BabyCount { get; set; }
    public DateOnly TourDate { get; set; }
    public bool UseShuttle { get; set; }
    /// <summary>
    /// Yeni | Satış Yapıldı | İptal
    /// </summary>
    public string Status { get; set; } = "Yeni";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public string? Notes { get; set; }
}

