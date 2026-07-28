import { NOMINAL_HEALTH } from "../../contract/types";
import { evaluateBatteryHolder, batteryHolderSeriesElement } from "./batteryHolder";

describe("evaluateBatteryHolder", () => {
  it("displays the board's actual supply voltage", () => {
    const result = evaluateBatteryHolder(
      {},
      { supplyVoltageVolts: 9 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.visual.suppliedVoltageVolts).toBe(9);
  });

  it("has no failure mode — always nominal", () => {
    const result = evaluateBatteryHolder(
      {},
      { supplyVoltageVolts: 5 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health).toBe(NOMINAL_HEALTH);
  });
});

describe("batteryHolderSeriesElement", () => {
  it("presents a perfect (zero-resistance) connection", () => {
    expect(batteryHolderSeriesElement()).toEqual({
      kind: "resistive",
      resistanceOhms: 0,
    });
  });
});
