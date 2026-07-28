import { NOMINAL_HEALTH } from "../../contract/types";
import { evaluateDht11, dht11SeriesElement } from "./dht11";

const params = { operatingCurrentAmps: 0.0025 };

describe("evaluateDht11", () => {
  it("displays the simulated temperature and humidity readings", () => {
    const result = evaluateDht11(
      params,
      { simulatedTemperatureCelsius: 24, simulatedHumidityPercent: 55 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health).toBe(NOMINAL_HEALTH);
    expect(result.visual.temperatureCelsius).toBe(24);
    expect(result.visual.humidityPercent).toBe(55);
  });

  it("throws for a non-positive operating current", () => {
    expect(() =>
      evaluateDht11(
        { operatingCurrentAmps: 0 },
        { simulatedTemperatureCelsius: 20, simulatedHumidityPercent: 50 },
        { health: NOMINAL_HEALTH }
      )
    ).toThrow(RangeError);
  });
});

describe("dht11SeriesElement", () => {
  it("presents a fixed resistance derived from its rated operating current", () => {
    expect(dht11SeriesElement(params)).toEqual({
      kind: "resistive",
      resistanceOhms: 5 / 0.0025,
    });
  });
});
