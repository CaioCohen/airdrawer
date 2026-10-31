import { expect, test } from "@playwright/test";

async function drawPartial(page: import("@playwright/test").Page): Promise<void> {
  const board = page.getByLabel("Lousa de desenho");
  const box = await board.boundingBox();
  if (!box) throw new Error("Whiteboard is not visible.");
  await page.mouse.move(box.x + box.width * .2, box.y + box.height * .75);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .3, box.y + box.height * .57);
  await page.mouse.move(box.x + box.width * .4, box.y + box.height * .39);
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .2);
  await page.mouse.up();
}

test("loads the trained artifact, predicts a partial drawing, and clears stale output", async ({ page }) => {
  await page.goto("/");
  await drawPartial(page);
  await expect(page.getByLabel("Predição").getByText(/circle: \d+%/)).toBeVisible();
  await expect(page.getByLabel("Predição").getByText(/square: \d+%/)).toBeVisible();
  await expect(page.getByLabel("Predição").getByText(/triangle: \d+%/)).toBeVisible();
  await page.getByRole("button", { name: "Limpar lousa" }).click();
  await expect(page.getByLabel("Predição").getByText("Aguardando desenho")).toBeVisible();
});

test("keeps the whiteboard usable when the production artifact is absent", async ({ page }) => {
  await page.route("**/models/shape-cnn.v1.json", (route) => route.fulfill({ status: 404, body: "missing" }));
  await page.goto("/");
  await drawPartial(page);
  await expect(page.getByLabel("Predição").getByText("Erro ao carregar modelo")).toBeVisible();
  await expect(page.getByRole("button", { name: "Limpar lousa" })).toBeEnabled();
});

test("rejects a corrupt fetched artifact instead of falling back to heuristic weights", async ({ page }) => {
  await page.route("**/models/shape-cnn.v1.json", (route) => route.fulfill({ contentType: "application/json", body: JSON.stringify({ schemaVersion: 1, corrupted: true }) }));
  await page.goto("/");
  await drawPartial(page);
  await expect(page.getByLabel("Predição").getByText("Erro ao carregar modelo")).toBeVisible();
});
