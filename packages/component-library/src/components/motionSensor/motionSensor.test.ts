import { NOMINAL_HEALTH } from "../../contract/types";
import { evaluateMotionSensor, motionSensorSeriesElement } from "./motionSensor";

describe("evaluateMotionSensor", () => {
  it("reports motion detected", () => {
    const result = evaluateMotionSensor(
      {},
      { motionDetected: true },
      { health: NOMINAL_HEALTH }
    );
    expect(result.visual.motionDetected).toBe(true);
    expect(result.health).toBe(NOMINAL_HEALTH);
  });

  it("reports no motion", () => {
    const result = evaluateMotionSensor(
      {},
      { motionDetected: false },
      { health: NOMINAL_HEALTH }
    );
    expect(result.visual.motionDetected).toBe(false);
  });
});

describe("motionSensorSeriesElement", () => {
  it("presents a closed (zero-resistance) contact when motion is detected", () => {
    expect(motionSensorSeriesElement(true)).toEqual({
      kind: "resistive",
      resistanceOhms: 0,
    });
  });

  it("presents an open contact otherwise", () => {
    expect(motionSensorSeriesElement(false)).toEqual({
      kind: "resistive",
      resistanceOhms: Infinity,
    });
  });
});
