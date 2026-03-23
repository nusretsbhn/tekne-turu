namespace TekneTuru.Core.Entities;

/// <summary>
/// /landing/thanks anket cevapları (tarih + cevaplar JSON).
/// </summary>
public class ThanksSurveyResponse
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string AnswersJson { get; set; } = "[]";
}

