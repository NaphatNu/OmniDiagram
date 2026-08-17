import { expect, Locator, Page, test } from "@playwright/test";

async function dragNode(page: Page, node: Locator, dx: number, dy: number) {
  const box = await node.boundingBox();
  if (!box) throw new Error("node has no bounding box");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 10 });
  await page.mouse.up();
}

test("revert restores content and layout together and appends rather than rewinds history", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New Diagram" }).click();
  await page.getByRole("button", { name: "SchemaDiagram" }).click();
  await expect(page).toHaveURL(/\/d\/[^/]+$/);
  const token = page.url().split("/d/")[1];

  const textarea = page.locator("textarea");
  const node = page.locator(".react-flow__node").first();
  await expect(node).toBeVisible();

  // First save: drag the table to P1, then change the content.
  await dragNode(page, node, 120, 80);
  const contentA = "Table table_name {\n  id integer [primary key]\n}\n";
  await textarea.fill(contentA);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved")).toBeVisible();

  const afterFirstSave = await (await request.get(`/api/diagrams/${token}`)).json();
  const layoutAtA = afterFirstSave.layout.table_name;
  expect(layoutAtA).toBeDefined();

  // Second save: drag the table further to P2, then change the content again.
  await dragNode(page, page.locator(".react-flow__node").first(), 80, 60);
  const contentB = "Table table_name {\n  id integer [primary key]\n  name varchar\n}\n";
  await textarea.fill(contentB);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved")).toBeVisible();

  // Open History: two entries so far (the state right before each save).
  await page.getByRole("button", { name: "History" }).click();
  const restoreButtons = page.getByRole("button", { name: "Restore" });
  await expect(restoreButtons).toHaveCount(2);

  // Revert to the newest entry: content A with layout P1.
  page.once("dialog", (dialog) => dialog.accept());
  await restoreButtons.first().click();

  await expect(textarea).toHaveValue(contentA);
  // Revert is a forward write: one more entry, not fewer.
  await expect(restoreButtons).toHaveCount(3);

  const afterRevert = await (await request.get(`/api/diagrams/${token}`)).json();
  expect(afterRevert.content).toBe(contentA);
  expect(afterRevert.layout.table_name).toEqual(layoutAtA);

  await page.reload();
  await expect(page.locator("textarea")).toHaveValue(contentA);
});

test("history panel shows empty state before any save", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New Diagram" }).click();
  await page.getByRole("button", { name: "SchemaDiagram" }).click();
  await expect(page).toHaveURL(/\/d\/[^/]+$/);

  await page.getByRole("button", { name: "History" }).click();
  await expect(page.getByText("No previous versions yet")).toBeVisible();
});

test("reverting with unsaved changes warns before discarding them", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New Diagram" }).click();
  await page.getByRole("button", { name: "SchemaDiagram" }).click();
  await expect(page).toHaveURL(/\/d\/[^/]+$/);

  const textarea = page.locator("textarea");
  await textarea.fill("Table table_name {\n  id integer [primary key]\n  note varchar\n}\n");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved")).toBeVisible();

  await textarea.fill("Table table_name {\n  id integer [primary key]\n  extra varchar\n}\n");
  await expect(page.getByText("Unsaved changes")).toBeVisible();

  await page.getByRole("button", { name: "History" }).click();

  let dialogMessage = "";
  page.once("dialog", (dialog) => {
    dialogMessage = dialog.message();
    dialog.dismiss();
  });
  await page.getByRole("button", { name: "Restore" }).first().click();

  expect(dialogMessage.toLowerCase()).toContain("unsaved changes");
  await expect(page.getByText("Unsaved changes")).toBeVisible();
});
