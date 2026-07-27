import type { Metadata } from "next";
import { ESP32Lab } from "@/features/esp32-lab/ESP32Lab";

export const metadata: Metadata = {
  title: "ESP32 Lab — DS SimBoard",
  description:
    "Write and run ESP32 sketches against a real 19-pin GPIO pinout, serial monitor, and a Wi-Fi connection stub.",
};

export default function ESP32LabPage() {
  return (
    <main>
      <ESP32Lab />
    </main>
  );
}
