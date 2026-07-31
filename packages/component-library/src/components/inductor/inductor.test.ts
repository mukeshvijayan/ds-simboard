import { NOMINAL_HEALTH } from "../../contract/types";
import { evaluateInductor, inductorSeriesElement } from "./inductor";

const PARAMS = { dcResistanceOhms: 2, ratedCurrentAmps: 1 };

describe("evaluateInductor", () => {
  it("stays nominal under its rated current", () => {
    const result = evaluateInductor(
      PARAMS,
      { currentAmps: 0.5 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("nominal");
  });

  it("fails once current exceeds its rated current", () => {
    const result = evaluateInductor(
      PARAMS,
      { currentAmps: 1.5 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("failed");
  });

  it("latches failed even if current later drops", () => {
    const failed = evaluateInductor(
      PARAMS,
      { currentAmps: 1.5 },
      { health: NOMINAL_HEALTH }
    );
    const after = evaluateInductor(
      PARAMS,
      { currentAmps: 0.1 },
      { health: failed.health }
    );
    expect(after.health.status).toBe("failed");
  });

  it("rejects a negative DC resistance", () => {
    expect(() =>
      inductorSeriesElement({ dcResistanceOhms: -1, ratedCurrentAmps: 1 })
    ).toThrow(RangeError);
  });

  it("rejects a non-positive rated current", () => {
    expect(() =>
      inductorSeriesElement({ dcResistanceOhms: 1, ratedCurrentAmps: 0 })
    ).toThrow(RangeError);
  });
});

describe("inductorSeriesElement", () => {
  it("presents its fixed DC winding resistance", () => {
    expect(inductorSeriesElement(PARAMS)).toEqual({
      kind: "resistive",
      resistanceOhms: 2,
    });
  });
});
