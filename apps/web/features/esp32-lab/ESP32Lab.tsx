"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { SerialMonitor } from "@/components/simulator/SerialMonitor";
import { ESP32 } from "@/components/simulator/boards/ESP32";
import { LED } from "@/components/simulator/boards/LED";
import { DesktopOnlyNotice } from "@/components/shared/DesktopOnlyNotice";
import { SketchEngine } from "@/lib/simulation/engine";
import { BOARDS } from "@/lib/simulation/boards";
import {
  EngineStatus,
  PinStateMap,
  SerialLine,
  WifiStatus,
} from "@/lib/simulation/types";

// CodeMirror (@uiw/react-codemirror + @codemirror/*) is a sizeable,
// client-only editor — code-split it into its own chunk rather than
// bundling it into this route's initial JS.
const CodeEditor = dynamic(
  () => import("@/components/simulator/CodeEditor").then((mod) => mod.CodeEditor),
  { ssr: false }
);

let nextSerialId = 1;

export function ESP32Lab() {
  const [code, setCode] = useState(BOARDS.esp32.defaultSketch);
  const [pinStates, setPinStates] = useState<PinStateMap>({});
  const [serialLines, setSerialLines] = useState<SerialLine[]>([]);
  const [status, setStatus] = useState<EngineStatus>("idle");
  const [wifiStatus, setWifiStatus] = useState<WifiStatus>("disconnected");
  const [wifiSsid, setWifiSsid] = useState<string | null>(null);
  const engineRef = useRef<SketchEngine | null>(null);

  const handleRun = useCallback(() => {
    // Stop any already-running engine first — otherwise a fast double-click
    // (the Run/Stop button swap happens on React's next render, not
    // synchronously) can start two engines racing each other, a bug this
    // project has hit before (see the Phase 1 and Arduino Lab reports).
    engineRef.current?.stop();
    setSerialLines([]);
    setWifiStatus("disconnected");
    setWifiSsid(null);

    const engine = new SketchEngine(code, (event) => {
      if (event.type === "pin-change" && event.pin) {
        setPinStates((prev) => ({ ...prev, [event.pin as string]: event.value ?? 0 }));
      }
      if (event.type === "serial" && event.text !== undefined) {
        setSerialLines((prev) => [
          ...prev,
          { id: nextSerialId++, text: event.text as string, timestamp: Date.now() },
        ]);
      }
      if (event.type === "status" && event.status) {
        setStatus(event.status);
      }
      if (event.type === "wifi" && event.wifiStatus) {
        setWifiStatus(event.wifiStatus);
        setWifiSsid(event.ssid ?? null);
      }
      if (event.type === "error" && event.message) {
        setSerialLines((prev) => [
          ...prev,
          { id: nextSerialId++, text: `⚠ ${event.message}`, timestamp: Date.now() },
        ]);
      }
    });
    engineRef.current = engine;
    engine.start();
  }, [code]);

  const handleStop = useCallback(() => {
    engineRef.current?.stop();
  }, []);

  const isRunning = status === "running";
  const onboardLedOn = (pinStates["2"] ?? 0) > 0;

  return (
    <>
      <DesktopOnlyNotice labName="ESP32 Lab" />
      <div className="hidden h-screen flex-col lg:flex">
        <div className="flex items-center justify-between border-b border-hairline bg-ivory px-4 py-3">
          <div>
            <h1 className="font-serif text-[16px] text-charcoal">ESP32 Lab</h1>
            <p className="text-[12px] text-charcoal-muted">
              ESP32 Dev Board — 19 GPIO pins, the same line-stepping interpreter as the
              simulator (no Xtensa CPU emulator exists yet — see
              docs/architecture/0008-*.md).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[12px] capitalize text-charcoal-muted" role="status">
              {status}
            </span>
            {isRunning ? (
              <button
                type="button"
                onClick={handleStop}
                className="rounded-sm bg-charcoal px-4 py-2 text-[13.5px] font-medium text-ivory"
              >
                Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRun}
                className="rounded-sm bg-navy px-4 py-2 text-[13.5px] font-medium text-ivory hover:bg-navy-dark"
              >
                Run
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-1 flex-col items-center justify-center gap-6 border-r border-hairline p-8">
            <div className="h-full max-h-[420px] w-full max-w-[300px]">
              <ESP32 />
            </div>
            <div className="flex items-center gap-3">
              <LED on={onboardLedOn} />
              <span className="text-[13px] text-charcoal-muted">Pin 2 (onboard LED)</span>
            </div>
            <div
              className={`flex items-center gap-2 rounded-sm border px-3 py-1.5 text-[12px] ${
                wifiStatus === "connected"
                  ? "border-navy/30 bg-navy/10 text-navy"
                  : "border-hairline bg-white text-charcoal-muted"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${wifiStatus === "connected" ? "bg-navy" : "bg-charcoal-faint"}`}
              />
              Wi-Fi:{" "}
              {wifiStatus === "connected" ? `Connected to ${wifiSsid}` : "Disconnected"}
              <span className="text-charcoal-muted">(stub — no real network stack)</span>
            </div>
          </div>

          <div className="flex flex-1 flex-col">
            <div className="flex-1">
              <CodeEditor value={code} onChange={setCode} readOnly={isRunning} />
            </div>
            <div className="h-[180px] shrink-0">
              <SerialMonitor lines={serialLines} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
