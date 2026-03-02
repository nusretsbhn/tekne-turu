namespace TekneTuru.API.Models;

public record BulkCheckInRequest(List<int> Ids, bool CheckedIn);
