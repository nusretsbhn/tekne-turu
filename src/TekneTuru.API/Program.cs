using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.FileProviders;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TekneTuru.API.Configuration;
using TekneTuru.API.Data;
using TekneTuru.API.Models;
using TekneTuru.API.Services;
using TekneTuru.Core.Entities;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
                builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? new[] { "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176" })
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var conn = builder.Configuration.GetConnectionString("DefaultConnection");
// macOS'ta PostgreSQL genelde "postgres" rolü oluşturmaz; varsayılan kullanıcı adın kullanılır.
if (builder.Environment.IsDevelopment() && !string.IsNullOrEmpty(conn))
{
    var currentUser = Environment.GetEnvironmentVariable("USER");
    if (!string.IsNullOrEmpty(currentUser))
        conn = Regex.Replace(conn, "Username=postgres", $"Username={currentUser}", RegexOptions.IgnoreCase);
}
builder.Services.AddDbContext<AppDbContext>(o => o.UseNpgsql(conn));

var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key gerekli.");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        opts.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });
builder.Services.AddAuthorization(o =>
{
    o.AddPolicy("AdminOnly", p => p.RequireRole("Admin"));
    o.AddPolicy("AcentaOnly", p => p.RequireRole("Acenta"));
});

builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<BookingService>();
builder.Services.AddScoped<LandingService>();
builder.Services.AddScoped<AdminService>();

builder.Services.Configure<NetGsmOptions>(builder.Configuration.GetSection(NetGsmOptions.SectionName));
builder.Services.AddHttpClient<NetGsmSmsSender>();
builder.Services.AddScoped<ISmsSender>(sp =>
{
    var options = sp.GetRequiredService<IOptions<NetGsmOptions>>().Value;
    return options.IsConfigured ? sp.GetRequiredService<NetGsmSmsSender>() : new LogOnlySmsSender();
});

builder.Services.AddScoped<SmsService>();
builder.Services.AddScoped<SmsConsentService>();
builder.Services.AddScoped<ShortLinkService>();
builder.Services.AddScoped<TicketService>();
builder.Services.AddHostedService<TourEndSmsBackgroundService>();
builder.Services.AddHostedService<IysRetryBackgroundService>();
builder.Services.AddHealthChecks();
builder.Services.Configure<FormOptions>(o => o.MultipartBodyLengthLimit = 52_428_800); // 50 MB

// Nginx vb. arkasında gerçek şema (https) ve mutlak URL'ler için X-Forwarded-Proto kullan
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

// Veritabanı şemasını hem Development hem Production'da oluştur/güncelle
if (!string.IsNullOrEmpty(conn))
{
    try
    {
        await DatabaseEnsurer.EnsureDatabaseExistsAsync(conn);
    }
    catch (Npgsql.NpgsqlException)
    {
        // PostgreSQL çalışmıyorsa veya bağlantı kurulamazsa devam et; login isteği hata verir
    }

    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.EnsureCreatedAsync();
    // EndTime sütunu sonradan eklendiyse mevcut veritabanına ekle (EnsureCreated güncelleme yapmaz)
    await db.Database.ExecuteSqlRawAsync(@"
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'TourInfos' AND column_name = 'EndTime'
            ) THEN
                ALTER TABLE ""TourInfos"" ADD COLUMN ""EndTime"" time NULL;
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'TourInfos' AND column_name = 'DepartureMapUrl'
            ) THEN
                ALTER TABLE ""TourInfos"" ADD COLUMN ""DepartureMapUrl"" varchar(1024) NULL;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'SmsLogs') THEN
                CREATE TABLE ""SmsLogs"" (""Id"" SERIAL PRIMARY KEY, ""CustomerId"" INTEGER NULL, ""Phone"" VARCHAR(255) NOT NULL, ""TemplateKey"" VARCHAR(255) NOT NULL, ""MessageBody"" TEXT NULL, ""Status"" VARCHAR(64) NOT NULL, ""SentAt"" TIMESTAMP NOT NULL, ""ResponseCode"" VARCHAR(64) NULL);
            ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'SmsLogs' AND column_name = 'MessageBody') THEN
                ALTER TABLE ""SmsLogs"" ADD COLUMN ""MessageBody"" TEXT NULL;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'DailyBookings' AND column_name = 'AgencyName') THEN
                ALTER TABLE ""DailyBookings"" ADD COLUMN ""AgencyName"" VARCHAR(256) NULL;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'DailyBookings' AND column_name = 'UseShuttle') THEN
                ALTER TABLE ""DailyBookings"" ADD COLUMN ""UseShuttle"" BOOLEAN NOT NULL DEFAULT FALSE;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'DailyBookings' AND column_name = 'ServicePickupTime') THEN
                ALTER TABLE ""DailyBookings"" ADD COLUMN ""ServicePickupTime"" VARCHAR(32) NULL;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Users' AND column_name = 'AgencyId') THEN
                ALTER TABLE ""Users"" ADD COLUMN ""AgencyId"" INTEGER NULL;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'PreReservations') THEN
                CREATE TABLE ""PreReservations"" (
                    ""Id"" SERIAL PRIMARY KEY,
                    ""FullName"" VARCHAR(256) NOT NULL,
                    ""Phone"" VARCHAR(64) NOT NULL,
                    ""Email"" VARCHAR(256) NULL,
                    ""HotelName"" VARCHAR(256) NULL,
                    ""AdultCount"" INTEGER NOT NULL,
                    ""ChildCount"" INTEGER NOT NULL,
                    ""BabyCount"" INTEGER NOT NULL,
                    ""TourDate"" DATE NOT NULL,
                    ""UseShuttle"" BOOLEAN NOT NULL,
                    ""Status"" VARCHAR(32) NOT NULL,
                    ""CreatedAt"" TIMESTAMP NOT NULL,
                    ""UpdatedAt"" TIMESTAMP NULL,
                    ""Notes"" TEXT NULL
                );
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Tickets') THEN
                CREATE TABLE ""Tickets"" (
                    ""Id"" SERIAL PRIMARY KEY,
                    ""TicketNumber"" VARCHAR(8) NOT NULL,
                    ""FullName"" VARCHAR(256) NOT NULL,
                    ""Phone"" VARCHAR(64) NOT NULL,
                    ""TourDate"" DATE NOT NULL,
                    ""AdultCount"" INTEGER NOT NULL,
                    ""ChildCount"" INTEGER NOT NULL,
                    ""BabyCount"" INTEGER NOT NULL,
                    ""Hotel"" VARCHAR(256) NULL,
                    ""TourStartTime"" time NULL,
                    ""TourEndTime"" time NULL,
                    ""Note"" TEXT NULL,
                    ""HasService"" BOOLEAN NOT NULL,
                    ""PaymentType"" VARCHAR(32) NOT NULL,
                    ""Status"" VARCHAR(32) NOT NULL,
                    ""FilePath"" VARCHAR(512) NULL,
                    ""CreatedAt"" TIMESTAMP NOT NULL,
                    ""UpdatedAt"" TIMESTAMP NULL
                );
                CREATE UNIQUE INDEX ""IX_Tickets_TicketNumber"" ON ""Tickets"" (""TicketNumber"");
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Agencies') THEN
                CREATE TABLE ""Agencies"" (
                    ""Id"" SERIAL PRIMARY KEY,
                    ""Name"" VARCHAR(256) NOT NULL,
                    ""ContactFullName"" VARCHAR(256) NOT NULL,
                    ""Phone"" VARCHAR(64) NOT NULL,
                    ""Email"" VARCHAR(256) NULL,
                    ""ShortCode"" VARCHAR(16) NOT NULL,
                    ""CreatedAt"" TIMESTAMP NOT NULL,
                    ""UpdatedAt"" TIMESTAMP NULL
                );
                CREATE UNIQUE INDEX ""IX_Agencies_ShortCode"" ON ""Agencies"" (""ShortCode"");
            END IF;
        END $$;
    ");
    if (!await db.Users.AnyAsync())
    {
        db.Users.Add(new User
        {
            FullName = "Admin",
            Email = "nusretblog@gmail.com",
            PasswordHash = AuthService.HashPassword("Sene69.."),
            Role = "Admin",
            IsActive = true
        });
        await db.SaveChangesAsync();
    }
    if (!await db.TourInfos.AnyAsync())
    {
        db.TourInfos.Add(new TourInfo { Title = "Günlük Tekne Turu", Description = "Eşsiz koylar ve mavi yolculuk deneyimi.", StartTime = new TimeOnly(10, 0), DurationMinutes = 480, DeparturePoint = "Marina" });
        await db.SaveChangesAsync();
    }
    if (!await db.Settings.AnyAsync())
    {
        db.Settings.AddRange(
            new Setting { Key = "InstagramUrl", Value = "https://instagram.com" },
            new Setting { Key = "GoogleReviewsUrl", Value = "https://g.page/review" },
            new Setting { Key = "TripAdvisorUrl", Value = "https://tripadvisor.com" },
            new Setting { Key = "LandingBaseUrl", Value = "http://localhost:3000" },
            new Setting { Key = "ThanksPageUrl", Value = "" });
        await db.SaveChangesAsync();
    }
    if (!await db.SmsTemplates.AnyAsync())
    {
        db.SmsTemplates.AddRange(
            new SmsTemplate { TemplateKey = "booking-confirmation", ContentTR = "Sayin {Name}, {TourDate} tarihli Viking Oludeniz Tekne Turuna hosgeldiniz. Tur boyunca asagidaki linkten tum tur bilgilerine erisebilirsiniz. {LandingUrl} Iyi eglenceler dileriz.", IsActive = true, UpdatedAt = DateTime.UtcNow },
            new SmsTemplate { TemplateKey = "tour-end-thanks", ContentTR = "Sayin {Name}, {TourDate} tarihli Viking Oludeniz Tekne Turunun sonuna geldik. Bizi asagidaki linkten Google'dan puanlamayi ve Instagram'dan takip etmeyi unutmayin! {ThanksPageUrl} Bizi tercih ettiginiz icin tesekkur ederiz.", IsActive = true, UpdatedAt = DateTime.UtcNow },
            new SmsTemplate { TemplateKey = "service-info", ContentTR = "{TourDate} tarihli Viking Oludeniz Tekne Turu servis bilgilendirme mesajidir. Servis Fethiye Merkez icin 08:15 - 09:00 arasi, Ovacik icin 09:00 - 09:30 arasi otelinizin onunden sizi alacaktir. Lutfen ilgili saatte otel kapisinda hazir bulununuz.", IsActive = true, UpdatedAt = DateTime.UtcNow },
            new SmsTemplate { TemplateKey = "ticket-desk", ContentTR = "{TourDate}'li Viking Ölüdeniz Tekne Turu biletiniz oluşturulmuştur. Lütfen aşağıdaki linkten yolcu kaydınızı oluşturunuz. {DeskUrl}", IsActive = true, UpdatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();
    }
    else
    {
        var bookingTpl = await db.SmsTemplates.FirstOrDefaultAsync(t => t.TemplateKey == "booking-confirmation");
        if (bookingTpl != null)
        {
            bookingTpl.ContentTR = "Sayin {Name}, {TourDate} tarihli Viking Oludeniz Tekne Turuna hosgeldiniz. Tur boyunca asagidaki linkten tum tur bilgilerine erisebilirsiniz. {LandingUrl} Iyi eglenceler dileriz.";
            bookingTpl.UpdatedAt = DateTime.UtcNow;
        }
        if (!await db.SmsTemplates.AnyAsync(t => t.TemplateKey == "tour-end-thanks"))
        {
            db.SmsTemplates.Add(new SmsTemplate { TemplateKey = "tour-end-thanks", ContentTR = "Sayin {Name}, {TourDate} tarihli Viking Oludeniz Tekne Turunun sonuna geldik. Bizi asagidaki linkten Google'dan puanlamayi ve Instagram'dan takip etmeyi unutmayin! {ThanksPageUrl} Bizi tercih ettiginiz icin tesekkur ederiz.", IsActive = true, UpdatedAt = DateTime.UtcNow });
        }
        if (!await db.SmsTemplates.AnyAsync(t => t.TemplateKey == "service-info"))
        {
            db.SmsTemplates.Add(new SmsTemplate { TemplateKey = "service-info", ContentTR = "{TourDate} tarihli Viking Oludeniz Tekne Turu servis bilgilendirme mesajidir. Servis Fethiye Merkez icin 08:15 - 09:00 arasi, Ovacik icin 09:00 - 09:30 arasi otelinizin onunden sizi alacaktir. Lutfen ilgili saatte otel kapisinda hazir bulununuz.", IsActive = true, UpdatedAt = DateTime.UtcNow });
        }
        if (!await db.SmsTemplates.AnyAsync(t => t.TemplateKey == "ticket-desk"))
        {
            db.SmsTemplates.Add(new SmsTemplate { TemplateKey = "ticket-desk", ContentTR = "{TourDate}'li Viking Ölüdeniz Tekne Turu biletiniz oluşturulmuştur. Lütfen aşağıdaki linkten yolcu kaydınızı oluşturunuz. {DeskUrl}", IsActive = true, UpdatedAt = DateTime.UtcNow });
        }
        await db.SaveChangesAsync();
    }
    if (!await db.Settings.AnyAsync(s => s.Key == "LandingBaseUrl"))
    {
        db.Settings.Add(new Setting { Key = "LandingBaseUrl", Value = "http://localhost:3000", UpdatedAt = DateTime.UtcNow });
    }
    if (!await db.Settings.AnyAsync(s => s.Key == "ThanksPageUrl"))
    {
        db.Settings.Add(new Setting { Key = "ThanksPageUrl", Value = "", UpdatedAt = DateTime.UtcNow });
    }
    if (!await db.Settings.AnyAsync(s => s.Key == "ShortLinkBaseUrl"))
    {
        db.Settings.Add(new Setting { Key = "ShortLinkBaseUrl", Value = "", UpdatedAt = DateTime.UtcNow });
    }
    if (!await db.Settings.AnyAsync(s => s.Key == "YoutubeUrl"))
    {
        db.Settings.Add(new Setting { Key = "YoutubeUrl", Value = "https://youtube.com", UpdatedAt = DateTime.UtcNow });
    }
    if (!await db.Settings.AnyAsync(s => s.Key == "ThanksPageDescription"))
    {
        db.Settings.Add(new Setting { Key = "ThanksPageDescription", Value = "Deneyiminizi paylaşın — Google, Instagram ve TripAdvisor üzerinden bizi puanlamayı ve takip etmeyi unutmayın.", UpdatedAt = DateTime.UtcNow });
    }
    if (!await db.Settings.AnyAsync(s => s.Key == "ThanksSurveyJson"))
    {
        db.Settings.Add(new Setting { Key = "ThanksSurveyJson", Value = "[]", UpdatedAt = DateTime.UtcNow });
    }
    if (!await db.Settings.AnyAsync(s => s.Key == "MarketingBannerUrl"))
    {
        db.Settings.Add(new Setting { Key = "MarketingBannerUrl", Value = "", UpdatedAt = DateTime.UtcNow });
    }
    if (!await db.Settings.AnyAsync(s => s.Key == "MarketingServices"))
    {
        db.Settings.Add(new Setting { Key = "MarketingServices", Value = "", UpdatedAt = DateTime.UtcNow });
    }
    if (!await db.Settings.AnyAsync(s => s.Key == "MarketingServicesEn"))
        db.Settings.Add(new Setting { Key = "MarketingServicesEn", Value = "", UpdatedAt = DateTime.UtcNow });
    if (!await db.Settings.AnyAsync(s => s.Key == "MarketingPrice"))
    {
        db.Settings.Add(new Setting { Key = "MarketingPrice", Value = "", UpdatedAt = DateTime.UtcNow });
    }
    if (!await db.Settings.AnyAsync(s => s.Key == "MarketingVideoUrl"))
    {
        db.Settings.Add(new Setting { Key = "MarketingVideoUrl", Value = "", UpdatedAt = DateTime.UtcNow });
    }
    if (!await db.Settings.AnyAsync(s => s.Key == "MarketingGalleryJson"))
    {
        db.Settings.Add(new Setting { Key = "MarketingGalleryJson", Value = "[]", UpdatedAt = DateTime.UtcNow });
    }
    if (!await db.Settings.AnyAsync(s => s.Key == "MarketingGoogleReviewsUrl"))
        db.Settings.Add(new Setting { Key = "MarketingGoogleReviewsUrl", Value = "", UpdatedAt = DateTime.UtcNow });
    if (!await db.Settings.AnyAsync(s => s.Key == "MarketingLocationMapUrl"))
        db.Settings.Add(new Setting { Key = "MarketingLocationMapUrl", Value = "", UpdatedAt = DateTime.UtcNow });
    if (!await db.Settings.AnyAsync(s => s.Key == "MarketingLocationMapEmbedUrl"))
        db.Settings.Add(new Setting { Key = "MarketingLocationMapEmbedUrl", Value = "", UpdatedAt = DateTime.UtcNow });
    if (!await db.Settings.AnyAsync(s => s.Key == "MarketingServiceLocationMapUrl"))
        db.Settings.Add(new Setting { Key = "MarketingServiceLocationMapUrl", Value = "", UpdatedAt = DateTime.UtcNow });
    if (!await db.Settings.AnyAsync(s => s.Key == "MarketingServiceLocationMapEmbedUrl"))
        db.Settings.Add(new Setting { Key = "MarketingServiceLocationMapEmbedUrl", Value = "", UpdatedAt = DateTime.UtcNow });
    if (!await db.Settings.AnyAsync(s => s.Key == "MarketingRedbookUrl"))
        db.Settings.Add(new Setting { Key = "MarketingRedbookUrl", Value = "", UpdatedAt = DateTime.UtcNow });
    if (!await db.Settings.AnyAsync(s => s.Key == "DeskRegistrationUrl"))
        db.Settings.Add(new Setting { Key = "DeskRegistrationUrl", Value = "https://vikingoludeniz.xyz/desk", UpdatedAt = DateTime.UtcNow });
    await db.SaveChangesAsync();

    await db.Database.ExecuteSqlRawAsync(@"
        CREATE TABLE IF NOT EXISTS ""ShortLinks"" (
            ""Id"" SERIAL PRIMARY KEY,
            ""ShortCode"" VARCHAR(32) NOT NULL,
            ""BookingId"" INTEGER NOT NULL,
            ""CreatedAt"" TIMESTAMP NOT NULL,
            ""ClickCount"" INTEGER NOT NULL DEFAULT 0
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ""IX_ShortLinks_ShortCode"" ON ""ShortLinks"" (""ShortCode"");
        CREATE TABLE IF NOT EXISTS ""ShortLinkClicks"" (
            ""Id"" SERIAL PRIMARY KEY,
            ""ShortLinkId"" INTEGER NOT NULL,
            ""ClickedAt"" TIMESTAMP NOT NULL,
            ""UserAgent"" VARCHAR(512),
            ""IpAddress"" VARCHAR(64)
        );
        CREATE TABLE IF NOT EXISTS ""Feedbacks"" (
            ""Id"" SERIAL PRIMARY KEY,
            ""Type"" VARCHAR(32) NOT NULL,
            ""Message"" TEXT NOT NULL,
            ""CustomerId"" INTEGER NULL,
            ""BookingId"" INTEGER NULL,
            ""Status"" VARCHAR(32) NOT NULL DEFAULT 'Yeni',
            ""CreatedAt"" TIMESTAMP NOT NULL,
            ""ProcessedAt"" TIMESTAMP NULL
        );
        CREATE TABLE IF NOT EXISTS ""ThanksSurveyResponses"" (
            ""Id"" SERIAL PRIMARY KEY,
            ""CreatedAt"" TIMESTAMP NOT NULL,
            ""AnswersJson"" TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS ""SmsConsents"" (
            ""Id"" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            ""CustomerId"" INTEGER NOT NULL REFERENCES ""Customers""(""Id""),
            ""Phone"" VARCHAR(32) NOT NULL,
            ""ConsentStatus"" VARCHAR(32) NOT NULL,
            ""ConsentDate"" TIMESTAMP NOT NULL,
            ""ConsentChannel"" VARCHAR(32) NOT NULL DEFAULT 'WEB',
            ""IysSentAt"" TIMESTAMP NULL,
            ""IysSubmitId"" VARCHAR(64) NULL,
            ""IysResponseCode"" VARCHAR(64) NULL,
            ""IysResponseMessage"" VARCHAR(512) NULL,
            ""IysStatus"" VARCHAR(32) NOT NULL DEFAULT 'Pending',
            ""WebhookReceivedAt"" TIMESTAMP NULL,
            ""WebhookStatus"" VARCHAR(64) NULL,
            ""CreatedAt"" TIMESTAMP NOT NULL,
            ""IysRetryCount"" INTEGER NOT NULL DEFAULT 0,
            ""IysLastAttemptAt"" TIMESTAMP NULL
        );
        CREATE INDEX IF NOT EXISTS ""IX_SmsConsents_CustomerId"" ON ""SmsConsents""(""CustomerId"");
        CREATE INDEX IF NOT EXISTS ""IX_SmsConsents_IysStatus"" ON ""SmsConsents""(""IysStatus"");
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'SmsConsents' AND column_name = 'IysRetryCount') THEN
                ALTER TABLE ""SmsConsents"" ADD COLUMN ""IysRetryCount"" INTEGER NOT NULL DEFAULT 0;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'SmsConsents' AND column_name = 'IysLastAttemptAt') THEN
                ALTER TABLE ""SmsConsents"" ADD COLUMN ""IysLastAttemptAt"" TIMESTAMP NULL;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'SmsConsents' AND column_name = 'IysSubmitId') THEN
                ALTER TABLE ""SmsConsents"" ADD COLUMN ""IysSubmitId"" VARCHAR(64) NULL;
            END IF;
        END $$;
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'SmsDeliveryLogs' AND column_name = 'NetgsmResponseCode') THEN
                ALTER TABLE ""SmsDeliveryLogs"" ADD COLUMN ""NetgsmResponseCode"" VARCHAR(16) NULL;
            END IF;
        END $$;
        CREATE TABLE IF NOT EXISTS ""SmsDeliveryLogs"" (
            ""Id"" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            ""CustomerId"" INTEGER NULL REFERENCES ""Customers""(""Id""),
            ""Phone"" VARCHAR(32) NOT NULL,
            ""TemplateKey"" VARCHAR(64) NOT NULL,
            ""MessageContent"" TEXT NOT NULL,
            ""NetgsmMessageId"" VARCHAR(64) NULL,
            ""NetgsmResponseCode"" VARCHAR(16) NULL,
            ""Status"" VARCHAR(32) NOT NULL DEFAULT 'Pending',
            ""SentAt"" TIMESTAMP NULL,
            ""DeliveryReportAt"" TIMESTAMP NULL,
            ""ErrorCode"" VARCHAR(64) NULL,
            ""ErrorMessage"" VARCHAR(512) NULL,
            ""CreatedAt"" TIMESTAMP NOT NULL
        );
        CREATE INDEX IF NOT EXISTS ""IX_SmsDeliveryLogs_CustomerId"" ON ""SmsDeliveryLogs""(""CustomerId"");
        CREATE INDEX IF NOT EXISTS ""IX_SmsDeliveryLogs_Status"" ON ""SmsDeliveryLogs""(""Status"");
    ");
}

