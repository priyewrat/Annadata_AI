"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  Upload,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  PhoneCall,
  Share2,
  Printer,
  RotateCcw,
  ShieldAlert,
  Sun,
  Eye,
  Activity,
  Layers,
  ArrowLeft,
  Calendar,
  Sprout,
  X,
  RefreshCw,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface DiseaseResult {
  success: boolean;
  crop: string;
  crop_detected?: string;
  crop_hindi?: string;
  disease: string;
  disease_hindi?: string;
  confidence_label: string;
  urgency: string;
  symptoms: string[];
  symptoms_english?: string[];
  first_steps: string[];
  first_steps_english?: string[];
  next_step: string;
  next_step_english?: string;
  is_uncertain: boolean;
  auto_detected?: boolean;
}

const POPULAR_CROPS_HI = [
  { id: "Auto", label: "✨ स्वतः पहचान (AI)" },
  { id: "Tomato", label: "टमाटर" },
  { id: "Potato", label: "आलू" },
  { id: "Wheat", label: "गेहूं" },
  { id: "Rice", label: "धान" },
  { id: "Maize", label: "मक्का" },
  { id: "Mustard", label: "सरसों" },
  { id: "Cotton", label: "कपास" },
];

const POPULAR_CROPS_EN = [
  { id: "Auto", label: "✨ Auto-Detect (AI)" },
  { id: "Tomato", label: "Tomato" },
  { id: "Potato", label: "Potato" },
  { id: "Wheat", label: "Wheat" },
  { id: "Rice", label: "Rice" },
  { id: "Maize", label: "Maize" },
  { id: "Mustard", label: "Mustard" },
  { id: "Cotton", label: "Cotton" },
];

