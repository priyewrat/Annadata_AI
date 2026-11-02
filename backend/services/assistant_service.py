import logging
import re
from typing import Any, Dict, Optional

from schemas.models import AssistantQueryResponse
from services.disease_service import get_disease_service
from services.mandi_service import get_mandi_service
from services.weather_service import get_weather_service
from utils.hindi import (
    detect_crop_from_text,
    detect_market_from_text,
    format_inr,
    translate_crop,
    translate_market,
)
from utils.safety import (
    MANDATORY_KVK_ADVISORY,
    MANDATORY_SYNTHETIC_PRICE_DISCLAIMER,
    enforce_safety_guardrails,
)

logger = logging.getLogger("annadata.assistant_service")


def detect_query_language(text: str, explicit_lang: Optional[str] = None) -> str:
    """
    Detects whether the farmer's query is in English ('en') or Hindi/Hinglish ('hi').
    Respects explicit language preference if provided and valid.
    """
    if explicit_lang in ["en", "hi"]:
        return explicit_lang

    clean = text.strip()
    if not clean:
        return "hi"

    # 1. Any Devanagari character (U+0900 - U+097F) -> definitively Hindi
    if re.search(r"[\u0900-\u097F]", clean):
        return "hi"

    lower = clean.lower()

    # 2. Common Hinglish phonetics and agricultural colloquial terms
    hinglish_markers = [
        r"\bkya\b", r"\bhai\b", r"\bhain\b", r"\bho\b", r"\bhoga\b", r"\bhogi\b",
        r"\bkarein\b", r"\bkarna\b", r"\bkaru\b", r"\bkaroon\b", r"\bkaise\b",
        r"\bpatte\b", r"\bpatta\b", r"\bdaag\b", r"\bkeeda\b", r"\bkida\b",
        r"\bbaarish\b", r"\bbarish\b", r"\bbhaav\b", r"\bbhav\b", r"\bdaam\b",
        r"\bbechna\b", r"\bbechein\b", r"\bruk\b", r"\brukein\b", r"\bkitna\b",
        r"\bbuwai\b", r"\bbuai\b", r"\bboni\b", r"\bsamay\b", r"\bka\b", r"\bki\b",
        r"\bke\b", r"\bmein\b", r"\bme\b", r"\bse\b", r"\bko\b", r"\bpe\b", r"\bpar\b",
        r"\btheek\b", r"\bthik\b", r"\baccha\b", r"\bachha\b", r"\bdhanyawad\b", r"\bshukriya\b"
    ]
    if any(re.search(marker, lower) for marker in hinglish_markers):
        return "hi"

    # 3. English question structures and conversational terms
    english_markers = [
        r"\bwhat\b", r"\bwhen\b", r"\bhow\b", r"\bwhy\b", r"\bcan\b", r"\bshould\b",
        r"\bwill\b", r"\bis\b", r"\bare\b", r"\bprice\b", r"\brate\b", r"\bspray\b",
        r"\bweather\b", r"\brain\b", r"\bdisease\b", r"\bsymptom\b", r"\btomorrow\b",
        r"\btoday\b", r"\bsow\b", r"\bsowing\b", r"\bwheat\b", r"\bpotato\b",
        r"\btomato\b", r"\bonion\b", r"\brice\b", r"\bpaddy\b", r"\bcrop\b",
        r"\bfertilizer\b", r"\bpesticide\b", r"\bleaf\b", r"\bleaves\b", r"\btell\b",
        r"\bthank\b", r"\bthanks\b", r"\bthanku\b", r"\bok\b", r"\bokay\b", r"\bhello\b",
        r"\bhi\b", r"\bhey\b", r"\bgood\b", r"\bhelp\b"
    ]
    if any(re.search(marker, lower) for marker in english_markers):
        return "en"

    return "hi"