// Admin seed: Production'da da varsayılan admin yoksa oluştur
try
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (!await db.Users.AnyAsync())
    {
        db.Users.Add(new User
        {
            FullName = "Admin",
            Email = "nusretblog@gmail.com",
            PasswordHash = AuthService.HashPassword("Sene69.."),
            Role = "Admin",
            IsActive = true
        });
        await db.SaveChangesAsync();
    }
}
catch (Exception)
{
    // DB bağlantısı veya tablo yoksa atla
}

app.UseForwardedHeaders();
app.UseCors();

// wwwroot ve uploads klasörünü static dosya olarak sun
app.UseStaticFiles();
var uploadsPathSetting = builder.Configuration["Storage:UploadsPath"];
var uploadsPathEnv = Environment.GetEnvironmentVariable("UPLOADS_PATH");
var uploadsRootRaw = !string.IsNullOrWhiteSpace(uploadsPathSetting) ? uploadsPathSetting : uploadsPathEnv;
var uploadsRoot = string.IsNullOrWhiteSpace(uploadsRootRaw)
    ? Path.Combine(app.Environment.ContentRootPath, "wwwroot", "uploads")
    : (Path.IsPathRooted(uploadsRootRaw)
        ? uploadsRootRaw
        : Path.Combine(app.Environment.ContentRootPath, uploadsRootRaw));
Directory.CreateDirectory(uploadsRoot);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsRoot),
    RequestPath = "/uploads"
});
if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", () => Results.Ok(new
{
    app = "Tekne Turu Yönetim Sistemi API",
    version = "1.0.0",
    status = "çalışıyor",
    endpoints = new { health = "/health", apiHealth = "/api/health", login = "POST /api/auth/login" }
}));
app.MapHealthChecks("/health");
app.MapGet("/api/health", () => Results.Ok(new { status = "ok", app = "TekneTuru.API", version = "1.0.0" }));

app.MapPost("/api/auth/login", async (LoginRequest req, AuthService auth, CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Password))
        return Results.BadRequest(new { error = "E-posta ve şifre gerekli." });
    var result = await auth.LoginAsync(req.Email, req.Password, ct);
    if (result == null)
        return Results.Json(new { error = "E-posta veya şifre hatalı." }, statusCode: 401);
    return Results.Ok(result);
});

