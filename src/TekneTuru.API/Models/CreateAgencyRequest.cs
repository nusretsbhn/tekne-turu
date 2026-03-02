namespace TekneTuru.API.Models;

public record CreateAgencyRequest(string Name, string ContactFullName, string Phone, string? Email);
