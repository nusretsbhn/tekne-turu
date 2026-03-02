namespace TekneTuru.Core.Entities;

public class Stop
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public int OrderIndex { get; set; }
    public bool IsActive { get; set; } = true;
}
