import io
import json
import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import pandas as pd
from PIL import Image

from data.loader import get_crop_diseases
from schemas.models import CropDiseaseReference, DiseaseAnalysisResponse, DiseaseDetectionResponse
from utils.hindi import detect_crop_from_text, translate_crop, translate_disease, translate_urgency
from utils.safety import (
    MANDATORY_KVK_ADVISORY,
    MANDATORY_LIKELY_DISEASE_DISCLAIMER,
    enforce_safety_guardrails,
    get_disease_uncertain_response,
)

logger = logging.getLogger("annadata.disease_service")

# Custom Exception Classes
class GeminiAPIKeyMissingError(Exception):
    """Raised when GEMINI_API_KEY is not configured in backend/.env."""
    pass

class UnsupportedFileTypeError(ValueError):
    """Raised when uploaded file format is not supported."""
    pass

class ImageSizeExceededError(ValueError):
    """Raised when uploaded image exceeds file size limit."""
    pass

class InvalidImageError(ValueError):
    """Raised when uploaded file cannot be parsed as a valid image."""
    pass

class GeminiAPICallError(Exception):
    """Raised when Gemini API request encounters a failure."""
    pass

# Supported Image MIME Types and Extensions
ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]
ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"]
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

def get_gemini_api_key() -> Optional[str]:
    """Retrieves GEMINI_API_KEY from backend environment or .env file."""
    if "GEMINI_API_KEY" in os.environ:
        val = os.environ.get("GEMINI_API_KEY", "").strip()
        return val if val else None

    # Attempt to load directly from backend/.env if not present in os.environ
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.is_file():
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("GEMINI_API_KEY=") and not line.startswith("#"):
                        val = line.split("=", 1)[1].strip().strip('"').strip("'")
                        if val:
                            return val
        except Exception:
            pass
    return None

