import { test, expect } from "@playwright/test";
const errors = [];
test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => errors.push(error.message));
});
async function account(page, name) {
  await page.goto("/play");
  await page.getByRole("tab", { name: "Play the computer" }).click();
  await page.getByRole("button", { name: "Log in / create account" }).click();
  await page
    .getByRole("button", { name: "New here? Create an account" })
    .click();
  await page.getByLabel("Display name").fill(name);
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${name}-${Date.now()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("test-password-1234");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator("#board-status")).toHaveText("White to move.");
}
test("simple home, about and embedded registration", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Small moves. Brighter futures." }),
  ).toBeVisible();
  await expect(page.locator(".profile")).toHaveCount(0);
  await page.getByRole("link", { name: "About Us", exact: true }).click();
  await expect(page.locator(".profile")).toHaveCount(2);
  const names = await page.locator("nav a").allTextContents();
  expect(names.slice(0, 2)).toEqual(["Home", "About Us"]);
  await page.getByRole("link", { name: "Registration", exact: true }).click();
  await expect(page.locator("iframe")).toHaveAttribute("src", /1FAIpQLSdbieIf/);
  await page.getByRole("tab", { name: "Photo & video consent" }).click();
  await expect(page.locator("iframe")).toHaveAttribute("src", /1FAIpQLSefyh/);
  expect(errors).toEqual([]);
});
test("puzzle is open, play requires login, computer responds, logout closes gate", async ({
  page,
}) => {
  await page.goto("/play");
  await expect(page.locator("#board-status")).toContainText(
    "Find checkmate in one.",
  );
  await expect(page.locator(".square")).toHaveCount(64);
  await page.getByRole("button", { name: "Show a hint" }).click();
  await expect(page.locator("#puzzle-hint")).not.toBeEmpty();
  await page.getByRole("tab", { name: "Play the computer" }).click();
  await expect(
    page.getByRole("heading", { name: "Log in to make your move." }),
  ).toBeVisible();
  await account(page, "player-one");
  await page.locator("[data-square=e2]").click();
  await page.locator("[data-square=e4]").click();
  await expect(page.locator("#moves")).toContainText("1. e4");
  await expect(page.locator("#board-status")).toHaveText(/White to move/);
  await page.locator("#account-button").click();
  await expect(
    page.getByRole("heading", { name: "Log in to make your move." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("two actual accounts match and exchange legal moves", async ({
  browser,
}) => {
  const a = await browser.newContext(),
    b = await browser.newContext();
  const p = await a.newPage(),
    q = await b.newPage();
  await account(p, "online-one");
  await account(q, "online-two");
  await p.getByRole("tab", { name: "Online opponent" }).click();
  await q.getByRole("tab", { name: "Online opponent" }).click();
  await p.getByRole("button", { name: "Find an opponent" }).click();
  await expect(p.locator("#board-status")).toContainText(
    "Waiting for another player",
  );
  await q.getByRole("button", { name: "Find an opponent" }).click();
  await expect(p.locator("#opponent")).toContainText("You are White");
  await expect(q.locator("#opponent")).toContainText("You are Black");
  await p.locator("[data-square=e2]").click();
  await p.locator("[data-square=e4]").click();
  await expect(q.locator("#moves")).toContainText("e4");
  await q.locator("[data-square=e7]").click();
  await q.locator("[data-square=e5]").click();
  await expect(p.locator("#moves")).toContainText("e5");
  await q.close();
  await expect(p.locator("#board-status")).toContainText(
    "opponent disconnected",
  );
  await a.close();
  await b.close();
});
test("feedback, FAQ, events and narrow layout", async ({ page }) => {
  await page.goto("/help");
  await page
    .getByText("How do I register for membership?", { exact: true })
    .click();
  await expect(
    page.getByText("Open Registration, select Academy membership", {
      exact: false,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Your message")
    .fill("Please add more daily puzzle challenges.");
  await page.getByRole("button", { name: "Send feedback" }).click();
  await expect(page.locator("#feedback-status")).toContainText(
    "saved for academy review",
  );
  await page.goto("/events");
  await expect(
    page.getByRole("heading", { name: "Next event: to be announced." }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page.getByRole("link", { name: "About Us", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto("/play");
  await expect(page.locator("#board-status")).toContainText("Find checkmate");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("daily puzzle can be solved on the board and push denial is clear", async ({
  page,
}) => {
  await page.goto("/play");
  await expect(page.locator("#board-status")).toContainText("Find checkmate");
  const puzzle = await (await page.request.get("/api/puzzle")).json();
  const { Chess } = await import("chess.js");
  const game = new Chess(puzzle.fen);
  let solution;
  for (const move of game.moves({ verbose: true })) {
    game.move(move);
    if (game.isCheckmate()) solution = move;
    game.undo();
  }
  await page.locator(`[data-square=${solution.from}]`).click();
  await page.locator(`[data-square=${solution.to}]`).click();
  await expect(page.locator("#board-status")).toContainText(
    "Well done — checkmate!",
  );
  await page.goto("/events");
  await page.evaluate(() => {
    Notification.requestPermission = async () => "denied";
  });
  await page.locator("#push-button").click();
  await expect(page.locator("#push-status")).toContainText(
    "Notifications are not allowed",
  );
});
