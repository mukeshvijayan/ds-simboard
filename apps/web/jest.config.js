/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  // Scoped to the pure, framework-agnostic logic under features/*/model and
  // lib/simulation — React component testing (jsdom/RTL) isn't set up yet;
  // that's separate scope from verifying non-UI logic is correct.
  testMatch: [
    "<rootDir>/features/**/model/**/*.test.ts",
    "<rootDir>/lib/simulation/**/*.test.ts",
    "<rootDir>/lib/api/**/*.test.ts",
  ],
};
