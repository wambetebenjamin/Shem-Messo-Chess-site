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

test("source-inspired layout consistently uses our content and local declared typography", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const file of pages) {
    await page.goto(`/${file}.html`);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("body")).toHaveClass(/ck-design/);
    await expect(page.locator("main h1")).toHaveCount(1);
    expect(
      await page
        .locator("body")
        .evaluate((el) => getComputedStyle(el).fontFamily),
    ).toContain("Academy Open Sans");
    expect(
      await page
        .locator("h1")
        .evaluate((el) => getComputedStyle(el).fontFamily),
    ).toContain("Academy Raleway");
    expect(
      await page
        .locator("#navigation")
        .evaluate((el) => getComputedStyle(el).fontFamily),
    ).toContain("Academy Poppins");
    await expect(page.locator("#navigation a").nth(1)).toHaveAttribute(
      "href",
      "about.html",
    );
    if (file === "index")
      await expect(page.locator(".page-masthead")).toHaveCount(0);
    else {
      const breadcrumb = page.getByRole("navigation", {
        name: "Breadcrumb",
        exact: true,
      });
      await expect(breadcrumb).toBeVisible();
      await expect(
        breadcrumb.getByRole("link", { name: "Home", exact: true }),
      ).toHaveAttribute("href", "index.html");
      await expect(breadcrumb.locator("[aria-current=page]")).not.toBeEmpty();
      expect(
        await page
          .locator(".page-masthead")
          .evaluate((el) => getComputedStyle(el).backgroundColor),
      ).toBe("rgb(241, 244, 250)");
    }
    expect(await page.locator("body").innerText()).not.toMatch(
      /Chess Kenya Federation|1976|County Associations|Premier League|Sasha Mongeli|Cassidy Maina/,
    );
  }
  expect(errors).toEqual([]);
});

test("home adapts the photographic carousel, useful highlight strip and split About without fake counters", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page
      .locator(".hero-content")
      .evaluate((el) => getComputedStyle(el).textAlign),
  ).toBe("center");
  await expect(page.locator(".hero-slide")).toHaveCount(3);
  await expect(page.locator(".values-grid > a")).toHaveCount(3);
  for (const [i, href] of [
    "programs.html",
    "play.html",
    "registration.html",
  ].entries())
    await expect(page.locator(".values-grid > a").nth(i)).toHaveAttribute(
      "href",
      href,
    );
  await expect(
    page.locator(
      ".purecounter,[data-purecounter-end],.person-card,.staff-carousel",
    ),
  ).toHaveCount(0);
  await expect(page.locator("#community .quick-card")).toHaveCount(4);
  expect(
    await page
      .locator(".about-copy")
      .evaluate((el) => parseFloat(getComputedStyle(el).marginLeft)),
  ).toBeLessThan(0);
  await page.locator(".values-grid > a").nth(2).click();
  await expect(page).toHaveURL(/registration\.html$/);
});

test("all redesigned pages fit phone, tablet and desktop; touch navigation works at its new breakpoint", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const file of pages) {
    await page.goto(`/${file}.html`);
    await page.evaluate(() => document.fonts.ready);
    for (const width of [320, 390, 600, 851, 1024, 1200, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${file} at ${width}`,
      ).toBe(true);
      if (width <= 1100) {
        await expect(
          page.getByRole("button", { name: "Open navigation", exact: true }),
        ).toBeVisible();
      }
    }
  }
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await expect(page.locator("#navigation")).toBeVisible();
  await page
    .getByRole("button", { name: "Open programs menu", exact: true })
    .click();
  await expect(page.locator("#programs-menu")).toBeVisible();
  await page.locator("#programs-menu a").first().click();
  await expect(page).toHaveURL(/programs\.html#junior-program$/);
});

test("new design assets are local and contact destinations use labelled icons rather than printed details", async ({
  page,
}) => {
  const external = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://127.0.0.1:3000/")) external.push(r.url());
  });
  await page.goto("/contact.html");
  await page.evaluate(() => document.fonts.ready);
  const actions = page.locator(".contact-options");
  await expect(actions.locator("svg")).toHaveCount(3);
  await expect(
    actions.getByRole("link", { name: "Call the academy", exact: true }),
  ).toHaveAttribute("href", "tel:+254729037585");
  await expect(
    actions.getByRole("link", { name: "Email the academy", exact: true }),
  ).toHaveAttribute("href", "mailto:kerichochessacademy@gmail.com");
  expect(await page.locator("main").innerText()).not.toMatch(
    /\+254|kerichochessacademy@gmail/,
  );
  expect(external).toEqual([]);
});

test("source-inspired pages work without JavaScript and do not override the separate comparison", async ({
  browser,
  page,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const other = await context.newPage();
  await other.goto("http://127.0.0.1:3000/merchandise.html");
  await expect(
    other.getByRole("navigation", { name: "Breadcrumb" }),
  ).toBeVisible();
  await expect(other.locator(".product-description")).toHaveCount(6);
  await other.locator(".page-breadcrumbs a").click();
  await expect(other).toHaveURL(/index\.html$/);
  await expect(other.locator("h1")).toBeVisible();
  await context.close();
  await page.goto("/template-preview.html");
  await expect(page.locator("body")).not.toHaveClass(/ck-design/);
  await expect(
    page.locator('link[href="assets/academy-pages.css"]'),
  ).toHaveCount(0);
});
