import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Simulator — DS SimBoard",
  description:
    "One unified circuit simulator: drag a breadboard onto an open canvas, wire up real components, and watch the circuit solve live.",
};

export default function SimulatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
