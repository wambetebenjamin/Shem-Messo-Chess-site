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
test("short homepage preserves its navy palette, hero and photos", async ({
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
    "about.html",
  );
  await expect(page.locator("section#home")).toHaveCount(1);
  for (const id of ["about", "community"]) {
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
  await page.goto("/programs.html");
  await page.locator(".program-detail").first().click();
  await expect(page.locator("#program-dialog")).toBeVisible();
  await expect(page.locator("#dialog-title")).not.toBeEmpty();
  await page.getByRole("button", { name: "Close program details" }).click();
  await expect(page.locator("#program-dialog")).not.toBeVisible();
  await page.goto("/merchandise.html");
  await page.locator(".merchandise-enquiry").first().click();
  await expect(page).toHaveURL(/contact\.html\?/);
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
  await page.locator('#navigation a[href="about.html"]').click();
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
  ).toMatch(/^[0-9.]+px$/);
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
  await page.locator("#dialog-enquire").click();
  await expect(page).toHaveURL(/contact\.html\?program=/);
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
  await page.clock.fastForward(4100);
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

test("each main item is its own directly loadable page", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const item of ["about", "programs", "merchandise", "contact"]) {
    const response = await page.goto("/" + item + ".html");
    expect(response.status()).toBe(200);
    await expect(page.locator("main > section")).toHaveCount(
      item === "about" ? 2 : 1,
    );
    await expect(page.locator("section#" + item)).toHaveCount(1);
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page.locator("main .hero")).toHaveCount(0);
    await expect(page.locator(`[data-page=${item}]`)).toHaveAttribute(
      "aria-current",
      "page",
    );
    await page.reload();
    await expect(page.locator("section#" + item)).toHaveCount(1);
    await page.evaluate(() => {
      for (const image of document.images) image.loading = "eager";
    });
    await expect
      .poll(() =>
        page.evaluate(() =>
          [...document.images]
            .filter((img) => !img.naturalWidth)
            .map((img) => img.src),
        ),
      )
      .toEqual([]);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      item + " fits mobile",
    ).toBe(true);
    await page.setViewportSize({ width: 1280, height: 720 });
  }
  expect(errors).toEqual([]);
});

test("navigation and program anchors lead to their distinct pages", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("[data-page=about]").click();
  await expect(page).toHaveURL(/about\.html$/);
  await page.locator("#officials").scrollIntoViewIfNeeded();
  await expect(page.locator(".team-card")).toHaveCount(5);
  await page.getByRole("button", { name: "Open programs menu" }).click();
  await page.locator("#programs-menu a").last().click();
  await expect(page).toHaveURL(/programs\.html#school-program$/);
  await expect(page.locator("#school-program")).toBeVisible();
});

test("contact page safely handles query values and submits the enquiry via WhatsApp", async ({
  page,
}) => {
  await page.goto("/contact.html?program=Invalid&item=%3Cscript%3E");
  await expect(page.locator("[name=program]")).toHaveValue(
    "Junior chess academy",
  );
  await expect(page.locator("[name=message]")).toHaveValue("");
  await page.evaluate(() => {
    window.open = (url) => {
      window.lastEnquiry = url;
    };
  });
  await page.locator("[name=name]").fill("Test Visitor");
  await page.locator("[name=email]").fill("visitor@example.com");
  await page
    .locator("[name=message]")
    .fill("Please share the coaching schedule.");
  await page.getByRole("button", { name: "Continue on WhatsApp" }).click();
  const url = await page.evaluate(() => window.lastEnquiry);
  expect(url).toMatch(/^https:\/\/wa\.me\/254729037585\?text=/);
  expect(decodeURIComponent(url)).toContain(
    "Please share the coaching schedule.",
  );
});

