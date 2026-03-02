using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TekneTuru.API.Data;
using TekneTuru.API.Models;
using TekneTuru.Core.Entities;

namespace TekneTuru.API.Services;

public class AuthService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;

    public AuthService(AppDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    public async Task<LoginResponse?> LoginAsync(string email, string password, CancellationToken ct = default)
    {
        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == email && u.IsActive, ct);
        if (user == null) return null;

        if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
            return null;

        await _db.Users
            .Where(u => u.Id == user.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.LastLoginAt, DateTime.UtcNow), ct);

        var accessToken = GenerateAccessToken(user);
        var refreshToken = GenerateRefreshToken(user);
        var expiresAt = DateTime.UtcNow.AddMinutes(GetAccessTokenMinutes());

        return new LoginResponse(accessToken, refreshToken, expiresAt, user.FullName, user.Role);
    }

    public string GenerateAccessToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(GetJwtKey()));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };
        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims,
            expires: DateTime.UtcNow.AddMinutes(GetAccessTokenMinutes()),
            signingCredentials: creds
        );
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private string GenerateRefreshToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(GetJwtKey() + "Refresh"));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };
        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims,
            expires: DateTime.UtcNow.AddDays(GetRefreshTokenDays()),
            signingCredentials: creds
        );
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private string GetJwtKey() =>
        _config["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key yapılandırması eksik.");

    private int GetAccessTokenMinutes() => int.TryParse(_config["Jwt:AccessTokenMinutes"], out var m) ? m : 15;
    private int GetRefreshTokenDays() => int.TryParse(_config["Jwt:RefreshTokenDays"], out var d) ? d : 7;

    public static string HashPassword(string password) => BCrypt.Net.BCrypt.HashPassword(password, workFactor: 10);
}
