import type { ConnectionPointRef } from "./connectionPoint";
import { SEVEN_SEGMENT_NAMES, type PlacedComponent } from "./types";

export interface ComponentGraphElement {
  /** Unique within the whole graph — `component.id` itself for a plain
   * 2-lead component, or `` `${component.id}:${channelName}` `` for one
   * channel/segment of a multi-lead component. */
  elementId: string;
  /** The anode/positive terminal for this branch. */
  nodeA: ConnectionPointRef;
  /** The cathode/negative terminal for this branch. */
  nodeB: ConnectionPointRef;
}

/**
 * Every graph branch one placed component contributes — exactly one for
 * the 14 plain 2-lead types, or several sharing a common leg for the
 * multi-lead types (P2-2, closing ADR 0022): an RGB LED's three color
 * channels, or a 7-segment display's eight segments. Centralized here
 * since both `buildCircuit.ts` (assembling the graph) and
 * `resolveCircuit.ts` (describing/evaluating each branch) need the
 * identical mapping.
 */
export function componentGraphElements(
  component: PlacedComponent
): ComponentGraphElement[] {
  if (component.type === "rgbLed") {
    const commonIsAnode = component.params.commonTerminal === "anode";
    const channel = (name: "red" | "green" | "blue", lead: ConnectionPointRef) => ({
      elementId: `${component.id}:${name}`,
      nodeA: commonIsAnode ? component.commonLead : lead,
      nodeB: commonIsAnode ? lead : component.commonLead,
    });
    return [
      channel("red", component.redLead),
      channel("green", component.greenLead),
      channel("blue", component.blueLead),
    ];
  }

  if (component.type === "sevenSegmentDisplay") {
    const commonIsAnode = component.params.commonTerminal === "anode";
    return SEVEN_SEGMENT_NAMES.map((name) => {
      const lead = component.segmentLeads[name];
      return {
        elementId: `${component.id}:${name}`,
        nodeA: commonIsAnode ? component.commonLead : lead,
        nodeB: commonIsAnode ? lead : component.commonLead,
      };
    });
  }

  if (component.type === "transistor") {
    return [
      {
        elementId: `${component.id}:be`,
        nodeA: component.baseLead,
        nodeB: component.emitterLead,
      },
      {
        elementId: `${component.id}:ce`,
        nodeA: component.collectorLead,
        nodeB: component.emitterLead,
      },
    ];
  }

  if (component.type === "relay") {
    return [
      {
        elementId: `${component.id}:coil`,
        nodeA: component.coilLeadA,
        nodeB: component.coilLeadB,
      },
      {
        elementId: `${component.id}:contact`,
        nodeA: component.contactLeadA,
        nodeB: component.contactLeadB,
      },
    ];
  }

  if (component.type === "servo") {
    // Power/ground is the real current-carrying branch; signal/ground is
    // a fixed high-impedance branch (ADR 0039) — neither depends on the
    // other's solved current, unlike transistor/relay's two-phase shape.
    return [
      {
        elementId: `${component.id}:power`,
        nodeA: component.powerLead,
        nodeB: component.groundLead,
      },
      {
        elementId: `${component.id}:signal`,
        nodeA: component.signalLead,
        nodeB: component.groundLead,
      },
    ];
  }

  if (component.type === "bridgeRectifier") {
    // The classic full-bridge topology: whichever AC lead is momentarily
    // higher forward-biases the diode pair that routes current to
    // dcPositiveLead and back from dcNegativeLead through the other pair
    // — real reverse-polarity-safe rectification, not scripted.
    return [
      {
        elementId: `${component.id}:d1`,
        nodeA: component.acLead1,
        nodeB: component.dcPositiveLead,
      },
      {
        elementId: `${component.id}:d2`,
        nodeA: component.acLead2,
        nodeB: component.dcPositiveLead,
      },
      {
        elementId: `${component.id}:d3`,
        nodeA: component.dcNegativeLead,
        nodeB: component.acLead1,
      },
      {
        elementId: `${component.id}:d4`,
        nodeA: component.dcNegativeLead,
        nodeB: component.acLead2,
      },
    ];
  }

  const swapLeads =
    (component.type === "led" ||
      component.type === "diode" ||
      component.type === "photodiode") &&
    !component.leadZeroIsPositive;
  const [anodeLead, cathodeLead] = swapLeads
    ? [component.leads[1], component.leads[0]]
    : [component.leads[0], component.leads[1]];
  return [{ elementId: component.id, nodeA: anodeLead, nodeB: cathodeLead }];
}

/** Every connection point a placed component occupies — two for the
 * plain 2-lead types, more for a multi-lead part (an RGB LED's common
 * leg plus its three color leads; a 7-segment display's common leg plus
 * its eight segments). Used for glyph positioning and wire-line
 * rendering, which need to reach every physical lead, not just two. */
export function componentLeadPoints(component: PlacedComponent): ConnectionPointRef[] {
  if (component.type === "rgbLed") {
    return [
      component.commonLead,
      component.redLead,
      component.greenLead,
      component.blueLead,
    ];
  }
  if (component.type === "sevenSegmentDisplay") {
    return [
      component.commonLead,
      ...SEVEN_SEGMENT_NAMES.map((name) => component.segmentLeads[name]),
    ];
  }
  if (component.type === "transistor") {
    return [component.baseLead, component.collectorLead, component.emitterLead];
  }
  if (component.type === "relay") {
    return [
      component.coilLeadA,
      component.coilLeadB,
      component.contactLeadA,
      component.contactLeadB,
    ];
  }
  if (component.type === "bridgeRectifier") {
    return [
      component.acLead1,
      component.acLead2,
      component.dcPositiveLead,
      component.dcNegativeLead,
    ];
  }
  if (component.type === "servo") {
    return [component.powerLead, component.groundLead, component.signalLead];
  }
  return [component.leads[0], component.leads[1]];
}
