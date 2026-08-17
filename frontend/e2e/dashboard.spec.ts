import { expect, test } from "@playwright/test";

test("create a GenericDiagram, see it listed, then delete it", async ({ page }) => {
  await page.goto("/");

  await page.getByText("New Diagram").click();
  await page.getByText("GenericDiagram").click();
  await expect(page).toHaveURL(/\/d\/[^/]+$/);

  await page.goto("/");
  const row = page.getByRole("link", { name: /Untitled diagram/ }).locator("..");
  await expect(row).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await row.getByText("Delete").click();

  await expect(page.getByText("Untitled diagram")).not.toBeVisible();
  await page.reload();
  await expect(page.getByText("Untitled diagram")).not.toBeVisible();
});
