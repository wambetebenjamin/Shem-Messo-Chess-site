import { test, expect } from "@playwright/test";
async function products(page) {
  await page.goto("/merchandise.html");
  await page.evaluate(() => {
    for (const image of document.images) image.loading = "eager";
  });
  await expect
    .poll(() =>
      page
        .locator(".apparel-photo")
        .evaluateAll((images) =>
          images.every((image) => image.complete && image.naturalWidth),
        ),
    )
    .toBe(true);
}
async function swipes(page) {
  return page
    .locator("[data-apparel]")
    .evaluateAll((els) =>
      els.reduce((sum, el) => sum + Number(el.dataset.swipes || 0), 0),
    );
}

test("merchandise is concise photography, not a renderer or technical description", async ({
  page,
}) => {
  const requests = [],
    errors = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("pageerror", (error) => errors.push(error.message));
  await products(page);
  await expect(page.locator(".merch-card")).toHaveCount(6);
  await expect(
    page.locator("canvas, .garment-controls, .garment-status"),
  ).toHaveCount(0);
  expect(await page.locator("#merchandise").innerText()).not.toMatch(
    /3D|illustrat|rotate|reference design/i,
  );
  await expect(page.locator(".product-description")).toHaveCount(6);
  for (const description of await page.locator(".product-description").all()) {
    const words = (await description.innerText()).trim().split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(15);
    expect(words).toBeLessThanOrEqual(30);
  }
  expect(
    (await page.locator("#merchandise").innerText()).split(/\s+/).length,
  ).toBeLessThan(240);
  for (const name of ["tshirt", "hoodie", "polo"])
    await expect(page.locator(`#academy-${name} img`)).toHaveAttribute(
      "src",
      `assets/clothing/${name}.png`,
    );
  await expect(page.locator("#chess-set img")).toHaveAttribute(
    "src",
    "assets/site-photos/chess-set.jpg",
  );
  await expect(page.locator("#chess-clock img")).toHaveAttribute(
    "src",
    "assets/site-photos/chess-clock.jpg",
  );
  expect(
    requests.some((url) => /three|merchandise-3d|viewers\.js/.test(url)),
  ).toBe(false);
  expect(errors).toEqual([]);
});

test("quick staggered swipes return to rest, and pause/resume is persistent", async ({
  page,
}) => {
  await page.clock.install();
  await products(page);
  await page.mouse.move(0, 0);
  await page.clock.fastForward(3000);
  expect(await swipes(page)).toBeGreaterThan(0);
  await page.clock.fastForward(800);
  await expect(page.locator(".is-swiping")).toHaveCount(0);
  await page.getByRole("button", { name: "Pause product motion" }).click();
  const stopped = await swipes(page);
  await page.clock.fastForward(20000);
  expect(await swipes(page)).toBe(stopped);
  await page.getByRole("button", { name: "Resume product motion" }).click();
  await page.clock.fastForward(3000);
  expect(await swipes(page)).toBeGreaterThan(stopped);
});

test("an inspected or keyboard-focused item stays still", async ({ page }) => {
  await page.clock.install();
  await products(page);
  const first = page.locator("[data-apparel=tshirt]");
  await first.hover();
  await page.clock.fastForward(6000);
  expect(Number(await first.getAttribute("data-swipes"))).toBe(0);
  await page.mouse.move(0, 0);
  await page.locator("#academy-tshirt .merchandise-enquiry").focus();
  await page.clock.fastForward(6000);
  expect(Number(await first.getAttribute("data-swipes"))).toBe(0);
});

test("a horizontal swipe folds back quickly without changing the product", async ({
  page,
}) => {
  await page.clock.install();
  await products(page);
  await page.getByRole("button", { name: "Pause product motion" }).click();
  const image = page.locator("[data-apparel=tshirt]");
  const box = await image.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 65, box.y + box.height / 2, {
    steps: 5,
  });
  await page.mouse.up();
  expect(await swipes(page)).toBe(1);
  await page.clock.fastForward(800);
  await expect(image).not.toHaveClass(/is-swiping/);
  await expect(image.locator("img")).toHaveAttribute(
    "src",
    "assets/clothing/tshirt.png",
  );
});