app.MapPost("/api/bookings", async (CreateBookingRequest? req, BookingService booking, CancellationToken ct) =>
{
    if (req == null)
        return Results.Json(new { error = "Geçersiz istek: JSON gövdesi bekleniyor (tourDate, persons)." }, statusCode: 400);
    if (req.Persons == null || req.Persons.Count == 0)
        return Results.BadRequest(new { error = "En az bir kişi bilgisi gönderilmelidir." });
    try
    {
        var (success, error, ids) = await booking.CreateBookingAsync(req.TourDate, req.Persons, req.AgencyName, req.UseShuttle ?? false, req.ServicePickupTime, ct);
        if (!success)
            return Results.BadRequest(new { error = error ?? "Kayıt işlemi başarısız." });
        return Results.Ok(new { success = true, bookingIds = ids });
    }
    catch (Exception ex)
    {
        var inner = ex.InnerException?.Message ?? ex.Message;
        return Results.Json(new { error = "Sunucu hatası: " + inner }, statusCode: 500);
    }
});

var bookingGroup = app.MapGroup("/api/bookings").RequireAuthorization();
bookingGroup.MapGet("/", async (DateOnly? tourDate, string? search, HttpContext httpContext, BookingService booking, CancellationToken ct) =>
{
    var date = tourDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
    var (list, summary) = await booking.GetBookingsForDateAsync(date, search, ct);
    return Results.Ok(new { list, summary });
});
bookingGroup.MapPatch("/{id:int}/check-in", async (int id, CheckInRequest body, BookingService booking, CancellationToken ct) =>
{
    var ok = await booking.SetCheckInAsync(id, body.CheckedIn, ct);
    return ok ? Results.Ok(new { success = true }) : Results.NotFound();
});
bookingGroup.MapPost("/bulk-check-in", async (BulkCheckInRequest body, BookingService booking, CancellationToken ct) =>
{
    if (body?.Ids == null || body.Ids.Count == 0)
        return Results.BadRequest(new { error = "En az bir kayıt seçiniz." });
    var count = await booking.SetCheckInBulkAsync(body.Ids, body.CheckedIn, ct);
    return Results.Ok(new { success = true, count });
});

static async Task<(User? User, Agency? Agency, IResult? Error)> ResolveAcentaContextAsync(AppDbContext db, HttpContext http, CancellationToken ct)
{
    var userIdText = http.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (!int.TryParse(userIdText, out var userId))
        return (null, null, Results.Unauthorized());

    var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId && u.IsActive, ct);
    if (user == null)
        return (null, null, Results.BadRequest(new { error = "Acenta hesabı bulunamadı." }));

    Agency? agency = null;
    if (user.AgencyId.HasValue)
    {
        agency = await db.Agencies.AsNoTracking().FirstOrDefaultAsync(a => a.Id == user.AgencyId.Value, ct);
        if (agency != null) return (user, agency, null);
    }

    // Geriye dönük uyumluluk: AgencyId boş eski acenta kullanıcılarını otomatik eşleştir.
    var fullName = (user.FullName ?? "").Trim().ToLowerInvariant();
    var email = (user.Email ?? "").Trim().ToLowerInvariant();
    var matches = await db.Agencies.AsNoTracking()
        .Where(a =>
            (!string.IsNullOrWhiteSpace(fullName) && (
                a.ContactFullName.ToLower() == fullName ||
                a.Name.ToLower() == fullName
            )) ||
            (!string.IsNullOrWhiteSpace(email) && a.Email != null && a.Email.ToLower() == email))
        .OrderBy(a => a.Id)
        .Take(2)
        .ToListAsync(ct);

    if (matches.Count == 1)
    {
        user.AgencyId = matches[0].Id;
        await db.SaveChangesAsync(ct);
        return (user, matches[0], null);
    }

    return (user, null, Results.BadRequest(new { error = "Acenta hesabı eşleşmedi. Lütfen admin panelinden acenta-kullanıcı eşlemesini kontrol edin." }));
}

var acentaGroup = app.MapGroup("/api/acenta").RequireAuthorization("AcentaOnly");
acentaGroup.MapGet("/dashboard", async (DateOnly? date, AppDbContext db, HttpContext http, CancellationToken ct) =>
{
    var (_, agency, err) = await ResolveAcentaContextAsync(db, http, ct);
    if (err != null) return err;

    var selectedDate = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
    var agencyLower = agency!.Name.Trim().ToLowerInvariant();
    var todayList = await db.DailyBookings.AsNoTracking()
        .Include(b => b.Customer)
        .Where(b => b.AgencyName != null && b.AgencyName.Trim().ToLower() == agencyLower && b.TourDate == selectedDate)
        .OrderByDescending(b => b.Id)
        .Take(25)
        .Select(b => new
        {
            b.Id,
            b.TourDate,
            b.CheckedIn,
            b.UseShuttle,
            FullName = b.Customer.FullName,
            Phone = b.Customer.Phone,
            Hotel = b.Customer.AccommodationPlace,
            CreatedAt = b.Customer.CreatedAt
        })
        .ToListAsync(ct);

    var totalPassengerCount = await db.DailyBookings.AsNoTracking()
        .CountAsync(b => b.AgencyName != null && b.AgencyName.Trim().ToLower() == agencyLower, ct);

    return Results.Ok(new
    {
        agencyName = agency.Name,
        selectedDate,
        totalPassengerCount,
        list = todayList
    });
});
acentaGroup.MapPost("/bookings", async (CreateBookingRequest? req, AppDbContext db, BookingService booking, HttpContext http, CancellationToken ct) =>
{
    if (req == null || req.Persons == null || req.Persons.Count == 0)
        return Results.BadRequest(new { error = "En az bir kişi bilgisi gönderilmelidir." });

    var (_, agency, err) = await ResolveAcentaContextAsync(db, http, ct);
    if (err != null) return err;

    var (success, error, ids) = await booking.CreateBookingAsync(req.TourDate, req.Persons, agency!.Name, req.UseShuttle ?? false, null, ct);
    if (!success)
        return Results.BadRequest(new { error = error ?? "Kayıt işlemi başarısız." });
    return Results.Ok(new { success = true, bookingIds = ids });
});
acentaGroup.MapGet("/passengers", async (
    DateOnly? dateFrom,
    DateOnly? dateTo,
    string? search,
    bool? useShuttle,
    int? limit,
    int? page,
    AppDbContext db,
    HttpContext http,
    CancellationToken ct) =>
{
    var (_, agency, err) = await ResolveAcentaContextAsync(db, http, ct);
    if (err != null) return err;
    var agencyLower = agency!.Name.Trim().ToLowerInvariant();
    var q = db.DailyBookings.AsNoTracking()
        .Include(b => b.Customer)
        .Where(b => b.AgencyName != null && b.AgencyName.Trim().ToLower() == agencyLower);

    if (dateFrom.HasValue) q = q.Where(b => b.TourDate >= dateFrom.Value);
    if (dateTo.HasValue) q = q.Where(b => b.TourDate <= dateTo.Value);
    if (useShuttle.HasValue) q = q.Where(b => b.UseShuttle == useShuttle.Value);
    if (!string.IsNullOrWhiteSpace(search))
    {
        var s = search.Trim().ToLower();
        q = q.Where(b =>
            (b.Customer.FullName != null && b.Customer.FullName.ToLower().Contains(s)) ||
            (b.Customer.Phone != null && b.Customer.Phone.ToLower().Contains(s)) ||
            (b.Customer.AccommodationPlace != null && b.Customer.AccommodationPlace.ToLower().Contains(s)));
    }

    var pageSize = Math.Clamp(limit ?? 25, 1, 100);
    var pageNumber = Math.Max(1, page ?? 1);
    var total = await q.CountAsync(ct);
    var items = await q.OrderByDescending(b => b.TourDate).ThenByDescending(b => b.Id)
        .Skip((pageNumber - 1) * pageSize)
        .Take(pageSize)
        .Select(b => new
        {
            b.Id,
            b.TourDate,
            b.CheckedIn,
            b.UseShuttle,
            b.AgeCategory,
            FullName = b.Customer.FullName,
            IdNumber = b.Customer.IdNumber,
            Nationality = b.Customer.Nationality,
            BirthDate = b.Customer.BirthDate,
            Phone = b.Customer.Phone,
            Email = b.Customer.Email,
            Hotel = b.Customer.AccommodationPlace,
            b.Customer.KvkkConsent,
            b.Customer.SmsConsent,
            CreatedAt = b.Customer.CreatedAt
        })
        .ToListAsync(ct);

    return Results.Ok(new { total, page = pageNumber, pageSize, items });
});
acentaGroup.MapPut("/passengers/{bookingId:int}", async (int bookingId, AcentaUpdatePassengerRequest body, AppDbContext db, HttpContext http, CancellationToken ct) =>
{
    var (_, agency, err) = await ResolveAcentaContextAsync(db, http, ct);
    if (err != null) return err;

    var bookingItem = await db.DailyBookings.Include(b => b.Customer).FirstOrDefaultAsync(b => b.Id == bookingId, ct);
    if (bookingItem == null) return Results.NotFound();
    if (!string.Equals(bookingItem.AgencyName?.Trim(), agency!.Name.Trim(), StringComparison.OrdinalIgnoreCase))
        return Results.Forbid();
    if (bookingItem.TourDate < DateOnly.FromDateTime(DateTime.UtcNow))
        return Results.BadRequest(new { error = "Tur tarihi geçmiş kayıtlar güncellenemez." });

    bookingItem.TourDate = body.TourDate;
    bookingItem.UseShuttle = body.UseShuttle;
    bookingItem.AgeCategory = string.IsNullOrWhiteSpace(body.AgeCategory) ? bookingItem.AgeCategory : body.AgeCategory.Trim();
    bookingItem.Customer.FullName = string.IsNullOrWhiteSpace(body.FullName) ? bookingItem.Customer.FullName : body.FullName.Trim();
    bookingItem.Customer.IdNumber = body.IdNumber?.Trim() ?? "";
    bookingItem.Customer.Nationality = string.IsNullOrWhiteSpace(body.Nationality) ? "TR" : body.Nationality.Trim();
    bookingItem.Customer.BirthDate = body.BirthDate;
    bookingItem.Customer.Phone = string.IsNullOrWhiteSpace(body.Phone) ? null : body.Phone.Trim();
    bookingItem.Customer.Email = string.IsNullOrWhiteSpace(body.Email) ? null : body.Email.Trim();
    bookingItem.Customer.AccommodationPlace = string.IsNullOrWhiteSpace(body.AccommodationPlace) ? null : body.AccommodationPlace.Trim();
    bookingItem.Customer.KvkkConsent = body.KvkkConsent;
    bookingItem.Customer.SmsConsent = body.SmsConsent;

    await db.SaveChangesAsync(ct);
    return Results.Ok(new { success = true });
});
acentaGroup.MapDelete("/passengers/{bookingId:int}", async (int bookingId, AppDbContext db, HttpContext http, CancellationToken ct) =>
{
    var (_, agency, err) = await ResolveAcentaContextAsync(db, http, ct);
    if (err != null) return err;

    var bookingItem = await db.DailyBookings.FirstOrDefaultAsync(b => b.Id == bookingId, ct);
    if (bookingItem == null) return Results.NotFound();
    if (!string.Equals(bookingItem.AgencyName?.Trim(), agency!.Name.Trim(), StringComparison.OrdinalIgnoreCase))
        return Results.Forbid();
    if (bookingItem.TourDate < DateOnly.FromDateTime(DateTime.UtcNow))
        return Results.BadRequest(new { error = "Tur tarihi geçmiş kayıtlar silinemez." });

    db.DailyBookings.Remove(bookingItem);
    await db.SaveChangesAsync(ct);
    return Results.Ok(new { success = true });
});
acentaGroup.MapPost("/change-password", async (AcentaChangePasswordRequest body, AppDbContext db, HttpContext http, CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(body.CurrentPassword) || string.IsNullOrWhiteSpace(body.NewPassword) || string.IsNullOrWhiteSpace(body.ConfirmNewPassword))
        return Results.BadRequest(new { error = "Tüm alanları doldurunuz." });
    if (body.NewPassword.Trim().Length < 6)
        return Results.BadRequest(new { error = "Yeni şifre en az 6 karakter olmalıdır." });
    if (body.NewPassword != body.ConfirmNewPassword)
        return Results.BadRequest(new { error = "Yeni şifreler uyuşmuyor." });

    var userIdText = http.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (!int.TryParse(userIdText, out var userId))
        return Results.Unauthorized();
    var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId && u.IsActive, ct);
    if (user == null) return Results.NotFound();
    if (!BCrypt.Net.BCrypt.Verify(body.CurrentPassword, user.PasswordHash))
        return Results.BadRequest(new { error = "Mevcut şifre hatalı." });

    user.PasswordHash = AuthService.HashPassword(body.NewPassword.Trim());
    await db.SaveChangesAsync(ct);
    return Results.Ok(new { success = true });
});

