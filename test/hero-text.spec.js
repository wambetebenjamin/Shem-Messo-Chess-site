import { test, expect } from "@playwright/test";
async function ready(page) {
  await page.goto("/");
  await expect
    .poll(() =>
      page
        .locator(".hero-slide")
        .evaluateAll((images) =>
          images.every((image) => image.complete && image.naturalWidth),
        ),
    )
    .toBe(true);
  await expect(page.locator(".hero h1")).toHaveClass(/text-lettered/);
}
const entrances = (page) =>
  page.locator(".hero h1").getAttribute("data-letter-entrances").then(Number);

test("hero lettering replays on each four-second slide change and pause stops repeat motion", async ({
  page,
}) => {
  await page.clock.install();
  await ready(page);
  const first = await entrances(page);
  await page.clock.fastForward(4100);
  expect(await entrances(page)).toBeGreaterThan(first);
  await page
    .getByRole("button", { name: "Pause hero photo transitions", exact: true })
    .click();
  const paused = await entrances(page);
  await expect(
    page.locator(".hero .lettering-in,.hero .text-arriving"),
  ).toHaveCount(0);
  await page.clock.fastForward(16000);
  expect(await entrances(page)).toBe(paused);
  await page
    .getByRole("button", { name: "Resume hero photo transitions", exact: true })
    .click();
  await page.clock.fastForward(4100);
  expect(await entrances(page)).toBeGreaterThan(paused);
  await expect(
    page.getByRole("heading", {
      name: "Learn and play chess in Kericho.",
      exact: true,
    }),
  ).toBeVisible();
});

test("hero text stays still for reduced motion, hidden pages and offscreen heroes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/");
  await page.clock.fastForward(20000);
  await expect(
    page.locator(".hero .letter-char,.hero .text-arriving"),
  ).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await ready(page);
  const visible = await entrances(page);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.fastForward(12000);
  expect(await entrances(page)).toBe(visible);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.locator("footer").scrollIntoViewIfNeeded();
  await page.clock.fastForward(12000);
  expect(await entrances(page)).toBe(visible);
  await page.locator(".hero h1").scrollIntoViewIfNeeded();
  await expect(page.locator(".hero h1")).toBeInViewport();
  await page.clock.runFor(100);
  await page.clock.fastForward(4100);
  expect(await entrances(page)).toBeGreaterThan(visible);
});

test("independent comparison also repeats gentle hero text entrances without changing its five-second loop", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("http://127.0.0.1:3001/template-preview.html");
  await expect
    .poll(() =>
      page
        .locator(".template-photo")
        .evaluateAll((images) =>
          images.every((image) => image.complete && image.naturalWidth),
        ),
    )
    .toBe(true);
  await page.clock.fastForward(5100);
  await expect(page.locator(".preview-hero")).toHaveAttribute(
    "data-text-replays",
    "1",
  );
  await page
    .getByRole("button", { name: "Pause hero photo transitions", exact: true })
    .click();
  await page.clock.fastForward(12000);
  await expect(page.locator(".preview-hero")).toHaveAttribute(
    "data-text-replays",
    "1",
  );
});
