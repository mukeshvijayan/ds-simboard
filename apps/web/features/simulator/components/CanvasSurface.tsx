"use client";

import { useRef } from "react";
import { pan, zoomAt, type CanvasViewport } from "../model/viewport";

/**
 * The pannable/zoomable open canvas surface (ADR 0024): drag on empty
 * background to pan, mouse wheel to zoom-to-cursor. Controlled — the
 * caller owns `viewport` state, since other interactions (dragging a
 * placed breadboard) also need to read/convert through it.
 */
export function CanvasSurface({
  viewport,
  onViewportChange,
  onBackgroundClick,
  children,
}: {
  viewport: CanvasViewport;
  onViewportChange: (next: CanvasViewport) => void;
  onBackgroundClick?: () => void;
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{
    clientX: number;
    clientY: number;
    viewport: CanvasViewport;
  } | null>(null);

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
        if (event.target === event.currentTarget) onBackgroundClick?.();
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
