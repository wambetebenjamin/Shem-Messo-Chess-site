import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

// Regression checks for the exact previous-branch UI, not the removed redesign.
test("public frontend matches the approved previous branch byte-for-byte", async () => {
  const hashes = {
    "index.html":
      "b17d777a2ab856e3ea59b465f7fc6e75b92aa5ab0ab4c3889e9cab2f42755ad2",
    "style.css":
      "c471f0f27c1cfc86658bd01f92063822a897e8d2c2d1980a9d7284aff09ebbfe",
    "script.js":
      "524ad29b3173c922248999e48cfdd22143b284c1010a171db10ada4f9f330fb1",
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
