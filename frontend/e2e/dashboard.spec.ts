import { expect, test } from "@playwright/test";

test("create a GenericDiagram, see it listed, then delete it", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "New Diagram" }).click();
  await page.getByRole("button", { name: "GenericDiagram" }).click();
  await expect(page).toHaveURL(/\/d\/[^/]+$/);
  const token = page.url().split("/d/")[1];

  await page.goto("/");
  const rowLink = page.locator(`a[href="/d/${token}"]`);
  const row = rowLink.locator("..");
  await expect(row).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await row.getByText("Delete").click();

  await expect(rowLink).not.toBeVisible();
  await page.reload();
  await expect(page.locator(`a[href="/d/${token}"]`)).not.toBeVisible();
});
