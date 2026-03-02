namespace TekneTuru.API.Services;

/// <summary>
/// Gerçek SMS göndermez; sadece başarı döner. SmsService çağrıldığında log SmsService tarafından yazılır.
/// Geliştirme ve test için. Sağlayıcı seçildiğinde NetGsmSmsSender vb. ile değiştirilir.
/// </summary>
public class LogOnlySmsSender : ISmsSender
{
    public Task<(bool Success, string? ResponseCode, string? BulkId, string? ErrorMessage)> SendAsync(string phone, string message, CancellationToken ct = default)
    {
        return Task.FromResult<(bool, string?, string?, string?)>((true, "00", "LOG_ONLY_BULKID", null));
    }
}
