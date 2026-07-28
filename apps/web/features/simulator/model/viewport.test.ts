import {
  canvasToScreen,
  clampScale,
  INITIAL_VIEWPORT,
  MAX_SCALE,
  MIN_SCALE,
  pan,
  screenToCanvas,
  zoomAt,
} from "./viewport";

describe("screenToCanvas / canvasToScreen", () => {
  it("round-trips through both directions at the identity viewport", () => {
    const canvas = screenToCanvas(INITIAL_VIEWPORT, 150, 80);
    expect(canvas).toEqual({ x: 150, y: 80 });
    const screen = canvasToScreen(INITIAL_VIEWPORT, canvas.x, canvas.y);
    expect(screen).toEqual({ x: 150, y: 80 });
  });

  it("round-trips through both directions at an arbitrary pan+zoom", () => {
    const viewport = { translateX: 40, translateY: -20, scale: 1.5 };
    const canvas = screenToCanvas(viewport, 300, 150);
    const screen = canvasToScreen(viewport, canvas.x, canvas.y);
    expect(screen.x).toBeCloseTo(300);
    expect(screen.y).toBeCloseTo(150);
  });

  it("accounts for translate before scale is applied", () => {
    const viewport = { translateX: 100, translateY: 0, scale: 2 };
    // A screen point at the translate origin maps to canvas (0, 0)...
    expect(screenToCanvas(viewport, 100, 0)).toEqual({ x: 0, y: 0 });
    // ...and one scale-unit further right on screen is half a canvas unit
    // further right in canvas space, since scale is 2x.
    expect(screenToCanvas(viewport, 102, 0)).toEqual({ x: 1, y: 0 });
  });
});

describe("pan", () => {
  it("shifts translate by the screen-space delta, leaving scale untouched", () => {
    const viewport = { translateX: 10, translateY: 20, scale: 1.5 };
    const panned = pan(viewport, 5, -3);
    expect(panned).toEqual({ translateX: 15, translateY: 17, scale: 1.5 });
  });
});

describe("clampScale", () => {
  it("passes through values already in range", () => {
    expect(clampScale(1)).toBe(1);
  });

  it("clamps below MIN_SCALE up to MIN_SCALE", () => {
    expect(clampScale(0.01)).toBe(MIN_SCALE);
  });

  it("clamps above MAX_SCALE down to MAX_SCALE", () => {
    expect(clampScale(100)).toBe(MAX_SCALE);
  });
});

describe("zoomAt", () => {
  it("keeps the canvas point under the cursor fixed on screen after zooming in", () => {
    const viewport = { translateX: 0, translateY: 0, scale: 1 };
    const cursorScreen = { x: 200, y: 150 };
    const canvasUnderCursorBefore = screenToCanvas(
      viewport,
      cursorScreen.x,
      cursorScreen.y
    );

    const zoomed = zoomAt(viewport, cursorScreen.x, cursorScreen.y, 1.5);
    const canvasUnderCursorAfter = screenToCanvas(zoomed, cursorScreen.x, cursorScreen.y);

    expect(canvasUnderCursorAfter.x).toBeCloseTo(canvasUnderCursorBefore.x);
    expect(canvasUnderCursorAfter.y).toBeCloseTo(canvasUnderCursorBefore.y);
    expect(zoomed.scale).toBeCloseTo(1.5);
  });

  it("keeps the canvas point under the cursor fixed on screen after zooming out, from a panned+zoomed start", () => {
    const viewport = { translateX: 40, translateY: -30, scale: 1.8 };
    const cursorScreen = { x: 120, y: 260 };
    const canvasUnderCursorBefore = screenToCanvas(
      viewport,
      cursorScreen.x,
      cursorScreen.y
    );

    const zoomed = zoomAt(viewport, cursorScreen.x, cursorScreen.y, 1 / 1.2);
    const canvasUnderCursorAfter = screenToCanvas(zoomed, cursorScreen.x, cursorScreen.y);

    expect(canvasUnderCursorAfter.x).toBeCloseTo(canvasUnderCursorBefore.x);
    expect(canvasUnderCursorAfter.y).toBeCloseTo(canvasUnderCursorBefore.y);
  });

  it("clamps scale at MAX_SCALE and returns the same viewport once already there", () => {
    const atMax = { translateX: 5, translateY: 5, scale: MAX_SCALE };
    const zoomed = zoomAt(atMax, 100, 100, 1.5);
    expect(zoomed).toBe(atMax); // no-op — same reference, not just equal value
  });

  it("clamps scale at MIN_SCALE and returns the same viewport once already there", () => {
    const atMin = { translateX: 5, translateY: 5, scale: MIN_SCALE };
    const zoomed = zoomAt(atMin, 100, 100, 1 / 1.5);
    expect(zoomed).toBe(atMin);
  });

  it("stops exactly at MAX_SCALE rather than overshooting", () => {
    const viewport = { translateX: 0, translateY: 0, scale: MAX_SCALE / 1.1 };
    const zoomed = zoomAt(viewport, 0, 0, 2); // would overshoot without clamping
    expect(zoomed.scale).toBe(MAX_SCALE);
  });
});
