namespace TekneTuru.Core.Entities;

/// <summary>
/// Kesilen bilet kaydı. Görsel dosya yolu ile birlikte saklanır.
/// </summary>
public class Ticket
{
    public int Id { get; set; }
    /// <summary>6 haneli bilet numarası (000001, 000002, ...)</summary>
    public string TicketNumber { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public DateOnly TourDate { get; set; }
    public int AdultCount { get; set; }
    public int ChildCount { get; set; }
    public int BabyCount { get; set; }
    public string? Hotel { get; set; }
    public TimeOnly? TourStartTime { get; set; }
    public TimeOnly? TourEndTime { get; set; }
    public string? Note { get; set; }
    public bool HasService { get; set; }
    /// <summary>ToPay | FullPaid | Free</summary>
    public string PaymentType { get; set; } = "ToPay";
    /// <summary>Aktif | İptal</summary>
    public string Status { get; set; } = "Aktif";
    /// <summary>Oluşturulan JPG dosya yolu (örn. /tickets/000001.jpg)</summary>
    public string? FilePath { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
