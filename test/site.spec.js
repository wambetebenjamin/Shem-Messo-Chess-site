import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

// Existing photography stays original while requested interactions evolve.
test("original photo assets remain unchanged", async () => {
  const hashes = {
    "assets/site-photos/README.md":
      "b5c494231d79687f649bae43c4b2bad8802e30ff04935b0b2efa8dcd73f3410a",
    "assets/site-photos/chess-clock.jpg":
      "891ee1b7f66edc7da4458ae58feb9c944dc2007989adbea39fe18c621bbd6fdf",
    "assets/site-photos/chess-set.jpg":
      "4bbff8df4f5008c1b8c0fdf83048f0123ef03b5af792862d0345628fc0c16305",
    "assets/site-photos/tournament-room.jpg":
      "05b5e7dfa168290a28a552973c2045fd5ac68955b7e639a6948d1c49760ea92e",
  };
  for (const [file, hash] of Object.entries(hashes)) {
    expect(createHash("sha256").update(readFileSync(file)).digest("hex")).toBe(
      hash,
    );
  }
});
test("original sections, navy palette and images are intact", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Learn and play chess in Kericho." }),
  ).toBeVisible();
  await expect(page.locator("#navigation a").nth(1)).toHaveAttribute(
    "href",
    "#about",
  );
  for (const id of [
    "home",
    "about",
    "programs",
    "team",
    "merchandise",
    "contact",
  ]) {
    await expect(page.locator("section#" + id)).toHaveCount(1);
  }
  await page.evaluate(() => {
    for (const image of document.images) image.loading = "eager";
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.images]
          .filter((img) => !img.naturalWidth)
          .map((img) => img.getAttribute("src")),
      ),
    )
    .toEqual([]);
  expect(errors).toEqual([]);
});
test("original program dialog and merchandise enquiries still work", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".program-detail").first().click();
  await expect(page.locator("#program-dialog")).toBeVisible();
  await expect(page.locator("#dialog-title")).not.toBeEmpty();
  await page.getByRole("button", { name: "Close program details" }).click();
  await expect(page.locator("#program-dialog")).not.toBeVisible();
  await page.locator(".merchandise-enquiry").first().click();
  await expect(page.locator("[name=program]")).toHaveValue("Merchandise");
  await expect(page.locator("[name=message]")).toHaveValue(
    /price and availability/,
  );
});
test("original mobile navigation works without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Open navigation" });
  await menu.click();
  await expect(page.locator("#navigation")).toHaveClass(/open/);
  await page.locator('#navigation a[href="#about"]').click();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("top strip removed and text enlarged without changing colors", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".topbar")).toHaveCount(0);
  expect(
    await page.locator("body").evaluate((el) => getComputedStyle(el).fontSize),
  ).toBe("18px");
  expect(
    await page.locator("h1").evaluate((el) => getComputedStyle(el).fontSize),
  ).toBe("69px");
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--navy")
        .trim(),
    ),
  ).toBe("#14233f");
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--blue")
        .trim(),
    ),
  ).toBe("#2563eb");
  for (const width of [320, 390, 600, 851, 900, 1024, 1200, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `No overflow at ${width}px`,
    ).toBe(true);
    const overlap = await page.evaluate(() => {
      const nav = document.querySelector("nav");
      if (getComputedStyle(nav).display === "none") return false;
      return (
        document.querySelector("header .brand").getBoundingClientRect().right >
        nav.getBoundingClientRect().left
      );
    });
    expect(overlap, `No header overlap at ${width}px`).toBe(false);
  }
});

test("program dropdowns work with keyboard, outside click, and enquiries", async ({
  page,
}) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Open programs menu" });
  await toggle.focus();
  await page.keyboard.press("ArrowDown");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#programs-menu a").first()).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#programs-menu a").nth(1)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(page.locator("#programs-menu")).toBeHidden();
  await toggle.click();
  await page.locator("h1").click({ position: { x: 10, y: 10 } });
  await expect(page.locator("#programs-menu")).toBeHidden();
  await page.getByRole("button", { name: "Choose a chess program" }).click();
  await page.locator('[data-program-choice="Chess in schools"]').click();
  await expect(page.locator("#program-dialog")).toBeVisible();
  await expect(page.locator("#dialog-title")).toHaveText("Chess in schools");
  await expect(page.locator("[name=program]")).toHaveValue("Chess in schools");
});

test("hero crossfades, manual controls work, and pause persists", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await expect(page.locator(".hero-photo-controls")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".hero-slide")
        .evaluateAll((images) =>
          images.every((img) => img.complete && img.naturalWidth),
        ),
    )
    .toBe(true);
  await page.mouse.move(0, 0);
  await page.clock.fastForward(7100);
  await expect(page.locator('[data-photo="1"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Next hero photo" }).click();
  await expect(page.locator('[data-photo="2"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Previous hero photo" }).click();
  await expect(page.locator('[data-photo="1"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page
    .getByRole("button", { name: "Pause hero photo transitions" })
    .click();
  await page.locator("header .brand").focus();
  await page.mouse.move(0, 0);
  await page.clock.fastForward(15000);
  await expect(page.locator('[data-photo="1"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "Resume hero photo transitions" }),
  ).toBeVisible();
});

test("reduced motion disables automatic transitions but permits photo choice", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/");
  await expect(page.locator(".hero-photo-controls")).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Automatic transitions disabled for reduced motion",
    }),
  ).toBeDisabled();
  await page.clock.fastForward(15000);
  await expect(page.locator('[data-photo="0"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page
    .getByRole("button", { name: "Show tournament boards photo" })
    .click();
  await expect(page.locator('[data-photo="1"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(
    await page
      .locator(".hero-slide")
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0s");
});

test("dropdowns fit and close correctly on narrow screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Open programs menu" }).click();
  await expect(page.locator("#programs-menu")).toBeVisible();
  await page.locator("#programs-menu a").first().click();
  await expect(page.locator("#navigation")).not.toHaveClass(/open/);
  await expect(page.locator("#programs-menu")).toBeHidden();
  await page.locator("header .brand").click();
  await page.getByRole("button", { name: "Choose a chess program" }).click();
  await expect(page.locator("#hero-programs-menu")).toBeVisible();
  const bounds = await page.locator("#hero-programs-menu").boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("mobile dropdown options are not covered by slideshow controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Choose a chess program" }).click();
  await page.locator('[data-program-choice="Chess in schools"]').click();
  await expect(page.locator("#dialog-title")).toHaveText("Chess in schools");
  await expect(page.locator("#program-dialog")).toBeVisible();
});

test("failed background photo is skipped without a blank hero", async ({
  page,
}) => {
  await page.route("**/assets/tournament-prep-02.jpg", (route) =>
    route.abort(),
  );
  await page.goto("/");
  await expect(page.locator(".hero-photo-controls")).toBeVisible();
  await expect(page.locator('[data-photo="1"]')).toBeDisabled();
  await page.getByRole("button", { name: "Next hero photo" }).click();
  await expect(page.locator('[data-photo="2"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".hero-slide.is-active")).toHaveAttribute(
    "src",
    "assets/tournament-prep-09.jpg",
  );
});
