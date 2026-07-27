import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Simulator — DS SimBoard",
  description:
    "The original Arduino Uno and ESP32 sketch simulator: write code, wire up components, and watch pins and serial output respond live.",
};

export default function SimulatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
