import type { Metadata } from "next";
import { Instrument_Serif, Inter, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { TopBar } from "@/components/TopBar";
import { ApiKeyModal } from "@/components/ApiKeyModal";
import { AppSettingsProvider } from "@/lib/client/appSettings";
import "./globals.css";

// Editorial serif — used sparingly, only for large headline moments.
const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Model Council",
  description: "Ask one question. Let the world's strongest AI models debate it.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AppSettingsProvider>
          <Suspense fallback={<div className="h-14 border-b border-border bg-background" />}>
            <TopBar />
          </Suspense>
          <main className="min-w-0">{children}</main>
          <ApiKeyModal />
        </AppSettingsProvider>
      </body>
    </html>
  );
}
