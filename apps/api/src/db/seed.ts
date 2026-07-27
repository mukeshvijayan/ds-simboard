import { createComponentDefinitionsRepository } from "../repositories/componentDefinitionsRepository";
import { createProductionDatabase } from "./client";

/**
 * Catalog seed data for the 7 components `@ds-simboard/component-library`
 * implements (spec Part 4: "adding a component is a data change"). Values
 * match that package's own defaults at time of writing; this file doesn't
 * import from component-library to avoid coupling apps/api to it just for
 * seed literals — if the defaults there change, this seed should be
 * updated to match, but nothing enforces that automatically.
 */
const SEED_COMPONENTS = [
  {
    type: "resistor",
    label: "Resistor",
    defaultParams: { resistanceOhms: 220, ratedPowerWatts: 0.25 },
  },
  {
    type: "capacitor",
    label: "Capacitor",
    defaultParams: { capacitanceFarads: 1e-6, polarized: false, ratedVoltageVolts: 16 },
  },
  {
    type: "led",
    label: "LED",
    defaultParams: {
      forwardVoltageVolts: 2,
      ratedCurrentAmps: 0.02,
      maxCurrentAmps: 0.03,
    },
  },
  {
    type: "diode",
    label: "Diode",
    defaultParams: { forwardVoltageVolts: 0.7, reverseBreakdownVoltageVolts: 1000 },
  },
  { type: "pushbutton", label: "Pushbutton", defaultParams: { isMomentary: true } },
  {
    type: "potentiometer",
    label: "Potentiometer",
    defaultParams: { totalResistanceOhms: 10_000, ratedPowerWatts: 0.2 },
  },
  {
    type: "transistor",
    label: "Transistor (NPN)",
    defaultParams: {
      polarity: "NPN",
      hFE: 100,
      vceSatVolts: 0.2,
      maxCollectorCurrentAmps: 0.5,
    },
  },
];

/** Idempotent — safe to run repeatedly, e.g. once per deploy. */
export async function seedComponentDefinitions(
  repository: ReturnType<typeof createComponentDefinitionsRepository>
): Promise<void> {
  for (const component of SEED_COMPONENTS) {
    await repository.upsert(component);
  }
}

/* istanbul ignore next -- CLI entrypoint, only runs when executed directly as a script */
if (require.main === module) {
  const db = createProductionDatabase(process.env.DATABASE_URL);
  seedComponentDefinitions(createComponentDefinitionsRepository(db))
    .then(() => {
      // eslint-disable-next-line no-console
      console.log(`Seeded ${SEED_COMPONENTS.length} component definitions.`);
      process.exit(0);
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
