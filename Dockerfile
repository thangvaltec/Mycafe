# Use the official ASP.NET Core runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

# Use the SDK image for building
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["MyCafe.Backend/MyCafe.Backend.csproj", "MyCafe.Backend/"]
RUN dotnet restore "MyCafe.Backend/MyCafe.Backend.csproj"
COPY . .
WORKDIR "/src/MyCafe.Backend"
RUN dotnet build "MyCafe.Backend.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "MyCafe.Backend.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "MyCafe.Backend.dll"]
