/**
 * Seed/catalog data describing one entry in the component palette — makes
 * adding a component a data change, not always a code change (spec
 * Part 4). This describes the *catalog entry*, not a placed instance;
 * `packages/component-library`'s `ElectricalModel` types remain the
 * source of truth for how a component actually behaves once placed.
 */
export interface ComponentDefinition {
  id: string;
  /** Matches component-library's component type strings (e.g. "resistor", "led"). */
  type: string;
  label: string;
  /** Default params for a newly-placed instance (shape matches the
   * corresponding component-library TParams type; not cross-checked at
   * this package's type level to avoid a hard dependency between
   * shared-types and component-library). */
  defaultParams: Record<string, unknown>;
}
