import type { Metadata } from "next";
import { ArduinoLab } from "@/features/arduino-lab/ArduinoLab";

export const metadata: Metadata = {
  title: "Arduino Lab — DS SimBoard",
  description:
    "Watch a real, instruction-accurate AVR CPU emulator run a precompiled Arduino Uno demo program.",
};

export default function ArduinoLabPage() {
  return (
    <main className="h-screen">
      <ArduinoLab />
    </main>
  );
}
