import pytest
import pandas as pd
from data.loader import DataLoader, DataFileNotFoundError, DataValidationError
from services.disease_service import get_disease_service
from services.mandi_service import get_mandi_service
from services.weather_service import get_weather_service
from services.assistant_service import get_assistant_service
from utils.safety import contains_chemical_names_or_doses, enforce_safety_guardrails
from main import health_check, data_health_check

def test_data_loader_crop_diseases():
    loader = DataLoader.get_instance()
    df = loader.load_crop_diseases()
    assert isinstance(df, pd.DataFrame)
    assert len(df) == 8
    assert "crop" in df.columns
    assert "disease" in df.columns
    assert "visible_symptoms" in df.columns
    assert "prevention_and_first_steps" in df.columns

def test_data_loader_mandi_prices():
    loader = DataLoader.get_instance()
    df = loader.load_mandi_prices()
    assert isinstance(df, pd.DataFrame)
    assert len(df) == 2695
    assert "modal_price_rs_per_quintal" in df.columns
    assert "arrivals_tonnes" in df.columns
    assert set(df["market"].unique()) == {"Patna", "Bihar Sharif", "Ara", "Hajipur", "Muzaffarpur"}
    assert "Potato" in df["commodity"].values

def test_data_loader_weather_sample():
    loader = DataLoader.get_instance()
    w = loader.load_weather_sample()
    assert "daily" in w
    assert len(w["daily"]["time"]) == 7
    assert len(w["daily"]["precipitation_sum"]) == 7

def test_data_loader_farmer_queries():
    loader = DataLoader.get_instance()
    queries = loader.load_farmer_queries()
    assert len(queries) >= 6

def test_safety_chemical_detection():
    is_violation, v = contains_chemical_names_or_doses("Spray 2 ml/l mancozeb on leaves")
    assert is_violation is True
    assert len(v) >= 1

    clean_text = "Remove infected leaves and contact KVK"
    is_violation, v = contains_chemical_names_or_doses(clean_text)
    assert is_violation is False

def test_safety_guardrails_enforcement():
    dirty = "Use 2 ml/l chlorpyrifos immediately"
    sanitized = enforce_safety_guardrails(dirty)
    assert "chlorpyrifos" not in sanitized.lower()
    assert "kvk" in sanitized.lower() or "कृषि विज्ञान केंद्र" in sanitized

def test_disease_service_diagnosis():
    svc = get_disease_service()
    res = svc.diagnose_by_symptoms("Tamatar ke patte pe bhoore daag aa gaye hain, gol gol", crop_hint="Tomato")
    assert "Early blight" in res.likely_disease or "अगेती झुलसा" in res.likely_disease
    assert len(res.safe_first_steps) > 0
    assert "KVK" in res.next_step

def test_mandi_service_trends():
    svc = get_mandi_service()
    trend = svc.get_price_trends(commodity="Potato", market="Patna")
    assert trend.commodity == "Potato"
    assert trend.market == "Patna"
    assert trend.current_modal_price > 0
    assert len(trend.all_mandis_comparison) == 5
    assert trend.is_synthetic is True
    assert "कृत्रिम" in trend.disclaimer or "Synthetic" in trend.disclaimer

def test_weather_spray_advisory():
    svc = get_weather_service()
    adv = svc.get_spray_advisory(use_live_if_available=False)
    # The first two daily rainfall values are 0.0 mm and 0.0 mm -> total 0.0 mm <= 2.0 mm
    assert adv.forecast_rainfall_48h == 0.0
    assert adv.spray_warning is False
    assert adv.can_spray is True
    assert "छिड़काव" in adv.decision_badge

def test_assistant_all_six_farmer_queries():
    svc = get_assistant_service()
    sample_queries = [
        ("Tamatar ke patte pe bhoore daag aa gaye hain, gol gol, kya karein?", "disease"),
        ("Aalu bechna hai, abhi bechein ya 10 din ruk jaayein? Patna mandi.", "mandi"),
        ("Kal baarish hogi kya? Spray karna hai.", "weather"),
        ("मक्का के पत्तों में छेद हैं और अंदर बुरादा जैसा है, कौन सा कीड़ा है?", "disease"),
        ("Gehun ki buwai ka sahi samay kya hai?", "advisory"),
        ("Pyaaz ka bhaav Hajipur mein kitna chal raha hai?", "mandi")
    ]

    for q, expected_route in sample_queries:
        resp = svc.process_query(q)
        assert resp.routed_service == expected_route
        assert len(resp.answer_hindi) > 10

