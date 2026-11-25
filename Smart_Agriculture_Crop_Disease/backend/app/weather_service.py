"""Live weather using Open-Meteo (free, no API key needed)."""
import httpx

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"

WEATHER_CODES = {
    0: "Clear sky", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain", 71: "Light snow", 73: "Snow", 75: "Heavy snow",
    80: "Rain showers", 81: "Rain showers", 82: "Violent showers",
    95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with hail",
}


def describe(code):
    return WEATHER_CODES.get(code, "Unknown")


def search_places(query: str):
    r = httpx.get(GEOCODE_URL, params={"name": query, "count": 5, "language": "en"}, timeout=10)
    r.raise_for_status()
    return [
        {
            "name": p.get("name"),
            "region": p.get("admin1"),
            "country": p.get("country"),
            "lat": p.get("latitude"),
            "lon": p.get("longitude"),
        }
        for p in r.json().get("results", [])
    ]


def build_advisory(current: dict, today: dict) -> list:
    tips = []
    wind = current.get("wind_speed_10m") or 0
    humidity = current.get("relative_humidity_2m") or 0
    temp = current.get("temperature_2m") or 0
    rain_prob = today.get("precipitation_probability_max") or 0
    rain_mm = today.get("precipitation_sum") or 0

    if wind > 15:
        tips.append("Wind is strong: avoid spraying pesticide or fertilizer today, because it will drift.")
    else:
        tips.append("Wind is low: this is a suitable time for spraying, preferably early morning or evening.")
    if rain_prob >= 50 or rain_mm >= 2:
        tips.append("Rain is likely today: postpone spraying, since rain will wash the product off. Irrigation can be reduced.")
    else:
        tips.append("Little rain expected today: check soil moisture and irrigate if the topsoil is dry.")
    if humidity >= 85:
        tips.append("High humidity: fungal diseases such as blight spread faster. Inspect leaves closely.")
    if temp >= 35:
        tips.append("Very hot: irrigate in the early morning or evening and avoid working in midday heat.")
    return tips


def get_weather(lat: float, lon: float):
    r = httpx.get(
        FORECAST_URL,
        params={
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
            "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max",
            "timezone": "auto",
            "forecast_days": 5,
        },
        timeout=10,
    )
    r.raise_for_status()
    data = r.json()
    cur = data["current"]
    daily = data["daily"]
    days = []
    for i, date in enumerate(daily["time"]):
        days.append({
            "date": date,
            "summary": describe(daily["weather_code"][i]),
            "max": daily["temperature_2m_max"][i],
            "min": daily["temperature_2m_min"][i],
            "rain_mm": daily["precipitation_sum"][i],
            "rain_prob": daily["precipitation_probability_max"][i],
        })
    today = {
        "precipitation_probability_max": days[0]["rain_prob"],
        "precipitation_sum": days[0]["rain_mm"],
    }
    return {
        "current": {
            "temp": cur["temperature_2m"],
            "feels_like": cur["apparent_temperature"],
            "humidity": cur["relative_humidity_2m"],
            "wind": cur["wind_speed_10m"],
            "rain_mm": cur["precipitation"],
            "summary": describe(cur["weather_code"]),
        },
        "days": days,
        "advisory": build_advisory(cur, today),
    }