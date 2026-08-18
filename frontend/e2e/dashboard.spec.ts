import { expect, test } from "@playwright/test";

test("create a GenericDiagram, see it listed, then delete it", async ({ page }) => {
  await page.goto("/dashboard");

  await page.getByRole("button", { name: "New Diagram" }).click();
  await page.getByRole("button", { name: "GenericDiagram" }).click();
  await expect(page).toHaveURL(/\/share\/[^/]+$/);
  const token = page.url().split("/share/")[1];

  await page.goto("/dashboard");
  const rowLink = page.locator(`a[href="/share/${token}"]`);
  const row = rowLink.locator("..");
  await expect(row).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await row.getByText("Delete").click();

  await expect(rowLink).not.toBeVisible();
  await page.reload();
  await expect(page.locator(`a[href="/share/${token}"]`)).not.toBeVisible();
});

test("rename a diagram from the dashboard and see it persist after reload", async ({ page }) => {
  await page.goto("/dashboard");

  await page.getByRole("button", { name: "New Diagram" }).click();
  await page.getByRole("button", { name: "GenericDiagram" }).click();
  await expect(page).toHaveURL(/\/share\/[^/]+$/);
  const token = page.url().split("/share/")[1];

  await page.goto("/dashboard");
  const row = page.locator(`[data-testid="diagram-row-${token}"]`);
  await row.getByText("Rename").click();
  const input = row.locator("input");
  await input.fill("Renamed from dashboard");
  await input.press("Enter");

  await expect(row.getByText("Renamed from dashboard")).toBeVisible();
  await page.reload();
  await expect(row.getByText("Renamed from dashboard")).toBeVisible();
});

test("renaming to a blank title falls back to Untitled diagram", async ({ page }) => {
  await page.goto("/dashboard");

  await page.getByRole("button", { name: "New Diagram" }).click();
  await page.getByRole("button", { name: "GenericDiagram" }).click();
  await expect(page).toHaveURL(/\/share\/[^/]+$/);
  const token = page.url().split("/share/")[1];

  await page.goto("/dashboard");
  const row = page.locator(`[data-testid="diagram-row-${token}"]`);
  await row.getByText("Rename").click();
  const input = row.locator("input");
  await input.fill("   ");
  await input.press("Enter");

  await expect(row.getByText("Untitled diagram")).toBeVisible();
});
