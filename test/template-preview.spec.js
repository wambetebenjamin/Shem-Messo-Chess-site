import { test, expect } from "@playwright/test";
test.use({ baseURL: "http://127.0.0.1:3001" });

test("preview is simplified without moving officials back to Home", async ({
  page,
}) => {
  await page.goto("/template-preview.html");
  await expect(
    page.locator(".person-card, #team, .gallery-grid, .focus-card"),
  ).toHaveCount(0);
  await expect(page.locator(".main-nav > a").nth(1)).toHaveAttribute(
    "href",
    "about.html",
  );
});
test("source-based template uses our photos and loads without external assets", async ({
  page,
}) => {
  const errors = [],
    external = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (!r.url().startsWith("http://127.0.0.1:3001/")) external.push(r.url());
  });
  await page.goto("/template-preview.html");
  await expect(page.locator("h1")).toHaveText(
    "Learn and playchess in Kericho.",
  );
  await expect(page.locator(".contact-strip")).toHaveCount(0);
  await expect(page.locator(".service-card")).toHaveCount(6);
  await expect(page.locator(".focus-card")).toHaveCount(0);
  await expect(page.locator(".gallery-grid img")).toHaveCount(0);
  await page.evaluate(() => {
    for (const image of document.images) image.loading = "eager";
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.images].filter((i) => !i.naturalWidth).map((i) => i.src),
      ),
    )
    .toEqual([]);
  await page.evaluate(() => document.fonts.ready);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
  const text = await page.locator("body").innerText();
  expect(text).not.toContain("Free Demo");
  expect(text).not.toContain("Award Winners");
  expect(text).not.toContain("Professional Chess Academy");
});
test("hero follows the supplied source five-second loop and half-second fade", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/template-preview.html");
  await expect
    .poll(() =>
      page
        .locator(".template-photo")
        .evaluateAll((images) =>
          images.every((i) => i.complete && i.naturalWidth),
        ),
    )
    .toBe(true);
  await page.locator(".preview-hero").hover();
  expect(
    await page
      .locator(".template-photo")
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0.5s");
  await page.clock.fastForward(5100);
  await expect(page.locator('[data-photo="1"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.clock.fastForward(5100);
  await expect(page.locator('[data-photo="0"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page
    .getByRole("button", { name: "Pause hero photo transitions" })
    .click();
  await page.clock.fastForward(11000);
  await expect(page.locator('[data-photo="0"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
test("enquiry opens our WhatsApp destination, not the template form backend", async ({
  page,
}) => {
  await page.goto("/template-preview.html");
  await page.evaluate(() => {
    window.open = (url) => {
      window.enquiryURL = url;
    };
  });
  await page.getByLabel("Your name", { exact: true }).fill("Test Visitor");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("visitor@example.com");
  await page.getByLabel("I’m interested in").selectOption("Chess in schools");
  await page.getByRole("button", { name: "Continue on WhatsApp" }).click();
  const url = await page.evaluate(() => window.enquiryURL);
  expect(url).toMatch(/^https:\/\/wa\.me\/254729037585\?text=/);
  expect(decodeURIComponent(url)).toContain("Chess in schools");
  await expect(page.locator(".form-status")).toContainText("ready in WhatsApp");
});
test("mobile layout, native dropdown and comparison links work", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/template-preview.html");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.locator("summary").click();
  await expect(page.locator(".nav-dropdown")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".main-nav")).not.toHaveClass(/open/);
  for (const width of [320, 390, 767, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      String(width),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const formBox = await page.locator("#enquiry").boundingBox();
  const copyBox = await page.locator(".hero-copy").boundingBox();
  expect(formBox.y).toBeGreaterThanOrEqual(copyBox.y + copyBox.height);
  await page
    .getByRole("link", { name: "Current website", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/index\.html$/);
  await expect(page.locator(".hero")).toHaveCount(1);
  await expect(page.locator(".preview-hero")).toHaveCount(0);
});
test("reduced motion is respected in the independent preview", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/template-preview.html");
  await expect(
    page.getByRole("button", {
      name: "Automatic transitions disabled for reduced motion",
    }),
  ).toBeDisabled();
  await page.clock.fastForward(11000);
  await expect(page.locator('[data-photo="0"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Next hero photo" }).click();
  await expect(page.locator('[data-photo="1"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
