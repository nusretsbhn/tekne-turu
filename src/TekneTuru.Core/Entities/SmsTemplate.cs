namespace TekneTuru.Core.Entities;

public class SmsTemplate
{
    public int Id { get; set; }
    public string TemplateKey { get; set; } = string.Empty; // welcome, thank-you
    public string? ContentTR { get; set; }
    public string? ContentEN { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
