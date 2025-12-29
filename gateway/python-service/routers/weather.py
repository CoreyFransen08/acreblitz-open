"""Weather endpoints using National Weather Service API."""

import time
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
import httpx

router = APIRouter(prefix="/weather", tags=["weather"])

WEATHER_API_BASE = "https://api.weather.gov"
USER_AGENT = "AcreBlitz Gateway (https://acreblitz.com)"

# Grid point cache
grid_point_cache: dict[str, dict] = {}
GRID_CACHE_TTL = 24 * 60 * 60  # 24 hours in seconds


def celsius_to_fahrenheit(celsius: Optional[float]) -> Optional[int]:
    """Convert Celsius to Fahrenheit."""
    if celsius is None:
        return None
    return round((celsius * 9) / 5 + 32)


async def get_grid_point(lat: float, lon: float) -> dict:
    """Get grid point information for coordinates."""
    cache_key = f"{lat:.4f},{lon:.4f}"
    cached = grid_point_cache.get(cache_key)

    if cached and time.time() - cached["timestamp"] < GRID_CACHE_TTL:
        print(f"[Weather] Using cached grid point for: {cache_key}")
        return cached["data"]

    print(f"[Weather] Fetching grid point for: {cache_key}")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{WEATHER_API_BASE}/points/{lat},{lon}",
            headers={"User-Agent": USER_AGENT, "Accept": "application/geo+json"},
            timeout=10.0,
        )
        response.raise_for_status()
        props = response.json()["properties"]

        data = {
            "gridId": props["gridId"],
            "gridX": props["gridX"],
            "gridY": props["gridY"],
            "forecastHourly": props["forecastHourly"],
            "observationStations": props["observationStations"],
            "city": props["relativeLocation"]["properties"]["city"],
            "state": props["relativeLocation"]["properties"]["state"],
        }

        grid_point_cache[cache_key] = {"data": data, "timestamp": time.time()}
        return data


async def get_hourly_forecast(url: str) -> list:
    """Get hourly forecast from NWS."""
    print("[Weather] Fetching hourly forecast")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            url,
            headers={"User-Agent": USER_AGENT, "Accept": "application/geo+json"},
            timeout=10.0,
        )
        response.raise_for_status()
        periods = response.json()["properties"]["periods"]

        return [
            {
                "time": period["startTime"],
                "temperature": period["temperature"],
                "temperatureUnit": period["temperatureUnit"],
                "precipitationChance": period.get("probabilityOfPrecipitation", {}).get(
                    "value"
                ),
                "relativeHumidity": period.get("relativeHumidity", {}).get("value"),
                "windSpeed": period["windSpeed"],
                "windDirection": period["windDirection"],
                "icon": period["icon"],
                "shortForecast": period["shortForecast"],
                "isDaytime": period["isDaytime"],
            }
            for period in periods
        ]


async def get_current_conditions(stations_url: str) -> Optional[dict]:
    """Get current conditions from nearest observation station."""
    try:
        print("[Weather] Fetching observation stations")

        async with httpx.AsyncClient() as client:
            stations_response = await client.get(
                stations_url,
                headers={"User-Agent": USER_AGENT, "Accept": "application/geo+json"},
                timeout=10.0,
            )
            stations_response.raise_for_status()
            stations = stations_response.json()["features"]

            if not stations:
                print("[Weather] No observation stations found")
                return None

            station_id = stations[0]["id"]
            print(f"[Weather] Fetching latest observation from: {station_id}")

            obs_response = await client.get(
                f"{station_id}/observations/latest",
                headers={"User-Agent": USER_AGENT, "Accept": "application/geo+json"},
                timeout=10.0,
            )
            obs_response.raise_for_status()
            props = obs_response.json()["properties"]

            temp_c = props.get("temperature", {}).get("value")
            temp_f = celsius_to_fahrenheit(temp_c)

            return {
                "timestamp": props.get("timestamp"),
                "temperature": temp_f,
                "temperatureUnit": "F",
                "description": props.get("textDescription") or "N/A",
                "icon": props.get("icon") or "",
                "humidity": props.get("relativeHumidity", {}).get("value"),
                "windSpeed": props.get("windSpeed", {}).get("value"),
                "windDirection": props.get("windDirection", {}).get("value"),
                "pressure": props.get("barometricPressure", {}).get("value"),
            }

    except Exception as e:
        print(f"[Weather] Error fetching current conditions: {e}")
        return None


@router.get("/forecast")
async def get_forecast(
    lat: float = Query(..., ge=-90, le=90, description="Latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude"),
):
    """
    Get current conditions and hourly forecast for a location.

    Uses the National Weather Service API (api.weather.gov).
    Only works for US locations.
    """
    try:
        print(f"[Weather] Getting weather for: lat={lat}, lon={lon}")

        # Get grid point information
        grid_point = await get_grid_point(lat, lon)

        # Fetch hourly forecast and current conditions
        hourly_forecast = await get_hourly_forecast(grid_point["forecastHourly"])
        current_conditions = await get_current_conditions(
            grid_point["observationStations"]
        )

        return {
            "location": {
                "city": grid_point["city"],
                "state": grid_point["state"],
                "gridId": grid_point["gridId"],
                "gridX": grid_point["gridX"],
                "gridY": grid_point["gridY"],
            },
            "currentConditions": current_conditions,
            "hourlyForecast": hourly_forecast,
            "updated": datetime.utcnow().isoformat() + "Z",
        }

    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Weather API error: {e.response.text}",
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Weather API unavailable: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch weather: {str(e)}",
        )
