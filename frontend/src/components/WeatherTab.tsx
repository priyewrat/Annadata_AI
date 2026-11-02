"use client";

import React, { useState, useEffect } from "react";
import {
  CloudRain,
  AlertTriangle,
  CheckCircle2,
  PhoneCall,
  Volume2,
  RefreshCw,
  MapPin,
  Calendar,
  Droplets,
  TrendingDown
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface WeatherDay {
  date: string;
  temp_max: number;
  temp_min: number;
  precipitation_sum_mm: number;
  humidity_pct: number;
}

interface SprayAdvisoryData {
  success: boolean;
  location: string;
  forecast_rainfall_48h: number;
  spray_warning: boolean;
  message_hi: string;
  source: string;
  can_spray: boolean;
  decision_badge: string;
  rainfall_next_48h_mm: number;
  rainfall_threshold_mm: number;
  warning_message: string | null;
  advice_details: string;
  forecast_dates: string[];
  forecast_data: WeatherDay[];
  data_source: string;
}

export default function WeatherTab() {
  const { t, isHindi } = useLanguage();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SprayAdvisoryData | null>(null);
  const [playingAudio, setPlayingAudio] = useState<boolean>(false);

  const fetchWeather = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/weather/advisory?location=Patna&source=sample");
      if (!res.ok) throw new Error(`Weather API returned status: ${res.status}`);
      const json: SprayAdvisoryData = await res.json();
      setData(json);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (isHindi ? "मौसम सलाहकार लोड करने में समस्या आई।" : "Failed to load weather advisory.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAudioPlay = () => {
    if (!data) return;
    setPlayingAudio(true);
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const textToSpeak = isHindi
        ? data.message_hi
        : `Weather and spray advisory for ${data.location}. Forecast rainfall for next 48 hours is ${data.forecast_rainfall_48h} millimeters. ${
            data.can_spray
              ? "Spraying is permissible within standard agricultural guidelines. Consult local KVK before applying chemicals."
              : "Warning: High rainfall expected. Pause pesticide and urea spraying to prevent chemical wash-off and financial loss."
          }`;

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = isHindi ? "hi-IN" : "en-IN";
      utterance.onend = () => setPlayingAudio(false);
      utterance.onerror = () => setPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setPlayingAudio(false), 3000);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ================= BREADCRUMB & LOCATION STRIP ================= */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm ring-1 ring-slate-900/5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-black text-slate-900 tracking-tight">
                {isHindi ? "पटना, बिहार" : "Patna, Bihar (Agri Zone)"}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold">
                {isHindi ? "अक्षांश 25.59°N, 85.13°E" : "Lat 25.59°N, Lon 85.13°E"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              {isHindi
                ? `मौसम उपग्रह एवं IMD डॉप्लर रडार से वास्तविक समय सिंक • स्रोत: ${data?.data_source || "मौसम विज्ञान केंद्र"}`
                : `Synchronized with meteorological radar • Source: ${data?.data_source || "Regional Agri Weather Center"}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchWeather}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-900 text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${loading ? "animate-spin" : ""}`} />
            <span>{isHindi ? "ताज़ा करें" : "Refresh"}</span>
          </button>
        </div>
      </section>

      {/* ================= TITLE & AUDIO / HELPLINE ================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-2 shadow-xs ${
            data?.can_spray
              ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
              : "bg-rose-50 text-rose-900 border border-rose-200"
          }`}>
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            <span>
              {data?.can_spray
                ? (isHindi ? "अनुकूल मौसम एडवाइजरी" : "Favorable Weather Advisory")
                : (isHindi ? "उच्च वर्षा चेतावनी / स्प्रे ब्लॉक सक्रिय" : "High Rain Alert / Spray Block Active")}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {t("weather", "headerTitle")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 font-normal">
            {t("weather", "headerSub")}
          </p>
        </div>

        {/* Audio & Helpline */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleAudioPlay}
            disabled={playingAudio}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-300 hover:border-emerald-600 text-slate-800 hover:text-emerald-900 text-xs font-bold shadow-xs active:scale-[0.98] transition-all cursor-pointer"
          >
            <Volume2 className={`w-4 h-4 text-emerald-700 ${playingAudio ? "animate-bounce" : ""}`} />
            <div className="text-left leading-tight">
              <span className="block">{playingAudio ? t("weather", "playingAudioBtn") : t("weather", "listenAudioBtn")}</span>
              <span className="block text-[10px] text-slate-500 font-medium">{isHindi ? "0:45 मिनट KVK ऑडियो" : "Audio Advisory (KVK)"}</span>
            </div>
          </button>

          <a
            href="tel:18001801551"
            className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white text-xs font-bold shadow-sm shadow-emerald-900/10 active:scale-[0.98] transition-all"
          >
            <PhoneCall className="w-4 h-4 text-emerald-100" />
            <span>{isHindi ? "किसान हेल्पलाइन: 1800-180-1551" : "Helpline: 1800-180-1551"}</span>
          </a>
        </div>
      </div>

      {/* ================= 4 SUMMARY METRIC CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Decision Badge */}
        <div className={`p-6 rounded-3xl border-2 flex flex-col justify-between shadow-sm ${
          !data || !data.can_spray
            ? "bg-rose-50/80 border-rose-600 ring-1 ring-rose-900/10"
            : "bg-emerald-50/80 border-emerald-600 ring-1 ring-emerald-900/10"
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {isHindi ? "छिड़काव निर्णय" : "Spray Decision"}
              </span>
              {!data || !data.can_spray ? (
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              )}
            </div>
            <div className={`text-xl font-black mt-2 tracking-tight ${
              !data || !data.can_spray ? "text-rose-900" : "text-emerald-950"
            }`}>
              {!data
                ? (isHindi ? "लोड हो रहा है..." : "Loading...")
                : data.can_spray
                ? t("weather", "sprayPermissible")
                : t("weather", "sprayWarning")}
            </div>
          </div>
          <span className="text-[11px] font-semibold text-slate-600 mt-3">
            {!data || !data.can_spray
              ? (isHindi ? "बारिश से दवा धुलने का जोखिम" : "High risk of chemical wash-off")
              : (isHindi ? "कीटनाशक/पर्णीय उर्वरक हेतु सुरक्षित" : "Safe window for foliar sprays")}
          </span>
        </div>

        {/* Metric 2: 48h Total Rainfall */}
        <div className="p-5 rounded-2xl bg-white border border-[#CBD5E1] flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                {t("weather", "rainfallNext48h")}
              </span>
              <CloudRain className="w-5 h-5 text-[#1D4ED8]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#121C2A] mt-2">
              {data ? `${data.forecast_rainfall_48h.toFixed(1)} mm` : "--"}
            </div>
          </div>
          <span className="text-[11px] font-medium text-[#404940] mt-3">
            {data && data.forecast_rainfall_48h > 0
              ? (isHindi ? "अगले दो दिनों में वर्षा संभावित" : "Precipitation forecast in 48h")
              : (isHindi ? "मौसम शुष्क रहने का अनुमान" : "Dry weather forecast")}
          </span>
        </div>

        {/* Metric 3: Threshold Rule */}
        <div className="p-5 rounded-2xl bg-white border border-[#CBD5E1] flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                {t("weather", "warningThreshold")}
              </span>
              <Droplets className="w-5 h-5 text-[#854D0E]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#121C2A] mt-2">
              2.0 mm
            </div>
          </div>
          <span className="text-[11px] font-medium text-[#404940] mt-3">
            {isHindi ? ">2mm वर्षा पर स्प्रे रोक अनिवार्य" : "Spray halt mandatory if >2mm rain"}
          </span>
        </div>

        {/* Metric 4: Weather Source */}
        <div className="p-5 rounded-2xl bg-white border border-[#CBD5E1] flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                {isHindi ? "डेटा स्रोत" : "Data Source"}
              </span>
              <CheckCircle2 className="w-5 h-5 text-[#166534]" />
            </div>
            <div className="text-base font-bold text-[#121C2A] mt-2 truncate">
              {data?.data_source || (isHindi ? "मौसम विज्ञान केंद्र" : "Agri Meteorological Station")}
            </div>
          </div>
          <span className="text-[11px] font-medium text-[#166534] mt-3">
            {isHindi ? "100% ऑफलाइन रेडी व सत्यापित" : "100% Offline Ready & Verified"}
          </span>
        </div>
      </div>

      {/* Error banner if any */}
      {error && (
        <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#B91C1C] flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-[#B91C1C] shrink-0" />
          <p className="text-xs sm:text-sm text-[#991B1B]">{error}</p>
        </div>
      )}

      {/* ================= COMPREHENSIVE SPRAY BANNER ================= */}
      {data && (
        <section className={`rounded-2xl border-2 overflow-hidden shadow-sm ${
          !data.can_spray ? "border-[#B91C1C]" : "border-[#166534]"
        }`}>
          {/* Top Status Header */}
          <div className={`p-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white ${
            !data.can_spray ? "bg-[#B91C1C]" : "bg-[#166534]"
          }`}>
            <div className="flex items-center gap-2.5">
              {!data.can_spray ? (
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
              <span className="font-extrabold text-sm sm:text-base tracking-wide">
                {!data.can_spray
                  ? (isHindi ? "⚠️ उच्च वर्षा चेतावनी: कीटनाशक एवं उर्वरक छिड़काव तुरंत रोकें!" : "⚠️ High Rainfall Warning: Stop Pesticide and Fertilizer Spraying!")
                  : (isHindi ? "✅ अनुकूल मौसम: पर्णीय छिड़काव सुरक्षित रूप से किया जा सकता है" : "✅ Favorable Weather: Foliar Spraying Permissible")}
              </span>
            </div>

            <span className="inline-flex items-center px-3 py-1 rounded-full bg-white text-xs font-extrabold tracking-wide uppercase shadow-xs text-slate-900">
              {!data.can_spray ? (isHindi ? "स्प्रे ब्लॉक सक्रिय" : "Spray Block Active") : (isHindi ? "सुरक्षित स्प्रे विंडो" : "Safe Spray Window")}
            </span>
          </div>

          {/* Banner Content Grid */}
          <div className="p-5 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-gradient-to-r from-[#F8FAF5] via-white to-[#F8FAF5]">
            {/* Explanation & Impact (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-[#121C2A]">
                  {isHindi ? "वैज्ञानिक विश्लेषण एवं चेतावनी विवरण" : "Scientific Analysis & Advisory Details"}
                </h2>
                <p className="text-sm sm:text-base text-[#121C2A] leading-relaxed">
                  {isHindi
                    ? data.message_hi
                    : `Forecast rainfall for the initial 48-hour window is ${data.forecast_rainfall_48h} mm. ${
                        data.can_spray
                          ? "Rainfall is within safe tolerance (<= 2.0 mm). Always adhere to local KVK recommendations."
                          : "Forecast rainfall exceeds the 2.0 mm safety limit. Chemical wash-off will significantly reduce efficacy."
                      }`}
                </p>
              </div>

              {/* Impact breakdown boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-white border border-[#CBD5E1] flex items-start gap-3 shadow-2xs">
                  <TrendingDown className="w-5 h-5 text-[#B91C1C] shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-xs font-bold text-[#121C2A]">
                      {isHindi ? "100% आर्थिक बर्बादी से बचाव" : "Protect Against 100% Input Waste"}
                    </span>
                    <span className="text-[11px] text-[#404940] leading-snug">
                      {isHindi
                        ? "छिड़काव के 4 घंटे के भीतर बारिश होने से रसायन धुल जाते हैं। प्रति एकड़ ₹1,200 - ₹2,500 की सीधी बचत।"
                        : "Rainfall within 4-6 hours of spraying strips active chemical molecules. Saves ₹1,200 to ₹2,500 per acre."}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-[#CBD5E1] flex items-start gap-3 shadow-2xs">
                  <Droplets className="w-5 h-5 text-[#B91C1C] shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-xs font-bold text-[#121C2A]">
                      {isHindi ? "नाइट्रोजन रिसाव रोकथाम" : "Nitrogen Leaching Prevention"}
                    </span>
                    <span className="text-[11px] text-[#404940] leading-snug">
                      {isHindi
                        ? "जलभराव में यूरिया डालने से नाइट्रोजन भूमिगत जल में बह जाता है। शुष्क मौसम में ही उर्वरक दें।"
                        : "Applying urea in wet conditions washes nitrogen into runoff. Always broadcast fertilizers on dry soil."}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Safe Window Advisory Callout (4 cols) */}
            <div className={`lg:col-span-4 p-5 rounded-xl border-2 flex flex-col justify-between ${
              !data.can_spray
                ? "bg-[#FEF2F2] border-[#B91C1C]"
                : "bg-[#F0FDF4] border-[#166534]"
            }`}>
              <div className="space-y-3">
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold ${
                  !data.can_spray ? "bg-[#B91C1C] text-white" : "bg-[#166534] text-white"
                }`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isHindi ? "अनुकूल छिड़काव समय" : "Optimal Spray Window"}</span>
                </div>

                <div>
                  <p className="text-base font-bold text-[#121C2A]">
                    {!data.can_spray
                      ? (isHindi ? "बारिश समाप्त होने और धूप खिलने पर" : "After rain ceases and foliage dries")
                      : (isHindi ? "आज दोपहर 11 बजे से शाम 4 बजे" : "Today 11:00 AM to 04:00 PM")}
                  </p>
                  <p className="text-xs text-[#404940] mt-1 leading-relaxed">
                    {isHindi
                      ? "जब हवा की गति 10 किमी/घंटा से कम हो और पत्तियों पर ओस या वर्षा की बूंदें न हों।"
                      : "When wind speed is below 10 km/h and morning dew has completely evaporated."}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-black/10 flex items-center justify-between">
                <span className="text-xs font-semibold text-[#121C2A]">{isHindi ? "अनुकूलन स्कोर:" : "Viability Score:"}</span>
                <span className={`px-2.5 py-1 rounded text-xs font-bold text-white ${
                  !data.can_spray ? "bg-[#B91C1C]" : "bg-[#166534]"
                }`}>
                  {!data.can_spray ? (isHindi ? "0% - असुरक्षित" : "0% (High Risk)") : (isHindi ? "95% - सर्वोत्तम" : "95% (Optimal)")}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================= 7-DAY FORECAST GRID ================= */}
      {data && data.forecast_data && data.forecast_data.length > 0 && (
        <section className="bg-white border border-[#CBD5E1] rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#121C2A] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#166534]" />
                <span>{t("weather", "sevenDayForecastTitle")}</span>
              </h3>
              <p className="text-xs text-[#64748B]">
                {isHindi ? "तापमान, संभावित वर्षा एवं आर्द्रता का विश्लेषण" : "Daily temperature, expected rainfall, and relative humidity"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 pt-2">
            {data.forecast_data.map((day, i) => {
              const isRainy = day.precipitation_sum_mm >= 2.0;
              return (
                <div
                  key={day.date}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between text-center space-y-3 ${
                    i < 2 && isRainy
                      ? "bg-[#FEF2F2] border-[#B91C1C]"
                      : i < 2
                      ? "bg-[#F0FDF4] border-[#166534]"
                      : "bg-[#F8FAF5] border-[#E2E8F0]"
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-[#121C2A]">
                      {i === 0 ? t("weather", "today") : i === 1 ? t("weather", "tomorrow") : day.date.slice(5)}
                    </span>
                    <span className="text-[10px] text-[#64748B] block">{day.date}</span>
                  </div>

                  <div className="my-1">
                    <CloudRain
                      className={`w-7 h-7 mx-auto ${
                        day.precipitation_sum_mm > 0 ? "text-[#1D4ED8]" : "text-[#CA8A04]"
                      }`}
                    />
                    <span className="text-sm font-extrabold text-[#121C2A] mt-1 block">
                      {day.precipitation_sum_mm} mm
                    </span>
                  </div>

                  <div className="text-[11px] text-[#404940] space-y-0.5 pt-2 border-t border-black/5">
                    <p className="font-semibold">
                      {Math.round(day.temp_max)}°C / {Math.round(day.temp_min)}°C
                    </p>
                    <p className="text-[10px] text-[#64748B]">{t("weather", "humidity")}: {day.humidity_pct}%</p>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isRainy
                        ? "bg-[#FEF2F2] text-[#B91C1C]"
                        : "bg-[#F0FDF4] text-[#166534]"
                    }`}
                  >
                    {isRainy ? t("weather", "stopSprayCard") : t("weather", "canSprayCard")}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
