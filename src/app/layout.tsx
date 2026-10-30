import type { Metadata } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import { ApiKeyModal } from "@/components/ApiKeyModal";
import { AppSettingsProvider } from "@/lib/client/appSettings";
import "./globals.css";

// Poppins for both headings and body; globals.css points --font-heading here too.
const poppins = Poppins({
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Bohumot AI",
    template: "%s | Bohumot AI",
  },
  description: "One prompt for chat, comparison, auto-picked models, and judged AI council verdicts with Bohumot AI.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        <AppSettingsProvider>
          {children}
          <ApiKeyModal />
        </AppSettingsProvider>
      </body>
    </html>
  );
}
