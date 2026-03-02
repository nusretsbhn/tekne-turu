namespace TekneTuru.API.Models;

public record StopUpdateDto(string? Name, string? Description, string? ImageUrl, bool? IsActive, int? OrderIndex);
