using Microsoft.EntityFrameworkCore;
using TekneTuru.API.Data;
using TekneTuru.API.Models;
using TekneTuru.Core.Entities;

namespace TekneTuru.API.Services;

public class BookingService
{
    private readonly AppDbContext _db;
    private readonly SmsService _sms;
    private readonly SmsConsentService _smsConsent;
    private readonly LandingService _landing;
    private readonly ShortLinkService _shortLink;

    public BookingService(AppDbContext db, SmsService sms, SmsConsentService smsConsent, LandingService landing, ShortLinkService shortLink)
    {
        _db = db;
        _sms = sms;
        _smsConsent = smsConsent;
        _landing = landing;
        _shortLink = shortLink;
    }

    public async Task<(bool Success, string? Error, List<int>? BookingIds)> CreateBookingAsync(
        DateOnly? tourDate,
        List<BookingPersonDto> persons,
        string? agencyName,
        CancellationToken ct = default)
    {
        if (persons == null || persons.Count == 0)
            return (false, "En az bir kişi eklenmelidir.", null);

        var date = tourDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var errors = new List<string>();

        for (var i = 0; i < persons.Count; i++)
        {
            var p = persons[i];
            var err = ValidatePerson(p, i + 1);
            if (err != null) errors.Add(err);
        }

        if (errors.Count > 0)
            return (false, string.Join(" ", errors), null);

        var bookingIds = new List<int>();
        var newBookings = new List<DailyBooking>();

        foreach (var p in persons)
        {
            var idNumber = p.IdNumber.Trim();
            var customer = await _db.Customers
                .FirstOrDefaultAsync(c => c.IdNumber == idNumber, ct);

            if (customer == null)
            {
                customer = new Customer
                {
                    FullName = p.FullName.Trim(),
                    IdNumber = idNumber,
                    Nationality = p.Nationality?.Trim() ?? "TR",
                    BirthDate = p.BirthDate.HasValue ? DateTime.SpecifyKind(p.BirthDate.Value, DateTimeKind.Utc) : null,
                    Phone = string.IsNullOrWhiteSpace(p.Phone) ? null : p.Phone.Trim(),
                    Email = string.IsNullOrWhiteSpace(p.Email) ? null : p.Email.Trim(),
                    AccommodationPlace = string.IsNullOrWhiteSpace(p.AccommodationPlace) ? null : p.AccommodationPlace.Trim(),
                    KvkkConsent = p.KvkkConsent,
                    SmsConsent = p.SmsConsent,
                    CreatedAt = DateTime.UtcNow
                };
                _db.Customers.Add(customer);
            }
            else
            {
                if (!string.IsNullOrWhiteSpace(p.FullName)) customer.FullName = p.FullName.Trim();
                if (p.Nationality != null) customer.Nationality = p.Nationality.Trim();
                if (p.BirthDate.HasValue) customer.BirthDate = DateTime.SpecifyKind(p.BirthDate.Value, DateTimeKind.Utc);
                if (!string.IsNullOrWhiteSpace(p.Phone)) customer.Phone = p.Phone.Trim();
                if (!string.IsNullOrWhiteSpace(p.Email)) customer.Email = p.Email.Trim();
                if (p.AccommodationPlace != null) customer.AccommodationPlace = string.IsNullOrWhiteSpace(p.AccommodationPlace) ? null : p.AccommodationPlace.Trim();
                customer.KvkkConsent = p.KvkkConsent;
                customer.SmsConsent = p.SmsConsent;
            }

            var booking = new DailyBooking
            {
                TourDate = date,
                Customer = customer,
                AgeCategory = p.AgeCategory?.Trim() ?? "Yetişkin",
                CheckedIn = false,
                AgencyName = string.IsNullOrWhiteSpace(agencyName) ? null : agencyName.Trim()
            };
            _db.DailyBookings.Add(booking);
            newBookings.Add(booking);
        }
        await _db.SaveChangesAsync(ct);
        bookingIds.AddRange(newBookings.Select(b => b.Id));

        foreach (var b in newBookings.Where(b => b.Customer.SmsConsent && !string.IsNullOrWhiteSpace(b.Customer.Phone)))
        {
            try
            {
                await _smsConsent.CreateConsentAsync(b.Customer.Id, b.Customer.Phone!, "Approved", ct);
            }
            catch
            {
                // Aynı müşteri için zaten kayıt olabilir; devam et
            }
        }

        var landingBaseUrl = (await _db.Settings.AsNoTracking().FirstOrDefaultAsync(s => s.Key == "LandingBaseUrl", ct))?.Value?.TrimEnd('/') ?? "http://localhost:3000";
        var shortLinkBaseUrl = (await _db.Settings.AsNoTracking().FirstOrDefaultAsync(s => s.Key == "ShortLinkBaseUrl", ct))?.Value?.TrimEnd('/');
        foreach (var b in newBookings)
        {
            var isTr = string.Equals(b.Customer.Nationality?.Trim(), "TR", StringComparison.OrdinalIgnoreCase);
            if (isTr && b.Customer.SmsConsent && !string.IsNullOrWhiteSpace(b.Customer.Phone))
            {
                try
                {
                    string landingUrl;
                    if (!string.IsNullOrEmpty(shortLinkBaseUrl))
                    {
                        var code = await _shortLink.CreateForBookingAsync(b.Id, ct);
                        landingUrl = $"{shortLinkBaseUrl}/t/{code}";
                    }
                    else
                    {
                        var token = await _landing.CreateTokenForBookingAsync(b.Id, ct);
                        landingUrl = string.IsNullOrEmpty(token) ? landingBaseUrl : $"{landingBaseUrl}?token={token}";
                    }
                    await _sms.SendWithTemplateAsync(
                        b.Customer.Phone,
                        "booking-confirmation",
                        new Dictionary<string, string>
                        {
                            ["Name"] = b.Customer.FullName ?? "",
                            ["TourDate"] = date.ToString("dd.MM.yyyy"),
                            ["LandingUrl"] = landingUrl
                        },
                        b.Customer.Id,
                        ct);
                }
                catch
                {
                    // Rezervasyon başarılı; SMS hatası kaydı iptal etmez
                }
            }
        }

        return (true, null, bookingIds);
    }

