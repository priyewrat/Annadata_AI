"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Sprout,
  TrendingUp,
  CloudRain,
  PhoneCall,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Award,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface FAQItem {
  questionHi: string;
  questionEn: string;
  answerHi: string;
  answerEn: string;
}

const FAQS: FAQItem[] = [
  {
    questionHi: "अन्नदाता AI क्या है और यह किसानों की कैसे सहायता करता है?",
    questionEn: "What is Annadata AI and how does it help farmers?",
    answerHi:
      "अन्नदाता AI भारतीय किसानों के लिए विशेष रूप से डिज़ाइन किया गया एक आधुनिक डिजिटल कृषि सलाहकार है। यह पत्तों की फोटो से फसल के संभावित रोगों की पहचान करता है, बिहार की मंडियों के ताज़ा भाव व तुलना दिखाता है, और 48 घंटे के मौसम पूर्वानुमान के आधार पर कीटनाशक छिड़काव की वैज्ञानिक सलाह देता है।",
    answerEn:
      "Annadata AI is a modern digital agricultural advisor designed specifically for Indian farmers. It diagnoses crop leaf diseases from photos, provides live mandi prices & trend comparisons across Bihar, and delivers scientific 48-hour spray advisories based on rainfall thresholds.",
  },
  {
    questionHi: "क्या फसल रोग पहचान में रासायनिक कीटनाशक की खुराक बताई जाती है?",
    questionEn: "Does the Crop Doctor prescribe chemical pesticide dosages?",
    answerHi:
      "नहीं। सुरक्षा नियमों एवं कृषि वैधानिक दिशानिर्देशों के तहत अन्नदाता AI कभी भी रासायनिक दवाओं के नाम या सटीक खुराक की सिफारिश नहीं करता। यह केवल गैर-रासायनिक भौतिक प्राथमिक उपचार और स्वच्छता उपाय बताता है, तथा रासायनिक उपचार हेतु किसान को नजदीकी कृषि विज्ञान केंद्र (KVK) या किसान कॉल सेंटर (1800-180-1551) से संपर्क करने की सलाह देता है।",
    answerEn:
      "No. In strict compliance with agricultural safety and ICAR policies, Annadata AI never prescribes chemical names or dosages. It only provides safe, non-chemical physical first steps and hygiene measures, referring farmers to their local Krishi Vigyan Kendra (KVK) or Kisan Call Center (1800-180-1551) for authorized chemical recommendations.",
  },
  {
    questionHi: "मंडी भाव डेटा कितना सटीक है?",
    questionEn: "How accurate is the Mandi price data?",
    answerHi:
      "प्रोटोटाइप में प्रदर्शित मंडी भाव डेटा प्रायोगिक (Synthetic) परीक्षण डेटा है। यह वास्तविक समय के एपीएमसी भाव नहीं हैं। इसका उद्देश्य किसानों को मूल्य रुझान, 7-दिन व 30-दिन के बदलाव और आस-पास की मंडियों में भाव की तुलना का विश्लेषणात्मक प्रारूप समझाना है। वास्तविक सौदे से पहले अपनी स्थानीय मंडी से पुष्टि करें।",
    answerEn:
      "The mandi rates shown in this prototype are synthetic benchmark testing data. They are designed to demonstrate price trend analysis, 7-day and 30-day percentage changes, and regional market comparison. Always verify actual market prices with your local APMC market before transacting.",
  },
  {
    questionHi: "छिड़काव सलाहकार में 2 मिमी (2mm) का नियम क्या है?",
    questionEn: "What is the 2mm rainfall rule in the Spray Advisory?",
    answerHi:
      "वैज्ञानिक शोध के अनुसार, यदि कीटनाशक या पर्णीय उर्वरक छिड़कने के 48 घंटों के भीतर 2 मिमी या उससे अधिक बारिश होती है, तो दवा पत्तियों से धुल जाती है। इससे किसान को प्रति एकड़ ₹1,200 से ₹2,500 तक का नुकसान हो सकता है। अन्नदाता AI ऐसी स्थिति में तुरंत चेतावनी देकर छिड़काव रोकने की सलाह देता है।",
    answerEn:
      "According to agronomic research, if 2mm or more rainfall occurs within 48 hours of applying foliar spray, the chemicals wash off the foliage. This causes farmers to waste ₹1,200 to ₹2,500 per acre. Annadata AI triggers an instant warning to pause spraying, protecting farmers from wasted expenditure.",
  },
  {
    questionHi: "क्या मैं बोलकर अपनी भाषा में सवाल पूछ सकता हूँ?",
    questionEn: "Can I speak and ask questions in my native language?",
    answerHi:
      "हाँ, अन्नदाता AI में ध्वनि इनपुट (Voice Mic) की सुविधा उपलब्ध है। आप हिंदी या अंग्रेजी में बोलकर अपना प्रश्न पूछ सकते हैं और सहायक आपको बोलकर भी उत्तर सुना सकता है।",
    answerEn:
      "Yes, Annadata AI provides voice input (Mic). You can speak in Hindi or English, and the assistant can also read out responses using built-in speech synthesis.",
  },
];

