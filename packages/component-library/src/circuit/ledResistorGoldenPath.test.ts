import { CircuitGraph, solveSeriesLoopFromGraph } from "@ds-simboard/circuit-engine";
import { applyShortCircuitHealth } from "../contract/health";
import { NOMINAL_HEALTH } from "../contract/types";
import { evaluateResistor, resistorSeriesElement } from "../components/resistor/resistor";
import { evaluateLed, ledSeriesElement } from "../components/led/led";

/**
 * Spec Part 5.4's named golden path, proven through the real
 * `circuit-engine` graph and solver rather than asserted by hand: "place
 * LED + resistor + battery → it lights up; remove resistor → it burns
 * out."
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
    graph.addElement({ id: "supply", nodeA: "n0", nodeB: "n1" });
    graph.addElement({ id: "r1", nodeA: "n1", nodeB: "n2" });
    graph.addElement({ id: "led1", nodeA: "n2", nodeB: "n0" });

    const outcome = solveSeriesLoopFromGraph(graph, "supply", supplyVoltage, (id) =>
      id === "r1"
        ? resistorSeriesElement(resistorParams)
        : ledSeriesElement(ledParams, "forward", NOMINAL_HEALTH)
    );

    expect(outcome.kind).toBe("conducting");
    if (outcome.kind !== "conducting") return;

    // (5 - 2) / 220 ≈ 13.6mA — safely between 0 and the LED's 20mA rating.
    expect(outcome.currentAmps).toBeCloseTo(
      (supplyVoltage - ledParams.forwardVoltageVolts) / 220
    );

    const resistorResult = evaluateResistor(
      resistorParams,
      { currentAmps: outcome.currentAmps },
      { health: NOMINAL_HEALTH }
    );
    const ledResult = evaluateLed(
      ledParams,
      { biased: "forward", currentAmps: outcome.currentAmps },
      { health: NOMINAL_HEALTH }
    );

    expect(resistorResult.health.status).toBe("nominal");
    expect(ledResult.health.status).toBe("nominal");
    expect(ledResult.visual.brightness).toBeGreaterThan(0);
  });

  it("burns out when the series resistor is removed entirely", () => {
    const graph = new CircuitGraph();
    graph.addElement({ id: "supply", nodeA: "n0", nodeB: "n1" });
    graph.addElement({ id: "led1", nodeA: "n1", nodeB: "n0" });

    const outcome = solveSeriesLoopFromGraph(graph, "supply", supplyVoltage, () =>
      ledSeriesElement(ledParams, "forward", NOMINAL_HEALTH)
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
