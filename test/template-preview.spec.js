import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
test.use({ baseURL: "http://127.0.0.1:3001" });

test("preview leaves all current design files unchanged", () => {
  const hashes = {
    "index.html":
      "7fd67000da45db00b12040dc35a7e2d0ad93ad7600ad472946d156650e74a8cd",
    "about.html":
      "b46a93669664b9adfd932faf70febea06fd89e63f8871e12d07fa93c21f2bc6e",
    "programs.html":
      "335ed653b1848f08f1f933ae2de007a1d0f8f50ff2fa6f57b475b47bf5fa5291",
    "team.html":
      "440911c6452ccef39a699f30daff4483d4a90a12e51c8f3f69ec84d6814bd8a0",
    "merchandise.html":
      "d02e0ebf18eb57f068cb8fe6bd8337ddcdde0db94ec54c6d15cd9eda83cd86cc",
    "contact.html":
      "27a663f61b986a91ce9d0065d9b46a0aa9dda26bb3da909bd44c8bd204ed5b99",
    "style.css":
      "e1697a8fae7e906cba9107f675a9589c7b2560440fb1a3159d8a565a8796d01b",
    "script.js":
      "1bfd4f849fe0dec37b7b8d2ba55cf2594513d0514ef8b2e0f9e81a64b6e1da64",
  };
  for (const [file, hash] of Object.entries(hashes))
    expect(createHash("sha256").update(readFileSync(file)).digest("hex")).toBe(
      hash,
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
  await expect(page.locator(".focus-card")).toHaveCount(4);
  await expect(page.locator(".gallery-grid img")).toHaveCount(6);
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
