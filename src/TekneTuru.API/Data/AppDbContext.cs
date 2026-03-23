using Microsoft.EntityFrameworkCore;
using TekneTuru.Core.Entities;

namespace TekneTuru.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<DailyBooking> DailyBookings => Set<DailyBooking>();
    public DbSet<TourInfo> TourInfos => Set<TourInfo>();
    public DbSet<Stop> Stops => Set<Stop>();
    public DbSet<SmsTemplate> SmsTemplates => Set<SmsTemplate>();
    public DbSet<SmsLog> SmsLogs => Set<SmsLog>();
    public DbSet<SmsConsent> SmsConsents => Set<SmsConsent>();
    public DbSet<SmsDeliveryLog> SmsDeliveryLogs => Set<SmsDeliveryLog>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<Setting> Settings => Set<Setting>();
    public DbSet<ShortLink> ShortLinks => Set<ShortLink>();
    public DbSet<ShortLinkClick> ShortLinkClicks => Set<ShortLinkClick>();
    public DbSet<PreReservation> PreReservations => Set<PreReservation>();
    public DbSet<Feedback> Feedbacks => Set<Feedback>();
    public DbSet<ThanksSurveyResponse> ThanksSurveyResponses => Set<ThanksSurveyResponse>();
    public DbSet<Ticket> Tickets => Set<Ticket>();
    public DbSet<Agency> Agencies => Set<Agency>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.Entity<User>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();
        });
        builder.Entity<DailyBooking>(e =>
        {
            e.HasOne(d => d.Customer).WithMany().HasForeignKey(d => d.CustomerId).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<ShortLink>(e =>
        {
            e.HasIndex(s => s.ShortCode).IsUnique();
        });
        builder.Entity<SmsConsent>(e =>
        {
            e.ToTable("SmsConsents");
            e.HasOne<Customer>().WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<SmsDeliveryLog>(e =>
        {
            e.ToTable("SmsDeliveryLogs");
            e.HasOne<Customer>().WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);
        });
        builder.Entity<Ticket>(e =>
        {
            e.HasIndex(t => t.TicketNumber).IsUnique();
        });
        builder.Entity<Agency>(e =>
        {
            e.HasIndex(a => a.ShortCode).IsUnique();
        });
    }
}
