import type { Metadata } from "next";
import { Inter, Noto_Sans_Khmer } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansKhmer = Noto_Sans_Khmer({
  subsets: ["khmer"],
  variable: "--font-khmer",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AttendPro - ប្រព័ន្ធគ្រប់គ្រងវត្តមានបុគ្គលិក (TheDemo Coffee)",
  description:
    "ប្រព័ន្ធគ្រប់គ្រងវត្តមានបុគ្គលិកតាមអនឡាញ ជាមួយ GPS Check-in, Selfie Verification និង Live Dashboard",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="km" className={`${inter.variable} ${notoSansKhmer.variable}`}>
      <body className="font-sans antialiased bg-slate-900 text-slate-100 min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
