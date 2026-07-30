import { useRef } from "react";

/**
 * Drag-to-reposition for a canvas item (Part 2, docs/architecture/
 * 0036-*.md) — attaches its `mousemove`/`mouseup` listeners to
 * `window` once a drag starts, not just the dragged element itself.
 *
 * The original `Board`/`BreadboardGlyph` drag handlers (P2-3/ADR 0024)
 * attached `onMouseMove`/`onMouseUp` directly on the dragged div, which
 * works *only as long as the cursor stays over that div* — fine for a
 * board or breadboard, large enough that a normal drag distance rarely
 * exits its own bounds. `ComponentGlyph`'s free-floating components
 * (Part 2) are much smaller (a resistor's whole box is ~80×30px), so a
 * completely ordinary drag distance moves the cursor outside the box
 * within the first few pixels — after that, the box's own `onMouseMove`
 * simply stops firing (no browser event delivers a "mousemove" to an
 * element the cursor isn't over), and the drag silently stalls
 * partway, confirmed by an e2e test moving a resistor 100px and only
 * ~20% of that distance actually landing. Listening on `window`
 * instead — the standard fix for this exact class of bug — tracks the
 * cursor regardless of which element is currently under it, only
 * stopping on the matching `mouseup`.
 */
export function useCanvasDrag(
  position: { x: number; y: number },
  viewportScale: number,
  onPositionChange: (position: { x: number; y: number }) => void
) {
  const drag = useRef<{
    clientX: number;
    clientY: number;
    position: { x: number; y: number };
    onMove: (event: MouseEvent) => void;
    onUp: () => void;
  } | null>(null);

  function handleMouseDown(event: React.MouseEvent) {
    if (event.target !== event.currentTarget) return; // a child handles its own click
    event.stopPropagation();
    const start = { clientX: event.clientX, clientY: event.clientY, position };

    function onMove(moveEvent: MouseEvent) {
      const dx = (moveEvent.clientX - start.clientX) / viewportScale;
      const dy = (moveEvent.clientY - start.clientY) / viewportScale;
      onPositionChange({ x: start.position.x + dx, y: start.position.y + dy });
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      drag.current = null;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    drag.current = { ...start, onMove, onUp };
  }

  return { onMouseDown: handleMouseDown };
}
