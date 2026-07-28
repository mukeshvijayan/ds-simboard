/**
 * The unified canvas's pan/zoom state — a plain translate+scale applied
 * to the canvas content (`transform: translate(translateX, translateY)
 * scale(scale)`, transform-origin at the container's top-left). Screen
 * coordinates are pixels relative to the canvas *container* (e.g.
 * `clientX - containerRect.left`); canvas coordinates are the fixed,
 * zoom/pan-independent space every `ConnectionPoint`/canvas item lives
 * in. See docs/architecture/0024-*.md.
 */
export interface CanvasViewport {
  translateX: number;
  translateY: number;
  scale: number;
}

export const MIN_SCALE = 0.25;
export const MAX_SCALE = 3;

export const INITIAL_VIEWPORT: CanvasViewport = {
  translateX: 0,
  translateY: 0,
  scale: 1,
};

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Screen (container-relative pixel) → fixed canvas-space coordinates. */
export function screenToCanvas(
  viewport: CanvasViewport,
  screenX: number,
  screenY: number
): { x: number; y: number } {
  return {
    x: (screenX - viewport.translateX) / viewport.scale,
    y: (screenY - viewport.translateY) / viewport.scale,
  };
}

/** Canvas-space coordinates → screen (container-relative pixel). */
export function canvasToScreen(
  viewport: CanvasViewport,
  canvasX: number,
  canvasY: number
): { x: number; y: number } {
  return {
    x: canvasX * viewport.scale + viewport.translateX,
    y: canvasY * viewport.scale + viewport.translateY,
  };
}

/** Pans by a screen-space pixel delta (e.g. a mouse-drag movement) —
 * translate is in screen pixels already, so a drag delta applies
 * directly regardless of the current zoom level. */
export function pan(
  viewport: CanvasViewport,
  deltaScreenX: number,
  deltaScreenY: number
): CanvasViewport {
  return {
    ...viewport,
    translateX: viewport.translateX + deltaScreenX,
    translateY: viewport.translateY + deltaScreenY,
  };
}

/**
 * Zooms by `scaleFactor` (e.g. `1.1` to zoom in, `1/1.1` to zoom out),
 * keeping the canvas point currently under screen point
 * `(screenX, screenY)` visually fixed under the cursor — the standard
 * "zoom to cursor" feel, not a zoom that recenters on the viewport.
 * Clamped to `[MIN_SCALE, MAX_SCALE]`; a no-op (returns the same
 * viewport) if already at a clamped bound in that direction.
 */
export function zoomAt(
  viewport: CanvasViewport,
  screenX: number,
  screenY: number,
  scaleFactor: number
): CanvasViewport {
  const newScale = clampScale(viewport.scale * scaleFactor);
  if (newScale === viewport.scale) {
    return viewport;
  }
  const anchor = screenToCanvas(viewport, screenX, screenY);
  return {
    scale: newScale,
    translateX: screenX - anchor.x * newScale,
    translateY: screenY - anchor.y * newScale,
  };
}
