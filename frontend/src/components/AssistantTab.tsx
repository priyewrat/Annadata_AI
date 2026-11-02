"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Mic,
  MicOff,
  Bot,
  User,
  Volume2,
  PlusCircle,
  PhoneCall,
  Sprout,
  TrendingUp,
  CloudRain
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  category?: string;
  isAudioPlaying?: boolean;
}

interface AssistantTabProps {
  initialQuery?: string;
}

export default function AssistantTab({ initialQuery }: AssistantTabProps) {
  const { t, isHindi } = useLanguage();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [listening, setListening] = useState<boolean>(false);
  const [voiceSupported, setVoiceSupported] = useState<boolean>(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set initial localized welcome message
  useEffect(() => {
    setMessages([
      {
        id: "1",
        sender: "assistant",
        text: t("assistant", "welcomeMsg"),
        timestamp: t("assistant", "welcomeMsgTimestamp"),
        category: "welcome",
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHindi]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supported = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
      setVoiceSupported(supported);
    }
  }, []);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Handle incoming initial query from Home tab
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      handleSendMessage(initialQuery.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputText;
    if (!textToSend.trim() || loading) return;

    // Detect user query language
    const hasDevanagari = /[\u0900-\u097F]/.test(textToSend);
    const isEnglishQuery = !hasDevanagari && (
      !isHindi ||
      /\b(?:what|when|how|why|can|should|will|is|are|price|rate|spray|weather|rain|disease|symptom|sow|wheat|potato|tomato|onion|tell|help)\b/i.test(textToSend)
    );

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString(isEnglishQuery ? "en-US" : "hi-IN", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputText("");
    setLoading(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: textToSend.trim(),
          location: "Patna",
          language: isEnglishQuery ? "en" : (isHindi ? "hi" : "en"),
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned error: ${res.status}`);
      }

      const data = await res.json();

      // Pick response matching the user's query language
      let botResponseText = "";
      if (data.detected_language === "en" || isEnglishQuery) {
        botResponseText = data.answer_english || data.answer || data.answer_hindi || "Sorry, no answer could be retrieved at this moment.";
      } else {
        botResponseText = data.answer_hindi || data.answer || data.answer_english || "माफ़ कीजिए, कोई जवाब उपलब्ध नहीं हो सका।";
      }

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: botResponseText,
        timestamp: new Date().toLocaleTimeString(isEnglishQuery ? "en-US" : "hi-IN", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const fallbackMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: isEnglishQuery
          ? "Network or server connection issue. For immediate assistance, please call the Kisan Call Center toll-free at 1800-180-1551."
          : "नेटवर्क या सर्वर से जुड़ने में समस्या आई। यदि यह आपातकालीन समस्या है, तो कृपया किसान कॉल सेंटर 1800-180-1551 पर निशुल्क कॉल करें।",
        timestamp: new Date().toLocaleTimeString(isEnglishQuery ? "en-US" : "hi-IN", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Speech-to-text integration via Web Speech API
  const toggleListening = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert(isHindi ? "आपके ब्राउज़र में आवाज़ पहचान समर्थित नहीं है।" : "Speech recognition is not supported in this browser.");
      return;
    }

    if (listening) {
      setListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = isHindi ? "hi-IN" : "en-IN";
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      setListening(false);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognition.start();
  };

  // Text-to-speech
  const playSpeech = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = isHindi ? "hi-IN" : "en-IN";
      window.speechSynthesis.speak(utterance);
    }
  };

  const startNewChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        sender: "assistant",
        text: isHindi
          ? "नया परामर्श सत्र शुरू हुआ। कृपया अपनी फसल, मंडी या मौसम से संबंधित प्रश्न पूछें।"
          : "New consultation session started. Feel free to ask about your crops, mandi prices, or weather advisory.",
        timestamp: new Date().toLocaleTimeString(isHindi ? "hi-IN" : "en-US", { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-3xl shadow-sm overflow-hidden flex flex-col lg:flex-row min-h-[640px] pb-0 ring-1 ring-slate-900/5">
      {/* ================= LEFT SIDEBAR (QUICK TOPICS & HISTORY) ================= */}
      <aside className="w-full lg:w-80 bg-slate-50/70 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-200 space-y-3">
          <button
            onClick={startNewChat}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98] cursor-pointer ring-1 ring-emerald-600/30"
          >
            <PlusCircle className="w-4 h-4 text-emerald-100" />
            <span>{t("assistant", "clearChatBtn")}</span>
          </button>
        </div>

        {/* Quick Topic Chips */}
        <div className="p-4 border-b border-slate-200 space-y-2.5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            {isHindi ? "त्वरित विषय" : "Quick Topics"}
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => {
                setInputText(isHindi ? "टमाटर में झुलसा रोग के लक्षण और प्राथमिक उपाय क्या हैं?" : "What are the symptoms and safe first steps for tomato blight?");
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-800 flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs hover:shadow-xs active:scale-95"
            >
              <Sprout className="w-3.5 h-3.5 text-emerald-700" />
              <span>{isHindi ? "फसल रोग" : "Crop Disease"}</span>
            </button>
            <button
              onClick={() => {
                setInputText(isHindi ? "पटना मंडी में आज आलू और प्याज का क्या भाव चल रहा है?" : "What are the current potato and onion prices in Patna mandi?");
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-800 flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs hover:shadow-xs active:scale-95"
            >
              <TrendingUp className="w-3.5 h-3.5 text-amber-700" />
              <span>{isHindi ? "मंडी भाव" : "Mandi Rates"}</span>
            </button>
            <button
              onClick={() => {
                setInputText(isHindi ? "क्या कल बारिश होगी? क्या मुझे कीटनाशक का छिड़काव करना चाहिए?" : "Will it rain tomorrow? Should I spray pesticides or pause?");
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-800 flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs hover:shadow-xs active:scale-95"
            >
              <CloudRain className="w-3.5 h-3.5 text-blue-700" />
              <span>{isHindi ? "मौसम व छिड़काव" : "Weather & Spray"}</span>
            </button>
          </div>
        </div>

        {/* Recent Consultations List */}
        <div className="flex-1 p-3.5 space-y-2 overflow-y-auto">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block px-1">
            {t("assistant", "quickPromptsTitle")}
          </span>

          <button
            onClick={() => handleSendMessage(t("assistant", "chip1"))}
            className="w-full text-left p-3 rounded-2xl bg-white hover:bg-emerald-50/70 border border-slate-200/90 text-xs text-slate-800 font-semibold transition-all cursor-pointer shadow-2xs hover:border-emerald-300 active:scale-[0.99]"
          >
            🌱 {t("assistant", "chip1")}
          </button>
          <button
            onClick={() => handleSendMessage(t("assistant", "chip2"))}
            className="w-full text-left p-3 rounded-2xl bg-white hover:bg-amber-50/70 border border-slate-200/90 text-xs text-slate-800 font-semibold transition-all cursor-pointer shadow-2xs hover:border-amber-300 active:scale-[0.99]"
          >
            📈 {t("assistant", "chip2")}
          </button>
          <button
            onClick={() => handleSendMessage(t("assistant", "chip3"))}
            className="w-full text-left p-3 rounded-2xl bg-white hover:bg-blue-50/70 border border-slate-200/90 text-xs text-slate-800 font-semibold transition-all cursor-pointer shadow-2xs hover:border-blue-300 active:scale-[0.99]"
          >
            🌧️ {t("assistant", "chip3")}
          </button>
        </div>

        {/* KVK Helpline Box */}
        <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 m-3 rounded-2xl space-y-1">
          <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
            <PhoneCall className="w-3 h-3 text-amber-700" /> {isHindi ? "KVK किसान हेल्पलाइन:" : "KVK Farmer Helpline:"}
          </span>
          <p className="text-[11px] text-amber-800 font-medium">
            {isHindi ? "टोल-फ्री" : "Toll-Free"} <strong className="font-bold text-amber-950">1800-180-1551</strong> {isHindi ? "पर कॉल करें।" : "available 24/7."}
          </p>
        </div>
      </aside>

      {/* ================= MAIN CHAT AREA ================= */}
      <main className="flex-1 flex flex-col justify-between bg-white">
        {/* Chat Header */}
        <div className="p-4 md:p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 text-white flex items-center justify-center shadow-xs ring-1 ring-emerald-800/20">
              <Bot className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2 tracking-tight">
                <span>{t("assistant", "headerTitle")}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {t("assistant", "headerSub")}
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium hidden sm:block">
            <span>{isHindi ? "बिहार कृषि संदर्भ इंजन" : "Bihar Agri Reference Engine"}</span>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 max-h-[480px]">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${
                m.sender === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  m.sender === "user"
                    ? "bg-gradient-to-br from-emerald-700 to-emerald-900 text-white shadow-2xs"
                    : "bg-emerald-50 border border-emerald-200 text-emerald-800"
                }`}
              >
                {m.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-4.5 shadow-2xs space-y-2 ${
                  m.sender === "user"
                    ? "bg-gradient-to-r from-emerald-700 to-emerald-800 text-white rounded-tr-none shadow-sm shadow-emerald-900/10"
                    : "bg-slate-50/90 border border-slate-200/90 text-slate-900 rounded-tl-none ring-1 ring-slate-900/5"
                }`}
              >
                <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-normal">
                  {m.text}
                </p>

                <div
                  className={`flex items-center justify-between pt-1.5 border-t text-[10px] ${
                    m.sender === "user"
                      ? "border-white/20 text-emerald-100"
                      : "border-slate-200/60 text-slate-400"
                  }`}
                >
                  <span className="font-medium">{m.timestamp}</span>

                  {m.sender === "assistant" && (
                    <button
                      type="button"
                      onClick={() => playSpeech(m.text)}
                      className="inline-flex items-center gap-1 hover:text-emerald-800 transition-colors cursor-pointer ml-3 font-bold text-emerald-700"
                      title={isHindi ? "उत्तर सुनें" : "Listen to answer"}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{isHindi ? "सुनें" : "Listen"}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-none p-3 px-4 flex items-center gap-2 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]" />
                <span className="text-xs text-slate-500 font-medium ml-1">
                  {isHindi ? "कृषि परामर्श तैयार हो रहा है..." : "Analyzing agricultural guidance..."}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Dock */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/70 space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            {/* Voice Input Button */}
            {voiceSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  listening
                    ? "bg-rose-600 text-white animate-pulse"
                    : "bg-white border border-slate-300 text-emerald-800 hover:bg-emerald-50 shadow-2xs"
                }`}
                title={listening ? t("assistant", "voiceListening") : t("assistant", "voiceStart")}
              >
                {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            )}

            <div className="relative flex-1">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={listening ? t("assistant", "voiceListening") : t("assistant", "inputPlaceholder")}
                className="w-full h-11 px-4 rounded-2xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none transition-all shadow-2xs"
              />
            </div>

            <button
              type="submit"
              disabled={!inputText.trim() || loading}
              className="h-11 px-4 sm:px-5 rounded-2xl bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-emerald-900/10 cursor-pointer shrink-0 active:scale-[0.98]"
            >
              <span>{t("assistant", "sendBtn")}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          <p className="text-[10px] text-slate-400 font-medium text-center">
            {t("assistant", "helplineNotice")}
          </p>
        </div>
      </main>
    </div>
  );
}
