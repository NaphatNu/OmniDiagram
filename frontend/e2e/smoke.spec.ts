import { expect, test } from "@playwright/test";

test("an unknown diagram route 404s", async ({ page }) => {
  const response = await page.goto("/d/does-not-exist");
  expect(response?.status()).toBe(404);
});
