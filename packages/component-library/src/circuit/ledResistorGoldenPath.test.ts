import { CircuitGraph, solveMnaFromGraphWithDiodes } from "@ds-simboard/circuit-engine";
import { applyShortCircuitHealth } from "../contract/health";
import { NOMINAL_HEALTH } from "../contract/types";
import { evaluateResistor } from "../components/resistor/resistor";
import { evaluateLed } from "../components/led/led";

/**
 * Spec Part 5.4's named golden path, proven through the real
 * `circuit-engine` graph and solver rather than asserted by hand: "place
 * LED + resistor + battery → it lights up; remove resistor → it burns
 * out." Migrated to the general MNA/diode solver per A-Engine M3
 * (docs/architecture/0020-*.md) — unlike the retired
 * `solveSeriesLoopFromGraph` version, this doesn't tell the solver the
 * LED is forward-biased in advance; the iterative companion-model
 * solver determines that itself from topology alone, the same as it
 * would for a real breadboard.
 */
describe("golden path: LED + resistor + battery", () => {
  const resistorParams = { resistanceOhms: 220, ratedPowerWatts: 0.25 };
  const ledParams = {
    forwardVoltageVolts: 2,
    ratedCurrentAmps: 0.02,
    maxCurrentAmps: 0.03,
    color: "red" as const,
  };
  const supplyVoltage = 5;

  it("lights up when wired with a correctly-sized series resistor", () => {
    const graph = new CircuitGraph();
    graph.addElement({ id: "supply", nodeA: "positive", nodeB: "ground" });
    graph.addElement({ id: "r1", nodeA: "positive", nodeB: "mid" });
    graph.addElement({ id: "led1", nodeA: "mid", nodeB: "ground" });

    const outcome = solveMnaFromGraphWithDiodes(graph, "ground", (id) =>
      id === "supply"
        ? { kind: "voltage-source", voltageVolts: supplyVoltage }
        : id === "r1"
          ? { kind: "resistive" as const, resistanceOhms: resistorParams.resistanceOhms }
          : {
              kind: "diode",
              forwardVoltageVolts: ledParams.forwardVoltageVolts,
              reverseResistanceOhms: Infinity,
            }
    );

    expect(outcome.kind).toBe("solved");
    if (outcome.kind !== "solved") return;
    expect(outcome.diodeStates.get("led1")).toBe("conducting");

    const current = outcome.elementCurrentsAmps.get("led1") as number;
    // (5 - 2) / 220 ≈ 13.6mA — safely between 0 and the LED's 20mA rating.
    expect(current).toBeCloseTo((supplyVoltage - ledParams.forwardVoltageVolts) / 220);

    const resistorResult = evaluateResistor(
      resistorParams,
      { currentAmps: current },
      { health: NOMINAL_HEALTH }
    );
    const ledResult = evaluateLed(
      ledParams,
      { biased: "forward", currentAmps: current },
      { health: NOMINAL_HEALTH }
    );

    expect(resistorResult.health.status).toBe("nominal");
    expect(ledResult.health.status).toBe("nominal");
    expect(ledResult.visual.brightness).toBeGreaterThan(0);
  });

  it("burns out when the series resistor is removed entirely", () => {
    const graph = new CircuitGraph();
    graph.addElement({ id: "supply", nodeA: "positive", nodeB: "ground" });
    graph.addElement({ id: "led1", nodeA: "positive", nodeB: "ground" });

    const outcome = solveMnaFromGraphWithDiodes(graph, "ground", (id) =>
      id === "supply"
        ? { kind: "voltage-source", voltageVolts: supplyVoltage }
        : {
            kind: "diode",
            forwardVoltageVolts: ledParams.forwardVoltageVolts,
            reverseResistanceOhms: Infinity,
          }
    );

    // No resistive element anywhere in the loop, and 5V is enough to
    // forward-bias a 2V LED — exactly spec Part 2.3's short-circuit case.
    expect(outcome.kind).toBe("short-circuit");

    const ledHealth = applyShortCircuitHealth(NOMINAL_HEALTH);
    const ledResult = evaluateLed(
      ledParams,
      { biased: "forward", currentAmps: 0 },
      { health: ledHealth }
    );

    expect(ledResult.health.status).toBe("failed");
    expect(ledResult.visual.brightness).toBe(0);

    // And it stays burned out even on a later tick with a safe-looking current.
    const laterTick = evaluateLed(
      ledParams,
      { biased: "forward", currentAmps: 0.001 },
      { health: ledResult.health }
    );
    expect(laterTick.health.status).toBe("failed");
    expect(laterTick.visual.brightness).toBe(0);
  });
});