var adminGroup = app.MapGroup("/api/admin").RequireAuthorization("AdminOnly");
adminGroup.MapGet("/dashboard", async (DateOnly? date, AdminService admin, CancellationToken ct) =>
{
    try
    {
        var d = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var stats = await admin.GetDashboardStatsAsync(d, ct);
        return Results.Ok(stats);
    }
    catch (Exception ex) { return Results.Json(new { error = ex.Message }, statusCode: 500); }
});
adminGroup.MapGet("/dashboard/service-list", async (DateOnly? date, AdminService admin, CancellationToken ct) =>
{
    try
    {
        var d = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var list = await admin.GetServiceListAsync(d, ct);
        return Results.Ok(list);
    }
    catch (Exception ex) { return Results.Json(new { error = ex.Message }, statusCode: 500); }
});
adminGroup.MapGet("/customers", async (DateOnly? dateFrom, DateOnly? dateTo, string? search, string? agency, int? limit, int? offset, bool? registrationKayit, bool? withBookingsOnly, AdminService admin, CancellationToken ct) =>
{
    try
    {
        var list = await admin.GetCustomersAsync(dateFrom, dateTo, search, agency, limit ?? 100, offset ?? 0, registrationKayit ?? false, withBookingsOnly ?? false, ct);
        return Results.Ok(list);
    }
    catch (Exception ex) { return Results.Json(new { error = ex.Message }, statusCode: 500); }
});
adminGroup.MapGet("/customers/count", async (DateOnly? dateFrom, DateOnly? dateTo, string? search, string? agency, bool? withBookingsOnly, AdminService admin, CancellationToken ct) =>
{
    try
    {
        var count = await admin.GetCustomersCountAsync(dateFrom, dateTo, search, agency, withBookingsOnly ?? false, ct);
        return Results.Ok(new { count });
    }
    catch (Exception ex) { return Results.Json(new { error = ex.Message }, statusCode: 500); }
});
adminGroup.MapGet("/customers/{id:int}/bookings", async (int id, DateOnly? dateFrom, DateOnly? dateTo, AppDbContext db, CancellationToken ct) =>
{
    var query = db.DailyBookings.AsNoTracking().Where(b => b.CustomerId == id);
    if (dateFrom.HasValue) query = query.Where(b => b.TourDate >= dateFrom.Value);
    if (dateTo.HasValue) query = query.Where(b => b.TourDate <= dateTo.Value);
    var list = await query.OrderByDescending(b => b.TourDate).ThenBy(b => b.Id)
        .Select(b => new { b.Id, b.TourDate, b.AgeCategory, b.CheckedIn, b.AgencyName }).ToListAsync(ct);
    return Results.Ok(list);
});
adminGroup.MapGet("/customers/{id:int}", async (int id, AppDbContext db, CancellationToken ct) =>
{
    var c = await db.Customers.AsNoTracking().Where(x => x.Id == id).Select(c => new
    {
        c.Id,
        c.FullName,
        c.IdNumber,
        c.Phone,
        c.Email,
        c.BirthDate,
        c.Nationality,
        c.AccommodationPlace,
        c.KvkkConsent,
        c.SmsConsent,
        c.CreatedAt
    }).FirstOrDefaultAsync(ct);
    return c == null ? Results.NotFound() : Results.Ok(c);
});
adminGroup.MapPut("/customers/{id:int}", async (int id, UpdateCustomerRequest body, AppDbContext db, BookingService bookingService, CancellationToken ct) =>
{
    var c = await db.Customers.FindAsync(new object[] { id }, ct);
    if (c == null) return Results.NotFound();
    if (string.IsNullOrWhiteSpace(body.FullName)) return Results.BadRequest(new { error = "Ad soyad giriniz." });
    if (string.IsNullOrWhiteSpace(body.IdNumber)) return Results.BadRequest(new { error = "TC veya pasaport no giriniz." });
    var phoneBeforeUpdate = c.Phone;
    c.FullName = body.FullName.Trim();
    c.IdNumber = body.IdNumber.Trim();
    c.Phone = string.IsNullOrWhiteSpace(body.Phone) ? null : body.Phone.Trim();
    c.Email = string.IsNullOrWhiteSpace(body.Email) ? null : body.Email.Trim();
    c.BirthDate = body.BirthDate;
    c.Nationality = (body.Nationality ?? "TR").Trim();
    if (string.IsNullOrEmpty(c.Nationality)) c.Nationality = "TR";
    c.AccommodationPlace = string.IsNullOrWhiteSpace(body.AccommodationPlace) ? null : body.AccommodationPlace.Trim();
    c.KvkkConsent = body.KvkkConsent;
    c.SmsConsent = body.SmsConsent;
    await db.SaveChangesAsync(ct);
    await bookingService.TryResendBookingConfirmationAfterPhoneChangeAsync(id, phoneBeforeUpdate, ct);
    return Results.Ok(new { id = c.Id });
});
adminGroup.MapPatch("/bookings/{id:int}", async (int id, Dictionary<string, object?>? body, AppDbContext db, CancellationToken ct) =>
{
    var b = await db.DailyBookings.FindAsync(new object[] { id }, ct);
    if (b == null) return Results.NotFound();
    if (body != null)
    {
        if (body.TryGetValue("tourDate", out var td) && td != null && td is string s && DateOnly.TryParse(s, out var newDate))
            b.TourDate = newDate;
        if (body.TryGetValue("agencyName", out var an))
            b.AgencyName = an == null ? null : (an is string a ? a.Trim() : an.ToString()?.Trim());
    }
    await db.SaveChangesAsync(ct);
    return Results.Ok(new { id = b.Id });
});
adminGroup.MapGet("/coastguard", async (DateOnly? date, int? max, AdminService admin, CancellationToken ct) =>
{
    try
    {
        var d = date ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var list = await admin.GetCoastGuardListAsync(d, max ?? 115, ct);
        return Results.Ok(list);
    }
    catch (Exception ex) { return Results.Json(new { error = ex.Message }, statusCode: 500); }
});

adminGroup.MapGet("/sms/templates", async (AppDbContext db, CancellationToken ct) =>
{
    var list = await db.SmsTemplates.AsNoTracking().OrderBy(t => t.TemplateKey).Select(t => new { t.Id, t.TemplateKey, t.ContentTR, t.ContentEN, t.IsActive, t.UpdatedAt }).ToListAsync(ct);
    return Results.Ok(list);
});
adminGroup.MapPut("/sms/templates/{id:int}", async (int id, SmsTemplateUpdateDto body, AppDbContext db, CancellationToken ct) =>
{
    var t = await db.SmsTemplates.FindAsync(new object[] { id }, ct);
    if (t == null) return Results.NotFound();
    if (body.ContentTR != null) t.ContentTR = body.ContentTR;
    if (body.ContentEN != null) t.ContentEN = body.ContentEN;
    if (body.IsActive.HasValue) t.IsActive = body.IsActive.Value;
    t.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync(ct);
    return Results.Ok(new { t.Id });
});
adminGroup.MapGet("/sms/log", async (int? limit, int? offset, string? name, AppDbContext db, CancellationToken ct) =>
{
    IQueryable<SmsDeliveryLog> query = db.SmsDeliveryLogs.AsNoTracking();
    if (!string.IsNullOrWhiteSpace(name))
    {
        var search = name.Trim();
        var customerIds = await db.Customers.AsNoTracking()
            .Where(c => c.FullName != null && c.FullName.Contains(search))
            .Select(c => c.Id).ToListAsync(ct);
        query = query.Where(l => l.CustomerId != null && customerIds.Contains(l.CustomerId!.Value));
    }
    query = query.OrderByDescending(l => l.CreatedAt);
    var total = await query.CountAsync(ct);
    var list = await query.Skip(offset ?? 0).Take(limit ?? 10).ToListAsync(ct);
    var custIds = list.Where(l => l.CustomerId.HasValue).Select(l => l.CustomerId!.Value).Distinct().ToList();
    var customerNames = custIds.Count > 0
        ? await db.Customers.AsNoTracking().Where(c => custIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.FullName, ct)
        : new Dictionary<int, string>();
    var listDto = list.Select(l => new
    {
        l.Id, l.CustomerId, l.Phone, l.TemplateKey, MessageBody = l.MessageContent, l.Status, l.SentAt,
        ResponseCode = l.ErrorCode, l.NetgsmResponseCode, NetgsmMessageId = l.NetgsmMessageId, l.ErrorMessage,
        l.DeliveryReportAt, l.CreatedAt,
        CustomerFullName = l.CustomerId.HasValue ? customerNames.GetValueOrDefault(l.CustomerId.Value) : null
    }).ToList();
    return Results.Ok(new { list = listDto, total });
});
adminGroup.MapGet("/sms/log/{id:guid}", async (Guid id, AppDbContext db, CancellationToken ct) =>
{
    var log = await db.SmsDeliveryLogs.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id, ct);
    if (log == null) return Results.NotFound();
    string? customerFullName = null;
    if (log.CustomerId.HasValue)
        customerFullName = await db.Customers.AsNoTracking().Where(c => c.Id == log.CustomerId.Value).Select(c => c.FullName).FirstOrDefaultAsync(ct);
    return Results.Ok(new
    {
        log.Id, log.CustomerId, log.Phone, log.TemplateKey, MessageContent = log.MessageContent, log.Status, log.SentAt,
        log.NetgsmResponseCode, log.NetgsmMessageId, log.ErrorCode, log.ErrorMessage, log.DeliveryReportAt, log.CreatedAt,
        CustomerFullName = customerFullName
    });
});
adminGroup.MapPost("/sms/send-bulk", async (SendBulkSmsRequest body, SmsService sms, AppDbContext db, CancellationToken ct) =>
{
    if (body?.CustomerIds == null || body.CustomerIds.Count == 0)
        return Results.BadRequest(new { error = "En az bir müşteri seçiniz." });
    if (string.IsNullOrWhiteSpace(body.Message))
        return Results.BadRequest(new { error = "Mesaj metni giriniz." });
    var ids = body.CustomerIds.Distinct().ToList();
    var customers = await db.Customers.AsNoTracking().Where(c => ids.Contains(c.Id)).ToListAsync(ct);
    var sent = 0;
    var skipped = 0;
    foreach (var c in customers)
    {
        var isTr = string.Equals(c.Nationality?.Trim(), "TR", StringComparison.OrdinalIgnoreCase);
        if (!isTr || string.IsNullOrWhiteSpace(c.Phone))
        {
            skipped++;
            continue;
        }
        try
        {
            var (success, _) = await sms.SendRawAsync(c.Phone, body.Message.Trim(), c.Id, ct);
            if (success) sent++;
        }
        catch
        {
            skipped++;
        }
    }
    return Results.Ok(new { sent, skipped, total = customers.Count });
});

