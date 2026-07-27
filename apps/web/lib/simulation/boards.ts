import { BoardDefinition } from "./types";

export const UNO_DEFAULT_SKETCH = `void setup() {
  pinMode(13, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(13, HIGH);
  Serial.println("LED on");
  delay(500);
  digitalWrite(13, LOW);
  Serial.println("LED off");
  delay(500);
}
`;

export const ESP32_DEFAULT_SKETCH = `void setup() {
  pinMode(2, OUTPUT);
  Serial.begin(115200);
}

void loop() {
  digitalWrite(2, HIGH);
  Serial.println("On-board LED on");
  delay(400);
  digitalWrite(2, LOW);
  Serial.println("On-board LED off");
  delay(400);
}
`;

export const BOARDS: Record<string, BoardDefinition> = {
  uno: {
    id: "uno",
    name: "Arduino Uno",
    digitalPins: Array.from({ length: 14 }, (_, i) => i),
    analogPins: ["A0", "A1", "A2", "A3", "A4", "A5"],
    defaultSketch: UNO_DEFAULT_SKETCH,
  },
  esp32: {
    id: "esp32",
    name: "ESP32 Dev Board",
    digitalPins: [
      2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33,
    ],
    analogPins: ["A0", "A3", "A4", "A5", "A6", "A7"],
    defaultSketch: ESP32_DEFAULT_SKETCH,
  },
};
