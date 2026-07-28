import type { MetadataRoute } from "next";

const BASE_URL = "https://simboard.dsinventek.com";

/** Every real, indexable route — kept in sync by hand since there are only
 * a few. Breadboard/Arduino/ESP32 Lab were collapsed into one unified
 * /simulator canvas (docs/architecture/0024-*.md). */
const ROUTES = ["", "/docs", "/simulator"];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((route) => ({
    url: `${BASE_URL}${route}`,
    changeFrequency: "monthly",
    priority: route === "" ? 1 : 0.8,
  }));
}
