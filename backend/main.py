import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Ensure backend root and project root are both in sys.path
_BACKEND_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _BACKEND_DIR.parent
for _p in (str(_BACKEND_DIR), str(_REPO_ROOT)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

# Load environment variables (check backend/.env first)
_ENV_PATH = _BACKEND_DIR / ".env"
if _ENV_PATH.is_file():
    load_dotenv(dotenv_path=_ENV_PATH)
else:
    load_dotenv()

from data.loader import DataLoader
from schemas.models import (
    AssistantQueryRequest,
    AssistantQueryResponse,
    DataHealthResponse,
    DiseaseAnalysisResponse,
    DiseaseDetectionRequest,
    DiseaseDetectionResponse,
    HealthResponse,
    MandiAnalysisRequest,
    MandiAnalysisResponse,
    MandiOptionsResponse,
    MandiTrendResponse,
    SprayAdvisoryResponse,
    WeatherAdvisoryResponse,
)
from services.assistant_service import get_assistant_service
from services.disease_service import (
    GeminiAPICallError,
    GeminiAPIKeyMissingError,
    ImageSizeExceededError,
    InvalidImageError,
    UnsupportedFileTypeError,
    get_disease_service,
)
from services.mandi_service import get_mandi_service
from services.weather_service import get_weather_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("annadata.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI Lifespan: Pre-loads and validates all datasets once on startup.
    Prevents repeated disk I/O on every request.
    """
    logger.info("Annadata AI Backend initializing...")
    loader = DataLoader.get_instance()
    try:
        health_info = loader.validate_all()
        if not health_info.get("all_valid"):
            logger.warning("One or more datasets had validation issues on startup: %s", health_info)
        else:
            logger.info("All datasets successfully loaded and cached in memory.")
    except Exception as e:
        logger.error("Error during startup dataset initialization: %s", str(e))
    yield
    logger.info("Annadata AI Backend shutting down.")

app = FastAPI(
    title="Annadata AI (अन्नदाता AI) Backend",
    description="Modular FastAPI backend for Indian farmers: Crop Disease Detection, Mandi Intelligence, Weather Spray Advisory, and Hindi Assistant.",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS specifically for local Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Health Endpoints -----------------

@app.get("/", summary="Root Index")
def root_index():
    return {
        "message": "Welcome to Annadata AI Backend API",
        "docs": "/docs",
        "health": "/api/health",
        "data_health": "/api/health/data"
    }

@app.get(
    "/api/health",
    response_model=HealthResponse,
    summary="Application Health Check"
)
def health_check():
    """
    Standard application health check endpoint.
    Expected response: {"status": "ok", "application": "Annadata AI"}
    """
    return HealthResponse(
        status="ok",
        application="Annadata AI"
    )

@app.get(
    "/api/health/data",
    response_model=DataHealthResponse,
    summary="Dataset Health and Validation"
)
def data_health_check():
    """
    Validates existence, column schemas, and row counts of all starter datasets.
    """
    loader = DataLoader.get_instance()
    results = loader.validate_all()
    return DataHealthResponse(
        status="ok" if results.get("all_valid") else "warning",
        application="Annadata AI",
        data_directory=results["data_directory"],
        directory_exists=results["directory_exists"],
        all_valid=results["all_valid"],
        files=results["files"]
    )

# ----------------- Mandi Intelligence Endpoints -----------------

@app.get(
    "/api/mandi/options",
    response_model=MandiOptionsResponse,
    summary="List Available Crops and Mandis from Synthetic Dataset"
)
def get_mandi_options():
    """
    Returns supported crops and Bihar mandis with Hindi translations
    and mandatory synthetic data disclaimer.
    """
    service = get_mandi_service()
    return service.get_mandi_options()

@app.post(
    "/api/mandi/analyze",
    response_model=MandiAnalysisResponse,
    summary="Analyze Mandi Prices, Trends, and Nearby Comparisons with Pandas"
)
def analyze_mandi_price(req: MandiAnalysisRequest):
    """
    Calculates latest modal/min/max prices, 7-day & 30-day price trends,
    cross-mandi comparisons, and sell-now-or-wait advice in simple Hindi using Pandas.
    """
    service = get_mandi_service()
    try:
        return service.analyze_mandi_price(
            crop=req.crop,
            market=req.market,
            days=req.days
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error("Error in mandi analysis: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to calculate mandi price analysis")

@app.get("/api/mandi/commodities", summary="List Available Commodities")
def list_commodities():
    service = get_mandi_service()
    return {"commodities": service.get_available_commodities()}

@app.get("/api/mandi/markets", summary="List Available Bihar Mandis")
def list_markets():
    service = get_mandi_service()
    return {"markets": service.get_available_markets()}

@app.get(
    "/api/mandi/trends",
    response_model=MandiTrendResponse,
    summary="Calculate 7-Day & 30-Day Mandi Price Trends"
)
def get_mandi_trends(
    commodity: str = Query(..., description="Crop name, e.g. Potato, Wheat, Tomato, Onion"),
    market: str = Query("Patna", description="Bihar Mandi name, e.g. Patna, Hajipur, Muzaffarpur"),
    days: int = Query(30, ge=7, le=90, description="Historical trend days (7-90)")
):
    service = get_mandi_service()
    try:
        return service.get_price_trends(commodity=commodity, market=market, days=days)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error("Error in mandi trends calculation: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to calculate mandi price trends")

# ----------------- Weather Spray Advisory Endpoints -----------------

@app.get(
    "/api/weather",
    response_model=WeatherAdvisoryResponse,
    summary="Weather Spray Advisory API"
)
@app.get(
    "/api/weather/advisory",
    response_model=WeatherAdvisoryResponse,
    summary="Task 5 Weather Spray Advisory API"
)
def get_weather_advisory(
    location: str = Query("Patna", description="Forecast location, e.g. Patna"),
    source: str = Query("sample", description="Weather source: sample (offline JSON) or live (Open-Meteo)")
):
    """
    Calculates total forecast rainfall in the next 48 hours.
    - If rainfall > 2 mm: Shows spraying warning and advises consulting KVK/guidance.
    - If rainfall <= 2 mm: No >2mm warning; does not guarantee spraying is safe.
    Uses first two daily rainfall values from weather_sample_patna.json for the initial 48h window.
    """
    service = get_weather_service()
    try:
        return service.get_weather_advisory(location=location, source=source)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error("Error generating weather advisory: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to calculate weather advisory")

@app.get(
    "/api/weather/spray-advisory",
    response_model=WeatherAdvisoryResponse,
    summary="Weather-Aware Spray Advisory"
)
def get_spray_advisory(live: bool = Query(False, description="Attempt live Open-Meteo call")):
    service = get_weather_service()
    try:
        return service.get_spray_advisory(use_live_if_available=live)
    except Exception as e:
        logger.error("Error generating spray advisory: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to calculate weather spray advisory")

# ----------------- Disease Detection Endpoints -----------------

@app.get("/api/disease/reference", summary="List Crop Disease Authoritative Reference Space")
def get_disease_reference_catalog():
    service = get_disease_service()
    return {"reference_diseases": service.get_all_reference_diseases()}

@app.post(
    "/api/disease/diagnose",
    response_model=DiseaseDetectionResponse,
    summary="Diagnose Crop Problem from Symptoms/Image"
)
def diagnose_disease(req: DiseaseDetectionRequest):
    service = get_disease_service()
    try:
        return service.diagnose_by_symptoms(
            symptoms_text=req.symptoms_text or "",
            crop_hint=req.crop_hint
        )
    except Exception as e:
        logger.error("Error during disease diagnosis: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to diagnose crop condition")

@app.post(
    "/api/disease/analyze",
    response_model=DiseaseAnalysisResponse,
    summary="Analyze Crop Leaf Image via Vision AI Grounded in Reference Catalog"
)
def analyze_crop_leaf(
    image: UploadFile = File(..., description="Crop leaf photograph (JPEG, PNG, WebP)"),
    crop: Optional[str] = Form(None, description="Optional crop hint from farmer")
):
    """
    Accepts a crop leaf image upload, sends it to Gemini Vision SDK grounded
    in crop_disease_reference.csv, and returns likely disease, urgency, safe first steps,
    and KVK referral without chemical doses.
    """
    service = get_disease_service()
    try:
        content = image.file.read()
        mime_type = service.validate_image_upload(
            image_bytes=content,
            filename=image.filename,
            content_type=image.content_type
        )
        return service.analyze_leaf_image(
            image_bytes=content,
            mime_type=mime_type,
            crop_hint=crop
        )
    except UnsupportedFileTypeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except (ImageSizeExceededError, InvalidImageError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except GeminiAPIKeyMissingError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except GeminiAPICallError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.error("Unexpected error in leaf analysis: %s", str(e))
        raise HTTPException(status_code=500, detail="An error occurred while analyzing the leaf image.")

# ----------------- Hindi Farmer Assistant Endpoints -----------------

@app.post(
    "/api/ask",
    response_model=AssistantQueryResponse,
    summary="Task 2/Step 2 Farmer Query Assistant API"
)
@app.post(
    "/api/assistant/ask",
    response_model=AssistantQueryResponse,
    summary="Process Farmer Query in Hindi/Hinglish/English"
)
def ask_assistant(req: AssistantQueryRequest):
    service = get_assistant_service()
    try:
        return service.process_query(
            query=req.query,
            location_hint=req.location or "Patna",
            language=req.language or "auto"
        )
    except Exception as e:
        logger.error("Error processing assistant query: %s", str(e))
        raise HTTPException(status_code=500, detail="Failed to process farmer question")