export default function AboutTab() {
  const { t, isHindi } = useLanguage();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-emerald-50/70 via-white to-white rounded-3xl border border-slate-200/90 p-8 md:p-12 shadow-sm ring-1 ring-slate-900/5">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-emerald-200 text-emerald-900 text-xs font-bold mb-3 shadow-xs tracking-tight">
          <Award className="w-4 h-4 text-emerald-700" />
          <span>build#thon 2026 • Idea D: Annadata AI</span>
        </div>

        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
          {t("about", "headerTitle")}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-3xl leading-relaxed font-normal">
          {t("about", "headerSub")}
        </p>
      </div>

      {/* 4 Core Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3.5 ring-1 ring-slate-900/5 hover:shadow-md transition-shadow">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shadow-2xs">
            <Sprout className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">{t("about", "pillar1Title")}</h3>
          <p className="text-xs text-slate-600 leading-relaxed font-normal">
            {t("about", "pillar1Desc")}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3.5 ring-1 ring-slate-900/5 hover:shadow-md transition-shadow">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-700 shadow-2xs">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">{t("about", "pillar2Title")}</h3>
          <p className="text-xs text-slate-600 leading-relaxed font-normal">
            {t("about", "pillar2Desc")}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3.5 ring-1 ring-slate-900/5 hover:shadow-md transition-shadow">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-700 shadow-2xs">
            <CloudRain className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">{t("about", "pillar3Title")}</h3>
          <p className="text-xs text-slate-600 leading-relaxed font-normal">
            {t("about", "pillar3Desc")}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3.5 ring-1 ring-slate-900/5 hover:shadow-md transition-shadow">
          <div className="w-11 h-11 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-emerald-800 shadow-2xs">
            <PhoneCall className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">{t("about", "pillar4Title")}</h3>
          <p className="text-xs text-slate-600 leading-relaxed font-normal">
            {t("about", "pillar4Desc")}
          </p>
        </div>
      </div>

      {/* Safety & Ethics Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/90 shadow-sm space-y-4 ring-1 ring-slate-900/5">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shadow-2xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
              {isHindi ? "सुरक्षा एवं नैतिक उत्तरदायित्व" : "Safety & Ethical Governance"}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {isHindi ? "भारतीय कृषि अनुसंधान परिषद (ICAR) मार्गदर्शन के अनुरूप" : "In alignment with Indian Council of Agricultural Research (ICAR) guidelines"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-1.5">
            <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {isHindi ? "रासायनिक सुरक्षा प्रतिबद्धता" : "Zero Chemical Prescription Policy"}
            </span>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              {isHindi
                ? "अन्नदाता AI कभी भी मनगढ़ंत रासायनिक नुस्खे उत्पन्न नहीं करता। यह हमेशा किसान भाइयों को केवल गैर-रासायनिक भौतिक प्रथम उपचार बताता है।"
                : "Annadata AI strictly avoids prescribing chemical molecules or dosages. It only provides safe, non-chemical physical first steps to prevent crop damage."}
            </p>
          </div>

          <div className="p-4.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-1.5">
            <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              {isHindi ? "प्रायोगिक डेटा पारदर्शिता" : "Prototype Data Transparency"}
            </span>
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              {isHindi
                ? "मंडी भाव स्पष्ट रूप से सिंथेटिक परीक्षण डेटा के रूप में चिह्नित हैं ताकि किसान भाई वास्तविक सौदे से पूर्व स्थानीय पुष्टि करें।"
                : "Mandi rates are transparently marked as synthetic benchmark test data so farmers verify local APMC rates prior to actual transactions."}
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Accordion Section */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/90 shadow-sm space-y-4 ring-1 ring-slate-900/5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <HelpCircle className="w-5 h-5 text-emerald-700" />
          <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
            {t("about", "faqSectionTitle")}
          </h3>
        </div>

        <div className="space-y-3 pt-2">
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="rounded-2xl border border-slate-200/90 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full p-4.5 text-left flex items-center justify-between gap-4 bg-slate-50/70 hover:bg-emerald-50/50 transition-colors cursor-pointer"
                >
                  <span className="text-xs sm:text-sm font-bold text-slate-900">
                    {isHindi ? faq.questionHi : faq.questionEn}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-emerald-700 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="p-4.5 bg-white border-t border-slate-100 text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                    {isHindi ? faq.answerHi : faq.answerEn}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