adminGroup.MapGet("/feedback/new-count", async (AppDbContext db, CancellationToken ct) =>
{
    var count = await db.Feedbacks.AsNoTracking().CountAsync(f => f.Status == "Yeni", ct);
    return Results.Ok(new { count });
});
adminGroup.MapGet("/survey/reports", async (DateOnly? dateFrom, DateOnly? dateTo, AppDbContext db, CancellationToken ct) =>
{
    var q = db.ThanksSurveyResponses.AsNoTracking().AsQueryable();
    if (dateFrom.HasValue)
        q = q.Where(x => x.CreatedAt >= dateFrom.Value.ToDateTime(TimeOnly.MinValue));
    if (dateTo.HasValue)
        q = q.Where(x => x.CreatedAt < dateTo.Value.AddDays(1).ToDateTime(TimeOnly.MinValue));

    var rows = await q.OrderByDescending(x => x.CreatedAt).ToListAsync(ct);
    var totalResponses = rows.Count;

    var surveyQuestions = new List<string>();
    var surveySetting = await db.Settings.AsNoTracking().FirstOrDefaultAsync(s => s.Key == "ThanksSurveyJson", ct);
    if (!string.IsNullOrWhiteSpace(surveySetting?.Value))
    {
        try
        {
            using var doc = JsonDocument.Parse(surveySetting.Value);
            if (doc.RootElement.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in doc.RootElement.EnumerateArray())
                {
                    var qText = item.TryGetProperty("question", out var qEl) ? (qEl.GetString() ?? "").Trim() : "";
                    surveyQuestions.Add(qText);
                }
            }
        }
        catch
        {
            // ignore malformed settings json
        }
    }

    var byDate = rows
        .GroupBy(x => DateOnly.FromDateTime(x.CreatedAt))
        .OrderByDescending(g => g.Key)
        .Select(g => new { date = g.Key.ToString("yyyy-MM-dd"), count = g.Count() })
        .ToList();

    var answerCount = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
    foreach (var r in rows)
    {
        try
        {
            var answers = JsonSerializer.Deserialize<List<string>>(r.AnswersJson ?? "[]") ?? new List<string>();
            foreach (var a in answers)
            {
                var t = (a ?? "").Trim();
                if (string.IsNullOrWhiteSpace(t)) continue;
                answerCount[t] = answerCount.GetValueOrDefault(t) + 1;
            }
        }
        catch
        {
            // ignore malformed json
        }
    }

    var topAnswers = answerCount
        .OrderByDescending(x => x.Value)
        .Take(20)
        .Select(x => new { answer = x.Key, count = x.Value })
        .ToList();

    var parsedAnswers = rows.Select(r =>
    {
        try
        {
            return JsonSerializer.Deserialize<List<string>>(r.AnswersJson ?? "[]") ?? new List<string>();
        }
        catch
        {
            return new List<string>();
        }
    }).ToList();

    var maxQuestionCount = parsedAnswers.Count > 0 ? parsedAnswers.Max(a => a.Count) : 0;
    maxQuestionCount = Math.Max(maxQuestionCount, surveyQuestions.Count);

    var questionBreakdown = new List<object>();
    for (var i = 0; i < maxQuestionCount; i++)
    {
        var thisQuestionAnswers = parsedAnswers
            .Select(a => i < a.Count ? (a[i] ?? "").Trim() : "")
            .Where(a => !string.IsNullOrWhiteSpace(a))
            .ToList();

        var answeredCount = thisQuestionAnswers.Count;
        var grouped = thisQuestionAnswers
            .GroupBy(a => a, StringComparer.OrdinalIgnoreCase)
            .Select(g =>
            {
                var cnt = g.Count();
                var pct = answeredCount == 0 ? 0m : Math.Round((decimal)cnt * 100m / answeredCount, 1);
                return new { answer = g.First(), count = cnt, percentage = pct };
            })
            .OrderByDescending(x => x.count)
            .ToList();

        var qText = i < surveyQuestions.Count ? surveyQuestions[i] : "";
        questionBreakdown.Add(new
        {
            questionIndex = i + 1,
            question = string.IsNullOrWhiteSpace(qText) ? $"Soru {i + 1}" : qText,
            answeredCount,
            options = grouped
        });
    }

    var recent = rows
        .Take(50)
        .Select(r => new { r.Id, r.CreatedAt, r.AnswersJson })
        .ToList();

    return Results.Ok(new
    {
        totalResponses,
        byDate,
        topAnswers,
        questionBreakdown,
        recent
    });
});
adminGroup.MapGet("/feedback", async (DateOnly? dateFrom, DateOnly? dateTo, string? type, AppDbContext db, CancellationToken ct) =>
{
    IQueryable<Feedback> query = db.Feedbacks.AsNoTracking();
    if (dateFrom.HasValue)
        query = query.Where(f => f.CreatedAt >= dateFrom.Value.ToDateTime(TimeOnly.MinValue));
    if (dateTo.HasValue)
        query = query.Where(f => f.CreatedAt < dateTo.Value.AddDays(1).ToDateTime(TimeOnly.MinValue));
    if (!string.IsNullOrWhiteSpace(type))
        query = query.Where(f => f.Type == type.Trim());
    var list = await (
        from f in query
        join c in db.Customers.AsNoTracking() on f.CustomerId equals c.Id into custs
        from c in custs.DefaultIfEmpty()
        orderby f.CreatedAt descending
        select new
        {
            f.Id,
            f.Type,
            f.Message,
            f.CustomerId,
            f.BookingId,
            f.Status,
            f.CreatedAt,
            f.ProcessedAt,
            CustomerPhone = c != null ? c.Phone : null
        }).ToListAsync(ct);
    return Results.Ok(list);
});
adminGroup.MapGet("/feedback/{id:int}", async (int id, AppDbContext db, CancellationToken ct) =>
{
    var fb = await db.Feedbacks.AsNoTracking().FirstOrDefaultAsync(f => f.Id == id, ct);
    if (fb == null) return Results.NotFound();
    string? customerName = null;
    string? customerPhone = null;
    if (fb.CustomerId.HasValue)
    {
        var cust = await db.Customers.AsNoTracking().Where(c => c.Id == fb.CustomerId.Value).Select(c => new { c.FullName, c.Phone }).FirstOrDefaultAsync(ct);
        customerName = cust?.FullName;
        customerPhone = cust?.Phone;
    }
    return Results.Ok(new { fb.Id, fb.Type, fb.Message, fb.CustomerId, CustomerName = customerName, CustomerPhone = customerPhone, fb.Status, fb.CreatedAt, fb.ProcessedAt });
});
adminGroup.MapPatch("/feedback/{id:int}", async (int id, AppDbContext db, CancellationToken ct) =>
{
    var f = await db.Feedbacks.FindAsync(new object[] { id }, ct);
    if (f == null) return Results.NotFound();
    f.Status = "İşleme alındı";
    f.ProcessedAt = DateTime.UtcNow;
    await db.SaveChangesAsync(ct);
    return Results.Ok(new { success = true });
});

adminGroup.MapGet("/prereservations", async (DateOnly? dateFrom, DateOnly? dateTo, string? status, string? search, int? limit, int? offset, AppDbContext db, CancellationToken ct) =>
{
    IQueryable<PreReservation> query = db.PreReservations.AsNoTracking();
    if (dateFrom.HasValue)
        query = query.Where(p => p.TourDate >= dateFrom.Value);
    if (dateTo.HasValue)
        query = query.Where(p => p.TourDate <= dateTo.Value);
    if (!string.IsNullOrWhiteSpace(status) && status != "Tümü")
        query = query.Where(p => p.Status == status.Trim());
    if (!string.IsNullOrWhiteSpace(search))
    {
        var term = search.Trim().ToLower();
        query = query.Where(p =>
            p.FullName.ToLower().Contains(term) ||
            p.Phone.ToLower().Contains(term) ||
            (p.Email != null && p.Email.ToLower().Contains(term)) ||
            (p.HotelName != null && p.HotelName.ToLower().Contains(term)));
    }
    query = query.OrderByDescending(p => p.CreatedAt);
    var total = await query.CountAsync(ct);
    var list = await query.Skip(offset ?? 0).Take(limit ?? 100).ToListAsync(ct);
    var listDto = list.Select(p => new
    {
        p.Id,
        p.FullName,
        p.Phone,
        p.Email,
        p.HotelName,
        p.AdultCount,
        p.ChildCount,
        p.BabyCount,
        p.TourDate,
        p.UseShuttle,
        p.Status,
        p.CreatedAt,
        p.UpdatedAt
    }).ToList();
    return Results.Ok(new { total, list = listDto });
});

adminGroup.MapGet("/prereservations/new-count", async (AppDbContext db, CancellationToken ct) =>
{
    var count = await db.PreReservations.AsNoTracking().CountAsync(p => p.Status == "Yeni", ct);
    return Results.Ok(new { count });
});

adminGroup.MapGet("/prereservations/{id:int}", async (int id, AppDbContext db, CancellationToken ct) =>
{
    var p = await db.PreReservations.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
    if (p == null) return Results.NotFound();
    return Results.Ok(new
    {
        p.Id,
        p.FullName,
        p.Phone,
        p.Email,
        p.HotelName,
        p.AdultCount,
        p.ChildCount,
        p.BabyCount,
        p.TourDate,
        p.UseShuttle,
        p.Status,
        p.CreatedAt,
        p.UpdatedAt,
        p.Notes
    });
});

adminGroup.MapPut("/prereservations/{id:int}", async (int id, Dictionary<string, object?> body, AppDbContext db, CancellationToken ct) =>
{
    var p = await db.PreReservations.FindAsync(new object[] { id }, ct);
    if (p == null) return Results.NotFound();

    string? GetStringOrNull(string key)
    {
        if (!body.TryGetValue(key, out var v) || v == null) return null;
        var s = v.ToString()?.Trim();
        return string.IsNullOrEmpty(s) ? null : s;
    }

    var fullName = GetStringOrNull("fullName");
    var phone = GetStringOrNull("phone");
    var email = GetStringOrNull("email");
    var hotelName = GetStringOrNull("hotelName");
    var status = GetStringOrNull("status");
    var notes = GetStringOrNull("notes");
    var tourDateStr = GetStringOrNull("tourDate");

    if (!string.IsNullOrEmpty(fullName)) p.FullName = fullName;
    if (!string.IsNullOrEmpty(phone)) p.Phone = phone;
    if (email != null) p.Email = email;
    if (hotelName != null) p.HotelName = hotelName;
    if (notes != null) p.Notes = notes;
    if (!string.IsNullOrEmpty(status) && (status == "Yeni" || status == "Satış Yapıldı" || status == "İptal"))
        p.Status = status;
    if (!string.IsNullOrEmpty(tourDateStr) && DateOnly.TryParse(tourDateStr, out var newDate))
        p.TourDate = newDate;

    p.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync(ct);
    return Results.Ok(new { id = p.Id });
});

// --- Biletler ---
adminGroup.MapGet("/tickets/next-number", async (TicketService ticketService, CancellationToken ct) =>
{
    var num = await ticketService.GetNextTicketNumberAsync(ct);
    return Results.Ok(new { ticketNumber = num });
});
adminGroup.MapGet("/tickets", async (string? ticketNo, string? fullName, DateOnly? tourDateFrom, DateOnly? tourDateTo, string? status, int? limit, int? offset, AppDbContext db, CancellationToken ct) =>
{
    var query = db.Tickets.AsNoTracking().AsQueryable();
    if (!string.IsNullOrWhiteSpace(ticketNo)) query = query.Where(t => t.TicketNumber.Contains(ticketNo.Trim()));
    if (!string.IsNullOrWhiteSpace(fullName)) query = query.Where(t => t.FullName.ToLower().Contains(fullName.Trim().ToLower()));
    if (tourDateFrom.HasValue) query = query.Where(t => t.TourDate >= tourDateFrom.Value);
    if (tourDateTo.HasValue) query = query.Where(t => t.TourDate <= tourDateTo.Value);
    if (!string.IsNullOrWhiteSpace(status)) query = query.Where(t => t.Status == status.Trim());
    var total = await query.CountAsync(ct);
    var list = await query
        .OrderByDescending(t => t.CreatedAt)
        .Skip(offset ?? 0)
        .Take(limit ?? 50)
        .Select(t => new { t.Id, t.TicketNumber, t.FullName, t.Phone, t.TourDate, t.AdultCount, t.ChildCount, t.BabyCount, t.Hotel, t.TourStartTime, t.TourEndTime, t.Note, t.HasService, t.PaymentType, t.Status, t.FilePath, t.CreatedAt })
        .ToListAsync(ct);
    return Results.Ok(new { items = list, total });
});
adminGroup.MapGet("/tickets/{id:int}", async (int id, AppDbContext db, CancellationToken ct) =>
{
    var t = await db.Tickets.AsNoTracking().Where(x => x.Id == id)
        .Select(t => new { t.Id, t.TicketNumber, t.FullName, t.Phone, t.TourDate, t.AdultCount, t.ChildCount, t.BabyCount, t.Hotel, t.TourStartTime, t.TourEndTime, t.Note, t.HasService, t.PaymentType, t.Status, t.FilePath, t.CreatedAt, t.UpdatedAt })
        .FirstOrDefaultAsync(ct);
    return t == null ? Results.NotFound() : Results.Ok(t);
});
adminGroup.MapPost("/tickets", async (HttpRequest request, AppDbContext db, TicketService ticketService, SmsService sms, CancellationToken ct) =>
{
    var body = await request.ReadFromJsonAsync<Dictionary<string, JsonElement>>(cancellationToken: ct);
    if (body == null) return Results.BadRequest(new { error = "Geçersiz istek." });
    string GetStr(string k) => body.TryGetValue(k, out var v) ? v.GetString()?.Trim() ?? "" : "";
    string? GetStrN(string k) { var s = GetStr(k); return string.IsNullOrEmpty(s) ? null : s; }
    int GetInt(string k) => body.TryGetValue(k, out var v) && v.TryGetInt32(out var n) ? n : 0;
    bool GetBool(string k) => body.TryGetValue(k, out var v) && v.ValueKind == JsonValueKind.True;

    var fullName = GetStr("fullName");
    var phone = GetStr("phone");
    if (string.IsNullOrWhiteSpace(fullName)) return Results.BadRequest(new { error = "Ad soyad giriniz." });
    if (string.IsNullOrWhiteSpace(phone)) return Results.BadRequest(new { error = "Telefon giriniz." });
    if (!DateOnly.TryParse(GetStr("tourDate"), out var tourDate)) return Results.BadRequest(new { error = "Geçerli tur tarihi giriniz." });

    var tour = await db.TourInfos.AsNoTracking().FirstOrDefaultAsync(ct);
    var ticketNumber = await ticketService.GetNextTicketNumberAsync(ct);
    var ticket = new Ticket
    {
        TicketNumber = ticketNumber,
        FullName = fullName,
        Phone = phone,
        TourDate = tourDate,
        AdultCount = Math.Max(0, GetInt("adultCount")),
        ChildCount = Math.Max(0, GetInt("childCount")),
        BabyCount = Math.Max(0, GetInt("babyCount")),
        Hotel = GetStrN("hotel"),
        TourStartTime = tour?.StartTime,
        TourEndTime = tour?.EndTime,
        Note = GetStrN("note"),
        HasService = GetBool("hasService"),
        PaymentType = GetStr("paymentType") switch { "FullPaid" => "FullPaid", "Free" => "Free", _ => "ToPay" },
        Status = "Aktif",
        CreatedAt = DateTime.UtcNow
    };
    db.Tickets.Add(ticket);
    await db.SaveChangesAsync(ct);

    try
    {
        ticket.FilePath = await ticketService.GenerateTicketImageAsync(ticket, ct);
        ticket.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }
    catch (Exception ex)
    {
        return Results.Json(new { error = "Bilet görseli oluşturulamadı: " + ex.Message }, statusCode: 500);
    }

    try
    {
        var settings = await db.Settings.AsNoTracking().ToDictionaryAsync(s => s.Key, s => s.Value, ct);
        settings.TryGetValue("DeskRegistrationUrl", out var deskUrlRaw);
        var deskUrl = string.IsNullOrWhiteSpace(deskUrlRaw) ? "https://vikingoludeniz.xyz/desk" : deskUrlRaw.Trim();
        var tourDateTr = ticket.TourDate.ToString("d", CultureInfo.GetCultureInfo("tr-TR"));
        await sms.SendWithTemplateAsync(
            ticket.Phone,
            "ticket-desk",
            new Dictionary<string, string> { ["TourDate"] = tourDateTr, ["DeskUrl"] = deskUrl },
            customerId: null,
            ct);
    }
    catch
    {
        // SMS hatası bilet kesmeyi geri almaz; SmsDeliveryLog üzerinden izlenir
    }

    return Results.Ok(new { id = ticket.Id, ticketNumber = ticket.TicketNumber, filePath = ticket.FilePath });
});
adminGroup.MapPut("/tickets/{id:int}", async (int id, HttpRequest request, AppDbContext db, TicketService ticketService, CancellationToken ct) =>
{
    var ticket = await db.Tickets.FindAsync(new object[] { id }, ct);
    if (ticket == null) return Results.NotFound();
    var body = await request.ReadFromJsonAsync<Dictionary<string, JsonElement>>(cancellationToken: ct);
    if (body == null) return Results.BadRequest(new { error = "Geçersiz istek." });
    string GetStr(string k) => body.TryGetValue(k, out var v) ? v.GetString()?.Trim() ?? "" : "";
    string? GetStrN(string k) { var s = GetStr(k); return string.IsNullOrEmpty(s) ? null : s; }
    int GetInt(string k) => body.TryGetValue(k, out var v) && v.TryGetInt32(out var n) ? n : 0;
    bool GetBool(string k) => body.TryGetValue(k, out var v) && v.ValueKind == JsonValueKind.True;

    var fullName = GetStr("fullName");
    var phone = GetStr("phone");
    if (!string.IsNullOrWhiteSpace(fullName)) ticket.FullName = fullName;
    if (!string.IsNullOrWhiteSpace(phone)) ticket.Phone = phone;
    if (DateOnly.TryParse(GetStr("tourDate"), out var tourDate)) ticket.TourDate = tourDate;
    ticket.AdultCount = Math.Max(0, GetInt("adultCount"));
    ticket.ChildCount = Math.Max(0, GetInt("childCount"));
    ticket.BabyCount = Math.Max(0, GetInt("babyCount"));
    ticket.Hotel = GetStrN("hotel");
    ticket.Note = GetStrN("note");
    ticket.HasService = GetBool("hasService");
    var pt = GetStr("paymentType");
    if (pt == "FullPaid" || pt == "Free" || pt == "ToPay") ticket.PaymentType = pt;
    var st = GetStr("status");
    if (st == "Aktif" || st == "İptal") ticket.Status = st;

    var tour = await db.TourInfos.AsNoTracking().FirstOrDefaultAsync(ct);
    ticket.TourStartTime = tour?.StartTime;
    ticket.TourEndTime = tour?.EndTime;
    ticket.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync(ct);

    try
    {
        ticket.FilePath = await ticketService.GenerateTicketImageAsync(ticket, ct);
        await db.SaveChangesAsync(ct);
    }
    catch { /* görsel güncellenemediyse devam et */ }

    return Results.Ok(new { id = ticket.Id, filePath = ticket.FilePath });
});
adminGroup.MapGet("/tickets/{id:int}/file", async (int id, AppDbContext db, IWebHostEnvironment env, CancellationToken ct) =>
{
    var filePath = await db.Tickets.AsNoTracking().Where(t => t.Id == id).Select(t => t.FilePath).FirstOrDefaultAsync(ct);
    if (string.IsNullOrEmpty(filePath)) return Results.NotFound();
    var path = Path.Combine(env.ContentRootPath, "wwwroot", filePath.TrimStart('/'));
    if (!System.IO.File.Exists(path)) return Results.NotFound();
    var fileName = Path.GetFileName(path);
    return TypedResults.PhysicalFile(path, "image/jpeg", fileName);
});

