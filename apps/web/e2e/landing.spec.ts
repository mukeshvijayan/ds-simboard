import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

test.describe("landing page", () => {
  test("loads with the right title and links to Docs and the simulator", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/DS SimBoard/);

    await expect(page.getByRole("link", { name: "Docs" })).toHaveAttribute(
      "href",
      "/docs"
    );
    await expect(
      page.getByRole("link", { name: "Open simulator" }).first()
    ).toHaveAttribute("href", "/simulator");
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
    await expect(page.getByRole("link", { name: "Docs" })).toBeVisible();
  });
});
