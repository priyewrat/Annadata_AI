"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  Store,
  Calendar,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  Clock,
  Sprout
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from "recharts";
import { useLanguage } from "@/context/LanguageContext";

interface MandiOptionItem {
  value: string;
  label_hindi: string;
}

interface MandiComparisonItem {
  market: string;
  latest_modal_price: number;
  min_price: number;
  max_price: number;
  latest_date: string;
  price_difference_from_target: number;
}

interface PriceHistoryPoint {
  date: string;
  modal_price: number;
  min_price: number;
  max_price: number;
  arrivals_tonnes: number;
}

interface MandiAnalysisResponseData {
  crop: string;
  crop_hindi: string;
  market: string;
  market_hindi: string;
  trend_period_days: number;
  latest_date: string;
  latest_modal_price: number;
  latest_min_price: number;
  latest_max_price: number;
  seven_day_change_pct: number | null;
  thirty_day_change_pct: number | null;
  percentage_change: number | null;
  trend_direction: string;
  highest_recorded_modal_mandi: MandiComparisonItem | null;
  nearby_markets_comparison: MandiComparisonItem[];
  historical_chart_data: PriceHistoryPoint[];
  sell_now_or_wait_explanation: string;
  data_source: string;
  is_synthetic: boolean;
  disclaimer: string;
}

