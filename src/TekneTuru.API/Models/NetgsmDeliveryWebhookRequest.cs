namespace TekneTuru.API.Models;

/// <summary>Netgsm SMS teslimat raporu webhook body.</summary>
public record NetgsmDeliveryWebhookRequest(string? MessageId, string? Status, string? ErrorCode);
