import type { Metadata } from "next";
import { BreadboardLab } from "@/features/breadboard-lab/BreadboardLab";

export const metadata: Metadata = {
  title: "Breadboard Lab — DS SimBoard",
  description:
    "Wire resistors, LEDs, diodes, pushbuttons, and potentiometers on a real breadboard model and watch the circuit solve live.",
};

export default function BreadboardLabPage() {
  return (
    <div className="h-screen">
      <BreadboardLab />
    </div>
  );
}
