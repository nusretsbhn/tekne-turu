using Npgsql;

namespace TekneTuru.API.Data;

public static class DatabaseEnsurer
{
    /// <summary>
    /// Veritabanı yoksa oluşturur. PostgreSQL sunucusu çalışıyorsa createdb komutuna gerek kalmaz.
    /// </summary>
    public static async Task EnsureDatabaseExistsAsync(string connectionString, CancellationToken ct = default)
    {
        var builder = new NpgsqlConnectionStringBuilder(connectionString);
        var databaseName = builder.Database;
        if (string.IsNullOrWhiteSpace(databaseName)) return;

        builder.Database = "postgres";
        await using var conn = new NpgsqlConnection(builder.ConnectionString);
        await conn.OpenAsync(ct);

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT 1 FROM pg_database WHERE datname = @name";
        cmd.Parameters.AddWithValue("name", databaseName);
        var exists = await cmd.ExecuteScalarAsync(ct) != null;

        if (exists) return;

        cmd.Parameters.Clear();
        cmd.CommandText = $"CREATE DATABASE \"{databaseName.Replace("\"", "\"\"")}\"";
        await cmd.ExecuteNonQueryAsync(ct);
    }
}
