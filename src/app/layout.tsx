import type { Metadata } from "next";
import { Instrument_Serif, Inter, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { Sidebar } from "@/components/Sidebar";
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
      <body className="h-full">
        <AppSettingsProvider>
          <div className="flex h-full">
            <Suspense fallback={<div className="w-60 shrink-0 border-r border-border bg-surface" />}>
              <Sidebar />
            </Suspense>
            <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
          </div>
          <ApiKeyModal />
        </AppSettingsProvider>
      </body>
    </html>
  );
}
