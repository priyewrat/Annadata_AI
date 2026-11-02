import pytest
from services.weather_service import WeatherService, get_weather_service
from main import get_weather_advisory
from utils.safety import contains_chemical_names_or_doses


@pytest.fixture
def weather_service():
    return WeatherService()


def test_default_patna_sample_initial_48h(weather_service):
    """
    Test the supplied Patna JSON and verify the first two daily rainfall values
    are used for the initial 48-hour window.
    Day 0: 2026-10-31 = 0.0 mm
    Day 1: 2026-11-01 = 0.0 mm
    Total 48h = 0.0 mm <= 2.0 mm -> spray_warning: False
    """
    res = weather_service.get_weather_advisory(location="Patna", source="sample")

    assert res.success is True
    assert res.location == "Patna"
    assert res.source == "sample_weather_json"

    # Verify first two daily rainfall values used
    assert res.forecast_rainfall_48h == 0.0
    assert len(res.forecast_dates) == 2
    assert res.forecast_dates == ["2026-10-31", "2026-11-01"]

    # Main rule: <= 2.0 mm means no warning
    assert res.spray_warning is False
    assert res.can_spray is True

    # Hindi message explains status
    assert "निर्धारित सीमा" in res.message_hi or "बारिश का पूर्वानुमान नहीं" in res.message_hi

    # Safety: does not guarantee 100% safety
    assert "गारंटी नहीं" in res.message_hi

    # Safety: zero chemical prescriptions
    has_chem, _ = contains_chemical_names_or_doses(res.message_hi)
    assert not has_chem


def test_spray_warning_when_rainfall_exceeds_threshold(weather_service):
    """
    Test business rule: If rainfall exceeds 2 mm:
    - Show a spraying warning (spray_warning=True)
    - Explain that rainfall may affect spraying effectiveness
    - Advise farmer to check local agricultural guidance (KVK)
    """
    synthetic_high_rain_data = {
        "latitude": 25.61,
        "longitude": 85.14,
        "timezone": "Asia/Kolkata",
        "daily": {
            "time": ["2026-11-02", "2026-11-03", "2026-11-04"],
            "temperature_2m_max": [29.8, 28.9, 28.2],
            "temperature_2m_min": [18.6, 18.2, 17.5],
            "precipitation_sum": [2.4, 6.8, 0.4],  # 2.4 + 6.8 = 9.2 mm > 2.0 mm
            "relative_humidity_2m_mean": [71, 84, 75]
        }
    }

    weather_service.offline_data = synthetic_high_rain_data
    res = weather_service.get_weather_advisory(location="Patna", source="sample")

    assert res.success is True
    assert res.forecast_rainfall_48h == 9.2
    assert res.forecast_dates == ["2026-11-02", "2026-11-03"]
    assert res.spray_warning is True
    assert res.can_spray is False

    # Check Hindi explanation mentions spray effectiveness and local guidance/KVK
    assert "चेतावनी" in res.message_hi
    assert "धुल" in res.message_hi or "प्रभावशीलता" in res.message_hi
    assert "KVK" in res.message_hi or "कृषि विशेषज्ञ" in res.message_hi

    # Safety: zero chemical prescriptions
    has_chem, _ = contains_chemical_names_or_doses(res.message_hi)
    assert not has_chem


def test_spray_safe_when_rainfall_within_threshold(weather_service):
    """
    Test business rule: If rainfall does not exceed 2 mm:
    - Do not display the specific >2 mm warning
    - Do not guarantee that spraying is safe
    """
    synthetic_light_rain_data = {
        "latitude": 25.61,
        "longitude": 85.14,
        "timezone": "Asia/Kolkata",
        "daily": {
            "time": ["2026-11-01", "2026-11-02"],
            "temperature_2m_max": [29.6, 29.8],
            "temperature_2m_min": [19.0, 18.6],
            "precipitation_sum": [0.5, 0.8],  # 0.5 + 0.8 = 1.3 mm <= 2.0 mm
            "relative_humidity_2m_mean": [60, 71]
        }
    }

    weather_service.offline_data = synthetic_light_rain_data
    res = weather_service.get_weather_advisory(location="Hajipur", source="sample")

    assert res.success is True
    assert res.location == "Hajipur"
    assert res.forecast_rainfall_48h == 1.3
    assert res.spray_warning is False
    assert res.can_spray is True

    # Must NOT guarantee safety
    assert "गारंटी नहीं" in res.message_hi


def test_validate_missing_weather_variables(weather_service):
    """
    Validates useful error handling when weather variables are missing.
    """
    # Missing daily object
    with pytest.raises(ValueError, match="missing 'daily'"):
        weather_service.validate_weather_data({"latitude": 25.61})

    # Missing precipitation_sum
    with pytest.raises(ValueError, match="missing 'daily.precipitation_sum'"):
        weather_service.validate_weather_data({
            "daily": {
                "time": ["2026-10-31", "2026-11-01"]
            }
        })

    # Insufficient forecast dates (< 2 days)
    with pytest.raises(ValueError, match="Insufficient forecast entries"):
        weather_service.validate_weather_data({
            "daily": {
                "time": ["2026-10-31"],
                "precipitation_sum": [0.0]
            }
        })


def test_never_invent_rainfall_values(weather_service):
    """
    Verifies that the forecast rainfall is strictly the sum of actual JSON numbers.
    """
    raw_sample = weather_service.offline_data
    p1 = float(raw_sample["daily"]["precipitation_sum"][0])
    p2 = float(raw_sample["daily"]["precipitation_sum"][1])
    expected_sum = round(p1 + p2, 2)

    res = weather_service.get_weather_advisory(location="Patna", source="sample")
    assert res.forecast_rainfall_48h == expected_sum


def test_api_endpoint_weather_advisory():
    """
    Tests the GET /api/weather/advisory endpoint via direct call.
    """
    res = get_weather_advisory(location="Patna", source="sample")

    assert res.success is True
    assert res.location == "Patna"
    assert res.forecast_rainfall_48h == 0.0
    assert res.spray_warning is False
    assert res.source == "sample_weather_json"
    assert res.forecast_dates == ["2026-10-31", "2026-11-01"]
    assert isinstance(res.message_hi, str)
    assert len(res.message_hi) > 10


def test_weather_handles_null_values_gracefully(weather_service):
    """
    Ensures that None / null values occasionally returned by weather APIs
    do not crash the parser.
    """
    synthetic_null_data = {
        "latitude": 25.61,
        "longitude": 85.14,
        "timezone": "Asia/Kolkata",
        "daily": {
            "time": ["2026-11-01", "2026-11-02"],
            "temperature_2m_max": [None, 28.0],
            "temperature_2m_min": [18.0, None],
            "precipitation_sum": [None, 0.5],
            "relative_humidity_2m_mean": [None, 70]
        }
    }
    weather_service.offline_data = synthetic_null_data
    res = weather_service.get_weather_advisory(location="Patna", source="sample")
    assert res.success is True
    assert res.forecast_rainfall_48h == 0.5
    assert len(res.forecast_data) == 2


def test_assistant_weather_english_routing():
    """
    Validates that English weather queries route cleanly to the weather advisory module.
    """
    from services.assistant_service import get_assistant_service
    svc = get_assistant_service()
    for q in ["What is the weather today?", "weather in Patna", "Spray forecast tomorrow"]:
        res = svc.process_query(q)
        assert res.routed_service == "weather"
        assert len(res.answer_hindi) > 10