def test_main_health_endpoints():
    h = health_check()
    assert h.status == "ok"
    assert h.application == "Annadata AI"

    dh = data_health_check()
    assert dh.all_valid is True
    assert dh.files["crop_disease_reference.csv"]["valid"] is True
    assert dh.files["mandi_prices_bihar_SYNTHETIC.csv"]["valid"] is True
    assert dh.files["weather_sample_patna.json"]["valid"] is True
    assert dh.files["farmer_queries_sample.txt"]["valid"] is True

def test_api_ask_endpoint():
    from main import ask_assistant
    from schemas.models import AssistantQueryRequest
    req = AssistantQueryRequest(query="Tamatar ke patte pe daag hain", location="Patna")
    res = ask_assistant(req)
    assert res.routed_service == "disease"
    assert len(res.answer_hindi) > 10
    assert "KVK" in res.answer_hindi or "कृषि" in res.answer_hindi
    assert res.detected_language == "hi"

def test_api_ask_english_language_matching():
    from main import ask_assistant
    from schemas.models import AssistantQueryRequest

    # 1. English Weather Query
    req_weather = AssistantQueryRequest(query="Can I spray pesticide tomorrow? What is the rain forecast in Patna?")
    res_weather = ask_assistant(req_weather)
    assert res_weather.routed_service == "weather"
    assert res_weather.detected_language == "en"
    assert "Weather" in res_weather.answer
    assert "Kisan Call Center" in res_weather.answer

    # 2. English Mandi Query
    req_mandi = AssistantQueryRequest(query="What is the current potato rate in Patna mandi? Should I sell now or wait?")
    res_mandi = ask_assistant(req_mandi)
    assert res_mandi.routed_service == "mandi"
    assert res_mandi.detected_language == "en"
    assert "Potato" in res_mandi.answer
    assert "Mandi" in res_mandi.answer
    assert "Selling Strategy" in res_mandi.answer

    # 3. English Wheat Sowing Query
    req_wheat = AssistantQueryRequest(query="When is the optimal time for wheat sowing in Bihar?")
    res_wheat = ask_assistant(req_wheat)
    assert res_wheat.routed_service == "advisory"
    assert res_wheat.detected_language == "en"
    assert "November" in res_wheat.answer

def test_api_ask_conversational_intents():
    from main import ask_assistant
    from schemas.models import AssistantQueryRequest

    # 1. User says "Thanku"
    res_thanks = ask_assistant(AssistantQueryRequest(query="Thanku"))
    assert res_thanks.routed_service == "conversational"
    assert res_thanks.detected_language == "en"
    assert "welcome" in res_thanks.answer.lower()
    assert "outside our currently indexed" not in res_thanks.answer

    # 2. User says "ok"
    res_ok = ask_assistant(AssistantQueryRequest(query="ok"))
    assert res_ok.routed_service == "conversational"
    assert res_ok.detected_language == "en"
    assert any(w in res_ok.answer.lower() for w in ["understood", "helpful", "clear", "glad"])
    assert "outside our currently indexed" not in res_ok.answer

    # 3. User says "धन्यवाद"
    res_dhanyawad = ask_assistant(AssistantQueryRequest(query="धन्यवाद"))
    assert res_dhanyawad.routed_service == "conversational"
    assert res_dhanyawad.detected_language == "hi"
    assert "स्वागत" in res_dhanyawad.answer_hindi

    # 4. User says "ठीक है"
    res_thik = ask_assistant(AssistantQueryRequest(query="ठीक है"))
    assert res_thik.routed_service == "conversational"
    assert res_thik.detected_language == "hi"
    assert "बढ़िया" in res_thik.answer_hindi or "उपस्थित" in res_thik.answer_hindi



