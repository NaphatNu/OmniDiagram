import { expect, test } from "@playwright/test";

test("dashboard shows the empty state", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "OmniDiagram" }),
  ).toBeVisible();
  await expect(
    page.getByText("No diagrams yet. Create one to get started."),
  ).toBeVisible();
});

test("an unknown diagram route 404s", async ({ page }) => {
  const response = await page.goto("/d/does-not-exist");
  expect(response?.status()).toBe(404);
});
