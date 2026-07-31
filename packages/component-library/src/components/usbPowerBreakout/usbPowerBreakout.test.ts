import { NOMINAL_HEALTH } from "../../contract/types";
import {
  evaluateUsbPowerBreakout,
  usbPowerBreakoutSeriesElement,
} from "./usbPowerBreakout";

describe("evaluateUsbPowerBreakout", () => {
  it("displays the board's real supply voltage, always nominal", () => {
    const result = evaluateUsbPowerBreakout(
      {},
      { supplyVoltageVolts: 5 },
      { health: NOMINAL_HEALTH }
    );
    expect(result.health.status).toBe("nominal");
    expect(result.visual.suppliedVoltageVolts).toBe(5);
  });
});

describe("usbPowerBreakoutSeriesElement", () => {
  it("is a transparent 0Ω pass-through", () => {
    expect(usbPowerBreakoutSeriesElement()).toEqual({
      kind: "resistive",
      resistanceOhms: 0,
    });
  });
});
