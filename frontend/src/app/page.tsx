"use client";

import { useEffect, useState, useRef } from "react";
import {
  Sprout,
  TrendingUp,
  CloudRain,
  Mic,
  Bell,
  Home as HomeIcon,
  PhoneCall,
  X,
  Camera,
  Sparkles,
  CheckCheck,
  MoreHorizontal,
  ChevronRight,
  HelpCircle,
  Languages,
} from "lucide-react";

import { LanguageProvider, useLanguage } from "@/context/LanguageContext";
import HomeTab from "@/components/HomeTab";
import DiseaseTab from "@/components/DiseaseTab";
import MandiTab from "@/components/MandiTab";
import WeatherTab from "@/components/WeatherTab";
import AssistantTab from "@/components/AssistantTab";
import AboutTab from "@/components/AboutTab";

type TabType = "home" | "disease" | "mandi" | "weather" | "assistant" | "about";

interface AgroNotification {
  id: number;
  type: "weather" | "mandi" | "disease";
  titleHi: string;
  titleEn: string;
  descHi: string;
  descEn: string;
  timeHi: string;
  timeEn: string;
  targetTab: TabType;
}

export default function Home() {
  return (
    <LanguageProvider>
      <MainAppContent />
    </LanguageProvider>
  );
}

function MainAppContent() {
  const { setLang, isHindi, t } = useLanguage();

  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [initialAssistantQuery, setInitialAssistantQuery] = useState<string>("");

  // Dropdown states
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState<boolean>(false);
  const [notificationsRead, setNotificationsRead] = useState<boolean>(false);

  // Refs for outside click handling
  const notificationsRef = useRef<HTMLDivElement>(null);
  const mobileMoreRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(target)
      ) {
        setNotificationsOpen(false);
      }
      if (
        mobileMoreRef.current &&
        !mobileMoreRef.current.contains(target)
      ) {
        setMobileMoreOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleNavigate = (tab: TabType, initialQuery?: string) => {
    if (initialQuery) {
      setInitialAssistantQuery(initialQuery);
    }
    setActiveTab(tab);
    setNotificationsOpen(false);
    setMobileMoreOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Pre-configured agro notifications
  const notifications: AgroNotification[] = [
    {
      id: 1,
      type: "weather",
      titleHi: "मौसम अलर्ट - वर्षा चेतावनी",
      titleEn: "Weather Alert - Rain Warning",
      descHi: "पटना क्षेत्र में अगले 48 घंटों में 12mm बारिश की संभावना। कीटनाशक व यूरिया का छिड़काव तुरंत रोकें।",
      descEn: "Forecast predicts 12mm rainfall in Patna area over next 48h. Stop pesticide and urea spray immediately.",
      timeHi: "2 घंटे पहले",
      timeEn: "2h ago",
      targetTab: "weather",
    },
    {
      id: 2,
      type: "mandi",
      titleHi: "ताज़ा मंडी भाव अपडेट",
      titleEn: "Mandi Price Update",
      descHi: "हाजीपुर व पटना मंडी में आलू का मॉडल भाव ₹2,450/क्विंटल पर स्थिर। बिक्री का सही समय जांचें।",
      descEn: "Potato modal rate steady at ₹2,450/quintal in Hajipur & Patna mandis. Check optimal selling window.",
      timeHi: "आज सुबह 08:30",
      timeEn: "Today 08:30 AM",
      targetTab: "mandi",
    },
    {
      id: 3,
      type: "disease",
      titleHi: "फसल रोग चेतावनी",
      titleEn: "Crop Disease Alert",
      descHi: "टमाटर व आलू में अगेती झुलसा का प्रकोप बढ़ रहा है। खेत में पत्तियों की तुरंत फोटो जांचें।",
      descEn: "Early blight incidence rising in tomato and potato crops. Scan leaf photos immediately for early diagnosis.",
      timeHi: "कल शाम",
      timeEn: "Yesterday evening",
      targetTab: "disease",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAF5] text-[#121C2A] flex flex-col font-sans selection:bg-[#BBF7D0] selection:text-[#166534]">
      {/* ================= FIXED TOP NAVBAR (Modern SaaS Architecture) ================= */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 h-16 flex items-center justify-between gap-2 lg:gap-4">
          {/* Brand Logo & Title */}
          <div className="flex items-center shrink-0">
            <button
              onClick={() => handleNavigate("home")}
              className="flex items-center gap-2 sm:gap-2.5 text-left cursor-pointer group shrink-0"
              aria-label="Annadata AI Home"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-950 text-white flex items-center justify-center shadow-xs ring-1 ring-emerald-900/15 group-hover:scale-105 transition-transform shrink-0">
                <Sprout className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-emerald-100" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-base sm:text-lg xl:text-xl font-black text-emerald-950 tracking-tight leading-none whitespace-nowrap">
                  Annadata AI
                </span>
                <span className="hidden 2xl:inline-block text-[11px] font-bold text-emerald-700 -mt-0.5 whitespace-nowrap">
                  {t("nav", "brandSub")}
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links: Visible on large screens with zero overlap */}
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1.5 shrink min-w-0">
            {/* 1. Home */}
            <button
              onClick={() => handleNavigate("home")}
              className={`px-2.5 xl:px-3 py-1.5 rounded-lg text-xs xl:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${activeTab === "home"
                ? "text-emerald-900 bg-emerald-50 border border-emerald-200/80 shadow-2xs font-bold"
                : "text-slate-600 hover:text-emerald-800 hover:bg-slate-100/70"
                }`}
            >
              <HomeIcon className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
              <span>{t("nav", "home")}</span>
            </button>

            {/* 2. Crop Doctor */}
            <button
              onClick={() => handleNavigate("disease")}
              className={`px-2.5 xl:px-3 py-1.5 rounded-lg text-xs xl:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${activeTab === "disease"
                ? "text-emerald-900 bg-emerald-50 border border-emerald-200/80 shadow-2xs font-bold"
                : "text-slate-600 hover:text-emerald-800 hover:bg-slate-100/70"
                }`}
            >
              <Sprout className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
              <span>{t("nav", "disease")}</span>
            </button>

            {/* 3. Mandi Prices */}
            <button
              onClick={() => handleNavigate("mandi")}
              className={`px-2.5 xl:px-3 py-1.5 rounded-lg text-xs xl:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${activeTab === "mandi"
                ? "text-emerald-900 bg-emerald-50 border border-emerald-200/80 shadow-2xs font-bold"
                : "text-slate-600 hover:text-emerald-800 hover:bg-slate-100/70"
                }`}
            >
              <TrendingUp className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
              <span className="hidden 2xl:inline">{t("nav", "mandi")}</span>
              <span className="2xl:hidden">{t("nav", "mandiShort")}</span>
            </button>

            {/* 4. Weather Advisory */}
            <button
              onClick={() => handleNavigate("weather")}
              className={`px-2.5 xl:px-3 py-1.5 rounded-lg text-xs xl:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${activeTab === "weather"
                ? "text-emerald-900 bg-emerald-50 border border-emerald-200/80 shadow-2xs font-bold"
                : "text-slate-600 hover:text-emerald-800 hover:bg-slate-100/70"
                }`}
            >
              <CloudRain className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
              <span className="hidden 2xl:inline">{t("nav", "weather")}</span>
              <span className="2xl:hidden">{t("nav", "weatherShort")}</span>
            </button>

            {/* 5. About & FAQ */}
            <button
              onClick={() => handleNavigate("about")}
              className={`px-2.5 xl:px-3 py-1.5 rounded-lg text-xs xl:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${activeTab === "about"
                ? "text-emerald-900 bg-emerald-50 border border-emerald-200/80 shadow-2xs font-bold"
                : "text-slate-600 hover:text-emerald-800 hover:bg-slate-100/70"
                }`}
            >
              <HelpCircle className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
              <span className="hidden 2xl:inline">{t("nav", "about")}</span>
              <span className="2xl:hidden">{t("nav", "aboutShort")}</span>
            </button>
          </nav>

          {/* Right Action Cluster: High-Quality Language Toggle, Notification Panel, and Primary Ask AI CTA */}
          <div className="flex items-center gap-1.5 sm:gap-2 xl:gap-3 shrink-0">
            {/* Interactive Select Language Toggle (Segmented Pill) */}
            <div className="flex items-center rounded-xl bg-slate-100/90 p-0.5 border border-slate-200/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setLang("hi")}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1 ${isHindi
                  ? "bg-white text-emerald-950 font-bold shadow-xs border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900 font-semibold"
                  }`}
                title="हिंदी में सामग्री देखें"
                aria-label="Switch to Hindi"
              >
                <span>हिंदी</span>
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1 ${!isHindi
                  ? "bg-white text-emerald-950 font-bold shadow-xs border border-slate-200/60"
                  : "text-slate-600 hover:text-slate-900 font-semibold"
                  }`}
                title="View content in English"
                aria-label="Switch to English"
              >
                <span>English</span>
              </button>
            </div>

            {/* Notification Bell with Dropdown Panel */}
            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                aria-label="Agro Notifications"
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-colors relative cursor-pointer border ${notificationsOpen
                  ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                  : "border-transparent hover:border-slate-200 text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                  }`}
              >
                <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                {!notificationsRead && (
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-white absolute top-2 right-2 animate-pulse" />
                )}
              </button>

              {/* Notification Dropdown Panel */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* Header */}
                  <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {t("nav", "alertsTitle")}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                        {notifications.length}
                      </span>
                    </div>

                    {!notificationsRead && (
                      <button
                        type="button"
                        onClick={() => setNotificationsRead(true)}
                        className="text-[11px] font-semibold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>{t("nav", "markAllRead")}</span>
                      </button>
                    )}
                  </div>

                  {/* Notification List */}
                  <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                    {notifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNavigate(item.targetTab)}
                        className="w-full p-3.5 text-left hover:bg-slate-50/80 transition-colors flex items-start gap-3 cursor-pointer group"
                      >
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${item.type === "weather"
                            ? "bg-blue-50 text-blue-700 border border-blue-200/60"
                            : item.type === "mandi"
                              ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                            }`}
                        >
                          {item.type === "weather" ? (
                            <CloudRain className="w-4 h-4" />
                          ) : item.type === "mandi" ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <Sprout className="w-4 h-4" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 transition-colors truncate">
                              {isHindi ? item.titleHi : item.titleEn}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium shrink-0">
                              {isHindi ? item.timeHi : item.timeEn}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed mt-1">
                            {isHindi ? item.descHi : item.descEn}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="p-2.5 bg-amber-50/60 border-t border-amber-200/60 text-center">
                    <a
                      href="tel:18001801551"
                      className="text-[11px] font-bold text-amber-900 hover:underline inline-flex items-center justify-center gap-1.5"
                    >
                      <PhoneCall className="w-3 h-3 text-amber-700" />
                      <span>{t("nav", "helpline")}</span>
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* PRIMARY CTA: Ask AI Button (High-Contrast Emerald SaaS styling) */}
            <button
              onClick={() => handleNavigate("assistant")}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-700 hover:from-emerald-800 hover:to-emerald-800 text-white text-xs sm:text-sm font-bold shadow-sm hover:shadow-md hover:shadow-emerald-900/15 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap ring-1 ring-emerald-600/30"
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-200 animate-pulse shrink-0" />
              <span>{t("nav", "askAi")}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ================= MAIN BODY CANVAS ================= */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8 pb-24 lg:pb-8">
        {activeTab === "home" && <HomeTab onNavigate={handleNavigate} />}
        {activeTab === "disease" && <DiseaseTab />}
        {activeTab === "mandi" && <MandiTab />}
        {activeTab === "weather" && <WeatherTab />}
        {activeTab === "assistant" && <AssistantTab initialQuery={initialAssistantQuery} />}
        {activeTab === "about" && <AboutTab />}
      </main>

      {/* ================= MOBILE BOTTOM NAVIGATION (Home, Scan, AI, Mandi, More) ================= */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white/85 backdrop-blur-xl border-t border-slate-200/80 px-2 py-1.5 shadow-lg">
        <div className="flex items-center justify-around max-w-md mx-auto relative">
          {/* 1. Home */}
          <button
            onClick={() => handleNavigate("home")}
            className={`flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${activeTab === "home"
              ? "text-emerald-800 font-extrabold"
              : "text-slate-500 hover:text-slate-900"
              }`}
          >
            <HomeIcon className="w-5 h-5 mb-0.5" />
            <span>{t("nav", "homeMobile")}</span>
          </button>

          {/* 2. Scan (Crop Doctor) */}
          <button
            onClick={() => handleNavigate("disease")}
            className={`flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${activeTab === "disease"
              ? "text-emerald-800 font-extrabold"
              : "text-slate-500 hover:text-slate-900"
              }`}
          >
            <Camera className="w-5 h-5 mb-0.5" />
            <span>{t("nav", "scanMobile")}</span>
          </button>

          {/* 3. AI (Elevated Primary Center CTA FAB) */}
          <button
            onClick={() => handleNavigate("assistant")}
            className="relative -top-3 w-13 h-13 rounded-full bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 text-white flex flex-col items-center justify-center shadow-lg border-2 border-white active:scale-95 transition-transform cursor-pointer ring-4 ring-emerald-600/20"
            aria-label="Ask AI Assistant"
          >
            <Mic className="w-5 h-5 text-emerald-100 animate-pulse" />
            <span className="text-[8px] font-black leading-none mt-0.5">
              {t("nav", "aiMobile")}
            </span>
          </button>

          {/* 4. Mandi */}
          <button
            onClick={() => handleNavigate("mandi")}
            className={`flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${activeTab === "mandi"
              ? "text-emerald-800 font-extrabold"
              : "text-slate-500 hover:text-slate-900"
              }`}
          >
            <TrendingUp className="w-5 h-5 mb-0.5" />
            <span>{t("nav", "mandiMobile")}</span>
          </button>

          {/* 5. More (Opens Weather, About, Helpline) */}
          <button
            onClick={() => setMobileMoreOpen(!mobileMoreOpen)}
            className={`flex flex-col items-center py-1 px-2.5 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${mobileMoreOpen || activeTab === "weather" || activeTab === "about"
              ? "text-emerald-800 font-extrabold"
              : "text-slate-500 hover:text-slate-900"
              }`}
          >
            <MoreHorizontal className="w-5 h-5 mb-0.5" />
            <span>{t("nav", "moreMobile")}</span>
          </button>
        </div>

        {/* Mobile "More" Slide-up Drawer */}
        {mobileMoreOpen && (
          <div
            ref={mobileMoreRef}
            className="absolute bottom-full inset-x-0 bg-white border-t border-[#CBD5E1] border-x border-[#CBD5E1] shadow-2xl p-4 rounded-t-3xl animate-in slide-in-from-bottom-2 duration-150 space-y-2.5 mx-auto max-w-md"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <span className="text-xs font-bold text-[#121C2A]">
                {t("nav", "moreDrawerTitle")}
              </span>
              <button
                onClick={() => setMobileMoreOpen(false)}
                className="w-7 h-7 rounded-full bg-[#F8FAF5] flex items-center justify-center text-[#64748B] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Language Switcher Row */}
            <div className="p-2.5 bg-[#F8FAF5] rounded-xl border border-[#E2E8F0] flex items-center justify-between">
              <span className="text-xs font-bold text-[#121C2A] flex items-center gap-1.5">
                <Languages className="w-4 h-4 text-[#166534]" />
                <span>भाषा / Language</span>
              </span>
              <div className="flex items-center rounded-lg bg-white p-0.5 border border-[#CBD5E1]">
                <button
                  type="button"
                  onClick={() => setLang("hi")}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${isHindi ? "bg-[#166534] text-white" : "text-[#64748B]"
                    }`}
                >
                  हिंदी
                </button>
                <button
                  type="button"
                  onClick={() => setLang("en")}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${!isHindi ? "bg-[#166534] text-white" : "text-[#64748B]"
                    }`}
                >
                  English
                </button>
              </div>
            </div>

            {/* Weather Advisory */}
            <button
              onClick={() => handleNavigate("weather")}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer ${activeTab === "weather"
                ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]"
                : "bg-[#F8FAF5] border-[#E2E8F0] text-[#121C2A]"
                }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center shrink-0">
                  <CloudRain className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold leading-tight">
                    {t("nav", "weather")}
                  </div>
                  <div className="text-[10px] text-[#64748B]">
                    {t("nav", "weatherSub")}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#CBD5E1]" />
            </button>

            {/* About & FAQ */}
            <button
              onClick={() => handleNavigate("about")}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer ${activeTab === "about"
                ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]"
                : "bg-[#F8FAF5] border-[#E2E8F0] text-[#121C2A]"
                }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F8FAF5] text-[#166534] flex items-center justify-center shrink-0 border border-[#E2E8F0]">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold leading-tight">
                    {t("nav", "about")}
                  </div>
                  <div className="text-[10px] text-[#64748B]">
                    {t("nav", "aboutSub")}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#CBD5E1]" />
            </button>

            {/* Toll-Free Kisan Helpline Button */}
            <a
              href="tel:18001801551"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FEFCE8] border border-[#FEF08A] text-[#854D0E] text-xs font-bold active:scale-[0.98] transition-transform"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>{t("nav", "helpline")}</span>
            </a>
          </div>
        )}
      </nav>

      {/* ================= FOOTER ================= */}
      <footer className="bg-white border-t border-[#CBD5E1] py-8 text-xs text-[#64748B]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#166534] text-white flex items-center justify-center font-black text-xs">
              🌾
            </div>
            <span className="font-bold text-[#121C2A]">
              {t("nav", "footerTagline")}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span>build#thon 2026 Idea D Prototype</span>
            <span>•</span>
            <a
              href="tel:18001801551"
              className="text-[#166534] font-bold hover:underline inline-flex items-center gap-1"
            >
              <PhoneCall className="w-3 h-3" />
              <span>{t("nav", "footerCallCenter")}</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
