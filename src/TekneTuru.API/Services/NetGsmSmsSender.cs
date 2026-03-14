using System.Net;
using Microsoft.Extensions.Options;
using TekneTuru.API.Configuration;

namespace TekneTuru.API.Services;

/// <summary>
/// NetGSM SMS API ile gerçek SMS gönderimi. GET https://api.netgsm.com.tr/sms/send/get/
/// </summary>
public class NetGsmSmsSender : ISmsSender
{
    private readonly HttpClient _httpClient;
    private readonly NetGsmOptions _options;

    public NetGsmSmsSender(HttpClient httpClient, IOptions<NetGsmOptions> options)
    {
        _httpClient = httpClient;
        _options = options?.Value ?? new NetGsmOptions();
    }

    public async Task<(bool Success, string? ResponseCode, string? BulkId, string? ErrorMessage)> SendAsync(string phone, string message, CancellationToken ct = default)
    {
        var gsmno = NormalizePhone(phone);
        if (string.IsNullOrEmpty(gsmno) || gsmno.Length < 10)
            return (false, "INVALID_PHONE", null, "Geçersiz telefon numarası.");

        var baseUrl = _options.BaseUrl.TrimEnd('/');
        var path = "/sms/send/get/";
        var query = new List<string>
        {
            "usercode=" + Uri.EscapeDataString(_options.Usercode),
            "password=" + Uri.EscapeDataString(_options.Password),
            "msgheader=" + Uri.EscapeDataString(_options.MsgHeader),
            "gsmno=" + Uri.EscapeDataString(gsmno),
            "message=" + Uri.EscapeDataString(message)
        };
        var url = baseUrl + path + "?" + string.Join("&", query);

        try
        {
            var response = await _httpClient.GetAsync(url, ct).ConfigureAwait(false);
            var body = await response.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
            var trimmed = (body ?? "").Trim();

            if (response.StatusCode != HttpStatusCode.OK)
                return (false, ((int)response.StatusCode).ToString(), null, trimmed.Length > 0 ? trimmed : response.ReasonPhrase);

            // NetGSM: "00" veya "00 12345" (mesaj id) = başarı
            if (trimmed.StartsWith("00", StringComparison.Ordinal))
            {
                var parts = trimmed.Split(new[] { ' ', '\t' }, 2, StringSplitOptions.RemoveEmptyEntries);
                var bulkId = parts.Length > 1 ? parts[1] : null;
                return (true, "00", bulkId, null);
            }

            var code = trimmed.Length > 2 ? trimmed[..2] : trimmed;
            var errorMsg = GetErrorMessage(code);
            return (false, code, null, errorMsg ?? trimmed);
        }
        catch (Exception ex)
        {
            return (false, "EX", null, ex.Message);
        }
    }

    private static string NormalizePhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return "";
        var p = new string(phone.Where(char.IsDigit).ToArray());
        if (p.Length >= 10 && p.StartsWith('0')) p = p[1..];
        return p;
    }

    private static string? GetErrorMessage(string code)
    {
        return code switch
        {
            "20" => "Geçersiz kullanıcı adı, şifre veya yetki.",
            "30" => "Geçersiz içerik veya parametre.",
            "40" => "Mesaj başlığı (msgheader) onaylı değil.",
            "50" => "Abone bilgisi hatalı.",
            "70" => "Parametre hatası.",
            "85" => "Aynı mesaj kısa sürede tekrar gönderilemez.",
            _ => null
        };
    }
}
