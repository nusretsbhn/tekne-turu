namespace TekneTuru.API.Models;

public record CreateUserRequest(string Email, string Password, string FullName, string Role);