// --- Acentalar ---
static string GenerateAgencyShortCode()
{
    const string chars = "abcdefghjkmnpqrstuvwxyz23456789";
    var r = new Random();
    var code = new char[6];
    for (int i = 0; i < 6; i++) code[i] = chars[r.Next(chars.Length)];
    return new string(code);
}
adminGroup.MapGet("/agencies", async (AppDbContext db, CancellationToken ct) =>
{
    var list = await db.Agencies.AsNoTracking()
        .OrderBy(a => a.Name)
        .Select(a => new { a.Id, a.Name, a.ContactFullName, a.Phone, a.Email, a.ShortCode, a.CreatedAt })
        .ToListAsync(ct);
    return Results.Ok(list);
});
adminGroup.MapGet("/agencies/{id:int}", async (int id, AppDbContext db, CancellationToken ct) =>
{
    var a = await db.Agencies.AsNoTracking().Where(x => x.Id == id)
        .Select(a => new { a.Id, a.Name, a.ContactFullName, a.Phone, a.Email, a.ShortCode, a.CreatedAt, a.UpdatedAt })
        .FirstOrDefaultAsync(ct);
    return a == null ? Results.NotFound() : Results.Ok(a);
});
adminGroup.MapPost("/agencies", async (CreateAgencyRequest body, AppDbContext db, CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(body?.Name)) return Results.BadRequest(new { error = "Acenta adı giriniz." });
    if (string.IsNullOrWhiteSpace(body.ContactFullName)) return Results.BadRequest(new { error = "Yetkili ad soyad giriniz." });
    if (string.IsNullOrWhiteSpace(body.Phone)) return Results.BadRequest(new { error = "Telefon giriniz." });
    if (string.IsNullOrWhiteSpace(body.Username)) return Results.BadRequest(new { error = "Kullanıcı adı giriniz." });
    if (string.IsNullOrWhiteSpace(body.Password) || body.Password.Trim().Length < 6)
        return Results.BadRequest(new { error = "Şifre en az 6 karakter olmalıdır." });
    var username = body.Username.Trim();
    if (await db.Users.AnyAsync(u => u.Email.ToLower() == username.ToLower(), ct))
        return Results.BadRequest(new { error = "Bu kullanıcı adı zaten kullanılıyor." });
    string shortCode = GenerateAgencyShortCode();
    for (int i = 0; i < 20 && await db.Agencies.AnyAsync(a => a.ShortCode == shortCode, ct); i++)
        shortCode = GenerateAgencyShortCode();
    if (await db.Agencies.AnyAsync(a => a.ShortCode == shortCode, ct))
        return Results.Json(new { error = "Kısa kod üretilemedi, tekrar deneyin." }, statusCode: 500);
    var agency = new Agency
    {
        Name = body.Name.Trim(),
        ContactFullName = body.ContactFullName.Trim(),
        Phone = body.Phone.Trim(),
        Email = string.IsNullOrWhiteSpace(body.Email) ? null : body.Email.Trim(),
        ShortCode = shortCode,
        CreatedAt = DateTime.UtcNow
    };
    db.Agencies.Add(agency);
    await db.SaveChangesAsync(ct);

    var agencyUser = new User
    {
        FullName = body.ContactFullName.Trim(),
        AgencyId = agency.Id,
        Email = username,
        PasswordHash = AuthService.HashPassword(body.Password.Trim()),
        Role = "Acenta",
        IsActive = true,
        CreatedAt = DateTime.UtcNow
    };
    db.Users.Add(agencyUser);
    await db.SaveChangesAsync(ct);
    return Results.Ok(new { id = agency.Id, shortCode = agency.ShortCode, name = agency.Name });
});
adminGroup.MapPut("/agencies/{id:int}", async (int id, UpdateAgencyRequest body, AppDbContext db, CancellationToken ct) =>
{
    var a = await db.Agencies.FindAsync(new object[] { id }, ct);
    if (a == null) return Results.NotFound();
    if (!string.IsNullOrWhiteSpace(body?.Name)) a.Name = body.Name.Trim();
    if (!string.IsNullOrWhiteSpace(body?.ContactFullName)) a.ContactFullName = body.ContactFullName.Trim();
    if (!string.IsNullOrWhiteSpace(body?.Phone)) a.Phone = body.Phone.Trim();
    if (body != null) a.Email = string.IsNullOrWhiteSpace(body.Email) ? null : body.Email.Trim();
    a.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync(ct);
    return Results.Ok(new { id = a.Id });
});
adminGroup.MapDelete("/agencies/{id:int}", async (int id, AppDbContext db, CancellationToken ct) =>
{
    var a = await db.Agencies.FindAsync(new object[] { id }, ct);
    if (a == null) return Results.NotFound();

    var hasBooking = await db.DailyBookings.AsNoTracking()
        .AnyAsync(b => b.AgencyName != null && b.AgencyName.Trim().ToLower() == a.Name.Trim().ToLower(), ct);
    if (hasBooking)
        return Results.BadRequest(new { error = "Bu acentaya ait kayıtlar bulunduğu için silinemez." });

    var agencyUsers = await db.Users.Where(u => u.AgencyId == id).ToListAsync(ct);
    foreach (var u in agencyUsers)
        db.Users.Remove(u);
    db.Agencies.Remove(a);
    await db.SaveChangesAsync(ct);
    return Results.Ok(new { id });
});

/// <summary>Seçilen acentanın AgencyName ile eşleşen tüm günlük kayıtları (müşteri satırları).</summary>
adminGroup.MapGet("/agencies/{id:int}/registrations", async (int id, AppDbContext db, CancellationToken ct) =>
{
    var agency = await db.Agencies.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id, ct);
    if (agency == null) return Results.NotFound();
    var nameNorm = agency.Name.Trim();
    var nameLower = nameNorm.ToLowerInvariant();

    var bookings = await db.DailyBookings
        .AsNoTracking()
        .Include(b => b.Customer)
        .Where(b => b.AgencyName != null && b.AgencyName.Trim().ToLower() == nameLower)
        .OrderByDescending(b => b.TourDate)
        .ThenByDescending(b => b.Id)
        .ToListAsync(ct);

    static DateTime TruncateToMinuteUtc(DateTime dt)
    {
        var u = dt.Kind == DateTimeKind.Utc ? dt : dt.ToUniversalTime();
        return new DateTime(u.Year, u.Month, u.Day, u.Hour, u.Minute, 0, DateTimeKind.Utc);
    }

    var groupCounts = bookings
        .GroupBy(b => new { b.TourDate, RegMin = TruncateToMinuteUtc(b.Customer.CreatedAt) })
        .ToDictionary(g => g.Key, g => g.Count());

    var list = bookings.Select(b =>
    {
        var key = new { b.TourDate, RegMin = TruncateToMinuteUtc(b.Customer.CreatedAt) };
        var personCount = groupCounts.TryGetValue(key, out var c) ? c : 1;
        return new AgencyRegistrationRowDto(
            b.TourDate.ToString("yyyy-MM-dd"),
            b.Customer.FullName ?? "",
            b.Customer.Phone,
            personCount,
            string.IsNullOrWhiteSpace(b.Customer.AccommodationPlace) ? null : b.Customer.AccommodationPlace,
            b.UseShuttle,
            b.Customer.CreatedAt.ToUniversalTime().ToString("o")
        );
    }).ToList();

    return Results.Ok(list);
});

adminGroup.MapGet("/users", async (AppDbContext db, CancellationToken ct) =>
{
    var list = await db.Users.AsNoTracking()
        .OrderBy(u => u.FullName)
        .Select(u => new { u.Id, u.Email, u.FullName, u.Role, u.IsActive, u.CreatedAt, u.LastLoginAt })
        .ToListAsync(ct);
    return Results.Ok(list);
});
adminGroup.MapPost("/users", async (CreateUserRequest body, AppDbContext db, AuthService auth, CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(body?.Email))
        return Results.BadRequest(new { error = "E-posta giriniz." });
    if (string.IsNullOrWhiteSpace(body.Password) || body.Password.Length < 6)
        return Results.BadRequest(new { error = "Şifre en az 6 karakter olmalıdır." });
    if (string.IsNullOrWhiteSpace(body.FullName))
        return Results.BadRequest(new { error = "Ad soyad giriniz." });
    var role = (body.Role ?? "").Trim();
    if (role != "Admin" && role != "Çalışan")
        return Results.BadRequest(new { error = "Rol seçiniz: Admin veya Çalışan." });
    var emailNorm = body.Email.Trim().ToLowerInvariant();
    if (await db.Users.AnyAsync(u => u.Email.ToLower() == emailNorm, ct))
        return Results.BadRequest(new { error = "Bu e-posta adresi zaten kayıtlı." });
    var user = new User
    {
        Email = body.Email.Trim(),
        FullName = body.FullName.Trim(),
        PasswordHash = AuthService.HashPassword(body.Password),
        Role = role,
        IsActive = true,
        CreatedAt = DateTime.UtcNow
    };
    db.Users.Add(user);
    await db.SaveChangesAsync(ct);
    return Results.Ok(new { id = user.Id });
});

