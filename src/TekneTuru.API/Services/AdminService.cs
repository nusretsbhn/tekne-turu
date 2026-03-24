using Microsoft.EntityFrameworkCore;
using TekneTuru.API.Data;
using TekneTuru.API.Models;
using TekneTuru.Core.Entities;
using CustomerEntity = TekneTuru.Core.Entities.Customer;

namespace TekneTuru.API.Services;

public class AdminService
{
    private readonly AppDbContext _db;

    public AdminService(AppDbContext db) => _db = db;

    public async Task<DashboardStatsDto> GetDashboardStatsAsync(DateOnly date, CancellationToken ct = default)
    {
        var dayBookings = await _db.DailyBookings
            .AsNoTracking()
            .Include(b => b.Customer)
            .Where(b => b.TourDate == date)
            .ToListAsync(ct);

        var adult = dayBookings.Where(b => b.AgeCategory == "Yetişkin").ToList();
        var child = dayBookings.Where(b => b.AgeCategory == "Çocuk").ToList();
        var baby = dayBookings.Where(b => b.AgeCategory == "Bebek").ToList();

        var last7 = new List<DayCountDto>();
        for (var i = 6; i >= 0; i--)
        {
            var d = date.AddDays(-i);
            var total = await _db.DailyBookings.AsNoTracking().CountAsync(b => b.TourDate == d, ct);
            var checkedIn = await _db.DailyBookings.AsNoTracking().CountAsync(b => b.TourDate == d && b.CheckedIn, ct);
            last7.Add(new DayCountDto(d.ToString("yyyy-MM-dd"), total, checkedIn));
        }

        var next15 = new List<FutureDayCountDto>();
        for (var i = 1; i <= 15; i++)
        {
            var d = date.AddDays(i);
            var registered = await _db.DailyBookings.AsNoTracking().CountAsync(b => b.TourDate == d, ct);
            next15.Add(new FutureDayCountDto(d.ToString("yyyy-MM-dd"), registered));
        }

        var todayCustomers = dayBookings
            .GroupBy(b => b.CustomerId)
            .Select(g => g.OrderBy(b => b.Id).First())
            .OrderBy(b => b.Id)
            .Select(b => new TodayCustomerDto(
                b.Customer?.FullName ?? "",
                b.Customer?.Phone,
                b.CheckedIn,
                b.AgencyName
            ))
            .ToList();

        return new DashboardStatsDto(
            dayBookings.Count,
            dayBookings.Count(b => b.CheckedIn),
            adult.Count,
            adult.Count(b => b.CheckedIn),
            child.Count,
            child.Count(b => b.CheckedIn),
            baby.Count,
            baby.Count(b => b.CheckedIn),
            last7,
            next15,
            todayCustomers
        );
    }

    /// <summary>
    /// Müşteri listesi için tarih / acenta / metin filtreleriyle aynı mantığı kullanır (sayım ve sayfalama).
    /// </summary>
    private async Task<IQueryable<CustomerEntity>> GetFilteredCustomersQueryAsync(
        DateOnly? dateFrom,
        DateOnly? dateTo,
        string? search,
        string? agencyName,
        CancellationToken ct)
    {
        var query = _db.Customers.AsNoTracking();
        if (dateFrom.HasValue || dateTo.HasValue || !string.IsNullOrWhiteSpace(agencyName))
        {
            var bookingQuery = _db.DailyBookings.AsNoTracking()
                .Where(b => (!dateFrom.HasValue || b.TourDate >= dateFrom) && (!dateTo.HasValue || b.TourDate <= dateTo));
            if (!string.IsNullOrWhiteSpace(agencyName))
            {
                var agency = agencyName.Trim();
                bookingQuery = bookingQuery.Where(b => b.AgencyName != null && b.AgencyName.Trim() == agency);
            }
            var ids = await bookingQuery.Select(b => b.CustomerId).Distinct().ToListAsync(ct);
            if (ids.Count == 0)
                return query.Where(c => false);
            query = query.Where(c => ids.Contains(c.Id));
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(c =>
                (c.FullName != null && c.FullName.ToLower().Contains(term)) ||
                (c.IdNumber != null && c.IdNumber.ToLower().Contains(term)) ||
                (c.Phone != null && c.Phone.Contains(term)) ||
                (c.Email != null && c.Email.ToLower().Contains(term)));
        }
        return query;
    }

    public async Task<int> GetCustomersCountAsync(
        DateOnly? dateFrom,
        DateOnly? dateTo,
        string? search,
        string? agencyName,
        CancellationToken ct = default)
    {
        var query = await GetFilteredCustomersQueryAsync(dateFrom, dateTo, search, agencyName, ct);
        return await query.CountAsync(ct);
    }

