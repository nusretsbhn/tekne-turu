namespace TekneTuru.API.Services;

/// <summary>Türkiye GSM (+90) numaraları — SMS gönderim uygunluğu.</summary>
public static class SmsPhoneHelper
{
    public static string NormalizeDigits(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return "";
        var p = new string(phone.Where(char.IsDigit).ToArray());
        if (p.Length >= 10 && p.StartsWith('0')) p = p[1..];
        return p;
    }

    /// <summary>+90 / 90 / 05xx / 5xx formatında Türkiye cep telefonu.</summary>
    public static bool IsTurkishMobileForSms(string? phone)
    {
        var digits = NormalizeDigits(phone);
        if (string.IsNullOrEmpty(digits)) return false;
        if (digits.StartsWith("90", StringComparison.Ordinal) && digits.Length >= 12)
            return digits[2] == '5';
        if (digits.Length == 10 && digits[0] == '5') return true;
        return false;
    }
}
