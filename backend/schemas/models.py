from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

# --- Health & System Schemas ---

class HealthResponse(BaseModel):
    status: str = Field(..., description="System status, e.g. ok")
    application: str = Field(..., description="Application name")

class FileHealthInfo(BaseModel):
    valid: bool
    rows: Optional[int] = None
    columns: Optional[List[str]] = None
    error: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class DataHealthResponse(BaseModel):
    status: str
    application: str
    data_directory: str
    directory_exists: bool
    all_valid: bool
    files: Dict[str, Any]

# --- Crop Disease Schemas ---

class CropDiseaseReference(BaseModel):
    crop: str
    disease: str
    visible_symptoms: str
    prevention_and_first_steps: str
    urgency: Optional[str] = "None"
    next_step: str

class DiseaseDetectionRequest(BaseModel):
    image_base64: Optional[str] = Field(None, description="Base64-encoded leaf image")
    crop_hint: Optional[str] = Field(None, description="Optional crop hint from farmer")
    symptoms_text: Optional[str] = Field(None, description="Optional symptom description in Hindi or English")

class DiseaseDetectionResponse(BaseModel):
    crop: str = Field(..., description="Identified crop, e.g., Tomato")
    likely_disease: str = Field(..., description="Likely disease identified (always marked as likely)")
    confidence: str = Field(..., description="Confidence level: उच्च (High), मध्यम (Medium), or कम (Low)")
    urgency: str = Field(..., description="Urgency: High, Medium, Low, or None")
    urgency_hindi: str = Field(..., description="Urgency translated to Hindi")
    safe_first_steps: List[str] = Field(..., description="List of safe non-chemical first steps")
    next_step: str = Field(..., description="Advisory directing to local KVK or Agriculture Officer")
    chemical_warning: str = Field(
        "सुरक्षा चेतावनी: हम किसी भी रासायनिक दवा या उसकी मात्रा की सिफारिश नहीं करते हैं। कृपया कीटनाशक या फफूंदनाशी के लिए अपने नजदीकी कृषि विज्ञान केंद्र (KVK) से संपर्क करें।",
        description="Mandatory non-chemical safety warning"
    )
    is_uncertain: bool = Field(False, description="Flagged true if image evidence was ambiguous")
    rain_advisory_alert: Optional[str] = Field(None, description="Integrated rain/weather warning if applicable")

class DiseaseAnalysisResponse(BaseModel):
    success: bool = Field(True, description="Whether the analysis succeeded")
    crop: str = Field(..., description="Crop identified or detected")
    disease: str = Field(..., description="Disease name from reference or Uncertain/Unsupported")
    confidence_label: str = Field(..., description="Confidence label: High, Medium, or Low")
    urgency: str = Field(..., description="Urgency level from CSV: High, Medium, Low, or None")
    symptoms: List[str] = Field(default_factory=list, description="Observed visual symptoms")
    first_steps: List[str] = Field(default_factory=list, description="Safe first steps from CSV")
    next_step: str = Field(..., description="Next action advising KVK / Agri Officer")
    is_uncertain: bool = Field(False, description="Flag indicating uncertainty or low quality")

# --- Mandi Price Schemas ---

class MandiPriceRecord(BaseModel):
    date: str
    state: str
    market: str
    commodity: str
    min_price_rs_per_quintal: int
    max_price_rs_per_quintal: int
    modal_price_rs_per_quintal: int
    arrivals_tonnes: float

class MandiComparisonItem(BaseModel):
    market: str
    latest_modal_price: int
    min_price: int
    max_price: int
    latest_date: str
    price_difference_from_target: int

class PriceHistoryPoint(BaseModel):
    date: str
    modal_price: int
    min_price: int
    max_price: int
    arrivals_tonnes: float

class MandiTrendResponse(BaseModel):
    commodity: str
    commodity_hindi: str
    market: str
    market_hindi: str
    latest_date: str
    current_modal_price: int
    current_min_price: int
    current_max_price: int
    seven_day_change_pct: float
    thirty_day_change_pct: float
    trend_direction: str = Field(..., description="बढ़त (Upward), गिरावट (Downward), or स्थिर (Stable)")
    best_nearby_market: Optional[MandiComparisonItem] = None
    all_mandis_comparison: List[MandiComparisonItem]
    price_history: List[PriceHistoryPoint]
    recommendation: str = Field(..., description="अभी बेचें (Sell Now) or रुकें (Wait)")
    sell_or_wait_reasoning: str = Field(..., description="Plain-language Hindi explanation of the trend")
    is_synthetic: bool = Field(True, description="Strict synthetic data flag")
    disclaimer: str = Field(
        "अस्वीकरण: यह डेटा पूरी तरह कृत्रिम (Synthetic) है और केवल हैकथॉन प्रदर्शन के लिए है। यह वास्तविक मंडी भाव नहीं है और भविष्य के भावों की कोई गारंटी नहीं दी जाती है।",
        description="Mandatory synthetic price disclaimer"
    )

class MandiOptionItem(BaseModel):
    value: str
    label_hindi: str

