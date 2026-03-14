# multi-stage build cho .NET 8
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj và restore dependencies (cache)
COPY ["MyCafe.Backend.csproj", "./"]
RUN dotnet restore "MyCafe.Backend.csproj"

# Copy toàn bộ src và build
COPY . .
RUN dotnet publish "MyCafe.Backend.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Expose port (Render/Heroku dùng biến PORT, Docker mặc định ta tự map)
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "MyCafe.Backend.dll"]
