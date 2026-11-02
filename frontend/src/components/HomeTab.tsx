"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Camera,
  TrendingUp,
  CloudRain,
  Mic,
  Send,
  Zap,
  Store,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Search,
  PhoneCall
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface HomeTabProps {
  onNavigate: (tab: "disease" | "mandi" | "weather" | "assistant" | "about", initialQuery?: string) => void;
}

export default function HomeTab({ onNavigate }: HomeTabProps) {
  const { t, isHindi } = useLanguage();
  const [queryInput, setQueryInput] = useState("");

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (queryInput.trim()) {
      onNavigate("assistant", queryInput.trim());
    } else {
      onNavigate("assistant");
    }
  };

  const handleChipClick = (question: string) => {
    setQueryInput(question);
    onNavigate("assistant", question);
  };

  return (
    <div className="space-y-12 pb-12">
      {/* ================= HERO SECTION ================= */}
      <section className="relative overflow-hidden py-10 md:py-16 bg-gradient-to-b from-emerald-50/70 via-white to-white rounded-3xl border border-slate-200/90 p-6 md:p-12 shadow-sm ring-1 ring-slate-900/5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Headlines & Actions */}
          <div className="lg:col-span-7 flex flex-col items-start space-y-6">
            {/* Trust Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/90 text-emerald-900 text-xs md:text-sm font-bold shadow-xs tracking-tight">
              <span className="flex h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>{t("home", "trustPill")}</span>
            </div>

            {/* Main Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
              {t("home", "heroTitleLine1")} <br className="hidden sm:inline" />
              <span className="text-emerald-700 relative inline-block">
                {t("home", "heroTitleHighlight")}
                <svg
                  className="absolute -bottom-2 left-0 w-full text-lime-400"
                  fill="currentColor"
                  height="8"
                  preserveAspectRatio="none"
                  viewBox="0 0 100 8"
                >
                  <path d="M0 7 C 20 0, 80 0, 100 7 Z" />
                </svg>
              </span>
            </h1>

            {/* Subhead */}
            <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed font-normal">
              {t("home", "heroSubhead")}
            </p>

            {/* Dual CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto pt-2">
              <button
                onClick={() => onNavigate("disease")}
                className="min-h-[52px] px-7 rounded-2xl bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-md shadow-emerald-900/15 hover:shadow-lg hover:shadow-emerald-900/20 active:scale-[0.98] transition-all cursor-pointer ring-1 ring-emerald-600/30"
              >
                <Camera className="w-5 h-5 text-emerald-100" />
                <span>{t("home", "ctaScan")}</span>
              </button>

              <button
                onClick={() => onNavigate("mandi")}
                className="min-h-[52px] px-7 rounded-2xl bg-white border border-slate-300 text-slate-800 hover:text-emerald-900 hover:bg-emerald-50/50 hover:border-emerald-300 font-bold text-base flex items-center justify-center gap-2.5 shadow-xs active:scale-[0.98] transition-all cursor-pointer"
              >
                <TrendingUp className="w-5 h-5 text-emerald-700" />
                <span>{t("home", "ctaMandi")}</span>
              </button>
            </div>

            {/* 3 Quick Stat Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full pt-4 border-t border-slate-200">
              <div className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm text-slate-900 font-extrabold">{t("home", "stat1")}</span>
              </div>

              <div className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm text-slate-900 font-extrabold">{t("home", "stat2")}</span>
              </div>

              <div className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-700 shrink-0">
                  <CloudRain className="w-4 h-4" />
                </div>
                <span className="text-xs sm:text-sm text-slate-900 font-extrabold">{t("home", "stat3")}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Anchor & Farmer Image */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div className="rounded-3xl overflow-hidden border border-slate-200/90 shadow-xl bg-white p-3 ring-1 ring-slate-900/5">
                {/* Farmer Image Container */}
                <div className="relative rounded-2xl overflow-hidden shadow-inner group">
                  <Image
                    src="/farmer.jpg"
                    alt={t("home", "farmerAlt")}
                    width={600}
                    height={600}
                    priority
                    className="w-full h-[360px] sm:h-[400px] lg:h-[440px] object-cover object-[center_20%] transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Top Floating Badge */}
                  <div className="absolute top-3.5 left-3.5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-white/60 text-emerald-900 text-xs font-bold shadow-md">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    <span>{t("home", "badgeDigital")}</span>
                  </div>

                  {/* Top Right Location Badge */}
                  <div className="absolute top-3.5 right-3.5">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-black/45 backdrop-blur-md text-white text-xs font-bold border border-white/20 shadow-xs">
                      {t("home", "badgeLocation")}
                    </span>
                  </div>

                  {/* Bottom Gradient Overlay & Caption */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4.5 pt-12 text-white">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-white drop-shadow-sm">{t("home", "farmerCaptionTitle")}</p>
                        <p className="text-xs text-emerald-200 font-medium drop-shadow-sm">{t("home", "farmerCaptionSub")}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-600/95 text-white text-xs font-bold border border-emerald-400/50 shadow-xs shrink-0">
                        {t("home", "badgeFree")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Secondary Pill */}
                <div className="mt-3 bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{t("home", "icarTitle")}</p>
                    <p className="text-[11px] text-slate-600 font-medium">{t("home", "icarSub")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= ASK ANNADATA PROMPT BAR ================= */}
      <section className="rounded-3xl bg-white border border-slate-200/90 p-6 md:p-8 shadow-sm ring-1 ring-slate-900/5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 border-b border-slate-200 gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 text-white flex items-center justify-center shadow-xs ring-1 ring-emerald-800/20">
              <Sparkles className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{t("home", "askTitle")}</h2>
              <p className="text-xs sm:text-sm text-slate-600 font-normal">
                {t("home", "askSub")}
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <Mic className="w-3.5 h-3.5 text-emerald-700" />
            <span>{t("home", "voiceBadge")}</span>
          </div>
        </div>

        <form onSubmit={handleAskSubmit} className="mt-5 space-y-4">
          <div className="relative">
            <textarea
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder={t("home", "inputPlaceholder")}
              rows={3}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-slate-900 placeholder:text-slate-400 text-base focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:outline-none transition-all resize-none min-h-[96px]"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                const sampleVoicePrompt = isHindi
                  ? "टमाटर में झुलसा रोग के लिए क्या प्राथमिक उपाय करें?"
                  : "What are the safe first steps to control early blight in tomatoes?";
                setQueryInput(sampleVoicePrompt);
                onNavigate("assistant", sampleVoicePrompt);
              }}
              className="w-full sm:w-auto min-h-[48px] px-5 rounded-xl bg-emerald-50/80 hover:bg-emerald-100/70 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Mic className="w-4 h-4 text-emerald-700" />
              <span>{t("home", "askVoiceBtn")}</span>
            </button>

            <button
              type="submit"
              className="w-full sm:w-auto min-h-[48px] px-8 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm shadow-emerald-900/10 transition-all active:scale-[0.98] cursor-pointer"
            >
              <span>{t("home", "sendBtn")}</span>
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Query Chips */}
          <div className="pt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">{t("home", "suggestedQuestions")}</span>
            <button
              type="button"
              onClick={() => handleChipClick(t("home", "chip1"))}
              className="px-3.5 py-1.5 rounded-full bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-900 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
            >
              <Search className="w-3 h-3 text-emerald-700" />
              <span>{t("home", "chip1")}</span>
            </button>
            <button
              type="button"
              onClick={() => handleChipClick(t("home", "chip2"))}
              className="px-3.5 py-1.5 rounded-full bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-900 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
            >
              <TrendingUp className="w-3 h-3 text-amber-700" />
              <span>{t("home", "chip2")}</span>
            </button>
            <button
              type="button"
              onClick={() => handleChipClick(t("home", "chip3"))}
              className="px-3.5 py-1.5 rounded-full bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-900 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
            >
              <CloudRain className="w-3 h-3 text-blue-700" />
              <span>{t("home", "chip3")}</span>
            </button>
          </div>
        </form>
      </section>

      {/* ================= 3 MAIN SERVICE CARDS ================= */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            {t("home", "servicesSectionTitle")}
          </h2>
          <p className="text-sm md:text-base text-slate-600">
            {t("home", "servicesSectionSub")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature Card 1: Crop Doctor */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-7 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-emerald-300 transition-all duration-300 group ring-1 ring-slate-900/5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-13 h-13 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 flex items-center justify-center group-hover:bg-emerald-700 group-hover:text-white group-hover:border-emerald-700 transition-colors shadow-2xs">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200/80">
                  {t("home", "card1Badge")}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                  {t("home", "card1Title")}
                </h3>
                <p className="text-sm font-semibold text-emerald-700 mt-0.5">
                  {t("home", "card1Sub")}
                </p>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                {t("home", "card1Desc")}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t("home", "card1Check")}</span>
              </div>
              <button
                onClick={() => onNavigate("disease")}
                className="w-full min-h-[48px] rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm shadow-emerald-900/10 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>{t("home", "card1Btn")}</span>
              </button>
            </div>
          </div>

          {/* Feature Card 2: Mandi Intelligence */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-7 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-amber-300 transition-all duration-300 group ring-1 ring-slate-900/5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-13 h-13 rounded-2xl bg-amber-50 text-amber-800 border border-amber-200/80 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white group-hover:border-amber-600 transition-colors shadow-2xs">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200/80">
                  {t("home", "card2Badge")}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                  {t("home", "card2Title")}
                </h3>
                <p className="text-sm font-semibold text-amber-700 mt-0.5">
                  {t("home", "card2Sub")}
                </p>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                {t("home", "card2Desc")}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{t("home", "card2Check")}</span>
              </div>
              <button
                onClick={() => onNavigate("mandi")}
                className="w-full min-h-[48px] rounded-xl bg-white border border-slate-300 text-slate-800 hover:text-amber-900 hover:bg-amber-50/60 hover:border-amber-300 font-bold text-sm flex items-center justify-center gap-2 shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
              >
                <TrendingUp className="w-4 h-4 text-amber-700" />
                <span>{t("home", "card2Btn")}</span>
              </button>
            </div>
          </div>

          {/* Feature Card 3: Weather Advisory */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-7 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-blue-300 transition-all duration-300 group ring-1 ring-slate-900/5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-13 h-13 rounded-2xl bg-blue-50 text-blue-800 border border-blue-200/80 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors shadow-2xs">
                  <CloudRain className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200/80">
                  {t("home", "card3Badge")}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-800 transition-colors">
                  {t("home", "card3Title")}
                </h3>
                <p className="text-sm font-semibold text-blue-700 mt-0.5">
                  {t("home", "card3Sub")}
                </p>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                {t("home", "card3Desc")}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{t("home", "card3Check")}</span>
              </div>
              <button
                onClick={() => onNavigate("weather")}
                className="w-full min-h-[48px] rounded-xl bg-white border border-slate-300 text-slate-800 hover:text-blue-900 hover:bg-blue-50/60 hover:border-blue-300 font-bold text-sm flex items-center justify-center gap-2 shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
              >
                <CloudRain className="w-4 h-4 text-blue-700" />
                <span>{t("home", "card3Btn")}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= KVK & EMERGENCY HELPLINE BANNER ================= */}
      <section className="rounded-3xl bg-amber-50/70 border border-amber-200 p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5 ring-1 ring-amber-900/5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0 shadow-2xs">
            <PhoneCall className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-amber-950">
              {t("home", "helplineTitle")}
            </h3>
            <p className="text-xs sm:text-sm text-amber-800/90 font-medium">
              {t("home", "helplineDesc")}
            </p>
          </div>
        </div>

        <a
          href="tel:18001801551"
          className="min-h-[48px] px-6 rounded-2xl bg-amber-800 hover:bg-amber-900 text-white font-bold text-sm flex items-center justify-center gap-2 shrink-0 shadow-sm shadow-amber-900/10 transition-all active:scale-[0.98]"
        >
          <PhoneCall className="w-4 h-4" />
          <span>{t("home", "helplineBtn")}</span>
        </a>
      </section>
    </div>
  );
}
