namespace TekneTuru.API.Models;

public record SendBulkSmsRequest(List<int> CustomerIds, string Message);