    public async Task<List<CustomerListItemDto>> GetCustomersAsync(
        DateOnly? dateFrom,
        DateOnly? dateTo,
        string? search,
        string? agencyName,
        int limit,
        int offset,
        CancellationToken ct = default)
    {
        var query = await GetFilteredCustomersQueryAsync(dateFrom, dateTo, search, agencyName, ct);
        var list = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip(offset)
            .Take(limit)
            .ToListAsync(ct);

        if (list.Count == 0)
            return new List<CustomerListItemDto>();

        var customerIds = list.Select(c => c.Id).ToList();
        var dateFromVal = dateFrom ?? DateOnly.MinValue;
        var dateToVal = dateTo ?? DateOnly.MaxValue;

        var bookingsInRange = await _db.DailyBookings
            .AsNoTracking()
            .Where(b => customerIds.Contains(b.CustomerId) && b.TourDate >= dateFromVal && b.TourDate <= dateToVal)
            .OrderBy(b => b.Id)
            .Select(b => new { b.CustomerId, b.AgencyName, b.TourDate })
            .ToListAsync(ct);

        var firstAgencyByCustomer = bookingsInRange
            .GroupBy(x => x.CustomerId)
            .ToDictionary(g => g.Key, g => g.First().AgencyName);

        var firstTourDateByCustomer = bookingsInRange
            .GroupBy(x => x.CustomerId)
            .ToDictionary(g => g.Key, g => g.Min(b => b.TourDate));

        return list.Select(c =>
        {
            // Kayıt tarihi olarak, filtre aralığındaki ilk tur tarihini baz al;
            // yoksa müşteri oluşturulma tarihine geri dön.
            var created = firstTourDateByCustomer.TryGetValue(c.Id, out var td)
                ? td.ToDateTime(TimeOnly.MinValue)
                : c.CreatedAt;

            return new CustomerListItemDto(
                c.Id,
                c.FullName,
                c.IdNumber,
                c.Phone,
                c.Email,
                c.Nationality,
                c.KvkkConsent,
                c.SmsConsent,
                created,
                firstAgencyByCustomer.GetValueOrDefault(c.Id));
        }).ToList();
    }

    public async Task<List<CoastGuardRowDto>> GetCoastGuardListAsync(DateOnly date, int maxCount, CancellationToken ct = default)
    {
        var list = await _db.DailyBookings
            .AsNoTracking()
            .Include(b => b.Customer)
            .Where(b => b.TourDate == date)
            .OrderBy(b => b.Id)
            .Take(maxCount)
            .Select(b => new CoastGuardRowDto(b.Customer.FullName, b.Customer.Phone, b.Customer.IdNumber, b.Customer.BirthDate, b.Customer.Nationality))
            .ToListAsync(ct);

        var idNumbersWithoutPhone = list.Where(r => string.IsNullOrEmpty(r.Phone)).Select(r => r.IdNumber).Distinct().ToList();
        if (idNumbersWithoutPhone.Count > 0)
        {
            var phoneByIdNumber = await _db.Customers
                .AsNoTracking()
                .Where(c => idNumbersWithoutPhone.Contains(c.IdNumber) && c.Phone != null && c.Phone != "")
                .Select(c => new { c.IdNumber, c.Phone })
                .ToListAsync(ct);
            var dict = phoneByIdNumber.GroupBy(x => x.IdNumber).ToDictionary(g => g.Key, g => g.First().Phone!);
            for (var i = 0; i < list.Count; i++)
            {
                var row = list[i];
                if (string.IsNullOrEmpty(row.Phone) && dict.TryGetValue(row.IdNumber, out var phone))
                    list[i] = row with { Phone = phone };
            }
        }

        return list;
    }

    /// <summary>
    /// Seçilen tarihte servis alan rezervasyonları grup bazında döner (Alınış Saati + Acenta).
    /// </summary>
    public async Task<List<ServiceListItemDto>> GetServiceListAsync(DateOnly date, CancellationToken ct = default)
    {
        var bookings = await _db.DailyBookings
            .AsNoTracking()
            .Include(b => b.Customer)
            .Where(b => b.TourDate == date && b.UseShuttle)
            .OrderBy(b => b.ServicePickupTime)
            .ThenBy(b => b.AgencyName)
            .ThenBy(b => b.Id)
            .ToListAsync(ct);

        var groups = bookings
            .GroupBy(b => new { PickupTime = b.ServicePickupTime ?? "", AgencyName = b.AgencyName ?? "" })
            .Select(g =>
            {
                var first = g.First();
                var c = first.Customer;
                return new ServiceListItemDto(
                    c?.FullName ?? "",
                    c?.Phone,
                    c?.AccommodationPlace,
                    g.Count(),
                    first.ServicePickupTime
                );
            })
            .ToList();

        return groups;
    }
}
