import { NOMINAL_HEALTH } from "../../contract/types";
import { evaluateIdealConnector, idealConnectorSeriesElement } from "./idealConnector";

describe("evaluateIdealConnector", () => {
  it("always reports nominal health", () => {
    const result = evaluateIdealConnector(
      { kind: "headerPins" },
      {},
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("nominal");
  });
});

describe("idealConnectorSeriesElement", () => {
  it("is an ideal 0Ω pass-through", () => {
    expect(idealConnectorSeriesElement()).toEqual({
      kind: "resistive",
      resistanceOhms: 0,
    });
  });
});
