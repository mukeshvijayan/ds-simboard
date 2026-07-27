import { NOMINAL_HEALTH } from "../../contract/types";
import { evaluatePushbutton, pushbuttonSeriesElement } from "./pushbutton";

describe("evaluatePushbutton", () => {
  it("reports closed when pressed", () => {
    const result = evaluatePushbutton(
      { isMomentary: true },
      { pressed: true },
      { health: NOMINAL_HEALTH }
    );
    expect(result.visual.isClosed).toBe(true);
    expect(result.health.status).toBe("nominal");
  });

  it("reports open when released", () => {
    const result = evaluatePushbutton(
      { isMomentary: true },
      { pressed: false },
      { health: NOMINAL_HEALTH }
    );
    expect(result.visual.isClosed).toBe(false);
  });
});

describe("pushbuttonSeriesElement", () => {
  it("presents 0Ω when pressed (an ideal closed switch)", () => {
    expect(pushbuttonSeriesElement(true)).toEqual({
      kind: "resistive",
      resistanceOhms: 0,
    });
  });

  it("presents infinite resistance when released (an ideal open switch)", () => {
    expect(pushbuttonSeriesElement(false)).toEqual({
      kind: "resistive",
      resistanceOhms: Infinity,
    });
  });
});
