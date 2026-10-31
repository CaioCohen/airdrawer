import { expect, test } from "@playwright/test";
test("shows both canvases without starting a camera", async ({ page }) => { await page.goto("/"); await expect(page.getByLabel("Prévia da webcam")).toBeVisible(); await expect(page.getByLabel("Lousa de desenho")).toBeVisible(); });
test("stacks canvases on a narrow screen", async ({ page }) => { await page.setViewportSize({ width: 600, height: 900 }); await page.goto("/"); const webcam = await page.getByLabel("Prévia da webcam").boundingBox(); const whiteboard = await page.getByLabel("Lousa de desenho").boundingBox(); expect(webcam).not.toBeNull(); expect(whiteboard).not.toBeNull(); expect(whiteboard!.y).toBeGreaterThan(webcam!.y); });
test("keeps two mouse strokes separated and clears the whiteboard", async ({ page }) => {
  await page.goto("/");
  const board = page.getByLabel("Lousa de desenho");
  const box = await board.boundingBox();
  expect(box).not.toBeNull();
  const point = (x: number, y: number) => ({ x: box!.x + box!.width * x, y: box!.y + box!.height * y });
  await page.mouse.move(...Object.values(point(.15, .2))); await page.mouse.down();
  await page.mouse.move(...Object.values(point(.3, .2))); await page.mouse.up();
  await page.mouse.move(...Object.values(point(.7, .8))); await page.mouse.down();
  await page.mouse.move(...Object.values(point(.85, .8))); await page.mouse.up();
  await expect(page.getByRole("button", { name: "Desfazer" })).toBeEnabled();
  const gapIsWhite = await board.evaluate((canvas) => {
    const context = canvas.getContext("2d")!;
    const pixel = context.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data;
    return pixel[0] > 240 && pixel[1] > 240 && pixel[2] > 240;
  });
  expect(gapIsWhite).toBe(true);
  await page.getByRole("button", { name: "Limpar lousa" }).click();
  await expect(page.getByRole("button", { name: "Desfazer" })).toBeDisabled();
});
test("undo removes only the latest mouse stroke", async ({ page }) => {
  await page.goto("/");
  const board = page.getByLabel("Lousa de desenho");
  const box = await board.boundingBox();
  expect(box).not.toBeNull();
  const line = async (from: [number, number], to: [number, number]) => {
    await page.mouse.move(box!.x + box!.width * from[0], box!.y + box!.height * from[1]);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width * to[0], box!.y + box!.height * to[1]);
    await page.mouse.up();
  };
  await line([.1, .2], [.3, .2]);
  await line([.7, .8], [.9, .8]);
  await page.getByRole("button", { name: "Desfazer" }).click();
  const pixels = await board.evaluate((canvas) => {
    const context = canvas.getContext("2d")!;
    const first = context.getImageData(Math.floor(canvas.width * .2), Math.floor(canvas.height * .2), 1, 1).data[0];
    const second = context.getImageData(Math.floor(canvas.width * .8), Math.floor(canvas.height * .8), 1, 1).data[0];
    return { first, second };
  });
  expect(pixels.first).toBeLessThan(100);
  expect(pixels.second).toBeGreaterThan(240);
});
test("saves a consented local reference without losing it when the board is cleared", async ({ page }) => {
  await page.goto("/");
  const board = page.getByLabel("Lousa de desenho");
  const box = await board.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * .2, box!.y + box!.height * .2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * .7, box!.y + box!.height * .7);
  await page.mouse.up();
  const panel = page.getByLabel("Salvar referência");
  await expect(panel.getByRole("button", { name: "Salvar localmente" })).toBeDisabled();
  await panel.getByLabel(/Confirmo que quero salvar os traços/).check();
  await panel.getByRole("button", { name: "Salvar localmente" }).click();
  await expect(panel.getByText("Referência salva somente neste navegador.")).toBeVisible();
  await page.getByRole("button", { name: "Limpar lousa" }).click();
  await expect(panel.getByRole("button", { name: "Revisar" })).toBeVisible();
});
