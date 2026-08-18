import { expect, test } from "@playwright/test";

test("edit, save, and reload preserves the change", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "New Diagram" }).click();
  await page.getByRole("button", { name: "SchemaDiagram" }).click();
  await expect(page).toHaveURL(/\/share\/[^/]+$/);

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
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "New Diagram" }).click();
  await page.getByRole("button", { name: "SchemaDiagram" }).click();
  await expect(page).toHaveURL(/\/share\/[^/]+$/);

  await page.locator("textarea").fill("Table orders {\n  id integer [primary key]\n}\n");
  await expect(page.getByText("Unsaved changes")).toBeVisible();

  let dialogMessage = "";
  page.once("dialog", (dialog) => {
    dialogMessage = dialog.message();
    dialog.dismiss();
  });
  await page.getByRole("link", { name: "OmniDiagram" }).click();

  expect(dialogMessage).toContain("unsaved changes");
  await expect(page).toHaveURL(/\/share\/[^/]+$/);
});

test("renaming the title in the editor header requires Save, and persists after reload", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "New Diagram" }).click();
  await page.getByRole("button", { name: "SchemaDiagram" }).click();
  await expect(page).toHaveURL(/\/share\/[^/]+$/);

  await page.getByRole("button", { name: "Rename" }).click();
  const input = page.locator("input").first();
  await input.fill("Renamed in editor");
  await input.press("Tab");

  // Committing the title marks the diagram dirty but does not save it yet.
  await expect(page.getByText("Unsaved changes")).toBeVisible();

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Renamed in editor")).toBeVisible();
});
