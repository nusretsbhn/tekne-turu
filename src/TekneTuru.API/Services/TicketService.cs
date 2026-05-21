using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SixLabors.Fonts;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Drawing.Processing;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;
using TekneTuru.API.Data;
using TekneTuru.Core.Entities;

namespace TekneTuru.API.Services;

public class TicketService
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _config;

    public TicketService(AppDbContext db, IWebHostEnvironment env, IConfiguration config)
    {
        _db = db;
        _env = env;
        _config = config;
    }

    /// <summary>Sonraki 6 haneli bilet numarasını üretir (000001, 000002, ...).</summary>
    public async Task<string> GetNextTicketNumberAsync(CancellationToken ct = default)
    {
        var maxNum = await _db.Tickets
            .AsNoTracking()
            .Select(t => t.TicketNumber)
            .ToListAsync(ct);
        var max = 0;
        foreach (var n in maxNum)
            if (int.TryParse(n, out var parsed) && parsed > max)
                max = parsed;
        return (max + 1).ToString("D6");
    }

    /// <summary>Şablon dosya yolu (API projesinde Templates/bilet.jpg).</summary>
    private string GetTemplatePath()
    {
        var path = Path.Combine(_env.ContentRootPath, "Templates", "bilet.jpg");
        return path;
    }

    private string GetTicketsDirectory() => StoragePaths.GetTicketsDirectory(_env, _config);

    private string GetLayoutPath() => Path.Combine(_env.ContentRootPath, "Templates", "ticket-layout.json");

    /// <summary>ticket-layout.json'dan konumları yükler; yoksa veya hatalıysa null.</summary>
    private Dictionary<string, (double XPercent, double YPercent)>? LoadLayout()
    {
        var path = GetLayoutPath();
        if (!File.Exists(path)) return null;
        try
        {
            var json = File.ReadAllText(path);
            var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (!root.TryGetProperty("fields", out var fields)) return null;
            var dict = new Dictionary<string, (double, double)>();
            foreach (var prop in fields.EnumerateObject())
            {
                var x = prop.Value.TryGetProperty("xPercent", out var xEl) && xEl.TryGetDouble(out var xVal) ? xVal : 0;
                var y = prop.Value.TryGetProperty("yPercent", out var yEl) && yEl.TryGetDouble(out var yVal) ? yVal : 0;
                dict[prop.Name] = (x, y);
            }
            return dict;
        }
        catch { return null; }
    }

    private static double GetFontSizePercent(string path)
    {
        if (!File.Exists(path)) return 2.8;
        try
        {
            var json = File.ReadAllText(path);
            var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("fontSizePercent", out var v) && v.TryGetDouble(out var d))
                return d;
        }
        catch { }
        return 2.8;
    }

    /// <summary>Bilet bilgilerini şablon üzerine yazar ve JPG olarak kaydeder. Web yolu döner (/uploads/tickets/...).</summary>
    public async Task<string> GenerateTicketImageAsync(Ticket ticket, CancellationToken ct = default)
    {
        var templatePath = GetTemplatePath();
        if (!File.Exists(templatePath))
            throw new FileNotFoundException("Bilet şablonu bulunamadı. Lütfen Templates/bilet.jpg dosyasını API projesine ekleyin.", templatePath);

        await using var templateStream = File.OpenRead(templatePath);
        using var image = await Image.LoadAsync<Rgba32>(templateStream, ct);
        var w = image.Width;
        var h = image.Height;

        var layout = LoadLayout();
        var layoutPath = GetLayoutPath();
        var fontSizePercent = layout != null ? GetFontSizePercent(layoutPath) : 2.8;
        var fontSize = (float)(h * fontSizePercent / 100.0);

        Font font;
        if (SystemFonts.TryGet("Arial", out var arialFamily))
            font = arialFamily.CreateFont(fontSize, FontStyle.Regular);
        else
            font = SystemFonts.Collection.Families.First().CreateFont(fontSize, FontStyle.Regular);

        var color = Color.ParseHex("#1a1a1a");
        var options = new DrawingOptions();

        int px(string key, bool x)
        {
            if (layout != null && layout.TryGetValue(key, out var p))
                return (int)((x ? w * p.XPercent : h * p.YPercent) / 100.0);
            return 0;
        }

        void Draw(string text, string fieldKey)
        {
            if (string.IsNullOrEmpty(text)) return;
            var x = px(fieldKey, true);
            var y = px(fieldKey, false);
            image.Mutate(ctx => ctx.DrawText(options, text, font, color, new SixLabors.ImageSharp.PointF(x, y)));
        }

        void DrawAt(string text, double xPercent, double yPercent)
        {
            if (string.IsNullOrEmpty(text)) return;
            var x = (int)(w * xPercent / 100.0);
            var y = (int)(h * yPercent / 100.0);
            image.Mutate(ctx => ctx.DrawText(options, text, font, color, new SixLabors.ImageSharp.PointF(x, y)));
        }

        if (layout != null)
        {
            Draw(ticket.TicketNumber, "biletNo");
            Draw(ticket.FullName, "fullName");
            Draw(ticket.Phone, "phone");
            Draw(ticket.Hotel ?? "", "hotel");
            Draw(ticket.HasService ? "Evet" : "Hayır", "servis");
            Draw(ticket.PaymentType, "paymentType");
            Draw(ticket.TourStartTime?.ToString("HH:mm") ?? "", "tourStart");
            Draw(ticket.TourEndTime?.ToString("HH:mm") ?? "", "tourEnd");
            Draw(ticket.TourDate.ToString("dd.MM.yyyy"), "tourDate");
            Draw(ticket.Note ?? "", "note");
            Draw(ticket.AdultCount.ToString(), "adultCount");
            Draw(ticket.ChildCount.ToString(), "childCount");
            Draw(ticket.BabyCount.ToString(), "babyCount");
            Draw(ticket.Status, "status");
        }
        else
        {
            DrawAt(ticket.TicketNumber, 40, 14);
            DrawAt(ticket.FullName, 8, 24);
            DrawAt(ticket.Phone, 8, 30);
            DrawAt(ticket.Hotel ?? "", 8, 36);
            DrawAt(ticket.HasService ? "Evet" : "Hayır", 8, 42);
            DrawAt(ticket.PaymentType, 8, 48);
            DrawAt(ticket.TourStartTime?.ToString("HH:mm") ?? "", 8, 54);
            DrawAt(ticket.TourEndTime?.ToString("HH:mm") ?? "", 28, 54);
            DrawAt(ticket.TourDate.ToString("dd.MM.yyyy"), 48, 54);
            DrawAt(ticket.Note ?? "", 8, 60);
            DrawAt(ticket.AdultCount.ToString(), 8, 66);
            DrawAt(ticket.ChildCount.ToString(), 18, 66);
            DrawAt(ticket.BabyCount.ToString(), 28, 66);
            DrawAt(ticket.Status, 8, 72);
        }

        var fileName = $"{ticket.TicketNumber}.jpg";
        var ticketsDir = GetTicketsDirectory();
        var fullPath = Path.Combine(ticketsDir, fileName);
        await image.SaveAsJpegAsync(fullPath, ct);
        return $"/uploads/tickets/{fileName}";
    }

    /// <summary>İndirme için dosya yolu; diskte yoksa bilet kaydından yeniden üretir.</summary>
    public async Task<(string PhysicalPath, string FileName)?> TryGetTicketFileAsync(int ticketId, bool regenerateIfMissing, CancellationToken ct = default)
    {
        var ticket = await _db.Tickets.FirstOrDefaultAsync(t => t.Id == ticketId, ct);
        if (ticket == null) return null;

        var physical = StoragePaths.ResolvePhysicalPath(ticket.FilePath, _env, _config);
        if (!string.IsNullOrEmpty(physical) && File.Exists(physical))
            return (physical, Path.GetFileName(physical));

        if (!regenerateIfMissing) return null;

        try
        {
            ticket.FilePath = await GenerateTicketImageAsync(ticket, ct);
            ticket.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
            physical = StoragePaths.ResolvePhysicalPath(ticket.FilePath, _env, _config);
            if (string.IsNullOrEmpty(physical) || !File.Exists(physical)) return null;
            return (physical, Path.GetFileName(physical));
        }
        catch
        {
            return null;
        }
    }
}
