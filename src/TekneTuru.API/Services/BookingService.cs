using System.Globalization;
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
        bool useShuttle = false,
        string? servicePickupTime = null,
        CancellationToken ct = default)
    {
        if (persons == null || persons.Count == 0)
            return (false, "En az bir kişi eklenmelidir.", null);

        var date = tourDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var errors = new List<string>();

        for (var i = 0; i < persons.Count; i++)
        {
            var p = persons[i];
            var err = ValidatePerson(p, i + 1, requireBirthDate: string.IsNullOrWhiteSpace(agencyName));
            if (err != null) errors.Add(err);
        }

        if (errors.Count > 0)
            return (false, string.Join(" ", errors), null);

        var isAgencyBooking = !string.IsNullOrWhiteSpace(agencyName);

        if (isAgencyBooking)
        {
            var batchNames = new HashSet<string>();
            foreach (var p in persons)
            {
                var nameNorm = NormalizeName(p.FullName);
                if (!batchNames.Add(nameNorm))
                    return (false, "Aynı kayıtta aynı ad soyad birden fazla kez eklenemez.", null);
            }

            var existingNames = await _db.DailyBookings
                .AsNoTracking()
                .Where(b => b.TourDate == date)
                .Select(b => b.Customer!.FullName)
                .ToListAsync(ct);
            var existingNameSet = new HashSet<string>(existingNames.Select(NormalizeName));

            foreach (var p in persons)
            {
                if (existingNameSet.Contains(NormalizeName(p.FullName)))
                    return (false, "Bu tur tarihi için bu ad soyad ile kayıt zaten mevcut.", null);
            }
        }
        else
        {
        // Aynı tur günü + aynı ad soyad + aynı telefon: ikinci kayıt yok (telefon boşsa bu kural uygulanmaz).
        var batchSeen = new HashSet<(string NameNorm, string PhoneNorm)>();
        foreach (var p in persons)
        {
            var phoneNorm = NormalizePhoneDigits(p.Phone);
            if (string.IsNullOrEmpty(phoneNorm)) continue;
            var nameNorm = NormalizeName(p.FullName);
            if (!batchSeen.Add((nameNorm, phoneNorm)))
                return (false, "Aynı kayıtta aynı ad soyad ve telefonla birden fazla kişi eklenemez.", null);
        }

        var existingRows = await _db.DailyBookings
            .AsNoTracking()
            .Where(b => b.TourDate == date)
            .Select(b => new { b.Customer!.FullName, b.Customer!.Phone })
            .ToListAsync(ct);
        var existingNamePhone = new HashSet<(string NameNorm, string PhoneNorm)>();
        foreach (var row in existingRows)
        {
            var pn = NormalizePhoneDigits(row.Phone);
            if (string.IsNullOrEmpty(pn)) continue;
            existingNamePhone.Add((NormalizeName(row.FullName), pn));
        }

        foreach (var p in persons)
        {
            var phoneNorm = NormalizePhoneDigits(p.Phone);
            if (string.IsNullOrEmpty(phoneNorm)) continue;
            if (existingNamePhone.Contains((NormalizeName(p.FullName), phoneNorm)))
                return (false, "Bu tur tarihi için bu ad soyad ve telefonla kayıt zaten mevcut.", null);
        }
        }

        var bookingIds = new List<int>();
        var newBookings = new List<DailyBooking>();

        foreach (var p in persons)
        {
            var idNumber = (p.IdNumber ?? "").Trim();
            Customer? customer = null;
            if (!string.IsNullOrWhiteSpace(idNumber))
            {
                customer = await _db.Customers
                    .FirstOrDefaultAsync(c => c.IdNumber == idNumber, ct);
            }

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
                AgeCategory = string.IsNullOrWhiteSpace(agencyName)
                    ? (p.AgeCategory?.Trim() ?? "Yetişkin")
                    : "Yetişkin",
                CheckedIn = false,
                AgencyName = string.IsNullOrWhiteSpace(agencyName) ? null : agencyName.Trim(),
                UseShuttle = useShuttle,
                ServicePickupTime = string.IsNullOrWhiteSpace(servicePickupTime) ? null : servicePickupTime.Trim()
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

        foreach (var b in newBookings)
        {
            if (b.Customer.SmsConsent && SmsPhoneHelper.IsTurkishMobileForSms(b.Customer.Phone))
            {
                try
                {
                    var landingUrl = await BuildLandingUrlForBookingAsync(b.Id, ct);
                    await _sms.SendWithTemplateAsync(
                        b.Customer.Phone,
                        "booking-confirmation",
                        new Dictionary<string, string>
                        {
                            ["Name"] = b.Customer.FullName ?? "",
                            ["TourDate"] = b.TourDate.ToString("dd.MM.yyyy"),
                            ["LandingUrl"] = landingUrl
                        },
                        b.Customer.Id,
                        ct);
                }
                catch
                {
                    // Rezervasyon başarılı; SMS hatası kaydı iptal etmez
                }

                if (b.UseShuttle)
                {
                    try
                    {
                        await _sms.SendWithTemplateAsync(
                            b.Customer.Phone,
                            "service-info",
                            new Dictionary<string, string>
                            {
                                ["Name"] = b.Customer.FullName ?? "",
                                ["TourDate"] = b.TourDate.ToString("dd.MM.yyyy"),
                                ["ServicePickupTime"] = b.ServicePickupTime ?? ""
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
        }

        return (true, null, bookingIds);
    }

    /// <summary>
    /// Müşteri telefonu güncellendikten sonra: tur tarihi gelmemiş, +90 cep, SMS onayı, yeni numara eskiden farklıysa
    /// booking-confirmation SMS'ini yeni numaraya gönderir (desk kaydı sonrası Admin vb. düzenlemeler için).
    /// </summary>
    public async Task TryResendBookingConfirmationAfterPhoneChangeAsync(int customerId, string? phoneBeforeUpdate, CancellationToken ct = default)
    {
        var customer = await _db.Customers.AsNoTracking().FirstOrDefaultAsync(c => c.Id == customerId, ct);
        if (customer == null) return;

        var normOld = NormalizePhoneDigits(phoneBeforeUpdate);
        var normNew = NormalizePhoneDigits(customer.Phone);
        if (string.IsNullOrEmpty(normNew) || normOld == normNew) return;
        if (!customer.SmsConsent) return;
        if (!SmsPhoneHelper.IsTurkishMobileForSms(customer.Phone)) return;

        var todayTr = GetTodayTurkeyDateOnly();
        var booking = await _db.DailyBookings
            .AsNoTracking()
            .Where(b => b.CustomerId == customerId && b.TourDate >= todayTr)
            .OrderBy(b => b.TourDate)
            .ThenBy(b => b.Id)
            .FirstOrDefaultAsync(ct);
        if (booking == null) return;

        try
        {
            await _smsConsent.CreateConsentAsync(customerId, customer.Phone!, "Approved", ct);
        }
        catch
        {
            // Zaten kayıt olabilir
        }

        try
        {
            var landingUrl = await BuildLandingUrlForBookingAsync(booking.Id, ct);
            await _sms.SendWithTemplateAsync(
                customer.Phone!,
                "booking-confirmation",
                new Dictionary<string, string>
                {
                    ["Name"] = customer.FullName ?? "",
                    ["TourDate"] = booking.TourDate.ToString("dd.MM.yyyy"),
                    ["LandingUrl"] = landingUrl
                },
                customer.Id,
                ct);
        }
        catch
        {
            // Güncelleme başarılı; SMS hatası işlemi iptal etmez
        }
    }

    private async Task<string> BuildLandingUrlForBookingAsync(int bookingId, CancellationToken ct)
    {
        var landingBaseUrl = (await _db.Settings.AsNoTracking().FirstOrDefaultAsync(s => s.Key == "LandingBaseUrl", ct))?.Value?.TrimEnd('/') ?? "http://localhost:3000";
        var shortLinkBaseUrl = (await _db.Settings.AsNoTracking().FirstOrDefaultAsync(s => s.Key == "ShortLinkBaseUrl", ct))?.Value?.TrimEnd('/');
        if (!string.IsNullOrEmpty(shortLinkBaseUrl))
        {
            var code = await _shortLink.CreateForBookingAsync(bookingId, ct);
            return $"{shortLinkBaseUrl}/t/{code}";
        }
        var token = await _landing.CreateTokenForBookingAsync(bookingId, ct);
        return string.IsNullOrEmpty(token) ? landingBaseUrl : $"{landingBaseUrl}?token={token}";
    }

    private static DateOnly GetTodayTurkeyDateOnly()
    {
        var tz = GetTurkeyTimeZone();
        var turkeyNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
        return DateOnly.FromDateTime(turkeyNow);
    }

    private static TimeZoneInfo GetTurkeyTimeZone()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("Europe/Istanbul"); }
        catch { }
        try { return TimeZoneInfo.FindSystemTimeZoneById("Turkey Standard Time"); }
        catch { }
        return TimeZoneInfo.Utc;
    }

    private static string NormalizePhoneDigits(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return "";
        var p = new string(phone.Where(char.IsDigit).ToArray());
        if (p.Length >= 10 && p.StartsWith('0')) p = p[1..];
        return p;
    }

    private static string NormalizeName(string? fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName)) return "";
        var parts = fullName.Trim().Split(new[] { ' ', '\t', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);
        var joined = string.Join(" ", parts);
        return joined.ToLower(new CultureInfo("tr-TR"));
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
                b.Customer.Phone,
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

    private static string? ValidatePerson(BookingPersonDto p, int index, bool requireBirthDate = true)
    {
        if (string.IsNullOrWhiteSpace(p.FullName) || p.FullName.Trim().Length < 3)
            return $"Kişi {index}: Ad soyad en az 3 karakter olmalıdır.";

        if (!p.KvkkConsent)
            return $"Kişi {index}: KVKK onayı zorunludur.";

        if (requireBirthDate)
        {
            if (!p.BirthDate.HasValue)
                return $"Kişi {index}: Doğum tarihi zorunludur.";
            if (DateOnly.FromDateTime(p.BirthDate.Value) > DateOnly.FromDateTime(DateTime.UtcNow))
                return $"Kişi {index}: Doğum tarihi geçmiş bir tarih olmalıdır.";
        }
        else if (p.BirthDate.HasValue && DateOnly.FromDateTime(p.BirthDate.Value) > DateOnly.FromDateTime(DateTime.UtcNow))
        {
            return $"Kişi {index}: Doğum tarihi geçmiş bir tarih olmalıdır.";
        }

        var ageCat = p.AgeCategory?.Trim() ?? "Yetişkin";
        if (ageCat is not ("Yetişkin" or "Çocuk" or "Bebek"))
            return $"Kişi {index}: Yaş kategorisi Yetişkin, Çocuk veya Bebek olmalıdır.";

        if (!string.IsNullOrWhiteSpace(p.Email) && !p.Email.Contains('@'))
            return $"Kişi {index}: Geçerli bir e-posta adresi giriniz.";

        return null;
    }
}