adminGroup.MapGet("/documents", async (AppDbContext db, CancellationToken ct) =>
{
    var list = await db.Documents.AsNoTracking()
        .Where(d => (d.DocType == "menu" || d.DocType == "rules") && (d.Language == "TR" || d.Language == "EN"))
        .OrderBy(d => d.DocType).ThenBy(d => d.Language)
        .Select(d => new { d.DocType, d.Language, d.FileUrl })
        .ToListAsync(ct);
    return Results.Ok(list);
});
adminGroup.MapPut("/documents", async (DocumentUpdateRequest body, AppDbContext db, CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(body?.DocType) || string.IsNullOrWhiteSpace(body.Language))
        return Results.BadRequest(new { error = "DocType ve Language gerekli." });
    if (body.DocType != "menu" && body.DocType != "rules")
        return Results.BadRequest(new { error = "DocType 'menu' veya 'rules' olmalı." });
    if (body.Language != "TR" && body.Language != "EN")
        return Results.BadRequest(new { error = "Language 'TR' veya 'EN' olmalı." });
    var doc = await db.Documents.FirstOrDefaultAsync(d => d.DocType == body.DocType && d.Language == body.Language, ct);
    if (doc == null)
    {
        doc = new Document { DocType = body.DocType, Language = body.Language };
        db.Documents.Add(doc);
    }
    doc.FileUrl = string.IsNullOrWhiteSpace(body.FileUrl) ? null : body.FileUrl.Trim();
    doc.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync(ct);
    return Results.Ok();
});

var tourGroup = app.MapGroup("/api/tour").RequireAuthorization();
tourGroup.MapGet("/", async (AppDbContext db, CancellationToken ct) =>
{
    var tour = await db.TourInfos.AsNoTracking().FirstOrDefaultAsync(ct);
    return tour == null ? Results.Ok((object?)null) : Results.Ok(new { tour.Id, tour.Title, tour.Description, tour.StartTime, tour.EndTime, tour.DurationMinutes, durationHours = tour.DurationMinutes.HasValue ? Math.Round(tour.DurationMinutes.Value / 60.0, 1) : (double?)null, tour.DeparturePoint, tour.ImageUrl });
});
tourGroup.MapPut("/", async (TourUpdateDto body, AppDbContext db, CancellationToken ct) =>
{
    var tour = await db.TourInfos.FirstOrDefaultAsync(ct);
    if (tour == null) { tour = new TourInfo(); db.TourInfos.Add(tour); }
    tour.Title = body.Title ?? tour.Title;
    tour.Description = body.Description ?? tour.Description;
    if (!string.IsNullOrWhiteSpace(body.StartTime) && TimeOnly.TryParse(body.StartTime.Trim(), out var startVal))
        tour.StartTime = startVal;
    else if (body.StartTime != null)
        tour.StartTime = null;
    if (!string.IsNullOrWhiteSpace(body.EndTime) && TimeOnly.TryParse(body.EndTime.Trim(), out var endVal))
        tour.EndTime = endVal;
    else if (body.EndTime != null)
        tour.EndTime = null;
    if (body.DurationHours.HasValue) tour.DurationMinutes = (int)(body.DurationHours.Value * 60);
    else if (body.DurationMinutes.HasValue) tour.DurationMinutes = body.DurationMinutes;
    tour.DeparturePoint = body.DeparturePoint ?? tour.DeparturePoint;
    tour.ImageUrl = body.ImageUrl ?? tour.ImageUrl;
    tour.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync(ct);
    return Results.Ok(new { tour.Id });
});

var stopsGroup = app.MapGroup("/api/stops").RequireAuthorization();
stopsGroup.MapGet("/", async (AppDbContext db, CancellationToken ct) =>
{
    var list = await db.Stops.AsNoTracking().Where(s => true).OrderBy(s => s.OrderIndex).Select(s => new { s.Id, s.Name, s.Description, s.ImageUrl, s.OrderIndex, s.IsActive }).ToListAsync(ct);
    return Results.Ok(list);
});
stopsGroup.MapPost("/", async (StopCreateDto body, AppDbContext db, CancellationToken ct) =>
{
    var maxOrder = await db.Stops.MaxAsync(s => (int?)s.OrderIndex, ct) ?? 0;
    var stop = new Stop { Name = body.Name ?? "", Description = body.Description, ImageUrl = body.ImageUrl, OrderIndex = maxOrder + 1, IsActive = true };
    db.Stops.Add(stop);
    await db.SaveChangesAsync(ct);
    return Results.Ok(new { stop.Id });
});
stopsGroup.MapPut("/{id:int}", async (int id, StopUpdateDto body, AppDbContext db, CancellationToken ct) =>
{
    var stop = await db.Stops.FindAsync(new object[] { id }, ct);
    if (stop == null) return Results.NotFound();
    stop.Name = body.Name ?? stop.Name;
    stop.Description = body.Description;
    stop.ImageUrl = body.ImageUrl;
    if (body.IsActive.HasValue) stop.IsActive = body.IsActive.Value;
    if (body.OrderIndex.HasValue) stop.OrderIndex = body.OrderIndex.Value;
    await db.SaveChangesAsync(ct);
    return Results.Ok(new { stop.Id });
});
stopsGroup.MapDelete("/{id:int}", async (int id, AppDbContext db, CancellationToken ct) =>
{
    var stop = await db.Stops.FindAsync(new object[] { id }, ct);
    if (stop == null) return Results.NotFound();
    db.Stops.Remove(stop);
    await db.SaveChangesAsync(ct);
    return Results.Ok();
});
stopsGroup.MapPost("/reorder", async (ReorderStopsRequest body, AppDbContext db, CancellationToken ct) =>
{
    if (body?.OrderedIds == null || body.OrderedIds.Count == 0) return Results.BadRequest();
    for (var i = 0; i < body.OrderedIds.Count; i++)
    {
        var stop = await db.Stops.FindAsync(new object[] { body.OrderedIds[i] }, ct);
        if (stop != null) stop.OrderIndex = i;
    }
    await db.SaveChangesAsync(ct);
    return Results.Ok();
});

var uploadGroup = app.MapGroup("/api/upload").RequireAuthorization();
uploadGroup.MapPost("/", async (HttpRequest request, CancellationToken ct) =>
{
    try
    {
        if (!request.HasFormContentType)
            return Results.Json(new { error = "Form verisi gerekli." }, statusCode: 400);
        var form = await request.ReadFormAsync(ct);
        var file = form.Files.GetFile("file");
        if (file == null || file.Length == 0)
            return Results.Json(new { error = "Dosya seçiniz." }, statusCode: 400);
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (string.IsNullOrEmpty(ext)) ext = ".bin";
        var name = $"{Guid.NewGuid():N}{ext}";
        Directory.CreateDirectory(uploadsRoot);
        var path = Path.Combine(uploadsRoot, name);
        await using (var stream = File.Create(path))
            await file.CopyToAsync(stream, ct);
        return Results.Ok(new { url = $"/uploads/{name}" });
    }
    catch (Exception ex)
    {
        var msg = ex.InnerException?.Message ?? ex.Message;
        return Results.Json(new { error = "Yükleme hatası: " + msg }, statusCode: 500);
    }
}).DisableAntiforgery();

var settingsGroup = app.MapGroup("/api/settings").RequireAuthorization();
settingsGroup.MapGet("/", async (AppDbContext db, CancellationToken ct) =>
{
    var dict = await db.Settings.AsNoTracking().ToDictionaryAsync(s => s.Key, s => s.Value, ct);
    return Results.Ok(dict);
});
settingsGroup.MapPut("/", async (Dictionary<string, string?> body, AppDbContext db, CancellationToken ct) =>
{
    foreach (var (key, value) in body ?? new Dictionary<string, string?>())
    {
        var setting = await db.Settings.FirstOrDefaultAsync(s => s.Key == key, ct);
        if (setting == null) { setting = new Setting { Key = key }; db.Settings.Add(setting); }
        setting.Value = value;
        setting.UpdatedAt = DateTime.UtcNow;
    }
    await db.SaveChangesAsync(ct);
    return Results.Ok();
});

app.MapGet("/api/landing/data", async (string? token, LandingService landing, HttpContext httpContext, CancellationToken ct) =>
{
    var validated = landing.ValidateToken(token);
    if (validated == null)
        return Results.Json(new { error = "Bu link artık aktif değil." }, statusCode: 404);
    var data = await landing.GetLandingDataAsync(validated.Value.BookingId, ct);
    if (data == null)
        return Results.Json(new { error = "Bu link artık aktif değil." }, statusCode: 404);
    var baseUrl = $"{httpContext.Request.Scheme}://{httpContext.Request.Host}";
    string? ToAbsolute(string? url) => string.IsNullOrEmpty(url) ? url : url.StartsWith("/", StringComparison.Ordinal) ? baseUrl + url : url;
    var stopsWithAbs = data.Stops.Select(s => new LandingStopDto(s.Name, s.Description, ToAbsolute(s.ImageUrl))).ToList();
    var tourWithAbs = data.Tour == null ? null : new LandingTourDto(data.Tour.Title, data.Tour.Description, data.Tour.StartTime, data.Tour.EndTime, data.Tour.DurationMinutes, data.Tour.DeparturePoint, ToAbsolute(data.Tour.ImageUrl));
    var dto = new LandingDataDto(data.CustomerName, data.TourDate, tourWithAbs, stopsWithAbs, ToAbsolute(data.MenuPdfTr), ToAbsolute(data.MenuPdfEn), ToAbsolute(data.RulesPdfTr), ToAbsolute(data.RulesPdfEn), data.InstagramUrl, data.GoogleReviewsUrl, data.TripAdvisorUrl);
    return Results.Ok(dto);
});

app.MapGet("/api/landing/create-token", async (int bookingId, LandingService landing, CancellationToken ct) =>
{
    var token = await landing.CreateTokenForBookingAsync(bookingId, ct);
    if (token == null)
        return Results.NotFound(new { error = "Kayıt bulunamadı." });
    var baseUrl = "http://localhost:3000";
    return Results.Ok(new { token, url = $"{baseUrl}?token={token}" });
}).AllowAnonymous();

app.MapGet("/api/landing/thanks-settings", async (AppDbContext db, CancellationToken ct) =>
{
    var dict = await db.Settings.AsNoTracking().Where(s => s.Key == "InstagramUrl" || s.Key == "GoogleReviewsUrl" || s.Key == "TripAdvisorUrl" || s.Key == "ThanksPageDescription" || s.Key == "ThanksSurveyJson").ToDictionaryAsync(s => s.Key, s => s.Value, ct);
    dict.TryGetValue("InstagramUrl", out var instagramUrl);
    dict.TryGetValue("GoogleReviewsUrl", out var googleReviewsUrl);
    dict.TryGetValue("TripAdvisorUrl", out var tripAdvisorUrl);
    dict.TryGetValue("ThanksPageDescription", out var thanksPageDescription);
    dict.TryGetValue("ThanksSurveyJson", out var thanksSurveyJson);
    return Results.Ok(new { instagramUrl, googleReviewsUrl, tripAdvisorUrl, thanksPageDescription, thanksSurveyJson });
}).AllowAnonymous();

app.MapGet("/api/agency-by-code", async (string? code, AppDbContext db, CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(code))
        return Results.BadRequest(new { error = "code gerekli." });
    var name = await db.Agencies.AsNoTracking()
        .Where(a => a.ShortCode == code.Trim())
        .Select(a => a.Name)
        .FirstOrDefaultAsync(ct);
    if (name == null)
        return Results.NotFound(new { error = "Acenta bulunamadı." });
    return Results.Ok(new { name });
}).AllowAnonymous();

app.MapPost("/api/landing/feedback", async (SubmitFeedbackRequest body, LandingService landing, AppDbContext db, CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(body?.Token))
        return Results.BadRequest(new { error = "Geçerli bir link ile erişin." });
    var validated = landing.ValidateToken(body.Token);
    if (validated == null)
        return Results.Json(new { error = "Bu link artık aktif değil." }, statusCode: 404);
    var typeNorm = (body.Type ?? "").Trim();
    if (typeNorm != "Dilek" && typeNorm != "İstek" && typeNorm != "Şikayet" && typeNorm != "Istek" && typeNorm != "Sikayet")
        return Results.BadRequest(new { error = "Tür seçiniz: Dilek, İstek veya Şikayet." });
    if (typeNorm == "Istek") typeNorm = "İstek";
    if (typeNorm == "Sikayet") typeNorm = "Şikayet";
    var message = (body.Message ?? "").Trim();
    if (string.IsNullOrEmpty(message))
        return Results.BadRequest(new { error = "Mesaj giriniz." });
    var booking = await db.DailyBookings.AsNoTracking().FirstOrDefaultAsync(b => b.Id == validated.Value.BookingId, ct);
    var customerId = booking?.CustomerId;
    db.Feedbacks.Add(new Feedback
    {
        Type = typeNorm,
        Message = message,
        CustomerId = customerId,
        BookingId = validated.Value.BookingId,
        Status = "Yeni",
        CreatedAt = DateTime.UtcNow
    });
    await db.SaveChangesAsync(ct);
    return Results.Ok(new { success = true });
}).AllowAnonymous();

