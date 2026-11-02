import logging
from typing import Any, Dict, List, Optional
import requests

from data.loader import get_weather_sample
from schemas.models import (
    SprayAdvisoryResponse,
    WeatherAdvisoryResponse,
    WeatherDailyPoint,
)

logger = logging.getLogger("annadata.weather_service")

# Approximate coordinates for key Bihar agricultural districts
LOCATION_COORDINATES: Dict[str, tuple[float, float]] = {
    "patna": (25.61, 85.14),
    "hajipur": (25.68, 85.22),
    "muzaffarpur": (26.12, 85.39),
    "ara": (25.56, 84.66),
    "bihar sharif": (25.20, 85.52),
    "gaya": (24.79, 85.00),
    "bhagalpur": (25.24, 87.01),
}


class WeatherService:
    """
    Weather & Spray Advisory Engine for Annadata AI.
    Primary business rule:
      Calculate total forecast rainfall in the next 48 hours using the first two daily rainfall values.
      - If rainfall > 2.0 mm:
          * Show spraying warning (spray_warning=True)
          * Explain rainfall effect on spraying effectiveness
          * Advise farmer to check local guidance (KVK)
      - If rainfall <= 2.0 mm:
          * No specific >2 mm warning (spray_warning=False)
          * Do not guarantee that spraying is safe

    Uses data/weather_sample_patna.json as the offline fallback (must work without internet).
    Provides optional live Open-Meteo integration when source='live'.
    """

    def __init__(self):
        self._offline_data: Optional[Dict[str, Any]] = None

    @property
    def offline_data(self) -> Dict[str, Any]:
        if self._offline_data is None:
            self._offline_data = get_weather_sample()
        return self._offline_data

    @offline_data.setter
    def offline_data(self, value: Dict[str, Any]) -> None:
        self._offline_data = value

    def validate_weather_data(self, data: Any) -> None:
        """
        Validates structure of weather payload.
        Ensures daily forecast with time and precipitation_sum exists and contains at least 2 entries.
        """
        if not isinstance(data, dict):
            raise ValueError("Invalid weather payload: root must be a JSON object")

        if "daily" not in data or not isinstance(data["daily"], dict):
            raise ValueError("Invalid weather payload: missing 'daily' forecast object")

        daily = data["daily"]
        if "time" not in daily or not isinstance(daily["time"], list):
            raise ValueError("Invalid weather payload: missing 'daily.time' list")

        if "precipitation_sum" not in daily or not isinstance(daily["precipitation_sum"], list):
            raise ValueError("Invalid weather payload: missing 'daily.precipitation_sum' list")

        if len(daily["time"]) < 2 or len(daily["precipitation_sum"]) < 2:
            raise ValueError(
                f"Insufficient forecast entries for 48-hour window (found {len(daily['time'])} dates)"
            )

    def fetch_live_weather(self, location: str = "Patna") -> Dict[str, Any]:
        """
        Fetches live forecast from Open-Meteo for the specified location.
        Raises RuntimeError if network is unreachable or request fails.
        """
        loc_key = location.strip().lower()
        lat, lon = LOCATION_COORDINATES.get(loc_key, (25.61, 85.14))

        url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={lat}&longitude={lon}&daily=temperature_2m_max,temperature_2m_min,"
            f"precipitation_sum,relative_humidity_2m_mean&timezone=Asia%2FKolkata"
        )
        try:
            resp = requests.get(url, timeout=3.5)
            if resp.status_code == 200:
                data = resp.json()
                self.validate_weather_data(data)
                return data
            raise RuntimeError(f"Open-Meteo API returned HTTP {resp.status_code}")
        except Exception as e:
            logger.warning("Failed to fetch live weather from Open-Meteo: %s", str(e))
            raise RuntimeError(f"Live weather service unavailable: {str(e)}")

    def get_weather_advisory(
        self,
        location: str = "Patna",
        source: str = "sample"
    ) -> WeatherAdvisoryResponse:
        """
        Calculates weather spray advisory for the next 48 hours.
        Satisfies Task 5 API contract:
          GET /api/weather/advisory?location=...&source=...
        """
        clean_source = (source or "sample").strip().lower()
        clean_location = (location or "Patna").strip()

        # Determine source
        if clean_source in ["live", "open_meteo", "open-meteo", "open_meteo_live"]:
            try:
                raw_data = self.fetch_live_weather(clean_location)
                source_label = "open_meteo_live"
                source_desc = "Open-Meteo Live API"
            except Exception as e:
                logger.info("Live weather unavailable (%s); falling back to sample JSON", str(e))
                # If specifically requested live and failed, raise error if strictly requested,
                # or fallback safely with clear identification.
                raw_data = self.offline_data
                source_label = "sample_weather_json"
                source_desc = f"sample_weather_json (Fallback after live error: {e})"
        else:
            raw_data = self.offline_data
            source_label = "sample_weather_json"
            source_desc = "sample_weather_json (weather_sample_patna.json)"

        # Validate weather structure
        self.validate_weather_data(raw_data)

        daily = raw_data["daily"]
        dates = daily["time"]
        precip = daily["precipitation_sum"]
        temps_max = daily.get("temperature_2m_max", [0.0] * len(dates))
        temps_min = daily.get("temperature_2m_min", [0.0] * len(dates))
        humidity = daily.get("relative_humidity_2m_mean", [50] * len(dates))

        # Initial 48-hour window uses the first two daily rainfall values
        forecast_dates_48h = [str(d) for d in dates[:2]]
        precip_first_two = [float(p if p is not None else 0.0) for p in precip[:2]]
        forecast_rainfall_48h = round(float(sum(precip_first_two)), 2)

        # Main Business Rule: Rainfall Threshold = 2.0 mm
        threshold_mm = 2.0
        spray_warning = forecast_rainfall_48h > threshold_mm
        can_spray = not spray_warning

        if spray_warning:
            decision_badge = "छिड़काव न करें (Do Not Spray)"
            warning_msg = (
                f"मौसम चेतावनी: अगले 48 घंटों में कुल {forecast_rainfall_48h} mm बारिश का अनुमान है "
                f"({threshold_mm} mm सीमा से अधिक)।"
            )
            message_hi = (
                f"मौसम चेतावनी: अगले 48 घंटों में कुल {forecast_rainfall_48h} mm बारिश का पूर्वानुमान है, "
                f"जो {threshold_mm} mm की निर्धारित सीमा से अधिक है। बारिश से कीटनाशक या पर्णीय छिड़काव धुल सकता है "
                f"और दवा की प्रभावशीलता समाप्त हो सकती है। कृपया स्थानीय कृषि विज्ञान केंद्र (KVK) या कृषि विशेषज्ञ "
                f"से सलाह लें और मौसम साफ होने तक छिड़काव टालें।"
            )
            advice_details = (
                f"अगले 48 घंटों ({forecast_dates_48h[0]} से {forecast_dates_48h[1]}) में कुल {forecast_rainfall_48h} mm "
                f"वर्षा संभावित है। छिड़काव के 4 घंटे के भीतर बारिश होने से 100% रासायनिक नुकसान और नाइट्रोजन लीचिंग "
                f"का जोखिम रहता है। शुष्क मौसम व खिली धूप होने पर ही छिड़काव करें।"
            )
        else:
            decision_badge = "छिड़काव संभव (Check Local Wind)"
            warning_msg = None
            message_hi = (
                f"अगले 48 घंटों में निर्धारित सीमा ({threshold_mm} mm) से अधिक बारिश का पूर्वानुमान नहीं है "
                f"(कुल अनुमानित वर्षा {forecast_rainfall_48h} mm)। ध्यान दें कि छिड़काव पूर्णतः सुरक्षित होने की "
                f"कोई गारंटी नहीं है; कृपया हवा की गति, पत्तियों की नमी और स्थानीय कृषि सलाह अवश्य जांचें।"
            )
            advice_details = (
                f"अगले 48 घंटों ({forecast_dates_48h[0]} से {forecast_dates_48h[1]}) में वर्षा केवल {forecast_rainfall_48h} mm "
                f"अनुमानित है ({threshold_mm} mm से कम)। मौसम शुष्क रहने की संभावना है, अतः अनुशंसित सुरक्षित उपचार "
                f"किया जा सकता है।"
            )

        # Build daily points for full forecast visualization
        daily_points = [
            WeatherDailyPoint(
                date=str(dates[i]),
                temp_max=float(temps_max[i] if i < len(temps_max) and temps_max[i] is not None else 0.0),
                temp_min=float(temps_min[i] if i < len(temps_min) and temps_min[i] is not None else 0.0),
                precipitation_sum_mm=float(precip[i] if i < len(precip) and precip[i] is not None else 0.0),
                humidity_pct=int(humidity[i] if i < len(humidity) and humidity[i] is not None else 50),
            )
            for i in range(len(dates))
        ]

        return WeatherAdvisoryResponse(
            success=True,
            location=clean_location.capitalize(),
            forecast_rainfall_48h=forecast_rainfall_48h,
            spray_warning=spray_warning,
            message_hi=message_hi,
            source=source_label,
            forecast_dates=forecast_dates_48h,
            # Extended fields
            rainfall_threshold_mm=threshold_mm,
            can_spray=can_spray,
            decision_badge=decision_badge,
            rainfall_next_48h_mm=forecast_rainfall_48h,
            warning_message=warning_msg,
            advice_details=advice_details,
            forecast_data=daily_points,
            data_source=source_desc,
        )

    def get_spray_advisory(self, use_live_if_available: bool = False) -> WeatherAdvisoryResponse:
        """
        Backwards-compatible helper calling get_weather_advisory.
        """
        source = "live" if use_live_if_available else "sample"
        return self.get_weather_advisory(location="Patna", source=source)


# Singleton instance
_weather_service: Optional[WeatherService] = None


def get_weather_service() -> WeatherService:
    global _weather_service
    if _weather_service is None:
        _weather_service = WeatherService()
    return _weather_service
