namespace TekneTuru.API.Models;

/// <summary>Netgsm İYS bildirim sonucu webhook body (alan adları Netgsm dokümantasyonuna göre güncellenebilir).</summary>
public record NetgsmIysWebhookRequest(Guid? ConsentId, string? Phone, string? Status);