    public async Task<(List<BookingListItemDto> List, BookingSummaryDto Summary)> GetBookingsForDateAsync(
        DateOnly date,
        string? search,
        CancellationToken ct = default)
    {
        var query = _db.DailyBookings
            .AsNoTracking()
            .Include(b => b.Customer)
            .Where(b => b.TourDate == date && b.Customer != null);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(b =>
                (b.Customer!.FullName != null && b.Customer.FullName.ToLower().Contains(term)) ||
                (b.Customer.IdNumber != null && b.Customer.IdNumber.ToLower().Contains(term)));
        }

        var items = await query
            .OrderBy(b => b.CheckedIn)
            .ThenBy(b => b.Id)
            .Select(b => new BookingListItemDto(
                b.Id,
                b.CustomerId,
                b.Customer!.FullName ?? "",
                b.Customer.IdNumber ?? "",
                b.Customer.BirthDate,
                b.AgeCategory,
                b.CheckedIn,
                b.CheckedInAt
            ))
            .ToListAsync(ct);

        var adult = items.Where(x => x.AgeCategory == "Yetişkin").ToList();
        var child = items.Where(x => x.AgeCategory == "Çocuk").ToList();
        var baby = items.Where(x => x.AgeCategory == "Bebek").ToList();
        var summary = new BookingSummaryDto(
            adult.Count, adult.Count(x => x.CheckedIn),
            child.Count, child.Count(x => x.CheckedIn),
            baby.Count, baby.Count(x => x.CheckedIn),
            items.Count, items.Count(x => x.CheckedIn)
        );
        return (items, summary);
    }

    public async Task<bool> SetCheckInAsync(int bookingId, bool checkedIn, CancellationToken ct = default)
    {
        var booking = await _db.DailyBookings.FindAsync(new object[] { bookingId }, ct);
        if (booking == null) return false;
        booking.CheckedIn = checkedIn;
        booking.CheckedInAt = checkedIn ? DateTime.UtcNow : null;
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<int> SetCheckInBulkAsync(IEnumerable<int> ids, bool checkedIn, CancellationToken ct = default)
    {
        var idList = ids.ToList();
        if (idList.Count == 0) return 0;
        var now = checkedIn ? DateTime.UtcNow : (DateTime?)null;
        await _db.DailyBookings
            .Where(b => idList.Contains(b.Id))
            .ExecuteUpdateAsync(s => s
                .SetProperty(b => b.CheckedIn, checkedIn)
                .SetProperty(b => b.CheckedInAt, now), ct);
        return idList.Count;
    }

    private static string? ValidatePerson(BookingPersonDto p, int index)
    {
        if (string.IsNullOrWhiteSpace(p.FullName) || p.FullName.Trim().Length < 3)
            return $"Kişi {index}: Ad soyad en az 3 karakter olmalıdır.";

        if (!p.KvkkConsent)
            return $"Kişi {index}: KVKK onayı zorunludur.";

        var nationality = p.Nationality?.Trim() ?? "TR";
        if (nationality == "TR")
        {
            if (string.IsNullOrWhiteSpace(p.IdNumber) || p.IdNumber.Length != 11 || !p.IdNumber.All(char.IsDigit))
                return $"Kişi {index}: TC kimlik numarası 11 haneli rakam olmalıdır.";
        }
        else
        {
            if (string.IsNullOrWhiteSpace(p.IdNumber))
                return $"Kişi {index}: Pasaport numarası giriniz.";
            if (p.IdNumber.Length > 50)
                return $"Kişi {index}: Pasaport numarası çok uzun.";
        }

        if (!p.BirthDate.HasValue)
            return $"Kişi {index}: Doğum tarihi zorunludur.";
        if (DateOnly.FromDateTime(p.BirthDate.Value) > DateOnly.FromDateTime(DateTime.UtcNow))
            return $"Kişi {index}: Doğum tarihi geçmiş bir tarih olmalıdır.";

        var ageCat = p.AgeCategory?.Trim() ?? "Yetişkin";
        if (ageCat is not ("Yetişkin" or "Çocuk" or "Bebek"))
            return $"Kişi {index}: Yaş kategorisi Yetişkin, Çocuk veya Bebek olmalıdır.";

        if (!string.IsNullOrWhiteSpace(p.Email) && !p.Email.Contains('@'))
            return $"Kişi {index}: Geçerli bir e-posta adresi giriniz.";

        return null;
    }
}
