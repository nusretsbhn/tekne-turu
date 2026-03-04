## API Dockerfile (.NET 9)
## Build context: repo root

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy solution + project files first for better layer caching
COPY TekneTuru.sln ./
COPY src/TekneTuru.Core/TekneTuru.Core.csproj src/TekneTuru.Core/
COPY src/TekneTuru.API/TekneTuru.API.csproj src/TekneTuru.API/
RUN dotnet restore src/TekneTuru.API/TekneTuru.API.csproj

# Copy the rest and publish (publish runs restore internally)
COPY . .
RUN dotnet publish src/TekneTuru.API/TekneTuru.API.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

# ImageSharp ile metin yazdırmak için Linux container'a temel fontları ekle
RUN apt-get update && apt-get install -y --no-install-recommends \
    fontconfig \
    fonts-dejavu-core \
 && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish ./

EXPOSE 5244
ENTRYPOINT ["dotnet", "TekneTuru.API.dll"]

