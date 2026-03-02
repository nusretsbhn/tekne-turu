namespace TekneTuru.Core.Entities;

public class Customer
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string IdNumber { get; set; } = string.Empty; // TC veya Pasaport
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public DateTime? BirthDate { get; set; }
    public string Nationality { get; set; } = "TR"; // TR / Diğer
    public string? AccommodationPlace { get; set; }
    public bool KvkkConsent { get; set; }
    public bool SmsConsent { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