class MandiOptionsResponse(BaseModel):
    crops: List[str]
    crops_formatted: List[MandiOptionItem]
    mandis: List[str]
    mandis_formatted: List[MandiOptionItem]
    is_synthetic: bool = True
    disclaimer: str

class MandiAnalysisRequest(BaseModel):
    crop: str = Field(..., description="Crop/Commodity name, e.g. Potato, Onion, Wheat")
    market: str = Field(..., description="Bihar Mandi name, e.g. Patna, Hajipur, Ara")
    days: int = Field(30, ge=7, le=90, description="Trend duration in days (7 or 30)")

class MandiAnalysisResponse(BaseModel):
    crop: str
    crop_hindi: str
    market: str
    market_hindi: str
    trend_period_days: int
    latest_date: str
    latest_modal_price: int
    latest_min_price: int
    latest_max_price: int
    seven_day_change_pct: Optional[float] = None
    thirty_day_change_pct: Optional[float] = None
    percentage_change: Optional[float] = None
    trend_direction: str
    highest_recorded_modal_mandi: Optional[MandiComparisonItem] = None
    nearby_markets_comparison: List[MandiComparisonItem]
    historical_chart_data: List[PriceHistoryPoint]
    sell_now_or_wait_explanation: str
    data_source: str = "mandi_prices_bihar_SYNTHETIC.csv (Synthetic demonstration data)"
    is_synthetic: bool = True
    disclaimer: str

# --- Weather & Spray Advisory Schemas ---

class WeatherDailyPoint(BaseModel):
    date: str
    temp_max: float
    temp_min: float
    precipitation_sum_mm: float
    humidity_pct: int

class SprayAdvisoryResponse(BaseModel):
    can_spray: bool = Field(..., description="True if rainfall in next 48h <= 2.0 mm, False otherwise")
    decision_badge: str = Field(..., description="छिड़काव करें (Safe to spray) or छिड़काव न करें (Do not spray)")
    rainfall_next_48h_mm: float = Field(..., description="Cumulative rainfall expected in next 48 hours")
    rainfall_threshold_mm: float = Field(2.0, description="Threshold above which spraying is advised against")
    warning_message: Optional[str] = Field(None, description="Hindi warning if rain is expected")
    advice_details: str = Field(..., description="Explanation of why to spray or wait")
    forecast_dates: List[str]
    forecast_data: List[WeatherDailyPoint]
    data_source: str = Field(..., description="Open-Meteo Live or Offline Fallback (weather_sample_patna.json)")

class WeatherAdvisoryResponse(BaseModel):
    success: bool = Field(True, description="Request success status")
    location: str = Field("Patna", description="Forecast location")
    forecast_rainfall_48h: float = Field(..., description="Total cumulative rainfall in the 48-hour window in mm")
    spray_warning: bool = Field(..., description="True if rainfall > 2.0 mm, False otherwise")
    message_hi: str = Field(..., description="Hindi explanation regarding spray feasibility and guidance")
    source: str = Field("sample_weather_json", description="Data source indicator: sample_weather_json or open_meteo_live")
    forecast_dates: List[str] = Field(..., description="The two forecast dates comprising the 48-hour window")

    # Extended fields for rich dashboard / backwards compatibility
    rainfall_threshold_mm: float = Field(2.0, description="Rainfall threshold in mm")
    can_spray: bool = Field(True, description="Whether spraying is viable")
    decision_badge: str = Field("", description="Badge text in Hindi")
    rainfall_next_48h_mm: float = Field(0.0, description="Cumulative rainfall expected in next 48 hours")
    warning_message: Optional[str] = Field(None, description="Hindi warning if rain is expected")
    advice_details: str = Field("", description="Detailed scientific advice")
    forecast_data: List[WeatherDailyPoint] = Field(default_factory=list, description="Daily weather points")
    data_source: str = Field("", description="Source description")

# --- Hindi Farmer Assistant Schemas ---

class AssistantQueryRequest(BaseModel):
    query: str = Field(..., description="Farmer question in Hindi, Hinglish, or English")
    location: Optional[str] = Field("Patna", description="Farmer market/location context")
    crop: Optional[str] = Field(None, description="Optional crop context")
    language: Optional[str] = Field("auto", description="Preferred response language: 'auto', 'en', or 'hi'")

class AssistantQueryResponse(BaseModel):
    original_query: str
    routed_service: str = Field(..., description="disease, mandi, weather, or advisory")
    answer_hindi: str = Field(..., description="Clean, grounded response in simple Hindi")
    answer_english: Optional[str] = Field(None, description="Clean, grounded response in English")
    answer: Optional[str] = Field(None, description="Response matching user's requested or detected language")
    detected_language: str = Field("hi", description="Detected language: 'en' or 'hi'")
    service_payload: Optional[Dict[str, Any]] = None
    safety_disclaimer: str = Field(
        "सूचना: यह सलाह केवल प्रारंभिक जानकारी के लिए है। किसी भी रासायनिक उपचार के लिए KVK से संपर्क करें।",
        description="Grounded advisory disclaimer"
    )

