"use client";

import { useEffect, useRef, useState } from "react";
import { AtmegaRuntime, BLINK_PROGRAM } from "@ds-simboard/chip-emulation";
import type { ChipEvent } from "@ds-simboard/chip-emulation";
import { ArduinoUno } from "@/components/simulator/boards/ArduinoUno";
import { LED } from "@/components/simulator/boards/LED";
import { BLINK_SOURCE, INSTRUCTIONS_PER_FRAME } from "./constants";

export function ArduinoLab() {
  const [pin13On, setPin13On] = useState(false);
  const [status, setStatus] = useState<"idle" | "running" | "stopped">("idle");
  const runtimeRef = useRef<AtmegaRuntime | null>(null);
  const frameRef = useRef<number | null>(null);

  function stopCurrentRun() {
    runtimeRef.current?.stop();
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }

  // Unmount safety net — stop the rAF loop if the user navigates away mid-run.
  useEffect(() => () => stopCurrentRun(), []);

  function tick(runtime: AtmegaRuntime) {
    if (!runtime.isRunning) return;
    runtime.runInstructions(INSTRUCTIONS_PER_FRAME);
    frameRef.current = requestAnimationFrame(() => tick(runtime));
  }

  function handleRun() {
    // Guard against a double-click racing two concurrent runtimes — the
    // Run/Stop button swap happens on React's next render, not
    // synchronously, so a fast double-click can otherwise fire this twice.
    stopCurrentRun();

    const runtime = new AtmegaRuntime(BLINK_PROGRAM, (event: ChipEvent) => {
      if (event.type === "pin-change" && event.pin === "13") {
        setPin13On(event.value === 1);
      }
      if (event.type === "status") {
        setStatus(event.status);
      }
    });
    runtimeRef.current = runtime;
    runtime.start();
    frameRef.current = requestAnimationFrame(() => tick(runtime));
  }

  function handleStop() {
    stopCurrentRun();
  }

  const isRunning = status === "running";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-hairline bg-ivory px-4 py-3">
        <div>
          <p className="font-serif text-[16px] text-charcoal">Arduino Lab</p>
          <p className="text-[12px] text-charcoal-faint">
            Running a precompiled demo on a real, instruction-accurate AVR CPU emulator.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] capitalize text-charcoal-muted">{status}</span>
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
              Run Blink demo
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col items-center justify-center gap-6 border-r border-hairline p-8">
          <div className="w-full max-w-[420px]">
            <ArduinoUno />
          </div>
          <div className="flex items-center gap-3">
            <LED on={pin13On} />
            <span className="text-[13px] text-charcoal-muted">Pin 13 (onboard LED)</span>
          </div>
        </div>

        <div className="flex w-[420px] shrink-0 flex-col">
          <div className="border-b border-hairline bg-[#1C1B18] px-4 py-2">
            <p className="text-[12px] uppercase tracking-[0.1em] text-ivory/60">
              Running on the emulated CPU
            </p>
          </div>
          <pre className="flex-1 overflow-auto bg-[#1C1B18] p-4 font-mono text-[12px] leading-relaxed text-ivory/80">
            {BLINK_SOURCE}
          </pre>
          <div className="border-t border-hairline bg-white px-4 py-3 text-[12px] leading-relaxed text-charcoal-faint">
            No live code editing yet — this demo runs fixed, precompiled AVR machine code,
            not sketch text you type. See docs/architecture/0007-*.md for why.
          </div>
        </div>
      </div>

      <div className="h-[92px] shrink-0 border-t border-hairline bg-white px-4 py-2">
        <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-charcoal-muted">
          Serial monitor
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-charcoal-faint">
          Not wired up yet — the emulated USART peripheral needs a few AVR instructions
          (sts/lds/rcall) the current assembler tool doesn&rsquo;t support. See
          docs/architecture/0007-*.md.
        </p>
      </div>
    </div>
  );
}
