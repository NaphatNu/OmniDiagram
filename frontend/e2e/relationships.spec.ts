import { expect, Locator, Page, test } from "@playwright/test";

async function dragNode(page: Page, node: Locator, dx: number, dy: number) {
  const box = await node.boundingBox();
  if (!box) throw new Error("node has no bounding box");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy, { steps: 10 });
  await page.mouse.up();
}

async function newSchemaDiagram(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "New Diagram" }).click();
  await page.getByRole("button", { name: "SchemaDiagram" }).click();
  await expect(page).toHaveURL(/\/d\/[^/]+$/);
}

test("a Ref renders as an edge anchored at the two related tables", async ({ page }) => {
  await newSchemaDiagram(page);

  await page.locator("textarea").fill(
    "Table orders {\n  id integer [primary key]\n  customer_id integer\n}\n\nTable customers {\n  id integer [primary key]\n}\n\nRef: orders.customer_id > customers.id\n",
  );

  await expect(page.locator(".react-flow__node")).toHaveCount(2);
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
});

test("dragging a table keeps the edge attached and re-routes it", async ({ page }) => {
  await newSchemaDiagram(page);

  await page.locator("textarea").fill(
    "Table orders {\n  id integer [primary key]\n  customer_id integer\n}\n\nTable customers {\n  id integer [primary key]\n}\n\nRef: orders.customer_id > customers.id\n",
  );
  const edgePath = page.locator(".react-flow__edge-path").first();
  await expect(edgePath).toBeVisible();
  const pathBefore = await edgePath.getAttribute("d");

  const orders = page.locator(".react-flow__node", { hasText: "orders" });
  await dragNode(page, orders, 150, 120);

  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
  const pathAfter = await edgePath.getAttribute("d");
  expect(pathAfter).not.toBe(pathBefore);
});

test("a self-referencing Ref renders as a self-loop without breaking the canvas", async ({ page }) => {
  await newSchemaDiagram(page);

  await page.locator("textarea").fill(
    "Table orders {\n  id integer [primary key]\n  parent_order_id integer\n}\n\nRef: orders.parent_order_id > orders.id\n",
  );

  await expect(page.locator(".react-flow__node")).toHaveCount(1);
  await expect(page.locator(".react-flow__edge")).toHaveCount(1);
});

test("a Ref naming a table that doesn't exist surfaces an error naming it, without crashing", async ({
  page,
}) => {
  await newSchemaDiagram(page);

  await page.locator("textarea").fill(
    "Table orders {\n  id integer [primary key]\n  customer_id integer\n}\n\nRef: orders.customer_id > missing_table.id\n",
  );

  await expect(page.getByText(/missing_table/)).toBeVisible();
});