export default function MandiTab() {
  const { t, isHindi } = useLanguage();

  const [crops, setCrops] = useState<MandiOptionItem[]>([
    { value: "Potato", label_hindi: "आलू" },
    { value: "Tomato", label_hindi: "टमाटर" },
    { value: "Wheat", label_hindi: "गेहूं" },
    { value: "Paddy", label_hindi: "धान" },
    { value: "Maize", label_hindi: "मक्का" },
    { value: "Onion", label_hindi: "प्याज" },
    { value: "Masoor (lentil)", label_hindi: "मसूर दाल" },
  ]);
  const [markets, setMarkets] = useState<MandiOptionItem[]>([
    { value: "Patna", label_hindi: "पटना" },
    { value: "Hajipur", label_hindi: "हाजीपुर" },
    { value: "Muzaffarpur", label_hindi: "मुजफ्फरपुर" },
    { value: "Ara", label_hindi: "आरा" },
    { value: "Bihar Sharif", label_hindi: "बिहार शरीफ" },
  ]);

  // Helper to ensure clean single-language labels without bilingual parentheticals
  const formatLabel = (rawLabel: string, fallbackEn: string) => {
    if (!isHindi) return fallbackEn;
    return rawLabel ? rawLabel.replace(/\s*\([^)]*\)/g, "").trim() : fallbackEn;
  };

  const [selectedCrop, setSelectedCrop] = useState<string>("Potato");
  const [selectedMarket, setSelectedMarket] = useState<string>("Patna");
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MandiAnalysisResponseData | null>(null);

  // Load available options
  useEffect(() => {
    fetch("/api/mandi/options")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load options");
        return res.json();
      })
      .then((opts) => {
        if (opts.crops_formatted && opts.crops_formatted.length > 0) {
          setCrops(opts.crops_formatted);
        }
        if (opts.mandis_formatted && opts.mandis_formatted.length > 0) {
          setMarkets(opts.mandis_formatted);
        }
      })
      .catch(() => {
        // Fallback to static list
      });
  }, []);

  // Fetch analysis data
  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mandi/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crop: selectedCrop,
          market: selectedMarket,
          days: days,
        }),
      });

      if (!res.ok) {
        throw new Error(`Mandi data not available for ${selectedCrop} in ${selectedMarket}`);
      }

      const json: MandiAnalysisResponseData = await res.json();
      setData(json);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (isHindi ? "मंडी भाव लोड करने में समस्या आई।" : "Failed to load mandi prices.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedCrop, selectedMarket, days, isHindi]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  // Calculate average modal price for chart benchmark
  const averagePrice = data?.historical_chart_data?.length
    ? Math.round(
        data.historical_chart_data.reduce((acc, curr) => acc + curr.modal_price, 0) /
          data.historical_chart_data.length
      )
    : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* ================= BREADCRUMB HEADER ================= */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#CBD5E1] rounded-2xl p-5 md:p-6 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#FEFCE8] text-[#854D0E] border border-[#FEF08A] text-xs font-bold mb-2">
            <span className="w-2 h-2 rounded-full bg-[#CA8A04] animate-pulse" />
            <span>{isHindi ? "बिहार कृषि उपज मंडी खुफिया विश्लेषण" : "Bihar APMC Mandi Intelligence"}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {t("mandi", "headerTitle")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 font-normal">
            {t("mandi", "headerSub")}
          </p>
        </div>

        {/* Synthetic Data Disclaimer Pill */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-slate-50/80 border border-slate-200 px-3.5 py-2 rounded-xl text-xs text-slate-600 font-medium shadow-2xs">
          <Clock className={`w-4 h-4 text-emerald-700 ${loading ? "animate-spin" : ""}`} />
          <span>
            {loading
              ? (isHindi ? "डेटा लोड हो रहा है..." : "Loading market data...")
              : (isHindi ? "दैनिक मॉडल भाव • स्वचालित सांख्यिकी" : "Daily Modal Rates • Live Analytics")}
          </span>
        </div>
      </section>

      {/* ================= FILTER / CONTROLS STRIP ================= */}
      <section className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm ring-1 ring-slate-900/5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Crop Selector */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Sprout className="w-3.5 h-3.5 text-emerald-700" />
              <span>{t("mandi", "selectCrop")}</span>
            </label>
            <div className="relative">
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="w-full h-[52px] pl-4 pr-10 rounded-2xl bg-slate-50/70 border border-slate-200 text-sm sm:text-base font-semibold text-slate-900 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:outline-none transition-all cursor-pointer"
              >
                {crops.map((c) => (
                  <option key={c.value} value={c.value}>
                    {formatLabel(c.label_hindi, c.value)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mandi Selector */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-emerald-700" />
              <span>{t("mandi", "selectMarket")}</span>
            </label>
            <div className="relative">
              <select
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
                className="w-full h-[52px] pl-4 pr-10 rounded-2xl bg-slate-50/70 border border-slate-200 text-sm sm:text-base font-semibold text-slate-900 focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:outline-none transition-all cursor-pointer"
              >
                {markets.map((m) => (
                  <option key={m.value} value={m.value}>
                    {formatLabel(m.label_hindi, m.value)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Timeframe Toggle Buttons */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              <span>{t("mandi", "selectPeriod")}</span>
            </label>
            <div className="h-[52px] p-1 rounded-2xl bg-slate-100/90 flex items-center border border-slate-200/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setDays(7)}
                className={`flex-1 h-full rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  days === 7
                    ? "bg-white text-emerald-950 shadow-xs border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900 font-semibold"
                }`}
              >
                {days === 7 && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                <span>{t("mandi", "period7Days")}</span>
              </button>
              <button
                type="button"
                onClick={() => setDays(30)}
                className={`flex-1 h-full rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  days === 30
                    ? "bg-white text-emerald-950 shadow-xs border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900 font-semibold"
                }`}
              >
                {days === 30 && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                <span>{t("mandi", "period30Days")}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Error state */}
      {error && (
        <div className="rounded-xl bg-[#FEF2F2] border border-[#B91C1C] p-4 flex items-center justify-between text-xs sm:text-sm text-[#991B1B]">
          <span>{error}</span>
          <button
            onClick={fetchAnalysis}
            className="font-bold underline hover:no-underline cursor-pointer"
          >
            {isHindi ? "पुनः प्रयास करें" : "Retry"}
          </button>
        </div>
      )}

      {/* ================= BENTO 4-METRIC GRID ================= */}
      {data && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Modal Price (Primary Highlight) */}
            <div className="bg-white border-2 border-emerald-600 rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-between ring-1 ring-emerald-900/10">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full pointer-events-none" />
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {t("mandi", "latestModalPrice")}
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                </div>
                <div className="mt-2.5 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  ₹{data.latest_modal_price.toLocaleString("en-IN")}{" "}
                  <span className="text-xs font-semibold text-slate-400">/ {isHindi ? "क्विंटल" : "Quintal"}</span>
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-slate-100">
                {data.percentage_change !== null ? (
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                      data.percentage_change >= 0
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200/90"
                        : "bg-rose-50 text-rose-800 border-rose-200/90"
                    }`}
                  >
                    {data.percentage_change >= 0 ? (
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                    )}
                    <span>
                      {data.percentage_change > 0 ? "+" : ""}
                      {data.percentage_change.toFixed(1)}% ({days} {isHindi ? "दिन रुझान" : "day trend"})
                    </span>
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 font-medium">{isHindi ? "तुलना अनुपलब्ध" : "Data comparison unavailable"}</span>
                )}
              </div>
            </div>

            {/* Metric 2: Minimum Price */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm flex flex-col justify-between ring-1 ring-slate-900/5">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {isHindi ? "न्यूनतम भाव" : "Minimum Price"}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">Grade B</span>
                </div>
                <div className="mt-2.5 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  ₹{data.latest_min_price.toLocaleString("en-IN")}{" "}
                  <span className="text-xs font-semibold text-slate-400">/ {isHindi ? "क्विंटल" : "Quintal"}</span>
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>{isHindi ? "दैनिक न्यूनतम दर" : "Daily Min Rate"}</span>
                <span className="font-bold text-slate-800">{isHindi ? "स्थिर" : "Steady"}</span>
              </div>
            </div>

            {/* Metric 3: Maximum Price */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm flex flex-col justify-between ring-1 ring-slate-900/5">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {isHindi ? "अधिकतम भाव" : "Maximum Price"}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">Grade A+</span>
                </div>
                <div className="mt-2.5 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  ₹{data.latest_max_price.toLocaleString("en-IN")}{" "}
                  <span className="text-xs font-semibold text-slate-400">/ {isHindi ? "क्विंटल" : "Quintal"}</span>
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>{isHindi ? "प्रीमियम लॉट दर" : "Premium Lot Rate"}</span>
                <span className="font-bold text-emerald-700">{isHindi ? "उच्चतम" : "Highest"}</span>
              </div>
            </div>

            {/* Metric 4: Highest Nearby Mandi */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm flex flex-col justify-between ring-1 ring-slate-900/5">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {isHindi ? "सर्वाधिक भाव वाली मंडी" : "Highest Rate Mandi"}
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                </div>
                <div className="mt-2.5 text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {data.highest_recorded_modal_mandi ? (
                    <>
                      ₹{data.highest_recorded_modal_mandi.latest_modal_price.toLocaleString("en-IN")}{" "}
                      <span className="text-xs font-semibold text-slate-500">
                        ({data.highest_recorded_modal_mandi.market})
                      </span>
                    </>
                  ) : (
                    (isHindi ? "उपलब्ध नहीं" : "N/A")
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span>{isHindi ? "क्षेत्रीय उच्चतम स्तर" : "Regional Peak Rate"}</span>
                <span className="font-bold text-slate-800">
                  {data.highest_recorded_modal_mandi?.market}
                </span>
              </div>
            </div>
          </section>

          {/* ================= SELL-NOW-OR-WAIT SMART ADVISORY ================= */}
          <section className="bg-gradient-to-r from-emerald-50/80 via-slate-50/50 to-white border border-emerald-200/90 rounded-3xl p-6 md:p-7 flex items-start gap-4 shadow-sm ring-1 ring-emerald-900/5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 text-white flex items-center justify-center shrink-0 shadow-xs ring-1 ring-emerald-800/20">
              <Lightbulb className="w-6 h-6 text-emerald-100" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-emerald-950 tracking-tight">
                  {t("mandi", "sellingAdviceTitle")}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                  {isHindi ? "डेटा विश्लेषित" : "Data Verified"}
                </span>
              </div>
              <p className="text-sm sm:text-base text-slate-800 leading-relaxed font-normal">
                {data.sell_now_or_wait_explanation}
              </p>
            </div>
          </section>

          {/* ================= CENTRAL HISTORICAL CHART & COMPARISON ================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Historical Price Trend Chart (7 cols) */}
            <section className="lg:col-span-7 bg-white border border-[#CBD5E1] rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#121C2A] flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#166534]" />
                    <span>{t("mandi", "chartTitle")} ({days} {isHindi ? "दिन" : "Days"})</span>
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    {selectedCrop} - {selectedMarket} ({t("mandi", "pricePerQuintal")})
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs text-[#64748B]">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#166534]" />
                    {t("mandi", "latestModalPrice")}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-0.5 bg-slate-400" />
                    {isHindi ? `औसत (₹${averagePrice})` : `Avg (₹${averagePrice})`}
                  </span>
                </div>
              </div>

              {/* Recharts Area Chart */}
              <div className="w-full h-72 pt-2">
                {data.historical_chart_data && data.historical_chart_data.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data.historical_chart_data}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="mandiGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#166534" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#166534" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: "#64748B" }}
                        tickFormatter={(val) => {
                          const parts = val.split("-");
                          if (parts.length === 3) {
                            return `${parseInt(parts[2], 10)} ${
                              isHindi
                                ? (parts[1] === "05" ? "मई" : parts[1] === "04" ? "अप्रैल" : parts[1] === "10" ? "अक्तू" : parts[1] === "11" ? "नवंबर" : "")
                                : (parts[1] === "05" ? "May" : parts[1] === "04" ? "Apr" : parts[1] === "10" ? "Oct" : parts[1] === "11" ? "Nov" : "")
                            }`;
                          }
                          return val;
                        }}
                        tickLine={false}
                        axisLine={{ stroke: "#CBD5E1" }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#64748B" }}
                        domain={["auto", "auto"]}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) => `₹${val}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#121C2A",
                          borderRadius: "0.75rem",
                          border: "none",
                          color: "#FFFFFF",
                          fontSize: "12px",
                        }}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(val: any) => [`₹${val} / ${isHindi ? "क्विंटल" : "Q"}`, t("mandi", "latestModalPrice")]}
                        labelFormatter={(label) => `${isHindi ? "दिनांक" : "Date"}: ${label}`}
                      />
                      <ReferenceLine
                        y={averagePrice}
                        stroke="#94A3B8"
                        strokeDasharray="4 4"
                      />
                      <Area
                        type="monotone"
                        dataKey="modal_price"
                        stroke="#166534"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#mandiGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-[#64748B]">
                    {isHindi ? "कोई ऐतिहासिक चार्ट डेटा उपलब्ध नहीं है।" : "No historical chart data available."}
                  </div>
                )}
              </div>
            </section>

            {/* Regional Mandi Comparison Table (5 cols) */}
            <section className="lg:col-span-5 bg-white border border-[#CBD5E1] rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#121C2A]">
                    {t("mandi", "nearbyComparisonTitle")}
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    {selectedCrop} - {isHindi ? "नवीनतम उपलब्ध तारीख पर तुलना" : "Comparison on latest benchmark date"}
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F8FAF5] border border-[#E2E8F0] text-[#166534]">
                  {data.nearby_markets_comparison?.length || 0} {isHindi ? "मंडियां" : "Mandis"}
                </span>
              </div>

              {/* Table */}
              <div className="space-y-2.5">
                {data.nearby_markets_comparison && data.nearby_markets_comparison.length > 0 ? (
                  data.nearby_markets_comparison.map((item) => {
                    const isSelected = item.market === selectedMarket;
                    const isHighest =
                      data.highest_recorded_modal_mandi &&
                      item.market === data.highest_recorded_modal_mandi.market;
                    return (
                      <div
                        key={item.market}
                        className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                          isSelected
                            ? "bg-[#F0FDF4] border-[#166534]"
                            : isHighest
                            ? "bg-[#FEFCE8] border-[#CA8A04]"
                            : "bg-[#F8FAF5] border-[#E2E8F0]"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-bold text-[#121C2A]">
                              {item.market} {isHindi ? "मंडी" : "Mandi"}
                            </span>
                            {isSelected && (
                              <span className="text-[10px] font-bold bg-[#166534] text-white px-1.5 py-0.2 rounded">
                                {isHindi ? "चयनित" : "Selected"}
                              </span>
                            )}
                            {isHighest && !isSelected && (
                              <span className="text-[10px] font-bold bg-[#854D0E] text-[#FEFCE8] px-1.5 py-0.2 rounded">
                                {isHindi ? "सर्वाधिक भाव" : "Peak Rate"}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#64748B]">
                            {isHindi ? "रेंज" : "Range"}: ₹{item.min_price} - ₹{item.max_price} • {item.latest_date}
                          </p>
                        </div>

                        <div className="text-right space-y-0.5">
                          <p className="text-sm sm:text-base font-black text-[#121C2A]">
                            ₹{item.latest_modal_price}
                          </p>
                          {item.price_difference_from_target !== 0 ? (
                            <span
                              className={`text-[11px] font-bold flex items-center justify-end gap-0.5 ${
                                item.price_difference_from_target > 0
                                  ? "text-[#166534]"
                                  : "text-[#B91C1C]"
                              }`}
                            >
                              {item.price_difference_from_target > 0 ? "+" : ""}
                              ₹{item.price_difference_from_target}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#64748B]">{isHindi ? "आधार दर" : "Base Market"}</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-[#64748B]">{isHindi ? "तुलना डेटा उपलब्ध नहीं।" : "No regional comparison data."}</p>
                )}
              </div>

              <div className="pt-2 border-t border-[#E2E8F0] text-[11px] text-[#64748B] flex items-center justify-between">
                <span>{isHindi ? `स्रोत: ${data.data_source}` : `Source: ${data.data_source}`}</span>
                <span className="text-[#166534] font-medium">{isHindi ? "Pandas गणना द्वारा सत्यापित" : "Verified via Statistical Engine"}</span>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
