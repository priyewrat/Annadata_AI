import re
from typing import Optional

CROP_EN_TO_HI = {
    "Tomato": "टमाटर",
    "Potato": "आलू",
    "Wheat": "गेहूँ",
    "Paddy": "धान",
    "Rice (Paddy)": "धान",
    "Maize": "मक्का",
    "Onion": "प्याज",
    "Masoor (lentil)": "मसूर (दाल)",
    "Healthy": "स्वस्थ फसल"
}

CROP_HI_TO_EN = {
    "टमाटर": "Tomato",
    "tamatar": "Tomato",
    "tomato": "Tomato",
    "आलू": "Potato",
    "aalu": "Potato",
    "aloo": "Potato",
    "potato": "Potato",
    "गेहूँ": "Wheat",
    "गेहू": "Wheat",
    "gehun": "Wheat",
    "gehu": "Wheat",
    "wheat": "Wheat",
    "धान": "Paddy",
    "चावल": "Paddy",
    "dhan": "Paddy",
    "paddy": "Paddy",
    "rice": "Paddy",
    "मक्का": "Maize",
    "makka": "Maize",
    "bhutta": "Maize",
    "maize": "Maize",
    "corn": "Maize",
    "प्याज": "Onion",
    "प्याज़": "Onion",
    "pyaaz": "Onion",
    "pyaz": "Onion",
    "onion": "Onion",
    "मसूर": "Masoor (lentil)",
    "masoor": "Masoor (lentil)",
    "lentil": "Masoor (lentil)"
}

MARKET_EN_TO_HI = {
    "Patna": "पटना",
    "Bihar Sharif": "बिहार शरीफ",
    "Ara": "आरा",
    "Hajipur": "हाजीपुर",
    "Muzaffarpur": "मुजफ्फरपुर"
}

MARKET_HI_TO_EN = {
    "पटना": "Patna",
    "patna": "Patna",
    "बिहार शरीफ": "Bihar Sharif",
    "bihar sharif": "Bihar Sharif",
    "biharsharif": "Bihar Sharif",
    "आरा": "Ara",
    "ara": "Ara",
    "arrah": "Ara",
    "हाजीपुर": "Hajipur",
    "hajipur": "Hajipur",
    "मुजफ्फरपुर": "Muzaffarpur",
    "muzaffarpur": "Muzaffarpur"
}

URGENCY_EN_TO_HI = {
    "High": "उच्च (High)",
    "Medium": "मध्यम (Medium)",
    "Low": "कम (Low)",
    "None": "सामान्य (Normal)"
}

DISEASE_EN_TO_HI = {
    "Early blight": "अगेती झुलसा (Early blight)",
    "Late blight": "पछेती झुलसा (Late blight)",
    "Blast": "ब्लास्ट / झोंका रोग (Blast)",
    "Brown spot": "भूरा धब्बा रोग (Brown spot)",
    "Yellow (stripe) rust": "पीला रतुआ (Yellow rust)",
    "Fall armyworm": "फॉल आर्मीवर्म (Fall armyworm)",
    "Healthy leaf": "स्वस्थ पत्ती (Healthy leaf)"
}

def translate_crop(crop_name: str) -> str:
    """Returns Hindi name for a crop, or original name if not found."""
    return CROP_EN_TO_HI.get(crop_name, crop_name)

def detect_crop_from_text(text: str) -> Optional[str]:
    """Detects commodity from Hindi or Hinglish text."""
    lower = text.lower()
    for keyword, standard_name in CROP_HI_TO_EN.items():
        if re.search(r"\b" + re.escape(keyword) + r"\b", lower) or keyword in text:
            return standard_name
    return None

def detect_market_from_text(text: str) -> Optional[str]:
    """Detects Bihar mandi from Hindi or Hinglish text."""
    lower = text.lower()
    for keyword, standard_name in MARKET_HI_TO_EN.items():
        if re.search(r"\b" + re.escape(keyword) + r"\b", lower) or keyword in text:
            return standard_name
    return None

def translate_market(market_name: str) -> str:
    """Returns Hindi name for a mandi."""
    return MARKET_EN_TO_HI.get(market_name, market_name)

def translate_urgency(urgency: Optional[str]) -> str:
    """Returns Hindi translation of urgency."""
    if not urgency or str(urgency).lower() in ["nan", "none"]:
        return "सामान्य (Normal)"
    return URGENCY_EN_TO_HI.get(urgency, urgency)

def translate_disease(disease: str) -> str:
    """Returns Hindi translated disease name."""
    return DISEASE_EN_TO_HI.get(disease, disease)

def format_inr(amount: int) -> str:
    """Formats amount as Indian Rupee string, e.g. ₹2,450 / क्विंटल."""
    return f"₹{amount:,} / क्विंटल"