test("local page links and anchors resolve without broken destinations", async ({
  page,
}) => {
  for (const file of [
    "index",
    "about",
    "programs",
    "team",
    "merchandise",
    "contact",
  ]) {
    await page.goto("/" + file + ".html");
    const links = await page
      .locator("a[href]")
      .evaluateAll((anchors) =>
        anchors
          .map((a) => a.href)
          .filter((href) => href.startsWith(location.origin)),
      );
    for (const link of new Set(links)) {
      const response = await page.request.get(link);
      expect(response.status(), link).toBe(200);
      const hash = new URL(link).hash.slice(1);
      if (hash) expect(await response.text(), link).toContain(`id="${hash}"`);
    }
  }
});

test("clean routes redirect to their documents and preserve enquiry context", async ({
  page,
}) => {
  await page.goto("/contact/?program=Chess%20in%20schools");
  await expect(page).toHaveURL(/contact\.html\?program=/);
  await expect(page.locator("[name=program]")).toHaveValue("Chess in schools");
  await page.goto("/about.html/");
  await expect(page).toHaveURL(/about\.html$/);
  await expect(page.locator("section#about")).toBeVisible();
});

test("standalone page content and ordinary navigation work without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3000/index.html");
  await expect(page.locator("h1")).toBeVisible();
  await page.locator("[data-page=about]").click();
  await expect(page).toHaveURL(/about\.html$/);
  await expect(page.locator("section#about")).toBeVisible();
  await expect(page.locator(".team-card")).toHaveCount(5);
  await context.close();
});

test("homepage is short and officials live only on About Us", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("main > section")).toHaveCount(4);
  await expect(
    page.locator(".staff-carousel, .team-card, #officials"),
  ).toHaveCount(0);
  await expect(page.locator(".quick-card")).toHaveCount(4);
  await page.locator('#about a[href="about.html"]').click();
  await expect(page.locator("#officials .team-card")).toHaveCount(5);
  await page.goto("/team.html");
  await expect(page).toHaveURL(/about\.html#officials$/);
});

