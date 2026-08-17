import { expect, test } from "@playwright/test";

test("edit, save, and reload preserves the change", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New Diagram" }).click();
  await page.getByRole("button", { name: "SchemaDiagram" }).click();
  await expect(page).toHaveURL(/\/d\/[^/]+$/);

  const textarea = page.locator("textarea");
  const edited = "Table orders {\n  id integer [primary key]\n}\n";
  await textarea.fill(edited);
  await expect(page.getByText("Unsaved changes")).toBeVisible();

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved")).toBeVisible();

  await page.reload();
  await expect(page.locator("textarea")).toHaveValue(edited);
});

test("navigating away with unsaved changes warns first", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New Diagram" }).click();
  await page.getByRole("button", { name: "SchemaDiagram" }).click();
  await expect(page).toHaveURL(/\/d\/[^/]+$/);

  await page.locator("textarea").fill("Table orders {\n  id integer [primary key]\n}\n");
  await expect(page.getByText("Unsaved changes")).toBeVisible();

  let dialogMessage = "";
  page.once("dialog", (dialog) => {
    dialogMessage = dialog.message();
    dialog.dismiss();
  });
  await page.getByRole("link", { name: "OmniDiagram" }).click();

  expect(dialogMessage).toContain("unsaved changes");
  await expect(page).toHaveURL(/\/d\/[^/]+$/);
});