app.MapPost("/api/landing/thanks-survey", async (HttpRequest request, AppDbContext db, CancellationToken ct) =>
{
    var body = await request.ReadFromJsonAsync<Dictionary<string, object?>>(cancellationToken: ct);
    if (body == null) return Results.BadRequest(new { error = "Geçersiz istek." });

    if (!body.TryGetValue("answers", out var answersObj) || answersObj == null)
        return Results.BadRequest(new { error = "answers gerekli." });

    var answers = new List<string>();
    if (answersObj is JsonElement je && je.ValueKind == JsonValueKind.Array)
    {
        foreach (var item in je.EnumerateArray())
        {
            var s = item.GetString()?.Trim();
            if (!string.IsNullOrWhiteSpace(s)) answers.Add(s);
        }
    }
    else if (answersObj is IEnumerable<string> list)
    {
        answers = list.Select(x => x?.Trim()).Where(x => !string.IsNullOrWhiteSpace(x)).Cast<string>().ToList();
    }

    if (answers.Count == 0)
        return Results.BadRequest(new { error = "En az bir cevap gerekli." });

    var json = JsonSerializer.Serialize(answers);
    db.ThanksSurveyResponses.Add(new ThanksSurveyResponse
    {
        CreatedAt = DateTime.UtcNow,
        AnswersJson = json
    });
    await db.SaveChangesAsync(ct);
    return Results.Ok(new { success = true });
}).AllowAnonymous();

app.MapGet("/api/marketing/landing", async (AppDbContext db, HttpContext httpContext, CancellationToken ct) =>
{
    var tour = await db.TourInfos.AsNoTracking().FirstOrDefaultAsync(ct);
    var stops = await db.Stops.AsNoTracking().Where(s => s.IsActive).OrderBy(s => s.OrderIndex).ToListAsync(ct);
    var settings = await db.Settings.AsNoTracking().ToDictionaryAsync(s => s.Key, s => s.Value, ct);

    var baseUrl = $"{httpContext.Request.Scheme}://{httpContext.Request.Host}";
    string? ToAbsolute(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return url;
        var t = url.Trim();
        if (t.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || t.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            return t;
        return t.StartsWith('/') ? baseUrl + t : $"{baseUrl}/{t}";
    }

    var tourTitle = tour?.Title ?? "Günlük Tekne Turu";
    var startTime = tour?.StartTime?.ToString("HH:mm");
    var endTime = tour?.EndTime?.ToString("HH:mm");
    var departurePoint = tour?.DeparturePoint;
    var departureMapUrl = ToAbsolute(tour?.DepartureMapUrl);

    settings.TryGetValue("MarketingBannerUrl", out var bannerUrl);
    settings.TryGetValue("MarketingServices", out var services);
    settings.TryGetValue("MarketingServicesEn", out var servicesEn);
    settings.TryGetValue("MarketingPrice", out var price);
    settings.TryGetValue("MarketingVideoUrl", out var videoUrl);
    settings.TryGetValue("MarketingGalleryJson", out var galleryJson);
    settings.TryGetValue("InstagramUrl", out var instagramUrl);
    settings.TryGetValue("TripAdvisorUrl", out var tripAdvisorUrl);
    settings.TryGetValue("YoutubeUrl", out var youtubeUrl);
    settings.TryGetValue("MarketingGoogleReviewsUrl", out var marketingGoogleReviewsUrl);
    settings.TryGetValue("GoogleReviewsUrl", out var globalGoogleReviewsUrl);
    settings.TryGetValue("MarketingLocationMapUrl", out var marketingLocationMapUrl);
    settings.TryGetValue("MarketingLocationMapEmbedUrl", out var marketingLocationMapEmbedUrl);
    settings.TryGetValue("MarketingServiceLocationMapUrl", out var marketingServiceLocationMapUrl);
    settings.TryGetValue("MarketingServiceLocationMapEmbedUrl", out var marketingServiceLocationMapEmbedUrl);
    settings.TryGetValue("MarketingRedbookUrl", out var marketingRedbookUrl);

    var googleReviewsForPage = string.IsNullOrWhiteSpace(marketingGoogleReviewsUrl) ? globalGoogleReviewsUrl : marketingGoogleReviewsUrl;

    var menuPdfTr = await db.Documents.AsNoTracking()
        .Where(d => d.DocType == "menu" && d.Language == "TR")
        .Select(d => d.FileUrl)
        .FirstOrDefaultAsync(ct);
    var menuPdfEn = await db.Documents.AsNoTracking()
        .Where(d => d.DocType == "menu" && d.Language == "EN")
        .Select(d => d.FileUrl)
        .FirstOrDefaultAsync(ct);

    var rulesPdfTr = await db.Documents.AsNoTracking()
        .Where(d => d.DocType == "rules" && d.Language == "TR")
        .Select(d => d.FileUrl)
        .FirstOrDefaultAsync(ct);
    var rulesPdfEn = await db.Documents.AsNoTracking()
        .Where(d => d.DocType == "rules" && d.Language == "EN")
        .Select(d => d.FileUrl)
        .FirstOrDefaultAsync(ct);

    var gallery = new List<MarketingGalleryItemDto>();
    if (!string.IsNullOrWhiteSpace(galleryJson))
    {
        try
        {
            var parsed = System.Text.Json.JsonSerializer.Deserialize<List<MarketingGalleryItemDto>>(
                galleryJson,
                new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            );
            if (parsed != null)
                gallery = parsed.Select(g => new MarketingGalleryItemDto(ToAbsolute(g.Url) ?? "", g.Title)).ToList();
        }
        catch
        {
            // ignore parse errors
        }
    }

    var dto = new MarketingLandingDto(
        tourTitle,
        startTime,
        endTime,
        departurePoint,
        departureMapUrl,
        stops.Select(s => new LandingStopDto(s.Name, s.Description, ToAbsolute(s.ImageUrl))).ToList(),
        services,
        servicesEn,
        price,
        ToAbsolute(bannerUrl),
        gallery,
        videoUrl,
        ToAbsolute(menuPdfTr),
        ToAbsolute(menuPdfEn),
        instagramUrl,
        tripAdvisorUrl,
        youtubeUrl,
        googleReviewsForPage,
        marketingLocationMapUrl,
        marketingLocationMapEmbedUrl,
        ToAbsolute(rulesPdfTr),
        ToAbsolute(rulesPdfEn),
        marketingServiceLocationMapUrl,
        marketingServiceLocationMapEmbedUrl,
        marketingRedbookUrl
    );
    return Results.Ok(dto);
}).AllowAnonymous();

app.MapPost("/api/landing/prereservation", async (AppDbContext db, HttpRequest request, CancellationToken ct) =>
{
    var body = await request.ReadFromJsonAsync<Dictionary<string, object?>>(cancellationToken: ct);
    if (body == null)
        return Results.BadRequest(new { error = "Geçersiz istek." });

    // JSON Dictionary'de değerler JsonElement olarak gelir; string/int kontrolü buna göre yapılmalı
    static string ObjToString(object? v)
    {
        if (v == null) return string.Empty;
        if (v is string s) return s.Trim();
        if (v is JsonElement je) return je.GetString()?.Trim() ?? string.Empty;
        return v.ToString()?.Trim() ?? string.Empty;
    }
    static string? ObjToStringOrNull(object? v)
    {
        var s = ObjToString(v);
        return string.IsNullOrEmpty(s) ? null : s;
    }
    string GetString(string key) => body.TryGetValue(key, out var v) ? ObjToString(v) : string.Empty;
    string? GetStringOrNull(string key) => body.TryGetValue(key, out var v) ? ObjToStringOrNull(v) : null;

    var fullName = GetString("fullName");
    var phone = GetString("phone");
    var email = GetStringOrNull("email");
    var hotelName = GetStringOrNull("hotelName");
    var tourDateStr = GetString("tourDate");

    if (string.IsNullOrWhiteSpace(fullName))
        return Results.BadRequest(new { error = "Ad soyad giriniz." });
    if (string.IsNullOrWhiteSpace(phone))
        return Results.BadRequest(new { error = "Telefon giriniz." });
    if (string.IsNullOrWhiteSpace(tourDateStr) || !DateOnly.TryParse(tourDateStr, out var tourDate))
        return Results.BadRequest(new { error = "Geçerli bir tur tarihi giriniz (YYYY-MM-DD)." });

    int GetInt(string key)
    {
        if (!body.TryGetValue(key, out var v) || v == null) return 0;
        if (v is int i && i >= 0) return i;
        if (v is JsonElement je && je.TryGetInt32(out var n) && n >= 0) return n;
        return int.TryParse(ObjToString(v), out var parsed) && parsed >= 0 ? parsed : 0;
    }
    bool GetBool(string key)
    {
        if (!body.TryGetValue(key, out var v) || v == null) return false;
        if (v is bool b) return b;
        if (v is JsonElement je && je.ValueKind == JsonValueKind.True) return true;
        return false;
    }

    var adultCount = GetInt("adultCount");
    var childCount = GetInt("childCount");
    var babyCount = GetInt("babyCount");
    var useShuttle = GetBool("useShuttle");

    var pre = new PreReservation
    {
        FullName = fullName,
        Phone = phone,
        Email = email,
        HotelName = hotelName,
        AdultCount = adultCount,
        ChildCount = childCount,
        BabyCount = babyCount,
        TourDate = tourDate,
        UseShuttle = useShuttle,
        Status = "Yeni",
        CreatedAt = DateTime.UtcNow
    };
    db.PreReservations.Add(pre);
    await db.SaveChangesAsync(ct);
    return Results.Ok(new { id = pre.Id });
}).AllowAnonymous();

app.MapGet("/t/{shortCode}", async (string shortCode, HttpContext httpContext, ShortLinkService shortLink, LandingService landing, AppDbContext db, CancellationToken ct) =>
{
    var userAgent = httpContext.Request.Headers.UserAgent.FirstOrDefault();
    var ip = httpContext.Connection.RemoteIpAddress?.ToString();
    var bookingId = await shortLink.ResolveAndRecordClickAsync(shortCode, userAgent, ip, ct);

    if (bookingId == null)
    {
        if (shortCode.Equals("thanks", StringComparison.OrdinalIgnoreCase))
        {
            var thanksUrl = (await db.Settings.AsNoTracking().FirstOrDefaultAsync(s => s.Key == "ThanksPageUrl", ct))?.Value?.Trim();
            if (string.IsNullOrEmpty(thanksUrl))
                thanksUrl = (await db.Settings.AsNoTracking().FirstOrDefaultAsync(s => s.Key == "LandingBaseUrl", ct))?.Value?.TrimEnd('/') + "/thanks";
            return Results.Redirect(string.IsNullOrEmpty(thanksUrl) ? "http://localhost:3000/thanks" : thanksUrl);
        }
        return Results.NotFound();
    }

    var token = await landing.CreateTokenForBookingAsync(bookingId.Value, ct);
    var landingBase = (await db.Settings.AsNoTracking().FirstOrDefaultAsync(s => s.Key == "LandingBaseUrl", ct))?.Value?.Trim().TrimEnd('/') ?? "http://localhost:3000/landing";
    // /landing veya /landing/ değerlerinden bağımsız olarak her zaman /landing/ şeklinde kullan
    if (landingBase.EndsWith("/landing", StringComparison.OrdinalIgnoreCase))
        landingBase += "/";
    var redirectUrl = string.IsNullOrEmpty(token) ? landingBase : $"{landingBase}?token={token}";
    return Results.Redirect(redirectUrl);
}).AllowAnonymous();

var webhookGroup = app.MapGroup("/api/webhooks/netgsm").AllowAnonymous();
webhookGroup.MapPost("/iys", async (NetgsmIysWebhookRequest? body, SmsConsentService consentService, CancellationToken ct) =>
{
    if (body == null) return Results.BadRequest();
    var ok = await consentService.HandleIysWebhookAsync(body.ConsentId, body.Phone, body.Status, ct);
    return ok ? Results.Ok() : Results.NotFound();
});
webhookGroup.MapPost("/delivery", async (NetgsmDeliveryWebhookRequest? body, SmsService smsService, CancellationToken ct) =>
{
    if (body == null || string.IsNullOrWhiteSpace(body.MessageId)) return Results.BadRequest();
    var ok = await smsService.HandleDeliveryWebhookAsync(body.MessageId, body.Status, body.ErrorCode, ct);
    return ok ? Results.Ok() : Results.NotFound();
});

app.Run();
