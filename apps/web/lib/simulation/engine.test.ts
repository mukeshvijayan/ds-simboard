import { SketchEngine } from "./engine";
import type { EngineEvent } from "./types";

function collectEvents(sketch: string, runForMs = 50): Promise<EngineEvent[]> {
  return new Promise((resolve) => {
    const events: EngineEvent[] = [];
    const engine = new SketchEngine(sketch, (event) => events.push(event));
    engine.start();
    setTimeout(() => {
      engine.stop();
      resolve(events);
    }, runForMs);
  });
}

describe("SketchEngine — core recognized statements (regression coverage)", () => {
  it("emits pin-change for digitalWrite", async () => {
    const events = await collectEvents(`
      void setup() { pinMode(13, OUTPUT); }
      void loop() { digitalWrite(13, HIGH); delay(1000); }
    `);
    expect(events).toContainEqual({ type: "pin-change", pin: "13", value: 1 });
  });

  it("emits pin-change for analogWrite", async () => {
    const events = await collectEvents(`
      void setup() {}
      void loop() { analogWrite(9, 128); delay(1000); }
    `);
    expect(events).toContainEqual({ type: "pin-change", pin: "9", value: 128 });
  });

  it("only emits serial output after Serial.begin", async () => {
    const events = await collectEvents(`
      void setup() {}
      void loop() { Serial.println("hello"); delay(1000); }
    `);
    expect(events.filter((e) => e.type === "serial")).toHaveLength(0);
  });

  it("emits serial output once Serial.begin has run", async () => {
    const events = await collectEvents(`
      void setup() { Serial.begin(9600); }
      void loop() { Serial.println("hello"); delay(1000); }
    `);
    expect(events).toContainEqual({ type: "serial", text: "hello" });
  });

  it("errors when setup()/loop() are missing", async () => {
    const events = await collectEvents(`void notSetup() {}`);
    expect(events.some((e) => e.type === "error")).toBe(true);
  });
});

describe("SketchEngine — WiFi stub (spec Part 6 Phase 7, ESP32 Lab)", () => {
  it("reports connected immediately on WiFi.begin — no real handshake", async () => {
    const events = await collectEvents(`
      void setup() { WiFi.begin("MyNetwork", "hunter2"); }
      void loop() { delay(1000); }
    `);
    expect(events).toContainEqual({
      type: "wifi",
      wifiStatus: "connected",
      ssid: "MyNetwork",
    });
  });

  it("supports WiFi.begin with no password", async () => {
    const events = await collectEvents(`
      void setup() { WiFi.begin("OpenNetwork"); }
      void loop() { delay(1000); }
    `);
    expect(events).toContainEqual({
      type: "wifi",
      wifiStatus: "connected",
      ssid: "OpenNetwork",
    });
  });

  it("reports disconnected on WiFi.disconnect", async () => {
    const events = await collectEvents(`
      void setup() { WiFi.begin("MyNetwork", "hunter2"); }
      void loop() { WiFi.disconnect(); delay(1000); }
    `);
    expect(events).toContainEqual({ type: "wifi", wifiStatus: "disconnected" });
  });

  it("ignores a malformed WiFi.begin call rather than crashing", async () => {
    const events = await collectEvents(`
      void setup() { WiFi.begin(); }
      void loop() { delay(1000); }
    `);
    expect(events.some((e) => e.type === "wifi")).toBe(false);
    expect(events.some((e) => e.type === "error")).toBe(false);
  });
});
