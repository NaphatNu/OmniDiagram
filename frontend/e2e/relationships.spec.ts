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

const THREE_TABLE_DBML =
  "Table orders {\n  id integer [primary key]\n  customer_id integer\n}\n\nTable customers {\n  id integer [primary key]\n}\n\nTable unrelated {\n  id integer [primary key]\n}\n\nRef: orders.customer_id > customers.id\n";

test("hovering a table highlights its connection and dims unrelated tables", async ({ page }) => {
  await newSchemaDiagram(page);
  await page.locator("textarea").fill(THREE_TABLE_DBML);

  const orders = page.locator('[data-testid="table-node-orders"]');
  const customers = page.locator('[data-testid="table-node-customers"]');
  const unrelated = page.locator('[data-testid="table-node-unrelated"]');

  await orders.hover();
  await expect(unrelated).toHaveCSS("opacity", "0.4");
  await expect(customers).not.toHaveCSS("opacity", "0.4");

  await page.mouse.move(0, 0);
  await expect(unrelated).not.toHaveCSS("opacity", "0.4");
});

test("clicking a foreign-key field pans the canvas toward the referenced table and highlights it", async ({
  page,
}) => {
  await newSchemaDiagram(page);
  await page.locator("textarea").fill(THREE_TABLE_DBML);

  const viewport = page.locator(".react-flow__viewport");
  const transformBefore = await viewport.getAttribute("style");

  await page.locator('[data-testid="field-orders-customer_id"]').click();

  await expect(page.locator('[data-testid="table-node-customers"]')).toHaveCSS(
    "border-color",
    "rgb(37, 99, 235)",
  );
  await expect
    .poll(async () => viewport.getAttribute("style"))
    .not.toBe(transformBefore);
});

test("clicking a non-FK field does not pan the canvas or highlight anything", async ({ page }) => {
  await newSchemaDiagram(page);
  await page.locator("textarea").fill(THREE_TABLE_DBML);

  await page.locator('[data-testid="field-orders-id"]').click();

  await expect(page.locator('[data-testid="table-node-customers"]')).not.toHaveCSS(
    "border-color",
    "rgb(37, 99, 235)",
  );
});

test("relationship edges of different types render with different colors, and the legend is visible", async ({
  page,
}) => {
  await newSchemaDiagram(page);
  await page.locator("textarea").fill(
    "Table orders {\n  id integer [primary key]\n  customer_id integer\n  ship_customer_id integer\n}\n\nTable customers {\n  id integer [primary key]\n}\n\nRef: orders.customer_id > customers.id\nRef: orders.ship_customer_id - customers.id\n",
  );

  await expect(page.locator(".react-flow__edge-path")).toHaveCount(2);
  const strokes = await page.locator(".react-flow__edge-path").evaluateAll((paths) =>
    paths.map((p) => getComputedStyle(p).stroke),
  );
  expect(new Set(strokes).size).toBe(2);

  await expect(page.getByText("One-to-many")).toBeVisible();
  await expect(page.getByText("One-to-one")).toBeVisible();
  await expect(page.getByText("Many-to-many")).toBeVisible();
});

test("dragging a table still works after hovering it (hover doesn't swallow the drag)", async ({
  page,
  request,
}) => {
  await newSchemaDiagram(page);
  const token = page.url().split("/d/")[1];
  await page.locator("textarea").fill(THREE_TABLE_DBML);

  const orders = page.locator('[data-testid="table-node-orders"]');
  await orders.hover();
  const box = await orders.boundingBox();
  if (!box) throw new Error("node has no bounding box");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 140, box.y + box.height / 2 + 90, { steps: 10 });
  await page.mouse.up();

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved")).toBeVisible();

  const body = await (await request.get(`/api/diagrams/${token}`)).json();
  expect(body.layout.orders).toBeDefined();
  expect(body.layout.orders).not.toEqual({ x: 0, y: 0 });
});
