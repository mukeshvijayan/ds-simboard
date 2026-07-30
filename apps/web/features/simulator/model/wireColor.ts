import type { ConnectionPointRef } from "./connectionPoint";

type WireRole = "gnd" | "power" | "signal";

/** What a connection point's own electrical role implies about a wire
 * touching it — ground, supply power, or (everything else) signal.
 * `componentLead` never implies a role by itself: a component's own
 * lead could be wired to anything, so its role is decided at the wire's
 * *other* end, same as a plain breadboard strip hole. */
function pointRole(point: ConnectionPointRef): WireRole {
  if (point.kind === "boardPin") {
    if (point.pinName === "GND") return "gnd";
    if (point.pinName === "5V" || point.pinName === "3V3") return "power";
    return "signal";
  }
  if (point.kind === "breadboardHole" && point.hole.kind === "rail") {
    return point.hole.rail === "top-negative" ? "gnd" : "power";
  }
  return "signal";
}

/** A wire's color, auto-derived from what it actually connects (Part 2)
 * — black for ground, red for a supply rail (5V/3V3), amber for
 * everything else (a plain signal/data connection). Matches real
 * breadboard-kit wire-color convention, so a student's own wiring
 * choices read the same way a real kit's colored jumper wires would. */
export function wireColor(from: ConnectionPointRef, to: ConnectionPointRef): string {
  const roles: WireRole[] = [pointRole(from), pointRole(to)];
  if (roles.includes("gnd")) return "#1C1B18";
  if (roles.includes("power")) return "#B23B3B";
  return "#D9822B";
}
