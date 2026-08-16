import { expect, test } from "@playwright/test";

test("dashboard lists placeholder diagrams", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "OmniDiagram" }),
  ).toBeVisible();
  await expect(page.getByText("Orders schema")).toBeVisible();
  await expect(page.getByText("Checkout flow")).toBeVisible();
});

test("GenericDiagram editor renders Mermaid SVG", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Checkout flow").click();
  await expect(page).toHaveURL(/\/d\/tt2-checkout-flow$/);
  await expect(page.locator("svg")).toBeVisible();
});

test("SchemaDiagram editor renders react-flow node", async ({ page }) => {
  await page.goto("/d/tt1-schema-orders");
  await expect(
    page.locator(".react-flow__node").filter({ hasText: "orders" }),
  ).toBeVisible();
});
