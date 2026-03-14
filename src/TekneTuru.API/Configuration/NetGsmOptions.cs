namespace TekneTuru.API.Configuration;

/// <summary>
/// NetGSM API ayarları. appsettings "NetGsm" bölümünden veya environment değişkenlerinden doldurulur.
/// </summary>
public class NetGsmOptions
{
    public const string SectionName = "NetGsm";

    /// <summary>Abone numarası (usercode).</summary>
    public string Usercode { get; set; } = "";

    /// <summary>API alt kullanıcı şifresi.</summary>
    public string Password { get; set; } = "";

    /// <summary>Onaylanmış SMS başlığı (msgheader).</summary>
    public string MsgHeader { get; set; } = "";

    /// <summary>API base URL (test için değiştirilebilir).</summary>
    public string BaseUrl { get; set; } = "https://api.netgsm.com.tr";

    public bool IsConfigured => !string.IsNullOrWhiteSpace(Usercode) && !string.IsNullOrWhiteSpace(Password) && !string.IsNullOrWhiteSpace(MsgHeader);
}
