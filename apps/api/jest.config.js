/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  // Each test spins up a real (if embedded) Postgres instance and applies
  // migrations — genuinely slower than a typical unit test, and worth it
  // per docs/architecture/0009-*.md's "test against something real" call.
  testTimeout: 30_000,
  collectCoverage: true,
  coverageDirectory: "coverage",
  // db/client.ts's production branch needs a real Postgres server to
  // exercise (see docs/architecture/0009-*.md) — everything else is
  // tested against the embedded pglite database.
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/db/client.ts",
    "!src/db/schema.ts",
    "!src/db/migrations/**",
    "!src/db/migrateProduction.ts",
    "!src/server.ts",
    // Ambient type declaration only — no runtime code to cover.
    "!src/types/**",
  ],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
};