test("footer is compact, icon-only and retains original social destinations on every page", async ({
  page,
}) => {
  for (const file of [
    "index",
    "about",
    "programs",
    "team",
    "merchandise",
    "contact",
  ]) {
    await page.goto("/" + file + ".html");
    const footer = page.locator("footer");
    await expect(footer).toHaveClass(/compact-footer/);
    expect(await footer.innerText()).not.toMatch(
      /Forward ever|Get in touch|Your next move|Explore/,
    );
    await expect(footer.locator("svg")).toHaveCount(5);
    await expect(
      footer.getByRole("link", { name: "Call the academy", exact: true }),
    ).toHaveAttribute("href", "tel:+254729037585");
    await expect(
      footer.getByRole("link", { name: "Email the academy", exact: true }),
    ).toHaveAttribute("href", "mailto:kerichochessacademy@gmail.com");
    await expect(
      footer.getByRole("link", { name: "Message the academy on WhatsApp" }),
    ).toHaveAttribute("href", "https://wa.me/254729037585");
    await expect(
      footer.getByRole("link", { name: "Facebook @smesso" }),
    ).toHaveAttribute("href", "https://www.facebook.com/smesso");
    await expect(
      footer.getByRole("link", { name: "TikTok @kericho.chess.clu" }),
    ).toHaveAttribute("href", "https://www.tiktok.com/@kericho.chess.clu");
    expect(await footer.innerText()).not.toContain(
      "kerichochessacademy@gmail.com",
    );
    expect(await footer.innerText()).not.toContain("729 037 585");
    await page.setViewportSize({ width: 320, height: 900 });
    await expect(footer.getByRole("navigation")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.setViewportSize({ width: 1280, height: 720 });
  }
});

test("decorative divider lines are removed while form fields remain usable", async ({
  page,
}) => {
  await page.goto("/");
  for (const selector of [
    "header",
    ".values",
    ".values-grid > a",
    ".mini-pieces",
    ".footer-bottom",
  ]) {
    const widths = await page
      .locator(selector)
      .first()
      .evaluate((el) => {
        const s = getComputedStyle(el);
        return [
          s.borderTopWidth,
          s.borderRightWidth,
          s.borderBottomWidth,
          s.borderLeftWidth,
        ];
      });
    expect(widths, selector).toEqual(["0px", "0px", "0px", "0px"]);
  }
  await page.goto("/contact.html");
  expect(
    await page
      .locator("[name=name]")
      .evaluate((el) => getComputedStyle(el).borderTopWidth),
  ).not.toBe("0px");
});

test("team photo cards transition, pause, and link to the full profile", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/about.html");
  const carousel = page.locator(".staff-carousel");
  await carousel.scrollIntoViewIfNeeded();
  await expect(page.locator(".staff-carousel-controls")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".staff-slide img")
        .evaluateAll((images) =>
          images.every((img) => img.complete && img.naturalWidth),
        ),
    )
    .toBe(true);
  await page.mouse.move(0, 0);
  await page.clock.fastForward(4100);
  await expect(page.locator('[data-staff="1"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "Next team photo" }).click();
  await expect(page.locator('[data-staff="2"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page
    .getByRole("button", { name: "Pause team photo transitions" })
    .click();
  await page
    .getByRole("button", { name: "Resume team photo transitions" })
    .blur();
  await page.mouse.move(0, 0);
  await page.clock.fastForward(15000);
  await expect(page.locator('[data-staff="2"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator(".staff-slide.is-active a").click();
  await expect(page).toHaveURL(/about\.html#staff-gladys-langat$/);
  await expect(page.locator("#staff-gladys-langat")).toBeVisible();
});

test("team cards respect reduced motion and inactive cards cannot receive focus", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/about.html");
  await page.locator(".staff-carousel").scrollIntoViewIfNeeded();
  await expect(page.locator(".staff-carousel-controls")).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Automatic team transitions disabled for reduced motion",
    }),
  ).toBeDisabled();
  await page.clock.fastForward(15000);
  await expect(page.locator('[data-staff="0"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page
    .getByRole("button", { name: "Show Barnabas Ochieng photo" })
    .click();
  await expect(page.locator(".staff-slide.is-active h3")).toHaveText(
    "Barnabas Ochieng",
  );
  expect(
    await page
      .locator(".staff-slide:not(.is-active)")
      .evaluateAll((slides) =>
        slides.every(
          (slide) =>
            slide.inert && slide.getAttribute("aria-hidden") === "true",
        ),
      ),
  ).toBe(true);
  expect(
    await page
      .locator(".staff-slide")
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0s");
});

test("hero automatically rotates every four seconds even with hover and control focus", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await expect
    .poll(() =>
      page
        .locator(".hero-slide")
        .evaluateAll((images) =>
          images.every((img) => img.complete && img.naturalWidth),
        ),
    )
    .toBe(true);
  await page.locator(".hero").hover();
  await page.getByRole("button", { name: "Next hero photo" }).focus();
  await page.clock.fastForward(4100);
  await expect(page.locator('[data-photo="1"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.clock.fastForward(4100);
  await expect(page.locator('[data-photo="2"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("staff cards automatically rotate every four seconds without clicking", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/about.html");
  await page.locator(".staff-carousel").scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page
        .locator(".staff-slide img")
        .evaluateAll((images) =>
          images.every((img) => img.complete && img.naturalWidth),
        ),
    )
    .toBe(true);
  await page.locator(".staff-carousel").hover();
  await page.getByRole("button", { name: "Next team photo" }).focus();
  await page.clock.fastForward(4100);
  await expect(page.locator('[data-staff="1"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.clock.fastForward(4100);
  await expect(page.locator('[data-staff="2"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator(".staff-slide.is-active a").focus();
  await page.clock.fastForward(8100);
  await expect(page.locator('[data-staff="2"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".staff-slide.is-active a")).toBeFocused();
});
