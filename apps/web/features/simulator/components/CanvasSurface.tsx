"use client";

import { useRef } from "react";
import { pan, screenToCanvas, zoomAt, type CanvasViewport } from "../model/viewport";

/**
 * The pannable/zoomable open canvas surface (ADR 0024): drag on empty
 * background to pan, mouse wheel to zoom-to-cursor. Controlled — the
 * caller owns `viewport` state, since other interactions (dragging a
 * placed breadboard) also need to read/convert through it.
 *
 * Part 2 (docs/architecture/0036-*.md) adds native HTML5 drag-and-drop
 * as the primary way to place a new item from the palette, and passes
 * `onBackgroundClick` real canvas-space coordinates — free-floating
 * components need to know exactly where on the canvas they were
 * dropped, unlike the old hole-sequence placement flow that never
 * needed a raw click position at all.
 */
export function CanvasSurface({
  viewport,
  onViewportChange,
  onBackgroundClick,
  onDropPayload,
  children,
}: {
  viewport: CanvasViewport;
  onViewportChange: (next: CanvasViewport) => void;
  onBackgroundClick?: (canvasPoint: { x: number; y: number }) => void;
  onDropPayload?: (payload: string, canvasPoint: { x: number; y: number }) => void;
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{
    clientX: number;
    clientY: number;
    viewport: CanvasViewport;
  } | null>(null);

  function toCanvasPoint(clientX: number, clientY: number): { x: number; y: number } {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return screenToCanvas(viewport, clientX - rect.left, clientY - rect.top);
  }

  function handleMouseDown(event: React.MouseEvent) {
    if (event.target !== event.currentTarget) return; // clicked a child item, not empty background
    dragStart.current = { clientX: event.clientX, clientY: event.clientY, viewport };
  }

  function handleMouseMove(event: React.MouseEvent) {
    if (!dragStart.current) return;
    const dx = event.clientX - dragStart.current.clientX;
    const dy = event.clientY - dragStart.current.clientY;
    onViewportChange(pan(dragStart.current.viewport, dx, dy));
  }

  function endDrag() {
    dragStart.current = null;
  }

  function handleWheel(event: React.WheelEvent) {
    event.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleFactor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    onViewportChange(
      zoomAt(viewport, event.clientX - rect.left, event.clientY - rect.top, scaleFactor)
    );
  }

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label="Simulator canvas — drag the background to pan, scroll to zoom"
      className="relative h-full w-full cursor-grab overflow-hidden bg-[#EDEAE0] active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onWheel={handleWheel}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onBackgroundClick?.(toCanvasPoint(event.clientX, event.clientY));
        }
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const payload = event.dataTransfer.getData("application/json");
        if (payload)
          onDropPayload?.(payload, toCanvasPoint(event.clientX, event.clientY));
      }}
    >
      <div
        className="absolute left-0 top-0"
        style={{
          transform: `translate(${viewport.translateX}px, ${viewport.translateY}px) scale(${viewport.scale})`,
          transformOrigin: "0 0",
        }}
      >
        {children}
      </div>
    </div>
  );
}
