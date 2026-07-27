import type { Metadata } from "next";
import { Inter, Source_Serif_4, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://simboard.dsinventek.com"),
  title: "DS SimBoard — Simulate Real Circuits Before You Build Them",
  description:
    "Wire up Arduino Uno and ESP32 circuits in the browser, write real code, and watch it run against a live circuit simulation — then flash the same sketch to real hardware.",
  keywords: [
    "arduino simulator",
    "esp32 simulator online",
    "circuit simulator for kids",
    "electronics simulation platform",
    "STEM circuit simulator",
  ],
  openGraph: {
    title: "DS SimBoard — Simulate Real Circuits Before You Build Them",
    description:
      "Wire up Arduino Uno and ESP32 circuits in the browser, write real code, and watch it run against a live circuit simulation.",
    url: "https://simboard.dsinventek.com",
    siteName: "DS SimBoard",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DS SimBoard — Simulate Real Circuits Before You Build Them",
    description:
      "Wire up Arduino Uno and ESP32 circuits in the browser, write real code, and watch it run against a live circuit simulation.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSerif.variable} ${plexMono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
