import asyncio
import io
import json
from unittest.mock import MagicMock, patch
import pytest
from PIL import Image
from fastapi import HTTPException, UploadFile

from main import analyze_crop_leaf
from services.disease_service import (
    DiseaseService,
    GeminiAPICallError,
    GeminiAPIKeyMissingError,
    ImageSizeExceededError,
    InvalidImageError,
    UnsupportedFileTypeError,
    get_disease_service,
)
from utils.safety import contains_chemical_names_or_doses

def create_dummy_image(color="green", size=(80, 80), fmt="JPEG") -> bytes:
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format=fmt)
    return buf.getvalue()

class MockGenAIResponse:
    def __init__(self, text: str):
        self.text = text

class MockGenAIClient:
    def __init__(self, return_json: dict = None, should_raise: Exception = None):
        self.return_json = return_json or {}
        self.should_raise = should_raise
        self.models = MagicMock()
        if self.should_raise:
            self.models.generate_content.side_effect = self.should_raise
        else:
            self.models.generate_content.return_value = MockGenAIResponse(json.dumps(self.return_json))

# ----------------- Scenario 1: Valid Tomato Leaf Image -----------------
def test_valid_tomato_leaf_image():
    service = get_disease_service()
    mock_payload = {
        "is_leaf": True,
        "crop": "Tomato",
        "disease": "Early blight",
        "confidence_label": "Medium",
        "symptoms": ["Dark brown target-like spots with concentric rings on lower leaves"],
        "is_uncertain": False,
        "reasoning": "Clear target-like concentric rings visible on older foliage."
    }
    mock_client = MockGenAIClient(return_json=mock_payload)
    img_bytes = create_dummy_image(color="green")

    res = service.analyze_leaf_image(
        image_bytes=img_bytes,
        mime_type="image/jpeg",
        crop_hint="Tomato",
        custom_client=mock_client
    )

    assert res.success is True
    assert res.crop == "Tomato"
    assert res.disease == "Early blight"
    assert res.confidence_label == "Medium"
    assert res.urgency == "Medium"  # Grounded in CSV
    assert len(res.first_steps) > 0  # Grounded in CSV
    assert "KVK" in res.next_step  # Grounded in CSV
    assert res.is_uncertain is False

    # Strict Safety check: No chemical names or doses
    has_chem, violations = contains_chemical_names_or_doses(res.next_step)
    assert has_chem is False, f"Violations found: {violations}"
    for step in res.first_steps:
        has_chem, _ = contains_chemical_names_or_doses(step)
        assert has_chem is False

# ----------------- Scenario 2: Unclear / Blurry Leaf Image -----------------
def test_unclear_leaf_image():
    service = get_disease_service()
    mock_payload = {
        "is_leaf": True,
        "crop": "Tomato",
        "disease": "Uncertain",
        "confidence_label": "Low",
        "symptoms": ["Photograph is too blurry to identify disease marks"],
        "is_uncertain": True,
        "reasoning": "Image out of focus."
    }
    mock_client = MockGenAIClient(return_json=mock_payload)
    img_bytes = create_dummy_image()

    res = service.analyze_leaf_image(
        image_bytes=img_bytes,
        mime_type="image/jpeg",
        custom_client=mock_client
    )

    assert res.success is True
    assert res.disease == "Uncertain"
    assert res.confidence_label == "Low"
    assert res.urgency == "None"
    assert res.is_uncertain is True
    assert any("रोशनी" in s or "light" in s.lower() or "स्पष्ट" in s for s in res.first_steps)

# ----------------- Scenario 3: Unsupported Image (Non-leaf / Unrelated) -----------------
def test_unsupported_non_leaf_image():
    service = get_disease_service()
    mock_payload = {
        "is_leaf": False,
        "crop": "Unknown",
        "disease": "Unsupported",
        "confidence_label": "Low",
        "symptoms": ["Image depicts a vehicle, not a plant leaf"],
        "is_uncertain": True,
        "reasoning": "Not a leaf."
    }
    mock_client = MockGenAIClient(return_json=mock_payload)
    img_bytes = create_dummy_image()

    res = service.analyze_leaf_image(
        image_bytes=img_bytes,
        mime_type="image/jpeg",
        custom_client=mock_client
    )

    assert res.success is False
    assert res.disease == "Unsupported"
    assert res.is_uncertain is True

