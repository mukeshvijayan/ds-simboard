import { NOMINAL_HEALTH } from "../../contract/types";
import { evaluateFerriteBead, ferriteBeadSeriesElement } from "./ferriteBead";

const PARAMS = { dcResistanceOhms: 0.3, ratedCurrentAmps: 2 };

describe("evaluateFerriteBead", () => {
  it("stays nominal under its rated current", () => {
    const result = evaluateFerriteBead(
      PARAMS,
      { currentAmps: 1 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("nominal");
  });

  it("fails once current exceeds its rated current", () => {
    const result = evaluateFerriteBead(
      PARAMS,
      { currentAmps: 3 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("failed");
  });
});

describe("ferriteBeadSeriesElement", () => {
  it("presents its fixed DC resistance", () => {
    expect(ferriteBeadSeriesElement(PARAMS)).toEqual({
      kind: "resistive",
      resistanceOhms: 0.3,
    });
  });

  it("rejects a negative DC resistance", () => {
    expect(() =>
      ferriteBeadSeriesElement({ dcResistanceOhms: -1, ratedCurrentAmps: 1 })
    ).toThrow(RangeError);
  });

  it("rejects a non-positive rated current", () => {
    expect(() =>
      ferriteBeadSeriesElement({ dcResistanceOhms: 0.1, ratedCurrentAmps: 0 })
    ).toThrow(RangeError);
  });
});
