import { test, expect } from "@playwright/test";

test.use({
  launchOptions: {
    executablePath: process.env.CHROMIUM_EXECUTABLE,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--enable-unsafe-swiftshader",
      "--use-gl=angle",
      "--use-angle=swiftshader",
    ],
  },
});
async function ready(page) {
  await page.goto("/merchandise.html");
  await expect(page.locator("[data-garment]")).toHaveCount(3);
  await expect
    .poll(() =>
      page
        .locator("[data-garment]")
        .evaluateAll((els) =>
          els.every(
            (el) => el.dataset.ready === "true" && el.querySelector("canvas"),
          ),
        ),
    )
    .toBe(true);
}

test("three real WebGL illustrations load locally alongside unchanged equipment", async ({
  page,
}) => {
  const errors = [],
    external = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:3000/"))
      external.push(request.url());
  });
  await ready(page);
  await expect(page.locator(".merch-card")).toHaveCount(6);
  await expect(page.locator("#chess-set img")).toHaveAttribute(
    "src",
    "assets/site-photos/chess-set.jpg",
  );
  await expect(page.locator("#chess-clock img")).toHaveAttribute(
    "src",
    "assets/site-photos/chess-clock.jpg",
  );
  await expect(page.locator("#school-equipment img")).toHaveAttribute(
    "src",
    "assets/tournament-prep-09.jpg",
  );
  await expect(page.locator("#merchandise")).toContainText(
    "rear styling is illustrative",
  );
  await expect(page.locator("canvas[role=img]")).toHaveCount(3);
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});

test("each garment rotates independently and an explicit pause persists", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await ready(page);
  const tee = page.locator("[data-garment=tshirt]"),
    polo = page.locator("[data-garment=polo]");
  await expect.poll(() => tee.getAttribute("data-angle")).not.toBeNull();
  const start = await tee.getAttribute("data-angle");
  await expect.poll(() => tee.getAttribute("data-angle")).not.toBe(start);
  await tee.getByRole("button", { name: "Show front of T-shirt" }).click();
  await expect(tee).toHaveAttribute("data-angle", "0.000");
  const otherStart = await polo.getAttribute("data-angle");
  await expect.poll(() => polo.getAttribute("data-angle")).not.toBe(otherStart);
  await expect(tee).toHaveAttribute("data-angle", "0.000");
  await tee.getByRole("button", { name: "Resume T-shirt rotation" }).click();
  await expect.poll(() => tee.getAttribute("data-angle")).not.toBe("0.000");
});

test("front, step-turn and pointer drag work without rotating a flat photo", async ({
  page,
}) => {
  await ready(page);
  const tee = page.locator("[data-garment=tshirt]");
  await tee.getByRole("button", { name: "Show front of T-shirt" }).click();
  await expect(tee).toHaveAttribute("data-angle", "0.000");
  await tee.getByRole("button", { name: "Turn T-shirt right" }).click();
  await expect(tee).toHaveAttribute("data-angle", "0.785");
  await tee.getByRole("button", { name: "Turn T-shirt left" }).click();
  await expect(tee).toHaveAttribute("data-angle", "0.000");
  const bounds = await tee.locator("canvas").boundingBox();
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width / 2 + 70,
    bounds.y + bounds.height / 2,
    { steps: 5 },
  );
  await page.mouse.up();
  await expect.poll(() => tee.getAttribute("data-angle")).not.toBe("0.000");
  await expect(
    tee.getByRole("button", { name: "Resume T-shirt rotation" }),
  ).toBeVisible();
  await expect(tee.locator(".garment-fallback")).toBeHidden();
});

test("reduced motion disables autoplay while manual turns fit 320–1440px", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  const tee = page.locator("[data-garment=tshirt]");
  await expect(
    tee.getByRole("button", {
      name: "Automatic T-shirt rotation disabled for reduced motion",
    }),
  ).toBeDisabled();
  await tee.getByRole("button", { name: "Show front of T-shirt" }).click();
  await expect(tee).toHaveAttribute("data-angle", "0.000");
  await tee.getByRole("button", { name: "Turn T-shirt left" }).click();
  await expect(tee).toHaveAttribute("data-angle", "-0.785");
  for (const width of [320, 390, 600, 851, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      String(width),
    ).toBe(true);
  }
});

test("unavailable WebGL leaves usable static reference images and enquiries", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return String(type).includes("webgl")
        ? null
        : original.call(this, type, ...args);
    };
  });
  await page.goto("/merchandise.html");
  for (const kind of ["tshirt", "hoodie", "polo"]) {
    const root = page.locator(`[data-garment=${kind}]`);
    await expect(root).toHaveAttribute("data-ready", "fallback");
    await expect(root.locator(".garment-fallback")).toBeVisible();
    await expect(root.locator(".garment-controls")).toBeHidden();
    await expect(root.locator(".garment-status")).toContainText(
      "Showing the supplied clothing reference",
    );
  }
  await page.locator("#academy-hoodie .merchandise-enquiry").click();
  await expect(page).toHaveURL(
    /contact\.html\?program=Merchandise&item=Academy\+hoodie$/,
  );
  await expect(page.locator("[name=message]")).toHaveValue(/academy hoodie/);
});

test("each apparel enquiry carries the correct garment to Contact", async ({
  page,
}) => {
  for (const [kind, label] of [
    ["tshirt", "round-neck t-shirt"],
    ["hoodie", "academy hoodie"],
    ["polo", "academy polo shirt"],
  ]) {
    await page.goto("/merchandise.html");
    await page.locator(`#academy-${kind} .merchandise-enquiry`).click();
    await expect(page.locator("[name=program]")).toHaveValue("Merchandise");
    await expect(page.locator("[name=message]")).toHaveValue(new RegExp(label));
  }
});

test("without JavaScript all three supplied clothing references remain visible", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3000/merchandise.html");
  for (const kind of ["tshirt", "hoodie", "polo"])
    await expect(
      page.locator(`[data-garment=${kind}] .garment-fallback`),
    ).toBeVisible();
  await expect(page.locator(".merch-card")).toHaveCount(6);
  await context.close();
});

test("a lost rendering context returns that garment to its reference photo", async ({
  page,
}) => {
  await ready(page);
  const tee = page.locator("[data-garment=tshirt]");
  await tee
    .locator("canvas")
    .evaluate((canvas) =>
      canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
    );
  await expect(tee).toHaveAttribute("data-ready", "fallback");
  await expect(tee.locator("canvas")).toHaveCount(0);
  await expect(tee.locator(".garment-fallback")).toBeVisible();
  await expect(page.locator("[data-garment=polo]")).toHaveAttribute(
    "data-ready",
    "true",
  );
});

test("automatic rotation suspends offscreen and in hidden tabs, then resumes", async ({
  page,
}) => {
  await ready(page);
  const tee = page.locator("[data-garment=tshirt]");
  await expect.poll(() => tee.getAttribute("data-angle")).not.toBeNull();
  await page.evaluate(() =>
    window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }),
  );
  await page.waitForTimeout(200);
  const offscreen = await tee.getAttribute("data-angle");
  await page.waitForTimeout(250);
  await expect(tee).toHaveAttribute("data-angle", offscreen);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect.poll(() => tee.getAttribute("data-angle")).not.toBe(offscreen);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(100);
  const hidden = await tee.getAttribute("data-angle");
  await page.waitForTimeout(250);
  await expect(tee).toHaveAttribute("data-angle", hidden);
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => tee.getAttribute("data-angle")).not.toBe(hidden);
});
