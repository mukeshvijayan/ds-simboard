import { NOMINAL_HEALTH } from "../../contract/types";
import { evaluateLiIonCell, liIonCellSeriesElement } from "./liIonCell";

describe("evaluateLiIonCell", () => {
  it("displays the board's real supply voltage, always nominal", () => {
    const result = evaluateLiIonCell(
      {},
      { supplyVoltageVolts: 3.7 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("nominal");
    expect(result.visual.suppliedVoltageVolts).toBe(3.7);
  });
});

describe("liIonCellSeriesElement", () => {
  it("is a transparent 0Ω pass-through", () => {
    expect(liIonCellSeriesElement()).toEqual({ kind: "resistive", resistanceOhms: 0 });
  });
});
