import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "अन्नदाता AI (Annadata AI) · भारतीय किसान सलाहकार",
  description: "Hindi-first agricultural assistant for Indian farmers: Crop Disease Detection, Mandi Prices, Weather Advisory",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hi">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