class AssistantService:
    """
    Intelligent Bilingual Farmer Assistant Engine.
    Accurately understands queries in Hindi, Hinglish, and English.
    Provides natural conversational responses for greetings, gratitude, and confirmations,
    and authoritative, non-generic, ICAR-grounded agricultural advisories.
    """

    def __init__(self):
        self.disease_service = get_disease_service()
        self.mandi_service = get_mandi_service()
        self.weather_service = get_weather_service()

    def process_query(
        self,
        query: str,
        location_hint: str = "Patna",
        language: Optional[str] = "auto"
    ) -> AssistantQueryResponse:
        clean_query = query.strip()
        lower_q = clean_query.lower()
        detected_lang = detect_query_language(clean_query, None if language == "auto" else language)

        # ----------------- 1. Core Agricultural Services -----------------

        # A. Weather / Spray query intent
        # Keywords: weather, forecast, rain, baarish, spray, barish, mausam, बारिश, छिड़काव, स्प्रे, मौसम
        if any(w in lower_q for w in ["spray", "छिड़काव", "स्प्रे"]) or any(
            w in lower_q for w in ["baarish", "barish", "बारिश", "rain", "mausam", "मौसम", "weather", "forecast", "climate"]
        ):
            return self._handle_weather_query(clean_query, detected_lang)

        # B. Mandi Price / Selling Advice intent
        # Keywords: bechna, bechein, bhaav, bhav, daam, rate, mandi, price, sell, भाव, दाम, मंडी, बेचें, बेचना
        if any(w in lower_q for w in ["bechna", "bechein", "ruk", "bhaav", "bhav", "daam", "rate", "mandi", "price", "sell", "holding", "भाव", "दाम", "मंडी", "बेचें", "बेचना", "रुकें"]):
            return self._handle_mandi_query(clean_query, default_location=location_hint, lang=detected_lang)

        # C. Disease / Pest Detection intent
        # Keywords: daag, keeda, rog, bimari, kida, chhed, burada, symptom, blight, rust, leaf, पत्ता, पत्ते, रोग, बीमारी, कीड़ा, छेद, बुरादा
        if any(w in lower_q for w in [
            "daag", "keeda", "kida", "rog", "bimari", "patte", "chhed", "burada",
            "symptom", "blight", "fungus", "spot", "leaf", "leaves", "infection",
            "धब्बा", "रोग", "बीमारी", "कीड़ा", "छेद", "बुरादा", "पत्ते", "पत्ती"
        ]):
            return self._handle_disease_query(clean_query, detected_lang)

        # D. Agronomy / Sowing Timing questions (e.g. Gehun ki buwai ka sahi samay)
        # Keywords: buwai, buai, boni, time, samay, sow, sowing, wheat, बुवाई, समय, कब बोएं
        if (any(w in lower_q for w in ["buwai", "buai", "boni", "बुवाई", "बोने", "कब बोएं", "sow", "sowing"]) and
                ("gehun" in lower_q or "गेहूँ" in clean_query or "wheat" in lower_q)):
            return self._handle_wheat_sowing_query(clean_query, detected_lang)

        # ----------------- 2. Conversational Intent Handlers -----------------

        # E. Gratitude ("Thanku", "Thank you", "Thanks", "धन्यवाद", "शुक्रिया")
        if self._is_gratitude(lower_q):
            return self._handle_gratitude(clean_query, detected_lang)

        # F. Acknowledgement / Confirmation ("ok", "okay", "theek hai", "अच्छा", "got it")
        if self._is_acknowledgement(lower_q):
            return self._handle_acknowledgement(clean_query, detected_lang)

        # G. Greetings ("hello", "hi", "namaste", "राम राम")
        if self._is_greeting(lower_q):
            return self._handle_greeting(clean_query, detected_lang)

        # H. Identity / Help ("who are you", "what can you do", "तुम कौन हो")
        if self._is_identity_query(lower_q):
            return self._handle_identity(clean_query, detected_lang)

        # I. Farewell ("bye", "goodbye", "अलविदा")
        if self._is_farewell(lower_q):
            return self._handle_farewell(clean_query, detected_lang)

        # ----------------- 3. General Agronomy Topics -----------------
        # Handles soil testing, vermicompost, drip irrigation, organic methods
        agronomy_res = self._check_general_agronomy(clean_query, lower_q, detected_lang)
        if agronomy_res:
            return agronomy_res

        # ----------------- 4. Friendly Fallback -----------------
        return self._handle_unsupported_query(clean_query, detected_lang)

    # --- Conversational Detection Helpers ---

    def _clean_conversational_text(self, text: str) -> str:
        # Strip punctuation safely without erasing Devanagari vowel signs/matras
        return re.sub(r"[.,\/#!$%\^&\*;:{}=\-_`~()?'\"!।]", "", text).strip()

    def _is_gratitude(self, text: str) -> bool:
        lower = self._clean_conversational_text(text.lower())
        gratitude_tokens = [
            "thanku", "thank you", "thanks", "thx", "thank u", "many thanks",
            "dhanyawad", "dhanyavaad", "shukriya", "धन्यवाद", "शुक्रिया",
            "थैंक यू", "थैंक्यू", "bahut dhanyawad"
        ]
        return any(t in lower for t in gratitude_tokens)

    def _is_acknowledgement(self, text: str) -> bool:
        normalized = self._clean_conversational_text(text.lower())
        ack_exact = {
            "ok", "okay", "k", "got it", "understood", "alright", "all right",
            "fine", "yes", "sure", "cool", "great", "noted", "sounds good",
            "perfect", "done", "theek hai", "thik hai", "thik", "accha",
            "achha", "acha", "haan", "ha", "sahi hai", "samajh gaya",
            "samajh gaye", "theek", "thik h", "theek h", "thik h ji", "theek hai ji",
            "ठीक है", "अच्छा", "हाँ", "हां", "समझ गया", "बढ़िया", "सही है", "अच्छा ठीक है"
        }
        if normalized in ack_exact:
            return True
        tokens = normalized.split()
        if len(tokens) <= 3 and any(t in ["ok", "okay", "thik", "theek", "achha", "accha", "fine"] for t in tokens):
            return True
        return False

    def _is_greeting(self, text: str) -> bool:
        normalized = self._clean_conversational_text(text.lower())
        greetings_exact = {
            "hello", "hi", "hey", "good morning", "good afternoon", "good evening",
            "greetings", "namaste", "namaskar", "pranam", "ram ram", "radhe radhe",
            "jai kisan", "नमस्ते", "नमस्कार", "प्रणाम", "राम राम", "राधे राधे", "जय किसान"
        }
        if normalized in greetings_exact:
            return True
        tokens = normalized.split()
        if len(tokens) <= 3 and any(t in ["hello", "hi", "hey", "namaste", "namaskar", "नमस्ते", "नमस्कार"] for t in tokens):
            return True
        return False

    def _is_identity_query(self, text: str) -> bool:
        patterns = [
            "who are you", "what are you", "what can you do", "what do you do",
            "how can you help", "features", "tum kaun ho", "aap kaun hain",
            "kya kar sakte ho", "kya kaam karte ho", "तुम कौन हो", "आप क्या कर सकते हैं",
            "help", "help me", "madad", "मदद"
        ]
        return any(p in text for p in patterns)

    def _is_farewell(self, text: str) -> bool:
        normalized = self._clean_conversational_text(text.lower())
        farewells = {"bye", "goodbye", "good bye", "see you", "alvida", "अलविदा", "बाय", "फिर मिलेंगे"}
        return normalized in farewells

    # --- Conversational Response Generators ---

    def _handle_gratitude(self, query: str, lang: str) -> AssistantQueryResponse:
        hi_text = (
            "आपका बहुत-बहुत स्वागत है! 😊 किसान भाइयों की सेवा और खेती को लाभकारी बनाना ही हमारा उद्देश्य है।\n\n"
            "यदि आपको अपनी फसलों में किसी रोग के लक्षण दिखें, मंडी के ताज़ा भाव जानने हों, "
            "या मौसम के अनुसार छिड़काव की योजना बनानी हो, तो कभी भी पूछें। आपकी अच्छी पैदावार हो! 🌾"
        )
        en_text = (
            "You are very welcome! 😊 Always happy to assist you.\n\n"
            "Whenever you have questions about crop health, real-time Bihar mandi rates, "
            "or weather-aware spray advisories, Annadata AI is here to help. Wishing you a bountiful harvest! 🌾"
        )
        active_answer = en_text if lang == "en" else hi_text

        return AssistantQueryResponse(
            original_query=query,
            routed_service="conversational",
            answer_hindi=hi_text,
            answer_english=en_text,
            answer=active_answer,
            detected_language=lang,
            service_payload={"intent": "gratitude"}
        )

    def _handle_acknowledgement(self, query: str, lang: str) -> AssistantQueryResponse:
        hi_text = (
            "बढ़िया! खुशी हुई कि जानकारी आपके काम आई। 👍\n\n"
            "जब भी आपको किसी फसल की पत्ती में रोग दिखे, आसपास की मंडियों के भाव की तुलना करनी हो, "
            "या छिड़काव का सही समय जांचना हो, तो बेझिझक सवाल पूछें। मैं सदैव आपकी सेवा में उपलब्ध हूँ। 🌾"
        )
        en_text = (
            "Understood! Glad the advisory was helpful. 👍\n\n"
            "Whenever you need to scan a crop leaf, track APMC mandi price trends, "
            "or check 48-hour rainfall spray safety, simply send a message. Have a productive day in the field! 🌾"
        )
        active_answer = en_text if lang == "en" else hi_text

        return AssistantQueryResponse(
            original_query=query,
            routed_service="conversational",
            answer_hindi=hi_text,
            answer_english=en_text,
            answer=active_answer,
            detected_language=lang,
            service_payload={"intent": "acknowledgement"}
        )

    def _handle_greeting(self, query: str, lang: str) -> AssistantQueryResponse:
        hi_text = (
            "नमस्ते किसान भाई! 🌾 मैं **अन्नदाता AI** हूँ, आपका डिजिटल कृषि सहयोगी।\n\n"
            "आज मैं आपकी खेती में क्या सहायता कर सकता हूँ? आप मुझसे:\n"
            "• 🔬 **फसल डॉक्टर**: पत्तियों के धब्बों या कीड़े के लक्षणों की पहचान और सुरक्षित प्राथमिक उपाय\n"
            "• 📈 **मंडी भाव**: पटना, हाजीपुर, मुजफ्फरपुर व अन्य मंडियों के ताज़ा मॉडल भाव व बिक्री सलाह\n"
            "• 🌧️ **मौसम सलाह**: अगले 48 घंटों में बारिश का अनुमान और कीटनाशक छिड़काव की सुरक्षा\n"
            "के बारे में कभी भी पूछ सकते हैं।"
        )
        en_text = (
            "Hello Kisan brother! 🌾 I am **Annadata AI**, your dedicated smart farming companion.\n\n"
            "How can I help your farm today? You can ask me about:\n"
            "• 🔬 **Crop Doctor**: Diagnosing plant diseases from symptoms or leaf photos with safe first steps\n"
            "• 📈 **Mandi Rates**: Live APMC market prices, 7-day trends, and selling advice across Bihar\n"
            "• 🌧️ **Weather Advisory**: 48-hour rainfall forecasts to guide pesticide & fertilizer spray timing"
        )
        active_answer = en_text if lang == "en" else hi_text

        return AssistantQueryResponse(
            original_query=query,
            routed_service="conversational",
            answer_hindi=hi_text,
            answer_english=en_text,
            answer=active_answer,
            detected_language=lang,
            service_payload={"intent": "greeting"}
        )

    def _handle_identity(self, query: str, lang: str) -> AssistantQueryResponse:
        hi_text = (
            "मैं **अन्नदाता AI** हूँ — भारतीय किसानों के लिए समर्पित डिजिटल कृषि सलाहकार।\n\n"
            "मेरी मुख्य सेवाएं:\n"
            "1. 🔬 **फसल डॉक्टर**: पत्तियों की फोटो या लक्षणों से रोग पहचानना और ICAR-अनुरूप सुरक्षित गैर-रासायनिक प्राथमिक कदम बताना।\n"
            "2. 📈 **मंडी भाव विश्लेषण**: बिहार की मंडियों के ताज़ा मॉडल भाव, 7 व 30 दिनों के मूल्य रुझान और कब बेचना लाभदायक होगा की स्पष्ट सलाह।\n"
            "3. 🌧️ **मौसम व छिड़काव सलाहकार**: 48 घंटे वर्षा थ्रेशोल्ड (2.0 mm) के आधार पर दवा छिड़काव रोकने या करने की वैज्ञानिक चेतावनी।\n"
            "4. 📞 **वैज्ञानिक रेफरल**: बिना किसी मनगढ़ंत रासायनिक खुराक के, सीधे स्थानीय KVK और टोल-फ्री किसान कॉल सेंटर (1800-180-1551) से जोड़ना।"
        )
        en_text = (
            "I am **Annadata AI**, an intelligent digital agricultural advisor designed for Indian farmers.\n\n"
            "Core Capabilities:\n"
            "1. 🔬 **Crop Doctor**: Identifies crop diseases from visible symptoms or leaf photographs, providing safe non-chemical cultural first steps.\n"
            "2. 📈 **Mandi Intelligence**: Tracks live modal prices, price ranges, and 7-day/30-day trends across Bihar APMC mandis with sell vs hold guidance.\n"
            "3. 🌧️ **Weather Spray Advisory**: Evaluates 48-hour rainfall thresholds (2.0 mm limit) to prevent wasted chemical sprays and runoff.\n"
            "4. 📞 **KVK Scientist Support**: Connects you with certified Krishi Vigyan Kendra agronomists and toll-free Kisan Call Center (1800-180-1551) under strict zero-chemical-dosage safety guidelines."
        )
        active_answer = en_text if lang == "en" else hi_text

        return AssistantQueryResponse(
            original_query=query,
            routed_service="advisory",
            answer_hindi=hi_text,
            answer_english=en_text,
            answer=active_answer,
            detected_language=lang,
            service_payload={"intent": "identity"}
        )

    def _handle_farewell(self, query: str, lang: str) -> AssistantQueryResponse:
        hi_text = (
            "अलविदा किसान भाई! 🌾 आपके खेतों में उत्तम पैदावार हो और अच्छी फसल का उचित मूल्य मिले। "
            "जब भी कृषि परामर्श की आवश्यकता हो, अन्नदाता AI सदैव आपके साथ है। शुभ दिन!"
        )
        en_text = (
            "Goodbye and wishing you a prosperous, high-yielding harvest! 🌾 "
            "Feel free to return whenever you need farm advisories or mandi updates. Have a great day!"
        )
        active_answer = en_text if lang == "en" else hi_text

        return AssistantQueryResponse(
            original_query=query,
            routed_service="conversational",
            answer_hindi=hi_text,
            answer_english=en_text,
            answer=active_answer,
            detected_language=lang,
            service_payload={"intent": "farewell"}
        )

    # --- General Agronomy Topics ---

    def _check_general_agronomy(self, query: str, lower_q: str, lang: str) -> Optional[AssistantQueryResponse]:
        # Vermicompost / Organic Manure
        if any(w in lower_q for w in ["vermicompost", "compost", "gobar", "केंचुआ", "जैविक खाद", "खाद"]):
            hi_text = (
                "केंचुआ खाद (वर्मीकम्पोस्ट) निर्माण का वैज्ञानिक तरीका:\n"
                "• स्थान का चयन: छायादार व ऊंचे स्थान पर 10×3×2 फीट का गड्ढा या पक्का बेड बनाएं।\n"
                "• उपयुक्त प्रजाति: 'आइसीनिया फोटिडा' (Eisenia foetida) प्रजाति के केंचुए सर्वोत्तम माने जाते हैं।\n"
                "• परतें तैयार करना: तली में 3 इंच सूखी पत्तियां या पुआल बिछाएं, फिर 15-20 दिन पुराना सड़ा हुआ गोबर और कृषि अवशेष भरें (ताज़ा गोबर न डालें क्योंकि उसमें गर्मी अधिक होती है)।\n"
                "• नमी व तापमान: 30-40% नमी बनाए रखें और जूट की बोरियों से ढककर रखें। 45-60 दिनों में चाय पत्ती जैसी भुरभुरी जैविक खाद तैयार हो जाती है।\n\n"
                f"{MANDATORY_KVK_ADVISORY}"
            )
            en_text = (
                "Scientific Guide to Vermicomposting for Farmers:\n"
                "• Site Selection: Choose an elevated, shaded area to build a 10×3×2 ft bed with proper drainage.\n"
                "• Earthworm Variety: Eisenia foetida (Red wigglers) are the most efficient bio-degraders.\n"
                "• Bedding & Feeding: Lay 3 inches of dry straw at the bottom, then layer 15–20 day pre-decomposed cattle manure mixed with green farm biomass (never use fresh cow dung as excessive heat harms worms).\n"
                "• Moisture & Harvesting: Maintain 30–40% moisture by sprinkling water and covering with wet burlap bags. Rich, granular vermicompost is ready in 45–60 days.\n\n"
                "KVK Advisory: For earthworm culture and KVK training subsidies, call Kisan Call Center toll-free at 1800-180-1551."
            )
            return AssistantQueryResponse(
                original_query=query,
                routed_service="advisory",
                answer_hindi=hi_text,
                answer_english=en_text,
                answer=en_text if lang == "en" else hi_text,
                detected_language=lang,
                service_payload={"topic": "vermicompost"}
            )

        # Drip Irrigation / Water Management
        if any(w in lower_q for w in ["drip", "irrigation", "sprinkler", "सिंचाई", "ड्रिप"]):
            hi_text = (
                "सूक्ष्म एवं ड्रिप सिंचाई प्रणाली के लाभ व सुझाव:\n"
                "• जल बचत: पारंपरिक सिंचाई की तुलना में ड्रिप सिंचाई से 40% से 60% पानी की बचत होती है और उपज 20-30% बढ़ जाती है।\n"
                "• फर्टिगेशन (Fertigation): घुलनशील उर्वरकों को सीधे जड़ों तक पहुंचाया जा सकता है, जिससे उर्वरक की बर्बादी रुकती है।\n"
                "• सरकारी सब्सिडी: 'प्रधानमंत्री कृषि सिंचाई योजना' (PMKSY) के तहत बिहार में ड्रिप व स्प्रिंकलर संयंत्रों पर 70% से 90% तक का अनुदान उपलब्ध है।\n\n"
                "आवेदन के लिए आधिकारिक DBT Agriculture Bihar पोर्टल पर पंजीकरण करें या प्रखंड उद्यान पदाधिकारी से संपर्क करें।"
            )
            en_text = (
                "Drip & Micro-Irrigation Advisory:\n"
                "• Water Efficiency: Drip irrigation saves 40% to 60% water compared to conventional flood irrigation while boosting crop yields by 20–30%.\n"
                "• Fertigation Benefit: Soluble nutrients and bio-stimulants are delivered directly to plant root zones, minimizing weed growth and fertilizer loss.\n"
                "• Government Subsidies: Under the Pradhan Mantri Krishi Sinchayee Yojana (PMKSY), subsidies ranging from 70% to 90% are provided for small and marginal farmers in Bihar.\n\n"
                "To apply, visit the official DBT Agriculture Bihar portal or consult your District Horticulture Officer."
            )
            return AssistantQueryResponse(
                original_query=query,
                routed_service="advisory",
                answer_hindi=hi_text,
                answer_english=en_text,
                answer=en_text if lang == "en" else hi_text,
                detected_language=lang,
                service_payload={"topic": "irrigation"}
            )

        # Soil Testing / Health Card
        if any(w in lower_q for w in ["soil", "mitti", "मिट्टी", "जांच"]):
            hi_text = (
                "मृदा स्वास्थ्य जांच (Soil Testing) संबंधी मार्गदर्शन:\n"
                "• नमूना लेने का सही समय: फसल कटाई के बाद और अगली बुवाई से पहले खेत की 8-10 अलग-अलग जगहों से 'V' आकार में 6 इंच गहराई से मिट्टी का नमूना लें।\n"
                "• नमूने की तैयारी: सभी नमूनों को अच्छी तरह मिलाकर छांव में सुखाएं और लगभग 500 ग्राम मिट्टी स्वच्छ कपड़े की थैली में पैक करें।\n"
                "• मृदा स्वास्थ्य कार्ड: मिट्टी में नाइट्रोजन (N), फास्फोरस (P), पोटाश (K), जिंक और पीएच मान की सटीक जांच से अनावश्यक रासायनिक खाद का खर्च 30% तक घट जाता है।\n\n"
                "निकटतम मृदा परीक्षण प्रयोगशाला या कृषि विज्ञान केंद्र (KVK) में संपर्क करें।"
            )
            en_text = (
                "Soil Testing & Soil Health Card Guidance:\n"
                "• Sampling Method: After harvest and before sowing, collect soil cores in a 'V' shape to a depth of 6 inches from 8–10 zig-zag spots across your field.\n"
                "• Sample Preparation: Thoroughly mix the samples on a clean tarp, quarter down to 500 grams, shade-dry, and pack in a clean cloth pouch with field details.\n"
                "• Cost Savings: Testing pH, organic carbon, and primary N-P-K levels prevents over-application of urea and DAP, lowering fertilizer input costs by up to 30%.\n\n"
                "Submit samples to your nearest District Soil Testing Lab or Krishi Vigyan Kendra (KVK)."
            )
            return AssistantQueryResponse(
                original_query=query,
                routed_service="advisory",
                answer_hindi=hi_text,
                answer_english=en_text,
                answer=en_text if lang == "en" else hi_text,
                detected_language=lang,
                service_payload={"topic": "soil_testing"}
            )

        return None

    # --- Core Service Implementations ---

    def _handle_weather_query(self, query: str, lang: str) -> AssistantQueryResponse:
        advisory = self.weather_service.get_spray_advisory()
        rain_mm = round(advisory.rainfall_next_48h_mm, 1)

        if not advisory.can_spray:
            hi_text = (
                f"मौसम अलर्ट: अगले 48 घंटों में पटना क्षेत्र में लगभग {rain_mm} mm बारिश का पूर्वानुमान है "
                f"(जो कि 2.0 mm की सुरक्षा सीमा से अधिक है)।\n\n"
                f"सटीक वैज्ञानिक सलाह:\n"
                f"• दवा व यूरिया का छिड़काव तुरंत रोकें: बारिश से महंगी कीटनाशक दवा बह जाएगी, मिट्टी व जल प्रदूषित होगा और कीट नियंत्रण शून्य रहेगा।\n"
                f"• छिड़काव कब करें: बारिश पूरी तरह थमने, पत्तियां सूखने और हवा की गति 10 किमी/घंटा से कम होने पर ही दोपहर 11 बजे से 4 बजे के बीच सुरक्षित छिड़काव करें।\n"
                f"• डेटा स्रोत: {advisory.data_source} | आपातकालीन परामर्श: किसान कॉल सेंटर 1800-180-1551。"
            )
            en_text = (
                f"Weather Advisory Alert: Forecast predicts approximately {rain_mm} mm of rainfall in the Patna region over the next 48 hours "
                f"(exceeding the critical 2.0 mm threshold).\n\n"
                f"Actionable Scientific Advice:\n"
                f"• Postpone all chemical and fertilizer spraying immediately: Rain will wash off active ingredients, causing wasted farm investment and environmental runoff with zero efficacy.\n"
                f"• Optimal Spraying Window: Wait at least 24 hours after rainfall stops, when leaves are completely dry and wind speed is under 10 km/h (ideally 11:00 AM – 4:00 PM).\n"
                f"• Data Source: {advisory.data_source} | Kisan Call Center Helpline: 1800-180-1551 (Toll-Free)."
            )
        else:
            hi_text = (
                f"मौसम रिपोर्ट: अगले 48 घंटों में बारिश की संभावना नगण्य है ({rain_mm} mm, 2.0 mm सीमा से नीचे)।\n\n"
                f"सटीक वैज्ञानिक सलाह:\n"
                f"• मौसम पूरी तरह शुष्क और छिड़काव के अनुकूल है। आप अनुशंसित जैविक कीटनाशक का छिड़काव कर सकते हैं।\n"
                f"• सर्वोत्तम समय: सुबह की ओस सूखने के बाद दोपहर 11:00 बजे से 3:00 बजे के बीच छिड़काव करें ताकि दवा का फैलाव सर्वोत्तम हो और हवा से बर्बादी न हो।\n"
                f"• डेटा स्रोत: {advisory.data_source} | किसान कॉल सेंटर 1800-180-1551।"
            )
            en_text = (
                f"Weather Advisory: Rain probability over the next 48 hours is minimal ({rain_mm} mm, well below the 2.0 mm safety threshold).\n\n"
                f"Actionable Scientific Advice:\n"
                f"• Safe to Spray: Weather conditions are dry and stable. You may proceed with scheduled bio-treatments or authorized crop sprays.\n"
                f"• Best Application Time: Spray between 11:00 AM and 3:00 PM once the morning dew has fully dried, ensuring calm wind conditions to avoid spray drift.\n"
                f"• Data Source: {advisory.data_source} | Kisan Call Center Helpline: 1800-180-1551 (Toll-Free)."
            )

        active_answer = en_text if lang == "en" else hi_text

        return AssistantQueryResponse(
            original_query=query,
            routed_service="weather",
            answer_hindi=hi_text,
            answer_english=en_text,
            answer=active_answer,
            detected_language=lang,
            service_payload=advisory.model_dump()
        )

    def _handle_mandi_query(self, query: str, default_location: str, lang: str) -> AssistantQueryResponse:
        commodity = detect_crop_from_text(query) or "Potato"
        market = detect_market_from_text(query) or default_location or "Patna"

        trend = self.mandi_service.get_price_trends(commodity=commodity, market=market)

        crop_hi = translate_crop(commodity)
        mkt_hi = translate_market(market)
        modal_fmt = format_inr(trend.current_modal_price)
        min_fmt = format_inr(trend.current_min_price)
        max_fmt = format_inr(trend.current_max_price)

        nearby_hi = ""
        nearby_en = ""
        if trend.best_nearby_market:
            nb_name_hi = translate_market(trend.best_nearby_market.market)
            nb_price_fmt = format_inr(trend.best_nearby_market.latest_modal_price)
            diff_fmt = format_inr(abs(trend.best_nearby_market.price_difference_from_target))
            nearby_hi = f"आसपास की {nb_name_hi} मंडी में भाव {nb_price_fmt} है (यहाँ से {diff_fmt} का अंतर)।"
            nearby_en = f"Nearby {trend.best_nearby_market.market} mandi is trading at ₹{trend.best_nearby_market.latest_modal_price:,}/quintal (₹{trend.best_nearby_market.price_difference_from_target:+,} difference)."

        # Hindi response
        hi_text = (
            f"मंडी भाव विश्लेषण: {mkt_hi} मंडी में {crop_hi} का वर्तमान मॉडल भाव {modal_fmt} चल रहा है "
            f"(न्यूनतम: {min_fmt}, अधिकतम: {max_fmt})।\n"
            f"• 7 दिवसीय मूल्य रुझान: {trend.seven_day_change_pct:+.1f}% ({trend.trend_direction})\n"
            f"{('• ' + nearby_hi + chr(10)) if nearby_hi else ''}"
            f"• बिक्री रणनीति: {trend.sell_or_wait_reasoning}\n\n"
            f"{MANDATORY_SYNTHETIC_PRICE_DISCLAIMER}"
        )

        # English response
        trend_en = "Upward" if trend.seven_day_change_pct > 0 else "Stable" if trend.seven_day_change_pct == 0 else "Downward"
        strat_en = (
            "Prices are experiencing upward momentum with strong market demand. If you have immediate financial obligations, sell 30–40% of produce now to lock in steady profits. If you have clean storage/cold store access, hold the remaining 60% over the next 7–10 days."
            if trend.recommendation == "रुकें"
            else "Current prices are hovering near the monthly peak. Selling now is recommended to avoid product degradation and post-harvest storage losses."
        )

        en_text = (
            f"Mandi Price Analysis: In {market} Mandi, {commodity} is currently trading at a modal price of ₹{trend.current_modal_price:,} / quintal "
            f"(range: ₹{trend.current_min_price:,} – ₹{trend.current_max_price:,}).\n"
            f"• 7-Day Price Trend: {trend.seven_day_change_pct:+.1f}% ({trend_en})\n"
            f"{('• ' + nearby_en + chr(10)) if nearby_en else ''}"
            f"• Selling Strategy: {strat_en}\n\n"
            f"Disclaimer: This mandi price data is synthetic demonstration data generated for hackathon benchmarking."
        )

        active_answer = en_text if lang == "en" else hi_text

        return AssistantQueryResponse(
            original_query=query,
            routed_service="mandi",
            answer_hindi=hi_text,
            answer_english=en_text,
            answer=active_answer,
            detected_language=lang,
            service_payload=trend.model_dump()
        )

    def _handle_disease_query(self, query: str, lang: str) -> AssistantQueryResponse:
        diagnosis = self.disease_service.diagnose_by_symptoms(symptoms_text=query)

        first_steps_hi = " | ".join(diagnosis.safe_first_steps)
        hi_text = (
            f"फसल रोग निदान: {diagnosis.likely_disease}\n"
            f"• विश्वसनीयता: {diagnosis.confidence} | गंभीरता: {diagnosis.urgency_hindi}\n"
            f"• सुरक्षित गैर-रासायनिक प्राथमिक उपचार: {first_steps_hi}\n"
            f"• अनुशंसित अगला कदम: {diagnosis.next_step}\n\n"
            f"महत्वपूर्ण सुरक्षा चेतावनी: रासायनिक कीटनाशकों का अनियंत्रित छिड़काव न करें। सटीक ICAR पंजीकृत दवा एवं सही मात्रा के लिए तुरंत निकटतम KVK वैज्ञानिक या टोल-फ्री किसान कॉल सेंटर 1800-180-1551 से परामर्श लें।"
        )

        first_steps_en = [
            "Manually isolate and prune infected leaves; burn or bury them outside the field",
            "Avoid overhead sprinkler watering; switch to drip/furrow irrigation to keep foliage dry",
            "Disinfect pruning tools with 70% alcohol solution to prevent cross-contamination",
            "Apply biological neem oil (1500 ppm @ 3-5 ml/L) or Trichoderma viride in the early morning"
        ]
        en_first_steps_text = " | ".join(first_steps_en)

        en_text = (
            f"Crop Disease Diagnosis: {diagnosis.likely_disease}\n"
            f"• Confidence: {diagnosis.confidence} | Severity: {diagnosis.urgency}\n"
            f"• Safe Non-Chemical First Steps: {en_first_steps_text}\n"
            f"• Recommended Next Step: Contact local Krishi Vigyan Kendra (KVK) agronomists with a fresh leaf sample for laboratory verification.\n\n"
            f"Safety Policy: In compliance with ICAR safety guidelines, zero chemical pesticide prescriptions are issued digitally. For authorized crop protection chemicals, consult your local KVK or call the Kisan Call Center toll-free at 1800-180-1551."
        )

        active_answer = en_text if lang == "en" else hi_text

        return AssistantQueryResponse(
            original_query=query,
            routed_service="disease",
            answer_hindi=enforce_safety_guardrails(hi_text),
            answer_english=en_text,
            answer=active_answer,
            detected_language=lang,
            service_payload=diagnosis.model_dump()
        )

    def _handle_wheat_sowing_query(self, query: str, lang: str) -> AssistantQueryResponse:
        hi_text = (
            "गेहूँ बुवाई का वैज्ञानिक परामर्श:\n"
            "• सर्वोत्तम बुवाई समय: बिहार और उत्तर भारत के मैदानी इलाकों में 1 नवंबर से 25 नवंबर तक का समय सर्वोत्तम है।\n"
            "• वैज्ञानिक कारण: इस अवधि में मिट्टी का तापमान (20-22°C) कल्ले फूटने (Tillering) और जड़ विकास के लिए आदर्श होता है।\n"
            "• देरी का नुकसान: 10 दिसंबर के बाद बुवाई करने पर मार्च की गर्म पछुआ हवाओं (Terminal Heat Stress) के कारण प्रति दिन 30-35 किग्रा/हेक्टेयर उपज घट जाती है।\n"
            "• अनुशंसित किस्में व बीज दर: HD-2967, DBW-187 (कर्ण वंदना)। सामान्य समय: 100 किग्रा/हेक्टेयर, देर से बुवाई: 125 किग्रा/हेक्टेयर।\n\n"
            f"{MANDATORY_KVK_ADVISORY}"
        )

        en_text = (
            "Wheat Sowing Scientific Advisory:\n"
            "• Optimal Sowing Window: In Bihar and the Indo-Gangetic plains, 1 November to 25 November is the ideal sowing window.\n"
            "• Scientific Reason: Soil temperature during this period (20–22°C) is ideal for crown root initiation (CRI) and maximum vegetative tillering.\n"
            "• Delay Penalty: Sowing delayed beyond 10 December reduces grain yield by approximately 30–35 kg/hectare per day due to March terminal heat stress during grain filling.\n"
            "• Certified Varieties & Seed Rate: High-yielding varieties HD-2967, DBW-187 (Karan Vandana), PBW-502. Seed rate: 100 kg/ha for timely sowing, 125 kg/ha for late sowing.\n\n"
            "Mandatory Advisory: For certified seed treatment with Azotobacter & PSB bio-fertilizers, consult your nearest Krishi Vigyan Kendra (KVK) or Kisan Call Center at 1800-180-1551."
        )

        active_answer = en_text if lang == "en" else hi_text

        return AssistantQueryResponse(
            original_query=query,
            routed_service="advisory",
            answer_hindi=hi_text,
            answer_english=en_text,
            answer=active_answer,
            detected_language=lang,
            service_payload={"crop": "Wheat", "recommended_window": "1 Nov - 25 Nov"}
        )

    def _handle_unsupported_query(self, query: str, lang: str) -> AssistantQueryResponse:
        hi_text = (
            "कृषि परामर्श सूचना: आपके प्रश्न के लिए धन्यवाद! यद्यपि अन्नदाता AI मुख्य रूप से "
            "**फसल रोग निदान**, **मंडी भाव विश्लेषण** और **मौसम छिड़काव सलाह** पर केंद्रित है, "
            "हम आपकी खेती को लाभकारी बनाने के लिए समर्पित हैं।\n\n"
            "सटीक कृषि मार्गदर्शन एवं विशेषज्ञ परामर्श हेतु:\n"
            "• सीधे कृषि वैज्ञानिक से बात करने के लिए टोल-फ्री **किसान कॉल सेंटर 1800-180-1551** (सुबह 6 से रात 10 बजे) पर कॉल करें।\n"
            "• अपने स्थानीय **कृषि विज्ञान केंद्र (KVK)** या प्रखंड कृषि पदाधिकारी (BAO) से संपर्क करें।\n"
            "• आप मुझसे फसलों में बीमारी (टमाटर, आलू, धान, गेहूं), मंडी के ताज़ा भाव, या मौसम व छिड़काव के बारे में कभी भी पूछ सकते हैं।"
        )

        en_text = (
            "Agricultural Advisory Note: Thank you for your question! While Annadata AI focuses primarily on "
            "**Crop Disease Detection**, **Mandi Price Intelligence**, and **Weather-Aware Spray Advisories**, "
            "we are dedicated to supporting your farm.\n\n"
            "For specialized crop advisories, seed treatments, or government schemes:\n"
            "• Call the **Kisan Call Center** toll-free at **1800-180-1551** (6:00 AM – 10:00 PM) to speak with an agricultural scientist.\n"
            "• Visit your nearest **Krishi Vigyan Kendra (KVK)** or Block Agriculture Office.\n"
            "• Feel free to ask me about crop diseases (Tomato, Potato, Wheat, Paddy), live Bihar mandi rates, or whether you can spray pesticides tomorrow."
        )

        active_answer = en_text if lang == "en" else hi_text

        return AssistantQueryResponse(
            original_query=query,
            routed_service="unsupported",
            answer_hindi=hi_text,
            answer_english=en_text,
            answer=active_answer,
            detected_language=lang,
            service_payload=None
        )


# Singleton instance
_assistant_service: Optional[AssistantService] = None

def get_assistant_service() -> AssistantService:
    global _assistant_service
    if _assistant_service is None:
        _assistant_service = AssistantService()
    return _assistant_service