# ----------------- Scenario 4: Invalid File Type -----------------
def test_invalid_file_type():
    service = get_disease_service()
    with pytest.raises(UnsupportedFileTypeError) as exc_info:
        service.validate_image_upload(b"This is just plain text content", filename="test.txt", content_type="text/plain")
    assert "Unsupported file type" in str(exc_info.value)

def test_corrupt_image_bytes():
    service = get_disease_service()
    with pytest.raises(InvalidImageError):
        service.validate_image_upload(b"\x89PNG\r\n\x1a\nCorruptPayloadHere", content_type="image/png")

# ----------------- Scenario 5: Missing API Key -----------------
def test_missing_api_key(monkeypatch):
    service = get_disease_service()
    # Explicitly set empty string
    monkeypatch.setenv("GEMINI_API_KEY", "")

    img_bytes = create_dummy_image()
    with pytest.raises(GeminiAPIKeyMissingError) as exc_info:
        service.analyze_leaf_image(
            image_bytes=img_bytes,
            mime_type="image/jpeg",
            custom_client=None
        )
    assert "GEMINI_API_KEY is not configured" in str(exc_info.value)

# ----------------- Scenario 6: API Failure -----------------
def test_api_failure():
    service = get_disease_service()
    mock_client = MockGenAIClient(should_raise=RuntimeError("Google GenAI connection timeout"))
    img_bytes = create_dummy_image()

    with pytest.raises(GeminiAPICallError) as exc_info:
        service.analyze_leaf_image(
            image_bytes=img_bytes,
            mime_type="image/jpeg",
            custom_client=mock_client
        )
    assert "AI vision service encountered an error" in str(exc_info.value)

# ----------------- Endpoint Tests: POST /api/disease/analyze -----------------
def test_endpoint_missing_api_key(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "")
    img_bytes = create_dummy_image()
    upload = UploadFile(filename="leaf.jpg", file=io.BytesIO(img_bytes), headers={"content-type": "image/jpeg"})

    with pytest.raises(HTTPException) as exc_info:
        analyze_crop_leaf(image=upload, crop="Tomato")
    assert exc_info.value.status_code == 503
    assert "GEMINI_API_KEY is not configured" in exc_info.value.detail

def test_endpoint_invalid_file_type():
    upload = UploadFile(filename="notes.txt", file=io.BytesIO(b"random text"), headers={"content-type": "text/plain"})

    with pytest.raises(HTTPException) as exc_info:
        analyze_crop_leaf(image=upload, crop="Tomato")
    assert exc_info.value.status_code == 400
    assert "Unsupported file type" in exc_info.value.detail

def test_endpoint_valid_image_with_mock():
    mock_payload = {
        "is_leaf": True,
        "crop": "Tomato",
        "disease": "Early blight",
        "confidence_label": "High",
        "symptoms": ["Concentric dark brown rings on lower leaves"],
        "is_uncertain": False,
        "reasoning": "Clear symptoms"
    }
    mock_client = MockGenAIClient(return_json=mock_payload)
    img_bytes = create_dummy_image()
    upload = UploadFile(filename="leaf.jpg", file=io.BytesIO(img_bytes), headers={"content-type": "image/jpeg"})

    # Patch client creation inside disease_service
    with patch("backend.services.disease_service.get_gemini_api_key", return_value="dummy_key"):
        with patch("google.genai.Client", return_value=mock_client):
            res = analyze_crop_leaf(image=upload, crop="Tomato")
            assert res.success is True
            assert res.crop == "Tomato"
            assert res.disease == "Early blight"
            assert res.confidence_label == "High"
            assert res.urgency == "Medium"
            assert len(res.first_steps) > 0
            assert "KVK" in res.next_step
