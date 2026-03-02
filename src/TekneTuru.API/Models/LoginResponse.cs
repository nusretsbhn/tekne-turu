namespace TekneTuru.API.Models;

public record LoginResponse(string AccessToken, string RefreshToken, DateTime ExpiresAt, string FullName, string Role);
