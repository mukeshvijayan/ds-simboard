import type { IdealConnectorParams } from "@ds-simboard/component-library";

/**
 * Hand-authored SVG connector family — original artwork (ADR 0038
 * rollout). All six kinds share one electrical model (an ideal 0Ω
 * pass-through, `idealConnectorModel`) but look nothing like each other
 * physically, so each gets its own real shape here rather than one
 * generic box — the pedagogical value of this whole family is learning
 * to recognize each connector by sight. No per-lead +/- label: unlike a
 * diode or LED, this model doesn't treat either lead as electrically
 * distinct, so labeling one "+" would assert a polarity the part/model
 * doesn't actually have (the same "bands only, no +/- needed" carve-out
 * a plain resistor gets).
 */

export const IDEAL_CONNECTOR_PIN_POSITIONS = {
  lead1: { x: 0, y: 15 },
  lead2: { x: 80, y: 15 },
};

function HeaderPins() {
  return (
    <>
      <rect x="20" y="10" width="40" height="10" fill="#1c1b18" />
      {[26, 34, 42, 50, 58].map((x) => (
        <rect key={x} x={x - 1.5} y="2" width="3" height="10" fill="#c9a339" />
      ))}
    </>
  );
}

function HeaderSockets() {
  return (
    <>
      <rect x="20" y="8" width="40" height="14" rx="2" fill="#1c1b18" />
      {[26, 34, 42, 50, 58].map((x) => (
        <rect key={x} x={x - 1.5} y="11" width="3" height="8" fill="#0a0a09" />
      ))}
    </>
  );
}

function JstConnector() {
  return (
    <>
      <rect x="24" y="7" width="32" height="16" rx="2" fill="#e8e6df" stroke="#8a8a80" />
      <rect x="27" y="10" width="4" height="10" fill="#c9a339" />
      <rect x="49" y="10" width="4" height="10" fill="#c9a339" />
      <path d="M56 12 L62 12" stroke="#8a8a80" strokeWidth="2" />
    </>
  );
}

function DcBarrelJack() {
  return (
    <>
      <rect x="22" y="5" width="36" height="20" rx="3" fill="#3a3a3a" stroke="#1c1b18" />
      <circle cx="40" cy="15" r="7" fill="#0a0a09" />
      <circle cx="40" cy="15" r="2.5" fill="#c9a339" />
    </>
  );
}

function ScrewTerminal() {
  return (
    <>
      <rect
        x="20"
        y="5"
        width="40"
        height="20"
        rx="1.5"
        fill="#2F6E4F"
        stroke="#1c1b18"
      />
      <circle cx="32" cy="15" r="5" fill="#b0b0a8" stroke="#6a6a62" />
      <circle cx="32" cy="15" r="1" fill="#3a3a3a" />
      <circle cx="48" cy="15" r="5" fill="#b0b0a8" stroke="#6a6a62" />
      <circle cx="48" cy="15" r="1" fill="#3a3a3a" />
    </>
  );
}

function AlligatorClips() {
  return (
    <>
      <path
        d="M16 15 L10 9 L22 9 Z M16 15 L10 21 L22 21 Z"
        fill="none"
        stroke="#b8b8b8"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M64 15 L70 9 L58 9 Z M64 15 L70 21 L58 21 Z"
        fill="none"
        stroke="#b8b8b8"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <line x1="22" y1="15" x2="58" y2="15" stroke="#8a3b3b" strokeWidth="2" />
    </>
  );
}

export function IdealConnectorGlyph({
  kind,
  width = 80,
  height = 30,
}: {
  kind: IdealConnectorParams["kind"];
  width?: number;
  height?: number;
}) {
  const labels: Record<IdealConnectorParams["kind"], string> = {
    headerPins: "Header pins",
    headerSockets: "Header sockets",
    jstConnector: "JST connector",
    dcBarrelJack: "DC barrel jack",
    screwTerminal: "Screw terminal",
    alligatorClips: "Alligator clips",
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 80 30"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={labels[kind]}
    >
      {kind !== "alligatorClips" && (
        <>
          <line x1="0" y1="15" x2="24" y2="15" stroke="#b8b8b8" strokeWidth="2" />
          <line x1="56" y1="15" x2="80" y2="15" stroke="#b8b8b8" strokeWidth="2" />
        </>
      )}
      {kind === "headerPins" && <HeaderPins />}
      {kind === "headerSockets" && <HeaderSockets />}
      {kind === "jstConnector" && <JstConnector />}
      {kind === "dcBarrelJack" && <DcBarrelJack />}
      {kind === "screwTerminal" && <ScrewTerminal />}
      {kind === "alligatorClips" && <AlligatorClips />}
    </svg>
  );
}
