import { test, expect } from "@playwright/test";

test("category filters select real items, announce counts, and preserve all-item browsing", async ({
  page,
}) => {
  await page.goto("/merchandise.html");
  const filters = page.getByRole("group", { name: "Filter products" });
  await filters.getByRole("button", { name: "Clothing", exact: true }).click();
  await expect(page.locator(".merch-card:visible")).toHaveCount(3);
  await expect(page.locator("#catalogue-status")).toHaveText(
    "Showing 3 clothing items",
  );
  await expect(
    filters.getByRole("button", { name: "Clothing", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#chess-set")).toBeHidden();
  await filters
    .getByRole("button", { name: "Chess equipment", exact: true })
    .click();
  await expect(page.locator(".merch-card:visible")).toHaveCount(3);
  await expect(page.locator("#academy-tshirt")).toBeHidden();
  await filters.getByRole("button", { name: "All items", exact: true }).click();
  await expect(page.locator(".merch-card:visible")).toHaveCount(6);
  await expect(page.locator("#catalogue-status")).toHaveText(
    "Showing all 6 items",
  );
});

test("quick look supports filtered previous/next, keyboard focus, Escape and item-specific enquiry", async ({
  page,
}) => {
  await page.goto("/merchandise.html");
  await page.getByRole("button", { name: "Clothing", exact: true }).click();
  const opener = page.getByRole("button", {
    name: "View Round-neck T-shirt",
    exact: true,
  });
  await opener.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("#preview-title")).toHaveText(
    "Round-neck T-shirt",
  );
  await expect(dialog.locator("#preview-image")).toHaveAttribute(
    "src",
    "assets/clothing/tshirt.png",
  );
  await expect(dialog.locator("#preview-position")).toHaveText("1 of 3 items");
  await expect(
    page.getByRole("button", { name: "Close product details" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Next product" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Close product details" }),
  ).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(dialog.locator("#preview-title")).toHaveText("Polo shirt");
  await page.keyboard.press("ArrowRight");
  await expect(dialog.locator("#preview-title")).toHaveText(
    "Round-neck T-shirt",
  );
  await page.getByRole("button", { name: "Next product" }).click();
  await expect(dialog.locator("#preview-title")).toHaveText("Hoodie");
  await expect(dialog.locator("#preview-description")).toContainText(
    "front pocket",
  );
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  await expect(page.locator("body")).not.toHaveClass(/product-preview-open/);
  await opener.click();
  await page.getByRole("button", { name: "Next product" }).click();
  await dialog
    .getByRole("link", { name: "Enquire about Hoodie", exact: true })
    .click();
  await expect(page.locator("[name=program]")).toHaveValue("Merchandise");
  await expect(page.locator("[name=message]")).toHaveValue(/academy hoodie/);
});

test("shared item links open the correct preview and copying reports only actual success", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (text) => (window.copiedItem = text) },
    });
  });
  await page.goto("/merchandise.html#chess-clock");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("#preview-title")).toHaveText("Chess clock");
  await dialog.getByRole("button", { name: "Share item", exact: true }).click();
  await expect(dialog.locator("#share-status")).toHaveText(
    "Item link copied. Ready to share.",
  );
  expect(await page.evaluate(() => window.copiedItem)).toMatch(
    /merchandise\.html#chess-clock$/,
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("Denied");
        },
      },
    }),
  );
  await dialog.getByRole("button", { name: "Share item", exact: true }).click();
  await expect(dialog.locator("#share-status")).toContainText(
    "Sharing is unavailable",
  );
  await expect(
    dialog.getByRole("textbox", { name: "Item link" }),
  ).toBeVisible();
  await expect(dialog.getByRole("textbox", { name: "Item link" })).toHaveValue(
    /#chess-clock$/,
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async () => {
        throw new DOMException("Cancelled", "AbortError");
      },
    }),
  );
  await dialog.getByRole("button", { name: "Share item", exact: true }).click();
  await expect(dialog.locator("#share-status")).toHaveText(
    "Sharing cancelled.",
  );
});

test("preview stays within mobile/tablet viewports, closes from the backdrop, and pauses garment motion", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/merchandise.html");
  await page
    .getByRole("button", { name: "View Round-neck T-shirt", exact: true })
    .click();
  const before = await page
    .locator("[data-apparel]")
    .evaluateAll((els) =>
      els.reduce((sum, el) => sum + Number(el.dataset.swipes || 0), 0),
    );
  await page.clock.fastForward(12000);
  expect(
    await page
      .locator("[data-apparel]")
      .evaluateAll((els) =>
        els.reduce((sum, el) => sum + Number(el.dataset.swipes || 0), 0),
      ),
  ).toBe(before);
  for (const width of [320, 390, 600, 851, 1440]) {
    await page.setViewportSize({ width, height: 700 });
    const box = await page.locator("#product-preview").boundingBox();
    expect(box.width).toBeLessThanOrEqual(width - 30);
    expect(box.height).toBeLessThanOrEqual(670);
    expect(
      await page
        .locator("#product-preview")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
  }
  await page.mouse.click(2, 2);
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("short descriptions and native enquiries remain available without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3000/merchandise.html");
  await expect(page.locator(".product-description")).toHaveCount(6);
  await expect(page.locator(".catalogue-tools")).toBeHidden();
  for (const button of await page.locator(".product-look").all())
    await expect(button).toBeHidden();
  await page.locator("#academy-polo .merchandise-enquiry").click();
  await expect(page).toHaveURL(/item=Academy\+polo\+shirt/);
  await context.close();
});
