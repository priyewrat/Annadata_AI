import re
from typing import List, Tuple

# Banned chemical names (fungicides, insecticides, herbicides, chemical compounds)
BANNED_CHEMICAL_KEYWORDS = [
    # English names
    "mancozeb", "chlorpyrifos", "carbendazim", "imidacloprid", "glyphosate",
    "cypermethrin", "malathion", "monocrotophos", "propiconazole", "hexaconazole",
    "streptomycin", "copper oxychloride", "thiamethoxam", "acephate", "dimethoate",
    "lambda-cyhalothrin", "coragen", "chlorantraniliprole", "spinosad", "cartap",
    "atrazine", "pendimethalin", "paraquat", "2,4-d",
    # Hindi / Hinglish names
    "मैंकोजेब", "क्लोरोपायरीफॉस", "कार्बेंडाजिम", "इमिडाक्लोप्रिड", "ग्लाइफोसेट",
    "साइपरमेथ्रिन", "मैलाथियान", "मोनोक्रोटोफॉस", "प्रोपिकोनाजोल", "हेक्साकोनाजोल",
    "स्ट्रेप्टोमाइसिन", "कॉपर ऑक्सीक्लोराइड", "थियामेथोक्सम", "कोराजन"
]

# Banned dosage patterns (e.g. 2 ml/l, 500 gm/acre, 2ml प्रति लीटर)
BANNED_DOSE_PATTERNS = [
    r"\b\d+(\.\d+)?\s*(ml|gm|g|kg|l|litre|liter|gram)\s*/\s*(l|litre|liter|acre|ha|hectare)\b",
    r"\b\d+(\.\d+)?\s*(मिली|ग्राम|किलो)\s*(प्रति|\/)\s*(लीटर|एकड़|हेक्टेयर)\b",
    r"\b\d+(\.\d+)?\s*ml\b",
    r"\b\d+(\.\d+)?\s*gm\b",
    r"\b\d+(\.\d+)?\s*ग्राम\b",
    r"\b\d+(\.\d+)?\s*मिली\b"
]

MANDATORY_KVK_ADVISORY = (
    "रासायनिक उपचार और सटीक दवा/मात्रा के लिए कृपया अपने नजदीकी कृषि विज्ञान केंद्र (KVK) "
    "या स्थानीय कृषि पदाधिकारी से संपर्क करें।"
)

MANDATORY_SYNTHETIC_PRICE_DISCLAIMER = (
    "अस्वीकरण: यह मंडी डेटा पूरी तरह कृत्रिम (Synthetic) है और build#thon 2026 के लिए तैयार किया गया है। "
    "यह आधिकारिक मंडी दर नहीं है और भविष्य के भावों की कोई गारंटी नहीं है।"
)

MANDATORY_LIKELY_DISEASE_DISCLAIMER = (
    "रोग पहचान केवल 'संभावित' (Likely) है, पूर्णतः निश्चित नहीं। पुष्टि के लिए कृषि विशेषज्ञ या KVK से जांच कराएं।"
)

def contains_chemical_names_or_doses(text: str) -> Tuple[bool, List[str]]:
    """
    Checks if text contains banned chemical names or dosage recommendations.
    Returns (True/False, list of detected violations).
    """
    if not text:
        return False, []

    lower_text = text.lower()
    violations: List[str] = []

    for chemical in BANNED_CHEMICAL_KEYWORDS:
        if chemical in lower_text:
            violations.append(f"Chemical name detected: {chemical}")

    for pattern in BANNED_DOSE_PATTERNS:
        matches = re.findall(pattern, lower_text, re.IGNORECASE)
        if matches:
            violations.append(f"Dosage pattern detected matching: {pattern}")

    return len(violations) > 0, violations

def enforce_safety_guardrails(text: str) -> str:
    """
    Strips accidental chemical mentions and appends mandatory KVK advisory.
    """
    sanitized = text
    lower = text.lower()

    # Redact any chemical keyword
    for chemical in BANNED_CHEMICAL_KEYWORDS:
        if chemical in lower:
            # Case-insensitive replacement with generic safe term
            sanitized = re.sub(re.escape(chemical), "[दवा/कीटनाशक]", sanitized, flags=re.IGNORECASE)

    # Redact dosage patterns
    for pattern in BANNED_DOSE_PATTERNS:
        sanitized = re.sub(pattern, "[विशेषज्ञ द्वारा निर्धारित मात्रा]", sanitized, flags=re.IGNORECASE)

    # Ensure KVK reference exists
    if "kvk" not in sanitized.lower() and "कृषि विज्ञान केंद्र" not in sanitized:
        sanitized = f"{sanitized}\n\n{MANDATORY_KVK_ADVISORY}"

    return sanitized

def get_disease_uncertain_response(crop: str = "Unknown") -> dict:
    """
    Safe fallback response when image or symptom evidence is ambiguous.
    """
    return {
        "crop": crop,
        "likely_disease": "अनिश्चित (Uncertain)",
        "confidence": "कम (Low)",
        "urgency": "None",
        "urgency_hindi": "सामान्य",
        "safe_first_steps": [
            "पत्ती की स्पष्ट और बेहतर रोशनी वाली तस्वीर दोबारा लें।",
            "पौधे के संक्रमित हिस्से को अलग रखें और निरीक्षण करते रहें।",
            "पत्तियों पर सीधे पानी का छिड़काव करने से बचें।"
        ],
        "next_step": MANDATORY_KVK_ADVISORY,
        "chemical_warning": "हम रासायनिक दवाओं की सिफारिश नहीं करते हैं। कृपया KVK से संपर्क करें।",
        "is_uncertain": True
    }