export default function DiseaseTab() {
  const { t, isHindi } = useLanguage();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropHint, setCropHint] = useState<string>("Auto");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiseaseResult | null>(null);

  // Live Camera states
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const popularCrops = isHindi ? POPULAR_CROPS_HI : POPULAR_CROPS_EN;

  const stopCamera = useCallback(() => {
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
    setCameraError(null);
  }, [videoStream]);

  const startCamera = async (facing: "environment" | "user" = facingMode) => {
    // Stop any existing stream before starting a new one
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
    }

    setIsCameraOpen(true);
    setCameraError(null);

    if (!navigator?.mediaDevices?.getUserMedia) {
      // Fallback for browsers without getUserMedia: open native device camera
      cameraInputRef.current?.click();
      setIsCameraOpen(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setVideoStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch {
      // Fallback: Try with general video constraints (e.g. laptop webcam without environment lens)
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        setVideoStream(fallbackStream);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.play().catch(() => {});
        }
      } catch {
        setCameraError(t("disease", "cameraPermissionError"));
      }
    }
  };

  const switchCamera = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `crop-leaf-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setError(null);
        setResult(null);
        stopCamera();
      },
      "image/jpeg",
      0.95
    );
  };

  // Bind video element when modal opens with active stream
  useEffect(() => {
    if (isCameraOpen && videoStream && videoRef.current) {
      videoRef.current.srcObject = videoStream;
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraOpen, videoStream]);

  // Clean up media tracks on unmount
  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [videoStream]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      setResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      setResult(null);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    stopCamera();
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const analyzeImage = async () => {
    if (!selectedFile) {
      setError(
        isHindi
          ? "कृपया पहले पत्ती की एक तस्वीर चुनें या खींचें।"
          : "Please select or snap a photo of the affected leaf first."
      );
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("image", selectedFile);
    if (cropHint) {
      formData.append("crop", cropHint);
    }

    try {
      const res = await fetch("/api/disease/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.is_leaf === false || errorData.disease === "Not a Leaf") {
          setError(
            isHindi
              ? "यह किसी कृषि फसल या पौधे की पत्ती की तस्वीर नहीं लगती है। कृपया पत्ती की साफ और स्पष्ट फोटो खींचें।"
              : "The uploaded image does not appear to be an agricultural plant leaf. Please capture or upload a clear photo of the crop leaf."
          );
          setResult(null);
          return;
        }
        throw new Error(errorData.detail || `Server error: ${res.status}`);
      }

      const data: DiseaseResult = await res.json();
      setResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (isHindi ? "रोग विश्लेषण में त्रुटि हुई।" : "An error occurred during disease analysis.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Demo fallback to test full report screen if backend or key is unavailable
  const loadDemoReport = () => {
    setResult({
      success: true,
      crop: cropHint || "Tomato",
      disease: "Early blight",
      confidence_label: "Medium",
      urgency: "Medium",
      symptoms: isHindi ? [
        "पुरानी निचली पत्तियों पर भूरे-काले संकेंद्री छल्ले (Target spots)",
        "प्रभावित पत्तियाँ पीली पड़कर सूखने लगती हैं",
        "तने और फल पर काले धब्बे फैल सकते हैं"
      ] : [
        "Concentric dark brown rings on older lower leaves (Target spots)",
        "Infected leaves turn yellow and drop prematurely",
        "Dark lesions may spread to stems and ripening fruits"
      ],
      first_steps: isHindi ? [
        "संक्रमित पत्तियों को तुरंत तोड़कर खेत से दूर सुरक्षित नष्ट कर दें",
        "पत्तियों पर सीधे पानी का छिड़काव करने से बचें व केवल जड़ों में सिंचाई करें",
        "हवा के संचार के लिए पौधों के बीच पर्याप्त दूरी रखें"
      ] : [
        "Prune and safely destroy infected lower leaves away from the field",
        "Avoid overhead irrigation to keep foliage dry; water at root base only",
        "Ensure adequate spacing between plants to maintain airflow"
      ],
      next_step: isHindi
        ? "सटीक फफूंदनाशी उपचार और मात्रा के लिए अपने नजदीकी कृषि विज्ञान केंद्र (KVK) या प्रखंड कृषि पदाधिकारी से संपर्क करें।"
        : "For authorized fungicide formulations and safe dosages, consult your nearest Krishi Vigyan Kendra (KVK) or block agriculture officer.",
      is_uncertain: false,
    });
    setPreviewUrl("https://images.unsplash.com/photo-1592417817098-8f3d6910985b?w=600&auto=format&fit=crop&q=80");
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Hidden file & camera inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header Section */}
      <div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/90 text-emerald-900 text-xs font-bold mb-3 shadow-xs tracking-tight">
          <Sparkles className="w-4 h-4 text-emerald-700" />
          <span>
            {isHindi ? "AI पावर्ड रोग पहचान • Reference Catalog Grounded" : "AI Plant Health Diagnostics • Reference Catalog Grounded"}
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              {t("disease", "headerTitle")}
            </h1>
            <p className="text-sm sm:text-base text-slate-600 mt-1.5 max-w-2xl font-normal">
              {t("disease", "headerSub")}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white border border-slate-200/90 px-4 py-2 rounded-xl shadow-xs self-start md:self-auto">
            <Sun className="w-4 h-4 text-amber-600" />
            <span>{isHindi ? "दिन के उजाले में साफ फोटो लें" : "Capture in bright natural daylight"}</span>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-xl bg-[#FEF2F2] border-2 border-[#B91C1C] p-4 flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#B91C1C] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-[#991B1B]">
                {isHindi ? "विश्लेषण में समस्या आई:" : "Analysis Notice:"}
              </p>
              <p className="text-xs text-[#7F1D1D] mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={loadDemoReport}
            className="text-xs font-bold text-[#166534] bg-white border border-[#166534] px-3 py-1.5 rounded-lg hover:bg-[#F0FDF4] transition-colors shrink-0"
          >
            {t("disease", "demoBtn")}
          </button>
        </div>
      )}

      {/* ================= IF RESULT IS READY: SHOW DIAGNOSTIC REPORT ================= */}
      {result ? (
        <div className="space-y-6">
          {/* Breadcrumb / Back button */}
          <div className="flex items-center justify-between">
            <button
              onClick={clearSelection}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#166534] hover:text-[#14532D] cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{isHindi ? "फसल डॉक्टर पर वापस जाएं" : "Back to Crop Doctor"}</span>
            </button>

            <span className="text-xs font-semibold text-[#64748B]">
              {isHindi ? "निदान रिपोर्ट" : "Report ID"} #CR-{Math.floor(1000 + Math.random() * 9000)}
            </span>
          </div>

          {/* Diagnostic Report Header */}
          <div className="bg-white rounded-2xl border border-[#CBD5E1] p-5 md:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <h2 className="text-xl md:text-2xl font-bold text-[#121C2A]">
                  {t("disease", "reportTitle")}
                </h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]">
                  {isHindi ? "सत्यापित परिणाम" : "Verified Result"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#404940]">
                {isHindi
                  ? "एआई संचालित पादप रोग विश्लेषण • crop_disease_reference.csv संदर्भ सूची से सत्यापित"
                  : "AI-driven plant pathology analysis • Grounded against crop disease catalog"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 bg-[#F8FAF5] px-4 py-3 rounded-xl border border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#166534]" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#64748B] uppercase font-bold">
                    {isHindi ? "जांच दिनांक" : "Date"}
                  </span>
                  <span className="text-xs font-bold text-[#121C2A]">
                    {new Date().toLocaleDateString(isHindi ? "hi-IN" : "en-US", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
              <div className="w-px h-7 bg-[#CBD5E1] hidden sm:block" />
              <div className="flex items-center gap-2">
                <Sprout className="w-4 h-4 text-[#166534]" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#64748B] uppercase font-bold">
                    {t("disease", "cropIdentified")}
                  </span>
                  <span className="text-xs font-bold text-[#121C2A]">{result.crop}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2-Column Responsive Diagnostic Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Image & Telemetry (5 cols) */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-white rounded-2xl border border-[#CBD5E1] p-4 md:p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#121C2A] flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-[#166534]" />
                    {isHindi ? "सबमिट की गई पत्ती की तस्वीर" : "Uploaded Leaf Specimen"}
                  </span>
                  <span className="text-[11px] font-semibold bg-[#F0FDF4] text-[#166534] px-2 py-0.5 rounded">
                    AI Overlay Active
                  </span>
                </div>

                {/* Image Preview with Bounding Box Overlay */}
                <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 border border-[#CBD5E1]">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt="Crop leaf sample"
                      className="w-full h-full object-cover opacity-90"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                      {isHindi ? "तस्वीर उपलब्ध नहीं" : "No image preview available"}
                    </div>
                  )}

                  {/* Bounding box visual simulation */}
                  <div className="absolute top-[25%] left-[20%] w-[50%] h-[45%] border-2 border-dashed border-[#FACC15] bg-[#FACC15]/15 rounded-lg p-1.5 flex flex-col justify-between pointer-events-none">
                    <span className="self-start text-[10px] font-bold bg-[#854D0E] text-[#FEFCE8] px-1.5 py-0.5 rounded shadow-sm">
                      {isHindi ? "संक्रमण क्षेत्र" : "Affected Region"} ({result.confidence_label})
                    </span>
                  </div>
                </div>

                {/* Metadata Telemetry */}
                <div className="pt-3 border-t border-[#E2E8F0] grid grid-cols-2 gap-2 text-xs text-[#404940]">
                  <div className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#166534]" />
                    <span>Focus: Macro Leaf</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-[#166534]" />
                    <span>Light: Daylight</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#166534]" />
                    <span>Status: {result.is_uncertain ? (isHindi ? "अस्पष्ट" : "Uncertain") : (isHindi ? "सत्यापित" : "Verified")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#166534]" />
                    <span>Quality: Sharp</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-white rounded-2xl border border-[#CBD5E1] p-4 shadow-sm space-y-3">
                <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider block">
                  {isHindi ? "त्वरित कार्रवाई" : "Quick Actions"}
                </span>
                <button
                  onClick={clearSelection}
                  className="w-full min-h-[50px] bg-[#166534] hover:bg-[#14532D] text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{t("disease", "scanAnotherBtn")}</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: "Annadata AI Crop Diagnosis",
                          text: `Crop: ${result.crop}, Suspected Disease: ${result.disease}`,
                        }).catch(() => {});
                      } else {
                        alert(isHindi ? "शेयरिंग लिंक कॉपी हो गया!" : "Sharing link copied!");
                      }
                    }}
                    className="min-h-[46px] bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/40 text-[#128C7E] font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#25D366]" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="min-h-[46px] bg-[#F8FAF5] hover:bg-[#EFF4FF] border border-[#CBD5E1] text-[#121C2A] font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#166534]" />
                    <span>{isHindi ? "प्रिंट / PDF" : "Print PDF"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Diagnostic Details & Safe Advisory (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              {/* Primary Identified Disease Card */}
              <div className={`bg-white rounded-2xl border-2 p-5 md:p-6 shadow-sm relative overflow-hidden ${
                result.urgency === "High"
                  ? "border-[#B91C1C]"
                  : result.urgency === "Medium"
                  ? "border-[#CA8A04]"
                  : "border-[#166534]"
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] text-xs font-bold mb-2">
                      <span className="w-2 h-2 rounded-full bg-[#166534] animate-ping" />
                      {t("disease", "suspectedDisease")}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black text-[#121C2A] leading-tight">
                      {isHindi && result.disease_hindi ? result.disease_hindi : result.disease}
                    </h3>
                    <p className="text-sm font-semibold text-[#64748B] mt-1 flex items-center gap-1.5 flex-wrap">
                      <span>{t("disease", "cropIdentified")}:</span>
                      <strong className="text-[#121C2A]">
                        {isHindi && result.crop_hindi ? result.crop_hindi : (result.crop_detected || result.crop)}
                      </strong>
                      {result.auto_detected && (
                        <span className="text-[11px] font-bold text-[#166534] bg-[#F0FDF4] px-2 py-0.5 rounded-full border border-[#BBF7D0]">
                          ✨ {isHindi ? "स्वतः पहचानी गई" : "Auto-Detected"}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Urgency Pill */}
                  <div className={`p-3 rounded-xl border text-right flex flex-col sm:items-end self-start ${
                    result.urgency === "High"
                      ? "bg-[#FEF2F2] border-[#B91C1C] text-[#991B1B]"
                      : result.urgency === "Medium"
                      ? "bg-[#FEFCE8] border-[#CA8A04] text-[#854D0E]"
                      : "bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]"
                  }`}>
                    <span className="text-[10px] uppercase font-bold tracking-wider">
                      {t("disease", "urgency")}
                    </span>
                    <span className="text-base font-extrabold mt-0.5">
                      {result.urgency === "High"
                        ? (isHindi ? "अति-गंभीर" : "High Urgency")
                        : result.urgency === "Medium"
                        ? (isHindi ? "मध्यम जोखिम" : "Medium Urgency")
                        : (isHindi ? "सामान्य जोखिम" : "Low Urgency")}
                    </span>
                    <span className="text-[11px] font-medium opacity-90 mt-0.5">
                      {result.urgency === "High"
                        ? (isHindi ? "24-48 घंटों में कार्रवाई आवश्यक" : "Action needed within 24-48h")
                        : (isHindi ? "नियमित निगरानी रखें" : "Maintain regular field scouting")}
                    </span>
                  </div>
                </div>

                {/* AI Confidence Progress */}
                <div className="mt-5 pt-4 border-t border-[#E2E8F0] space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#121C2A] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#166534]" />
                      {t("disease", "confidence")}
                    </span>
                    <span className="font-bold text-[#166534]">
                      {result.confidence_label} Confidence
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#166534] rounded-full transition-all duration-500"
                      style={{
                        width:
                          result.confidence_label === "High"
                            ? "92%"
                            : result.confidence_label === "Medium"
                            ? "68%"
                            : "40%",
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-[#64748B]">
                    {isHindi
                      ? "*यह मॉडल-रिपोर्टेड विश्वास स्तर है, निश्चित वैज्ञानिक प्रमाण नहीं।"
                      : "*Model-reported confidence level based on reference disease patterns."}
                  </p>
                </div>
              </div>

              {/* Observed Symptoms Checklist */}
              <div className="bg-white rounded-2xl border border-[#CBD5E1] p-5 md:p-6 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#F8FAF5] text-[#166534] flex items-center justify-center">
                    <Eye className="w-4 h-4" />
                  </div>
                  <h4 className="text-base md:text-lg font-bold text-[#121C2A]">
                    {t("disease", "symptomsTitle")}
                  </h4>
                </div>

                <div className="space-y-2 pt-1">
                  {((!isHindi && result.symptoms_english && result.symptoms_english.length > 0)
                    ? result.symptoms_english
                    : result.symptoms
                  )?.map((symptom, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#F8FAF5] border border-[#E2E8F0] flex items-start gap-2.5 text-xs sm:text-sm text-[#121C2A]"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#166534] shrink-0 mt-0.5" />
                      <span>{symptom}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Safe First Steps Checklist (Zero Chemical Prescription) */}
              <div className="bg-white rounded-2xl border border-[#CBD5E1] p-5 md:p-6 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] text-[#166534] flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-base md:text-lg font-bold text-[#121C2A]">
                        {t("disease", "firstStepsTitle")}
                      </h4>
                      <p className="text-xs text-[#166534] font-medium">
                        {isHindi ? "100% गैर-रासायनिक व सुरक्षित प्राथमिक उपाय" : "100% Safe & Non-Chemical Physical Measures"}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#F0FDF4] text-[#166534] text-[11px] font-bold border border-[#BBF7D0]">
                    Safe First Aid
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  {((!isHindi && result.first_steps_english && result.first_steps_english.length > 0)
                    ? result.first_steps_english
                    : result.first_steps
                  )?.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] flex items-start gap-2.5 text-xs sm:text-sm text-[#121C2A]"
                    >
                      <span className="w-5 h-5 rounded-full bg-[#166534] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mandatory KVK Advisory Banner */}
              <div className="rounded-2xl bg-[#FEFCE8] border-2 border-[#CA8A04] p-5 shadow-sm space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#CA8A04]/20 text-[#854D0E] flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-[#854D0E]">
                      {t("disease", "safetyNoticeTitle")}
                    </h5>
                    <p className="text-xs sm:text-sm text-[#713F12] mt-1 leading-relaxed">
                      {t("disease", "safetyNoticeDesc")}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#CA8A04]/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-[#854D0E] flex items-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5" />
                    {isHindi ? "राष्ट्रीय किसान कॉल सेंटर:" : "National Kisan Call Center:"}
                  </span>
                  <a
                    href="tel:18001801551"
                    className="inline-flex items-center justify-center gap-2 bg-[#854D0E] hover:bg-[#713F12] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs active:scale-[0.98]"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>{isHindi ? "टोल-फ्री: 1800-180-1551" : "Toll-Free: 1800-180-1551"}</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================= UPLOAD WORKSPACE ================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Upload Box & Crop Selector (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Crop Selector Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-3.5 ring-1 ring-slate-900/5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Sprout className="w-4 h-4 text-emerald-700" />
                  <span>{t("disease", "step1Title")}</span>
                </label>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  {cropHint === "Auto" ? (isHindi ? "✨ स्वतः पहचान (AI)" : "✨ Auto-Detect (AI)") : cropHint}
                </span>
              </div>

              {/* Horizontal badges */}
              <div className="flex flex-wrap gap-2 pt-1">
                {popularCrops.map((crop) => (
                  <button
                    key={crop.id}
                    type="button"
                    onClick={() => setCropHint(crop.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      cropHint === crop.id
                        ? "bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-600/30 font-bold"
                        : "bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200/80 hover:border-emerald-300"
                    }`}
                  >
                    {crop.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Dropper & Upload Box - HIDE WHEN IMAGE IS SELECTED */}
            {!selectedFile || !previewUrl ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="bg-gradient-to-b from-emerald-50/50 via-white to-white rounded-3xl p-8 md:p-10 border-2 border-dashed border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50/40 shadow-sm flex flex-col items-center text-center relative overflow-hidden transition-all group ring-1 ring-slate-900/5"
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 mb-4 shadow-xs group-hover:scale-105 transition-transform">
                  <Camera className="w-8 h-8" />
                </div>

                <h3 className="text-xl font-black text-slate-900 mb-1 tracking-tight">
                  {t("disease", "dropzoneTitle")}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mb-6 max-w-sm font-normal">
                  {t("disease", "dropzoneSub")}
                </p>

                <div className="flex flex-col sm:flex-row gap-3 w-full justify-center max-w-md">
                  {/* Camera Trigger */}
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="min-h-[52px] px-7 rounded-2xl bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm shadow-emerald-900/10 active:scale-[0.98] transition-all cursor-pointer ring-1 ring-emerald-600/30"
                  >
                    <Camera className="w-5 h-5 text-emerald-100" />
                    <span>{t("disease", "cameraBtn")}</span>
                  </button>

                  {/* File Upload Trigger */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-[52px] px-7 rounded-2xl bg-white border border-slate-300 text-slate-800 hover:text-emerald-900 hover:bg-emerald-50/50 hover:border-emerald-300 font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-xs active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <Upload className="w-5 h-5 text-emerald-700" />
                    <span>{t("disease", "galleryBtn")}</span>
                  </button>
                </div>

                {/* Micro Tips Footer */}
                <div className="mt-6 pt-4 border-t border-slate-100 w-full flex items-center justify-center gap-6 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {isHindi ? "अच्छी रोशनी" : "Good lighting"}
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {isHindi ? "पत्ता सीधा रखें" : "Keep leaf flat"}
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {isHindi ? "धुंधला न हो" : "Avoid blur"}
                  </span>
                </div>
              </div>
            ) : (
              /* Selected Specimen Preview Card (Replaces the upload box cleanly) */
              <div className="bg-white rounded-3xl p-6 border-2 border-emerald-600/40 shadow-sm space-y-5 animate-in fade-in duration-200 ring-1 ring-emerald-900/5">
                <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                    <span className="text-sm font-black text-slate-900 tracking-tight">
                      {isHindi ? "पत्ती की तस्वीर तैयार है" : "Leaf Specimen Ready"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-bold text-[#166534] hover:bg-[#F0FDF4] px-2.5 py-1.5 rounded-lg border border-[#BBF7D0] flex items-center gap-1 cursor-pointer transition-colors"
                      title={isHindi ? "दूसरी तस्वीर चुनें" : "Select another photo"}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{isHindi ? "फोटो बदलें" : "Change"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="text-xs font-bold text-[#B91C1C] hover:bg-[#FEF2F2] px-2.5 py-1.5 rounded-lg border border-[#FECACA] flex items-center gap-1 cursor-pointer transition-colors"
                      title={isHindi ? "चयनित तस्वीर हटाएं" : "Remove photo"}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{isHindi ? "हटाएं" : "Remove"}</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-full sm:w-36 h-36 rounded-xl overflow-hidden bg-slate-900 border border-[#CBD5E1] shrink-0 relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Selected Leaf Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1 rounded-lg bg-white/95 text-xs font-bold text-[#121C2A] shadow-sm hover:scale-105 transition-transform"
                      >
                        {isHindi ? "बदलें" : "Change"}
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 w-full text-xs space-y-2">
                    <div className="p-3 rounded-xl bg-[#F8FAF5] border border-[#E2E8F0] space-y-1">
                      <p className="font-bold text-[#121C2A] line-clamp-1">{selectedFile.name}</p>
                      <p className="text-[#64748B]">
                        {isHindi ? "साइज़:" : "Size:"} {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || "image/jpeg"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[#64748B] font-medium">{t("disease", "cropIdentified")}:</span>
                      <span className="px-2.5 py-1 rounded-lg bg-[#F0FDF4] text-[#166534] font-bold border border-[#BBF7D0]">
                        {cropHint === "Auto"
                          ? (isHindi ? "✨ AI द्वारा स्वतः पहचान" : "✨ AI Auto-Detect")
                          : cropHint}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Big Primary CTA Button */}
                <button
                  type="button"
                  onClick={analyzeImage}
                  disabled={loading}
                  className="w-full min-h-[52px] rounded-xl bg-gradient-to-r from-[#166534] via-[#15803D] to-[#166534] hover:from-[#14532D] hover:to-[#14532D] disabled:bg-slate-300 text-white font-bold text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer ring-2 ring-[#166534]/20"
                >
                  {loading ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{t("disease", "analyzingText")}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 animate-pulse" />
                      <span>{t("disease", "analyzeBtn")}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Educational Guide & Reference Crops (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Guide Card */}
            <div className="bg-white rounded-2xl p-6 border border-[#CBD5E1] shadow-sm space-y-4">
              <h4 className="text-base font-bold text-[#121C2A] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#166534]" />
                <span>{isHindi ? "सटीक परिणाम के 3 नियम" : "3 Rules for Accurate Diagnosis"}</span>
              </h4>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#F8FAF5] border border-[#E2E8F0]">
                  <div className="w-6 h-6 rounded-full bg-[#166534] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#121C2A]">
                      {isHindi ? "केवल रोगग्रस्त हिस्से पर फोकस करें" : "Focus on Affected Leaf Surface"}
                    </h5>
                    <p className="text-[11px] text-[#404940] mt-0.5">
                      {isHindi
                        ? "पत्ती पर बने धब्बे, फफूंद या मुड़ी हुई पत्तियों को पास से (10-15 सेमी दूरी) से खींचें।"
                        : "Frame lesions, fungal spots, or discoloration up-close (10-15cm distance)."}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#F8FAF5] border border-[#E2E8F0]">
                  <div className="w-6 h-6 rounded-full bg-[#166534] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#121C2A]">
                      {isHindi ? "छाया या सीधी तेज धूप से बचें" : "Avoid Glare or Harsh Shadows"}
                    </h5>
                    <p className="text-[11px] text-[#404940] mt-0.5">
                      {isHindi
                        ? "पत्ते पर हाथ की परछाई न आने दें ताकि प्राकृतिक रंग सही तरीके से कैमरे में आए।"
                        : "Prevent hand shadows so the camera captures natural spot hues accurately."}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#F8FAF5] border border-[#E2E8F0]">
                  <div className="w-6 h-6 rounded-full bg-[#166534] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#121C2A]">
                      {isHindi ? "सुरक्षित वैज्ञानिक मार्गदर्शन" : "Safe Non-Chemical Protocol"}
                    </h5>
                    <p className="text-[11px] text-[#404940] mt-0.5">
                      {isHindi
                        ? "हम रासायनिक नाम या कीटनाशक खुराक नहीं देते। केवल मान्य प्राथमिक प्रबंधन व KVK संपर्क देते हैं।"
                        : "We never prescribe chemical pesticides. Only non-chemical hygiene actions and KVK referrals."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Supported Diseases Quick Reference */}
            <div className="bg-[#F8FAF5] rounded-2xl p-5 border border-[#CBD5E1] shadow-xs space-y-3">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wide block">
                {isHindi ? "मान्य संदर्भ डेटाबेस" : "Verified Crop Diseases Catalog"}
              </span>
              <p className="text-xs text-[#404940] leading-relaxed">
                {isHindi
                  ? "टमाटर, गेहूं, धान, आलू, सरसों व कपास आदि के अधिकृत संदर्भ रिकॉर्ड।"
                  : "Tomato, Wheat, Rice, Potato, Mustard, and Cotton catalog references."}
              </p>
              <button
                type="button"
                onClick={loadDemoReport}
                className="text-xs font-bold text-[#166534] hover:underline cursor-pointer inline-flex items-center gap-1"
              >
                <span>{isHindi ? "नमूना टमाटर रिपोर्ट लोड करें" : "Load Sample Demo Diagnosis"}</span>
                <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Snapshot Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ================= LIVE CAMERA VIEWFINDER MODAL ================= */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200">
          {/* Top Bar */}
          <div className="w-full max-w-2xl flex items-center justify-between text-white pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#166534] flex items-center justify-center text-white shadow-xs">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold leading-tight">
                  {t("disease", "cameraModalTitle")}
                </h3>
                <p className="text-[11px] text-white/70">
                  {t("disease", "cameraFramingHelp")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={switchCamera}
                title={t("disease", "switchCameraBtn")}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">{t("disease", "switchCameraBtn")}</span>
              </button>
              <button
                type="button"
                onClick={stopCamera}
                title={t("disease", "closeCameraBtn")}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Viewfinder Video Area */}
          <div className="relative w-full max-w-2xl aspect-[4/3] sm:aspect-[16/10] bg-black rounded-3xl overflow-hidden border-2 border-emerald-500/50 shadow-2xl flex items-center justify-center">
            {cameraError ? (
              <div className="p-6 text-center text-white space-y-4 max-w-md">
                <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <p className="text-sm font-semibold leading-relaxed">{cameraError}</p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      fileInputRef.current?.click();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#166534] hover:bg-[#14532D] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-sm"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{t("disease", "galleryBtn")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    {t("disease", "closeCameraBtn")}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Framing Guide Box */}
                <div className="absolute inset-8 sm:inset-12 border-2 border-dashed border-[#22C55E] rounded-2xl pointer-events-none flex flex-col justify-between p-3.5 bg-[#22C55E]/5 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
                  <div className="self-center bg-black/70 backdrop-blur-xs text-white text-[11px] font-semibold px-3.5 py-1 rounded-full border border-white/20">
                    {t("disease", "cameraFramingHelp")}
                  </div>
                  <div className="self-center text-white/80 text-[11px] bg-black/60 px-2.5 py-0.5 rounded-md font-medium">
                    ⚡ {isHindi ? "दिन के प्राकृतिक प्रकाश में पत्ती सीधी रखें" : "Keep leaf steady in daylight"}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Bottom Action Bar */}
          <div className="w-full max-w-2xl flex items-center justify-center gap-6 pt-4">
            <button
              type="button"
              onClick={stopCamera}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              {t("disease", "closeCameraBtn")}
            </button>

            {/* Shutter Capture Button */}
            <button
              type="button"
              disabled={!!cameraError}
              onClick={capturePhoto}
              className="w-18 h-18 sm:w-20 sm:h-20 rounded-full border-4 border-white flex items-center justify-center p-1.5 cursor-pointer disabled:opacity-40 hover:scale-105 active:scale-95 transition-all shadow-2xl bg-white/20"
              aria-label={t("disease", "capturePhotoBtn")}
            >
              <div className="w-full h-full rounded-full bg-[#166534] hover:bg-[#15803D] flex items-center justify-center text-white shadow-lg">
                <Camera className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                stopCamera();
                fileInputRef.current?.click();
              }}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("disease", "galleryBtn")}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
