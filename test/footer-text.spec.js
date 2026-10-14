import { test, expect } from "@playwright/test";
const pages = [
  "index",
  "about",
  "programs",
  "merchandise",
  "registration",
  "events",
  "help",
  "contact",
  "play",
];

test("basic footer restores useful information without duplicate CTA blocks or printed contacts", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const file of pages) {
    await page.goto(`/${file}.html`);
    await page.evaluate(() => document.fonts.ready);
    const footer = page.locator("footer");
    await expect(
      footer.locator(".footer-grid,.footer-quick-actions,.footer-action-bar"),
    ).toHaveCount(0);
    await expect(footer).toContainText(
      "Coaching, club play and chess in schools.",
    );
    await expect(footer).toContainText("Kericho, Kenya");
    await expect(footer.locator(".footer-links a")).toHaveCount(7);
    await expect(footer.locator(".footer-actions a")).toHaveCount(5);
    expect(await footer.locator(".footer-actions").innerText()).toBe("");
    for (const link of await footer.locator(".footer-actions a").all()) {
      await expect(link).toHaveAttribute("aria-label", /\S+/);
      await expect(link.locator("svg")).toHaveCount(1);
      const box = await link.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    expect((await footer.boundingBox()).height).toBeLessThan(340);
    await page.setViewportSize({ width: 320, height: 900 });
    expect((await footer.boundingBox()).height).toBeLessThan(580);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.setViewportSize({ width: 1280, height: 900 });
  }
});

test("headings balance naturally, without forced breaks, clipped text or split word ladders", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(
    page.getByRole("heading", {
      name: "Learn and play chess in Kericho.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator("h1 .letter-word")).toHaveCount(6);
  for (const width of [320, 390, 600, 851, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const metrics = await page.locator(".hero h1").evaluate((el) => {
      const style = getComputedStyle(el),
        words = [...el.querySelectorAll(".letter-word")];
      return {
        font: parseFloat(style.fontSize),
        lines: new Set(
          words.map((word) => Math.round(word.getBoundingClientRect().top)),
        ).size,
        wrap: style.textWrap,
        overflow: el.scrollWidth > el.clientWidth,
        intact: words.every(
          (word) => getComputedStyle(word).whiteSpace === "nowrap",
        ),
      };
    });
    expect(metrics.font).toBeGreaterThanOrEqual(32);
    expect(metrics.lines).toBeLessThanOrEqual(3);
    expect(metrics.overflow).toBe(false);
    expect(metrics.wrap).toContain("balance");
    expect(metrics.intact).toBe(true);
  }
  for (const file of pages) {
    await page.goto(`/${file}.html`);
    await expect(page.locator("main h1 br,main h2 br,main h3 br")).toHaveCount(
      0,
    );
  }
});

test("brief lettering preserves readable accessible headings and updates product titles correctly", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/merchandise.html");
  const title = page.locator(".page-intro-title");
  await expect(title).toHaveClass(/text-lettered/);
  await expect(title).toHaveAttribute(
    "aria-label",
    "Wear the club. Equip your game.",
  );
  await expect
    .poll(() => title.getAttribute("data-letter-entrances"))
    .toBe("1");
  await expect(title).not.toHaveClass(/lettering-in/);
  expect(
    await title
      .locator(".letter-char")
      .first()
      .evaluate((el) => getComputedStyle(el).opacity),
  ).toBe("1");
  await page
    .getByRole("button", { name: "View Round-neck T-shirt", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "Round-neck T-shirt", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next product" }).click();
  await expect(page.locator("#preview-title")).toHaveAttribute(
    "aria-label",
    "Hoodie",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("#preview-title .letter-char")).toHaveCount(0);
  await page.getByRole("button", { name: "Next product" }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "Polo shirt", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("reduced motion and no-JavaScript leave all titles readable and footer links functional", async ({
  page,
  browser,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".letter-char")).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "Learn and play chess in Kericho.",
      exact: true,
    }),
  ).toBeVisible();
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 900 },
  });
  const other = await context.newPage();
  await other.goto("http://127.0.0.1:3000/");
  await expect(other.locator(".letter-char")).toHaveCount(0);
  await other
    .locator("footer")
    .getByRole("link", { name: "Join", exact: true })
    .click();
  await expect(other).toHaveURL(/registration\.html$/);
  await expect(
    other.getByRole("heading", { name: "Registration", exact: true }),
  ).toBeVisible();
  await context.close();
});
