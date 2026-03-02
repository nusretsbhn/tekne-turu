namespace TekneTuru.API.Services;

/// <summary>
/// SMS sağlayıcı soyutlaması. NetGSM, Turkcell vb. implementasyonlar bu arayüzü kullanır.
/// </summary>
public interface ISmsSender
{
    /// <summary>
    /// Tek bir SMS gönderir.
    /// </summary>
    /// <param name="phone">Alıcı numara (5xxxxxxxxx formatında)</param>
    /// <param name="message">Mesaj metni</param>
    /// <param name="ct">İptal token</param>
    /// <returns>Success, ResponseCode (00=başarılı, 30=hatalı), BulkId (mesaj ID - teslimat sorgusu için), ErrorMessage (hatada durum açıklaması).</returns>
    Task<(bool Success, string? ResponseCode, string? BulkId, string? ErrorMessage)> SendAsync(string phone, string message, CancellationToken ct = default);
}
