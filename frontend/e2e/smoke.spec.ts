import { expect, test } from "@playwright/test";

test("an unknown diagram route shows the not-found page", async ({ page }) => {
  await page.goto("/d/does-not-exist");
  await expect(page.getByText("Diagram not found")).toBeVisible();
});
