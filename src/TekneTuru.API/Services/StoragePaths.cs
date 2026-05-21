namespace TekneTuru.API.Services;

/// <summary>Upload ve bilet dosyaları için fiziksel kök yolları (UPLOADS_PATH ile uyumlu).</summary>
public static class StoragePaths
{
    public static string GetUploadsRoot(IWebHostEnvironment env, IConfiguration config)
    {
        var setting = config["Storage:UploadsPath"];
        var envVar = Environment.GetEnvironmentVariable("UPLOADS_PATH");
        var raw = !string.IsNullOrWhiteSpace(setting) ? setting : envVar;
        if (string.IsNullOrWhiteSpace(raw))
            return Path.Combine(env.ContentRootPath, "wwwroot", "uploads");
        return Path.IsPathRooted(raw)
            ? raw
            : Path.Combine(env.ContentRootPath, raw);
    }

    public static string GetTicketsDirectory(IWebHostEnvironment env, IConfiguration config)
    {
        var setting = config["Storage:TicketsPath"];
        var envVar = Environment.GetEnvironmentVariable("TICKETS_PATH");
        var raw = !string.IsNullOrWhiteSpace(setting) ? setting : envVar;
        string dir;
        if (!string.IsNullOrWhiteSpace(raw))
            dir = Path.IsPathRooted(raw) ? raw : Path.Combine(env.ContentRootPath, raw);
        else
            dir = Path.Combine(GetUploadsRoot(env, config), "tickets");
        Directory.CreateDirectory(dir);
        return dir;
    }

    /// <summary>Veritabanındaki web yolu → diskteki tam yol (eski /tickets/ ve yeni /uploads/tickets/ desteklenir).</summary>
    public static string? ResolvePhysicalPath(string? filePath, IWebHostEnvironment env, IConfiguration config)
    {
        if (string.IsNullOrWhiteSpace(filePath)) return null;
        var trimmed = filePath.Trim().TrimStart('/');

        if (trimmed.StartsWith("uploads/", StringComparison.OrdinalIgnoreCase))
            return Path.Combine(GetUploadsRoot(env, config), trimmed["uploads/".Length..]);

        if (trimmed.StartsWith("tickets/", StringComparison.OrdinalIgnoreCase))
        {
            var fileName = trimmed["tickets/".Length..];
            var inPersistent = Path.Combine(GetTicketsDirectory(env, config), fileName);
            if (File.Exists(inPersistent)) return inPersistent;
            var legacy = Path.Combine(env.ContentRootPath, "wwwroot", "tickets", fileName);
            if (File.Exists(legacy)) return legacy;
            return inPersistent;
        }

        return Path.Combine(env.ContentRootPath, "wwwroot", trimmed);
    }
}
