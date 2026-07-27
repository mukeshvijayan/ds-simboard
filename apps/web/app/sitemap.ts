import type { MetadataRoute } from "next";

const BASE_URL = "https://simboard.dsinventek.com";

/** Every real, indexable route — kept in sync by hand since there are only five. */
const ROUTES = ["", "/breadboard-lab", "/arduino-lab", "/esp32-lab", "/simulator"];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((route) => ({
    url: `${BASE_URL}${route}`,
    changeFrequency: "monthly",
    priority: route === "" ? 1 : 0.8,
  }));
}