test("reduced motion and no-JavaScript keep all products visible and static", async ({
  page,
  browser,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await products(page);
  await page.clock.fastForward(20000);
  expect(await swipes(page)).toBe(0);
  await expect(page.locator("#product-motion")).toBeHidden();
  const context = await browser.newContext({ javaScriptEnabled: false });
  const other = await context.newPage();
  await other.goto("http://127.0.0.1:3000/merchandise.html");
  await expect(other.locator(".apparel-photo")).toHaveCount(3);
  for (const name of ["tshirt", "hoodie", "polo"])
    await expect(other.locator(`#academy-${name} img`)).toBeVisible();
  await expect(other.locator("#product-motion")).toBeHidden();
  await other.locator("#academy-tshirt .merchandise-enquiry").click();
  await expect(other).toHaveURL(
    /contact\.html\?program=Merchandise&item=Round-neck\+T-shirt/,
  );
  await context.close();
});

test("all product enquiries preserve their correct context and the layout fits mobile", async ({
  page,
}) => {
  await products(page);
  for (const width of [320, 390, 600, 851, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      String(width),
    ).toBe(true);
  }
  for (const [id, item] of [
    ["academy-tshirt", "round-neck t-shirt"],
    ["academy-hoodie", "academy hoodie"],
    ["academy-polo", "academy polo shirt"],
    ["chess-set", "chess set"],
    ["chess-clock", "chess clock"],
    ["school-equipment", "school & club equipment"],
  ]) {
    await page.goto("/merchandise.html");
    await page.locator(`#${id} .merchandise-enquiry`).click();
    await expect(page.locator("[name=program]")).toHaveValue("Merchandise");
    await expect(page.locator("[name=message]")).toHaveValue(new RegExp(item));
  }
});

test("offscreen and hidden-page effects stop until the products are visible again", async ({
  page,
}) => {
  await page.clock.install();
  await products(page);
  await page.mouse.move(0, 0);
  await page.clock.fastForward(3000);
  const started = await swipes(page);
  await page.evaluate(() =>
    window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }),
  );
  await page
    .getByRole("link", { name: "See events", exact: true })
    .scrollIntoViewIfNeeded();
  await page.clock.fastForward(10000);
  expect(await swipes(page)).toBe(started);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.locator("[data-apparel=tshirt]").scrollIntoViewIfNeeded();
  await page.clock.fastForward(3000);
  expect(await swipes(page)).toBeGreaterThan(started);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const hidden = await swipes(page);
  await page.clock.fastForward(10000);
  expect(await swipes(page)).toBe(hidden);
});

test("footer shortcuts work on every main page and use comfortably sized touch targets", async ({
  page,
}) => {
  for (const file of [
    "index",
    "about",
    "programs",
    "merchandise",
    "contact",
    "registration",
    "events",
    "help",
    "play",
  ]) {
    await page.goto(`/${file}.html`);
    const footer = page.locator("footer");
    await expect(footer.locator(".footer-quick-actions a")).toHaveCount(3);
    await expect(
      footer.locator(".footer-quick-actions a").nth(0),
    ).toHaveAttribute("href", "registration.html");
    await expect(
      footer.locator(".footer-quick-actions a").nth(1),
    ).toHaveAttribute("href", "play.html");
    await expect(
      footer.locator(".footer-quick-actions a").nth(2),
    ).toHaveAttribute("href", "events.html");
    await page.setViewportSize({ width: 320, height: 900 });
    for (const link of await footer
      .locator(
        ".footer-links a, .footer-contact-icons a, .footer-quick-actions a, .footer-bottom a",
      )
      .all()) {
      const box = await link.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      file,
    ).toBe(true);
    await page.setViewportSize({ width: 1280, height: 900 });
  }
  await page
    .locator("footer")
    .getByRole("link", { name: "Join the academy", exact: true })
    .click();
  await expect(page).toHaveURL(/registration\.html$/);
});

test("footer links have visible keyboard feedback and CTA hover respects reduced motion", async ({
  page,
}) => {
  await page.goto("/");
  const join = page.locator("footer .footer-quick-actions a").first();
  await join.scrollIntoViewIfNeeded();
  await page.keyboard.press("Tab");
  await join.focus();
  await expect(join).toBeFocused();
  expect(
    await join.evaluate((el) => getComputedStyle(el).outlineStyle),
  ).not.toBe("none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await join.hover();
  expect(await join.evaluate((el) => getComputedStyle(el).transform)).toBe(
    "none",
  );
});