class DiseaseService:
    """
    Authoritative Crop Disease Detection Service.
    Powered by Google GenAI Vision SDK and grounded strictly in crop_disease_reference.csv.
    """

    def __init__(self):
        self._df: Optional[pd.DataFrame] = None

    @property
    def df(self) -> pd.DataFrame:
        if self._df is None:
            self._df = get_crop_diseases()
        return self._df

    def get_all_reference_diseases(self) -> List[CropDiseaseReference]:
        """Returns all reference disease entries from CSV."""
        records = []
        for _, row in self.df.iterrows():
            urgency_val = str(row["urgency"]) if pd.notna(row["urgency"]) and str(row["urgency"]).strip() != "" else "None"
            records.append(
                CropDiseaseReference(
                    crop=str(row["crop"]),
                    disease=str(row["disease"]),
                    visible_symptoms=str(row["visible_symptoms"]),
                    prevention_and_first_steps=str(row["prevention_and_first_steps"]),
                    urgency=urgency_val,
                    next_step=str(row["next_step"])
                )
            )
        return records

    def validate_image_upload(self, image_bytes: bytes, filename: Optional[str] = None, content_type: Optional[str] = None) -> str:
        """
        Validates file size, MIME type, and visual integrity with Pillow.
        Returns validated MIME type string (e.g. 'image/jpeg').
        """
        if not image_bytes or len(image_bytes) == 0:
            raise InvalidImageError("Uploaded image file is empty.")

        if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
            raise ImageSizeExceededError(
                f"File size ({len(image_bytes) / (1024 * 1024):.1f} MB) exceeds the 10 MB limit."
            )

        # Check content type if supplied
        detected_mime = None
        if content_type and content_type.lower() in ALLOWED_MIME_TYPES:
            detected_mime = content_type.lower()
        elif filename:
            ext = os.path.splitext(filename)[1].lower()
            if ext in [".jpg", ".jpeg"]:
                detected_mime = "image/jpeg"
            elif ext == ".png":
                detected_mime = "image/png"
            elif ext == ".webp":
                detected_mime = "image/webp"

        if not detected_mime:
            # Check magic bytes header
            if image_bytes.startswith(b"\xff\xd8\xff"):
                detected_mime = "image/jpeg"
            elif image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
                detected_mime = "image/png"
            elif image_bytes.startswith(b"RIFF") and b"WEBP" in image_bytes[:16]:
                detected_mime = "image/webp"
            else:
                raise UnsupportedFileTypeError(
                    f"Unsupported file type '{content_type or filename}'. Only JPEG, PNG, and WebP images are supported."
                )

        # Validate with PIL
        try:
            with Image.open(io.BytesIO(image_bytes)) as img:
                img.verify()
        except Exception as e:
            raise InvalidImageError(f"Uploaded file is corrupt or not a valid image: {str(e)}") from e

        return detected_mime

    def analyze_leaf_image(
        self,
        image_bytes: bytes,
        mime_type: str,
        crop_hint: Optional[str] = None,
        custom_client: Optional[Any] = None
    ) -> DiseaseAnalysisResponse:
        """
        Sends the leaf image to Gemini Vision SDK grounded in crop_disease_reference.csv,
        validates the result against authoritative data, and returns a structured response.
        """
        api_key = get_gemini_api_key()
        if not api_key and custom_client is None:
            raise GeminiAPIKeyMissingError(
                "GEMINI_API_KEY is not configured in backend/.env. "
                "Please configure a valid Google Gemini API key to enable AI disease detection."
            )

        # Prepare reference records for the model prompt
        ref_records = []
        for _, row in self.df.iterrows():
            urgency_str = str(row["urgency"]) if pd.notna(row["urgency"]) and str(row["urgency"]).strip() != "" else "None"
            ref_records.append({
                "crop": str(row["crop"]),
                "disease": str(row["disease"]),
                "symptoms": str(row["visible_symptoms"]),
                "urgency": urgency_str
            })

        prompt = self._build_gemini_prompt(ref_records, crop_hint=crop_hint)

        # Call Gemini Vision SDK
        try:
            if custom_client is not None:
                client = custom_client
            else:
                from google import genai
                client = genai.Client(api_key=api_key)

            from google.genai import types

            image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
            model_name = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

            config = types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1
            )

            response = client.models.generate_content(
                model=model_name,
                contents=[image_part, prompt],
                config=config
            )

            raw_text = response.text or "{}"
            result_json = json.loads(raw_text)
        except (GeminiAPIKeyMissingError, UnsupportedFileTypeError, ImageSizeExceededError, InvalidImageError):
            raise
        except json.JSONDecodeError as e:
            logger.error("Failed to parse Gemini JSON output: %s", raw_text)
            raise GeminiAPICallError("AI model returned an unparseable response format.") from e
        except Exception as e:
            logger.error("Gemini API call failed: %s", str(e))
            raise GeminiAPICallError(f"AI vision service encountered an error: {str(e)}") from e

        return self._format_and_ground_prediction(result_json, crop_hint=crop_hint)

    def _build_gemini_prompt(self, reference_catalog: List[Dict[str, Any]], crop_hint: Optional[str] = None) -> str:
        catalog_str = json.dumps(reference_catalog, indent=2, ensure_ascii=False)
        if crop_hint and crop_hint.lower() not in ["auto", "none", "unknown"]:
            crop_context = f"\nFarmer indicated crop: {crop_hint}\n"
        else:
            crop_context = "\nFarmer selected: Auto-Detect Crop (Determine the plant species automatically from leaf morphology and venation).\n"

        return f"""You are an expert agricultural plant pathologist specializing in Indian crop diseases for Annadata AI.
You are given a photograph uploaded by an Indian farmer.
{crop_context}
Here is the AUTHORITATIVE REFERENCE CATALOG of supported crops and conditions:
{catalog_str}

CRITICAL RULES:
1. First, check if the image is actually an agricultural plant or crop leaf.
   - If the image is NOT a plant leaf (e.g. human, animal, car, tool, building, random indoor or outdoor object, document), output:
     {{"is_leaf": false, "crop": "Unknown", "disease": "Unsupported", "confidence_label": "Low", "symptoms": ["Uploaded photograph does not appear to be an agricultural crop leaf"], "is_uncertain": true, "reasoning": "Object in image is not a plant leaf."}}
2. Next, check if the photograph quality is sufficient:
   - If the photo is too blurry, too dark, out of focus, or leaf features cannot be confidently assessed, output:
     {{"is_leaf": true, "crop": "Unknown", "disease": "Uncertain", "confidence_label": "Low", "symptoms": ["Photograph is blurry, poorly lit, or leaf features cannot be clearly observed"], "is_uncertain": true, "reasoning": "Insufficient visual detail."}}
3. If it is a plant leaf, match it ONLY against the supported conditions in the reference catalog.
   - If it is healthy with no disease symptoms, select "Healthy leaf" under crop "Healthy".
   - If the crop or disease is clearly NOT present in the catalog, output:
     {{"is_leaf": true, "crop": "<detected crop>", "disease": "Unsupported", "confidence_label": "Low", "symptoms": ["<brief symptoms>"], "is_uncertain": true, "reasoning": "Condition not in supported reference database."}}
4. Confidence label MUST be strictly one of: "High", "Medium", "Low". (Never output a numeric probability).
5. Never state a prediction is 100% certain.
6. SAFETY RULE: NEVER mention any chemical names, brand names, fungicides, insecticides, or dosages in symptoms or reasoning.
7. Provide 1 to 3 observed visual symptoms directly seen on this leaf.

Return ONLY a valid JSON object with these keys:
{{
  "is_leaf": true/false,
  "crop": "Crop name",
  "disease": "Disease name",
  "confidence_label": "High" | "Medium" | "Low",
  "symptoms": ["symptom 1", "symptom 2"],
  "is_uncertain": true/false,
  "reasoning": "brief visual justification"
}}"""

    def _format_and_ground_prediction(
        self,
        ai_output: Dict[str, Any],
        crop_hint: Optional[str] = None
    ) -> DiseaseAnalysisResponse:
        """
        Validates AI model output against crop_disease_reference.csv,
        enforces safety rules, and pulls authoritative treatments from the CSV.
        """
        is_leaf = ai_output.get("is_leaf", True)
        if crop_hint and crop_hint.lower() in ["auto", "none", "unknown"]:
            raw_crop = str(ai_output.get("crop", "Unknown")).strip()
        else:
            raw_crop = str(ai_output.get("crop", crop_hint or "Unknown")).strip()
        raw_disease = str(ai_output.get("disease", "Uncertain")).strip()
        confidence = str(ai_output.get("confidence_label", "Medium")).strip()
        if confidence not in ["High", "Medium", "Low"]:
            confidence = "Medium"
        is_uncertain = bool(ai_output.get("is_uncertain", False))
        observed_symptoms = ai_output.get("symptoms", [])
        if not isinstance(observed_symptoms, list):
            observed_symptoms = [str(observed_symptoms)]

        # 1. Unrelated / Non-leaf image rejected
        if not is_leaf:
            return DiseaseAnalysisResponse(
                success=False,
                crop="Unknown",
                disease="Unsupported",
                confidence_label="Low",
                urgency="None",
                symptoms=["अपलोड की गई तस्वीर किसी कृषि फसल या पत्ती की नहीं लगती है। (Uploaded image does not appear to be a crop leaf)."],
                first_steps=["कृपया किसी फसल की पत्ती की स्पष्ट तस्वीर अपलोड करें।"],
                next_step="केवल फसलों की पत्तियों की तस्वीरों का ही विश्लेषण किया जा सकता है।",
                is_uncertain=True
            )

        # 2. Unclear / Ambiguous photograph
        if is_uncertain or raw_disease.lower() in ["uncertain", "unclear", "unknown"]:
            return DiseaseAnalysisResponse(
                success=True,
                crop=raw_crop if raw_crop != "Unknown" else (crop_hint or "Unknown"),
                disease="Uncertain",
                confidence_label="Low",
                urgency="None",
                symptoms=observed_symptoms or ["तस्वीर धुंधली है या पत्ती के लक्षण स्पष्ट नहीं दिख रहे हैं।"],
                first_steps=[
                    "दिन की अच्छी रोशनी में पत्ती की स्पष्ट और स्थिर तस्वीर लें।",
                    "कैमरे को पत्ती के प्रभावित हिस्से पर केंद्रित करें (अत्यधिक क्लोज़-अप से बचें)।",
                    "पत्ती की ऊपरी और निचली दोनों सतहों की जांच करें।"
                ],
                next_step="सटीक पहचान के लिए कृपया अपने नजदीकी कृषि विज्ञान केंद्र (KVK) या कृषि अधिकारी से संपर्क करें।",
                is_uncertain=True
            )

        # 3. Match against authoritative reference CSV
        matched_row = self._find_matching_csv_row(crop=raw_crop, disease=raw_disease)

        # 4. If disease is not supported in reference CSV
        if matched_row is None or raw_disease.lower() == "unsupported":
            return DiseaseAnalysisResponse(
                success=False,
                crop=raw_crop,
                disease="Unsupported",
                confidence_label="Low",
                urgency="None",
                symptoms=observed_symptoms or ["लक्षण वर्तमान संदर्भ डेटाबेस में सूचीबद्ध नहीं हैं।"],
                first_steps=["यह रोग वर्तमान अधिकृत संदर्भ डेटाबेस में उपलब्ध नहीं है।"],
                next_step="सही पहचान और उपचार के लिए कृपया अपने नजदीकी KVK या प्रखंड कृषि पदाधिकारी से परामर्श लें।",
                is_uncertain=True
            )

        # 5. Authoritative grounding from CSV
        canonical_crop = str(matched_row["crop"])
        canonical_disease = str(matched_row["disease"])
        urgency_val = str(matched_row["urgency"]) if pd.notna(matched_row["urgency"]) and str(matched_row["urgency"]).strip() != "" else "None"
        if urgency_val.lower() in ["nan", "none"]:
            urgency_val = "None"

        raw_first_steps = str(matched_row["prevention_and_first_steps"])
        first_steps = [s.strip() for s in raw_first_steps.split(";") if s.strip()]

        raw_next_step = str(matched_row["next_step"])
        sanitized_next_step = enforce_safety_guardrails(raw_next_step)
        sanitized_symptoms = [enforce_safety_guardrails(s) for s in observed_symptoms]

        return DiseaseAnalysisResponse(
            success=True,
            crop=canonical_crop,
            disease=canonical_disease,
            confidence_label=confidence,
            urgency=urgency_val,
            symptoms=sanitized_symptoms,
            first_steps=first_steps,
            next_step=sanitized_next_step,
            is_uncertain=False
        )

    def _find_matching_csv_row(self, crop: str, disease: str) -> Optional[pd.Series]:
        """
        Finds exact or best fuzzy match in crop_disease_reference.csv.
        """
        crop_l = crop.lower()
        disease_l = disease.lower()

        # Check for Healthy leaf condition
        if "healthy" in disease_l or "healthy" in crop_l:
            healthy_rows = self.df[self.df["crop"].str.lower() == "healthy"]
            if not healthy_rows.empty:
                return healthy_rows.iloc[0]

        # Exact crop & disease match
        for _, row in self.df.iterrows():
            r_crop = str(row["crop"]).lower()
            r_dis = str(row["disease"]).lower()

            if (crop_l in r_crop or r_crop in crop_l) and (disease_l == r_dis):
                return row

        # Fuzzy disease match within crop
        for _, row in self.df.iterrows():
            r_crop = str(row["crop"]).lower()
            r_dis = str(row["disease"]).lower()

            if (crop_l in r_crop or r_crop in crop_l) and (disease_l in r_dis or r_dis in disease_l):
                return row

        # General disease name match regardless of minor crop string discrepancy
        for _, row in self.df.iterrows():
            r_dis = str(row["disease"]).lower()
            if disease_l == r_dis or (len(disease_l) > 4 and disease_l in r_dis):
                return row

        return None

    def diagnose_by_symptoms(
        self,
        symptoms_text: str,
        crop_hint: Optional[str] = None
    ) -> DiseaseDetectionResponse:
        """
        Text symptom diagnosis fallback (used by Hindi assistant).
        """
        if not symptoms_text or len(symptoms_text.strip()) < 3:
            uncertain = get_disease_uncertain_response(crop=crop_hint or "Unknown")
            return DiseaseDetectionResponse(**uncertain)

        detected_crop = crop_hint or detect_crop_from_text(symptoms_text)
        lower_symptoms = symptoms_text.lower()

        best_match_row = None
        best_score = 0

        for _, row in self.df.iterrows():
            row_crop = str(row["crop"]).lower()
            row_disease = str(row["disease"]).lower()
            row_symptoms = str(row["visible_symptoms"]).lower()

            score = 0
            if detected_crop and detected_crop.lower() in row_crop:
                score += 3

            if "bhoore daag" in lower_symptoms or "gol gol" in lower_symptoms or "rings" in lower_symptoms:
                if "early blight" in row_disease:
                    score += 5
            if "water-soaked" in lower_symptoms or "patches" in lower_symptoms or "humid" in lower_symptoms:
                if "late blight" in row_disease:
                    score += 5
            if "sawdust" in lower_symptoms or "बुरादा" in symptoms_text or "छेद" in symptoms_text or "holes" in lower_symptoms:
                if "fall armyworm" in row_disease:
                    score += 6
            if "yellow powder" in lower_symptoms or "पीला" in symptoms_text or "rust" in lower_symptoms:
                if "yellow" in row_disease:
                    score += 5

            if score > best_score:
                best_score = score
                best_match_row = row

        if best_match_row is None or best_score < 2:
            uncertain = get_disease_uncertain_response(crop=detected_crop or "Unknown")
            return DiseaseDetectionResponse(**uncertain)

        crop_name = str(best_match_row["crop"])
        disease_name = str(best_match_row["disease"])
        urgency_val = str(best_match_row["urgency"]) if pd.notna(best_match_row["urgency"]) and str(best_match_row["urgency"]).strip() != "" else "None"
        raw_first_steps = str(best_match_row["prevention_and_first_steps"])
        first_steps = [s.strip() for s in raw_first_steps.split(";") if s.strip()]
        sanitized_next_step = enforce_safety_guardrails(str(best_match_row["next_step"]))

        confidence = "उच्च (High)" if best_score >= 5 else "मध्यम (Medium)"

        return DiseaseDetectionResponse(
            crop=crop_name,
            likely_disease=f"संभावित: {translate_disease(disease_name)}",
            confidence=confidence,
            urgency=urgency_val,
            urgency_hindi=translate_urgency(urgency_val),
            safe_first_steps=first_steps,
            next_step=sanitized_next_step,
            chemical_warning="सुरक्षा चेतावनी: हम रासायनिक दवाओं या उनकी मात्रा की सिफारिश नहीं करते हैं। कृपया KVK से संपर्क करें।",
            is_uncertain=False
        )

# Singleton instance
_disease_service: Optional[DiseaseService] = None

def get_disease_service() -> DiseaseService:
    global _disease_service
    if _disease_service is None:
        _disease_service = DiseaseService()
    return _disease_service
