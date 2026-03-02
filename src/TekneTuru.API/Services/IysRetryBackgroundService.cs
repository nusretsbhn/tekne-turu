using Microsoft.Extensions.DependencyInjection;
using TekneTuru.API.Data;

namespace TekneTuru.API.Services;

/// <summary>IysStatus=Pending kayıtları 5 dakika aralıkla, en fazla 3 deneme ile Netgsm'e bildirir.</summary>
public class IysRetryBackgroundService : BackgroundService
{
    private readonly IServiceProvider _scopeFactory;
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(5);

    public IysRetryBackgroundService(IServiceProvider scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var consentService = scope.ServiceProvider.GetRequiredService<SmsConsentService>();
                var pending = await consentService.GetPendingIysConsentsAsync(3, stoppingToken);
                foreach (var c in pending)
                    await consentService.SendIysToNetgsmAsync(c.Id, stoppingToken);
            }
            catch (OperationCanceledException) { }
            catch (Exception) { /* log */ }

            await Task.Delay(Interval, stoppingToken);
        }
    }
}
