import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

test.describe("landing page", () => {
  test("loads with the right title and links to every lab", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/DS SimBoard/);

    await expect(page.getByRole("link", { name: "Breadboard Lab" })).toHaveAttribute(
      "href",
      "/breadboard-lab"
    );
    await expect(page.getByRole("link", { name: "Arduino Lab" })).toHaveAttribute(
      "href",
      "/arduino-lab"
    );
    await expect(page.getByRole("link", { name: "ESP32 Lab" })).toHaveAttribute(
      "href",
      "/esp32-lab"
    );
  });

  test("has no automatically detectable accessibility violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("nav links are reachable on a mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: /menu/i }).click();
    await expect(page.getByRole("link", { name: "Breadboard Lab" })).toBeVisible();
  });
});
