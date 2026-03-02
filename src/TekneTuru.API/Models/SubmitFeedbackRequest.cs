namespace TekneTuru.API.Models;

public record SubmitFeedbackRequest(string Token, string Type, string Message);
