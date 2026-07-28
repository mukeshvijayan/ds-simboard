/**
 * How a simple two-terminal component currently presents itself
 * electrically: a fixed resistance, or a fixed voltage drop (a
 * forward-biased diode/LED, modeled by its forward-voltage spec rather
 * than a resistance — see docs/architecture/0005-*.md). Originally
 * defined alongside the series-only solver this package no longer has
 * (see docs/architecture/0021-*.md) — kept under its original name since
 * `component-library`'s component models (`resistorSeriesElement`,
 * `ledSeriesElement`, etc.) all still return it, and renaming a type this
 * widely used, for a label change with no behavior difference, isn't
 * worth the churn.
 */
export type SeriesLoopElementDescriptor =
  | { kind: "resistive"; resistanceOhms: number }
  | { kind: "fixed-drop"; forwardVoltageVolts: number };
