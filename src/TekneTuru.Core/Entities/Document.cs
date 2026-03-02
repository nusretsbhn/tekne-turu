namespace TekneTuru.Core.Entities;

public class Document
{
    public int Id { get; set; }
    public string DocType { get; set; } = string.Empty; // menu, rules
    public string? FileUrl { get; set; }
    public string Language { get; set; } = "TR"; // TR, EN
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
