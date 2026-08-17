import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("export DBML from a SchemaDiagram downloads a file containing the table", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New Diagram" }).click();
  await page.getByRole("button", { name: "SchemaDiagram" }).click();
  await expect(page).toHaveURL(/\/d\/[^/]+$/);

  await page.getByRole("button", { name: "Export", exact: true }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByText("DBML", { exact: true }).click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/\.dbml$/);
  const path = await download.path();
  const content = readFileSync(path!, "utf-8");
  expect(content).toContain("table_name");
});

test("export SQL (PostgreSQL) downloads a file containing CREATE TABLE", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New Diagram" }).click();
  await page.getByRole("button", { name: "SchemaDiagram" }).click();
  await expect(page).toHaveURL(/\/d\/[^/]+$/);

  await page.getByRole("button", { name: "Export", exact: true }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByText("SQL (PostgreSQL)").click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/\.postgres\.sql$/);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) {
    chunks.push(chunk as Buffer);
  }
  const text = Buffer.concat(chunks).toString("utf-8");
  expect(text.toUpperCase()).toContain("CREATE TABLE");
});

test("importing a .sql file replaces the buffer and marks it dirty", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New Diagram" }).click();
  await page.getByRole("button", { name: "SchemaDiagram" }).click();
  await expect(page).toHaveURL(/\/d\/[^/]+$/);

  await page.getByRole("button", { name: "Import" }).click();
  const dialog = page.getByRole("dialog", { name: "Import" });
  await page.setInputFiles("input[type=file]", {
    name: "customers.sql",
    mimeType: "text/plain",
    buffer: Buffer.from("CREATE TABLE customers (id INTEGER PRIMARY KEY, name VARCHAR(255));"),
  });
  await dialog.getByRole("button", { name: "Import" }).click();

  await expect(page.locator("textarea").first()).toContainText("customers");
  await expect(page.getByText("Unsaved changes")).toBeVisible();
});
