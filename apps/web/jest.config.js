/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  // Scoped to the pure, framework-agnostic logic under features/*/model —
  // React component testing (jsdom/RTL) isn't set up yet; that's separate
  // scope from verifying the circuit-building/solving glue is correct.
  testMatch: ["<rootDir>/features/**/model/**/*.test.ts"],
};
