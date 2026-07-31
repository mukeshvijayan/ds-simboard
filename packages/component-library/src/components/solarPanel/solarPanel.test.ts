import { NOMINAL_HEALTH } from "../../contract/types";
import {
  evaluateSolarPanel,
  effectiveSolarPanelResistance,
  solarPanelSeriesElement,
} from "./solarPanel";

const PARAMS = { minResistanceOhms: 20, maxResistanceOhms: 1_000_000 };

describe("effectiveSolarPanelResistance", () => {
  it("is near its floor in full sun", () => {
    expect(effectiveSolarPanelResistance(PARAMS, 1)).toBe(20);
  });

  it("is at its ceiling in darkness", () => {
    expect(effectiveSolarPanelResistance(PARAMS, 0)).toBe(1_000_000);
  });

  it("rejects a negative minResistanceOhms", () => {
    expect(() =>
      effectiveSolarPanelResistance(
        { minResistanceOhms: -1, maxResistanceOhms: 100 },
        0.5
      )
    ).toThrow(RangeError);
  });

  it("rejects maxResistanceOhms not greater than minResistanceOhms", () => {
    expect(() =>
      effectiveSolarPanelResistance(
        { minResistanceOhms: 100, maxResistanceOhms: 50 },
        0.5
      )
    ).toThrow(RangeError);
  });

  it("rejects a sunlightLevel outside 0-1", () => {
    expect(() => effectiveSolarPanelResistance(PARAMS, -0.1)).toThrow(RangeError);
    expect(() => effectiveSolarPanelResistance(PARAMS, 1.1)).toThrow(RangeError);
  });
});

describe("solarPanelSeriesElement", () => {
  it("presents the light-dependent resistance", () => {
    expect(solarPanelSeriesElement(PARAMS, 1)).toEqual({
      kind: "resistive",
      resistanceOhms: 20,
    });
  });
});

describe("evaluateSolarPanel", () => {
  it("always reports nominal health", () => {
    const result = evaluateSolarPanel(
      PARAMS,
      { sunlightLevel: 0.5 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("nominal");
  });
});
