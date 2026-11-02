import Link from "next/link";
import { Sprout } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#F8FAF5] text-[#121C2A] text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#166534] text-white flex items-center justify-center mb-4 shadow-md">
        <Sprout className="w-9 h-9" />
      </div>
      <h1 className="text-3xl font-black text-[#166534] mb-2">404 - पृष्ठ नहीं मिला</h1>
      <p className="text-sm text-[#404940] max-w-md mb-6">
        यह पेज उपलब्ध नहीं है। कृपया मुख्य पृष्ठ पर लौटें।
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-xl bg-[#166534] hover:bg-[#14532D] text-white text-sm font-bold shadow-md transition-colors"
      >
        मुख्य पृष्ठ पर जाएं (Go Home)
      </Link>
    </div>
  );
}

