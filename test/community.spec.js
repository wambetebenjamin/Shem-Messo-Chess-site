import { test, expect } from "@playwright/test";
import { Chess } from "chess.js";
const base = "http://127.0.0.1:3000";
async function createPlayer(page, name) {
  await page.goto("/play.html");
  const form = page.locator("#account-form");
  await form.locator('[name="name"]').fill(name);
  await form
    .locator('[name="email"]')
    .fill(
      `browser-${name.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.invalid`,
    );
  await form.locator('[name="password"]').fill("browser-only-test-password");
  await expect(form.locator("button")).toBeEnabled();
  await form.locator("button").click();
  await expect(page.locator("#player-greeting")).toContainText(name);
}

test("community pages, mobile navigation, and all local destinations resolve", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const name of ["registration", "events", "help", "play"]) {
    await page.goto(`/${name}.html`);
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(
      page.locator(`#navigation a[data-page=${name}]`),
    ).toHaveAttribute("aria-current", "page");
    await expect(page.locator("#navigation a").nth(1)).toHaveAttribute(
      "href",
      "about.html",
    );
    for (const width of [320, 390, 851, 1024, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${name} at ${width}`,
      ).toBe(true);
    }
    const hrefs = await page
      .locator("a[href]")
      .evaluateAll((anchors) =>
        anchors
          .map((a) => a.href)
          .filter((href) => href.startsWith(location.origin)),
      );
    for (const href of new Set(hrefs)) {
      const response = await page.request.get(href);
      expect(response.ok(), href).toBe(true);
      const hash = new URL(href).hash.slice(1);
      if (hash) expect(await response.text()).toContain(`id="${hash}"`);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Open community menu" }).click();
  await page.locator('#community-menu a[href="play.html"]').click();
  await expect(page).toHaveURL(/play\.html$/);
  expect(errors).toEqual([]);
});

test("official forms are embedded on request, keyboard tabs and fallback links work", async ({
  page,
}) => {
  const googleRequests = [];
  page.on("request", (request) => {
    if (request.url().includes("docs.google.com"))
      googleRequests.push(request.url());
  });
  await page.route("https://docs.google.com/**", (route) => route.abort());
  await page.goto("/registration.html");
  expect(googleRequests).toEqual([]);
  await expect(page.locator("#membership-frame")).not.toHaveAttribute("src");
  await page
    .getByRole("button", { name: "Load membership registration form here" })
    .click();
  await expect(page.locator("#membership-frame")).toBeVisible();
  await expect(page.locator("#membership-frame")).toHaveAttribute(
    "src",
    /1FAIpQLSdbieIfMBN_VQPdNGKFHh1rPMa_JFpRZUUhkHEEU92DbUgJGw\/viewform\?embedded=true$/,
  );
  await page.locator("#membership-tab").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#consent-tab")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator("#membership-panel")).toBeHidden();
  await expect(page.locator("#consent-panel")).toContainText("separate");
  await page
    .getByRole("button", { name: "Load photo & video consent form here" })
    .click();
  await expect(page.locator("#consent-frame")).toHaveAttribute(
    "src",
    /1FAIpQLSefyh1CBlzc_YsCPh9dp8oNl9dcBPjr4cNvjET8ob4ndaodzw\/viewform\?embedded=true$/,
  );
  await expect(page.locator("#consent-panel a[target=_blank]")).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  );
  await page.locator("#consent-tab").focus();
  await page.keyboard.press("Home");
  await expect(page.locator("#membership-tab")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.locator("#go-consent").click();
  await expect(page.locator("#consent-tab")).toBeFocused();
});

test("feedback saves privately, validates length, and never puts messages in URLs", async ({
  page,
}) => {
  await page.goto("/help.html");
  const form = page.locator("#feedback-form");
  await expect(form).toHaveAttribute("method", "post");
  await form.locator("textarea").fill("short");
  await form.locator("button").click();
  await expect(page.locator("#feedback-status")).not.toContainText(
    "saved privately",
  );
  await form
    .locator("textarea")
    .fill("Browser test: clearer instructions for beginner chess practice.");
  await form.locator("button").click();
  await expect(page.locator("#feedback-status")).toContainText(
    "saved privately",
  );
  await expect(form.locator("textarea")).toHaveValue("");
  await expect(page).toHaveURL(/help\.html$/);
  expect((await page.request.get("/api/feedback")).status()).toBe(404);
});

test("failed feedback retains the message and reports failure without claiming success", async ({
  page,
}) => {
  await page.route("**/api/feedback", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Feedback service temporarily unavailable.",
      }),
    }),
  );
  await page.goto("/help.html");
  await page
    .locator("#feedback-form textarea")
    .fill("Please improve the registration instructions.");
  await page.getByRole("button", { name: "Send feedback" }).click();
  await expect(page.locator("#feedback-status")).toContainText(
    "temporarily unavailable",
  );
  await expect(page.locator("#feedback-form textarea")).toHaveValue(
    "Please improve the registration instructions.",
  );
});

test("FAQs and official form links are usable without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(base + "/help.html");
  await page.getByText("How do I join the academy?", { exact: true }).click();
  await expect(page.locator(".faq-item").first()).toHaveAttribute("open", "");
  await page.goto(base + "/registration.html");
  await expect(
    page.locator("#membership-panel a[target=_blank]"),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open photo/video consent", exact: true }),
  ).toBeVisible();
  await page.goto(base + "/play.html");
  await expect(page.locator("#login-form")).toHaveAttribute("method", "post");
  await expect(page.locator("#login-form button")).toBeDisabled();
  await context.close();
});

test("events show an honest empty state, safe confirmed content, and unavailable errors", async ({
  page,
}) => {
  await page.goto("/events.html");
  await expect(page.locator("#event-list")).toContainText(
    "No upcoming events have been confirmed yet",
  );
  await page.route("**/api/events", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([
        {
          title: "<img src=x onerror=alert(1)> Chess day",
          date: "2030-10-20",
          location: "Test venue",
          description: "Browser fixture, not a published event",
        },
      ]),
    }),
  );
  await page.reload();
  await expect(page.locator("#event-list h2")).toContainText("<img src=x");
  await expect(page.locator("#event-list time")).toContainText("2030");
  await expect(page.locator("#event-list img")).toHaveCount(0);
  await page.unroute("**/api/events");
  await page.route("**/api/events", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Events temporarily unavailable." }),
    }),
  );
  await page.reload();
  await expect(page.locator("#event-list")).toContainText(
    "temporarily unavailable",
  );
});

test("logged-out visitors get the daily puzzle but cannot start computer games", async ({
  page,
}) => {
  await page.goto("/play.html");
  await expect(page.locator("#player-panel")).toBeHidden();
  expect(
    (
      await page.request.post("/api/computer", {
        headers: { Origin: base },
        data: {},
      })
    ).status(),
  ).toBe(401);
  await expect(page.locator("#puzzle-board button")).toHaveCount(64);
  const puzzle = await (await page.request.get("/api/puzzle")).json(),
    chess = new Chess(puzzle.fen);
  const mate = chess.moves({ verbose: true }).find((move) => {
    chess.move(move);
    const wins = chess.isCheckmate();
    chess.undo();
    return wins;
  });
  expect(mate).toBeTruthy();
  await page.locator(`#puzzle-board [data-square=${mate.from}]`).click();
  await page.locator(`#puzzle-board [data-square=${mate.to}]`).click();
  await expect(page.locator("#puzzle-status")).toContainText(
    "Correct! Checkmate",
  );
  await page.getByRole("button", { name: "Try today’s puzzle again" }).click();
  await expect(page.locator("#puzzle-status")).toContainText(
    "Find checkmate in one",
  );
  await page.locator("#puzzle-board button").first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#puzzle-board button").nth(1)).toBeFocused();
});

test("account creation, legal computer play, session refresh, login and logout work", async ({
  page,
}) => {
  const email = `browser-computer-${Date.now()}@example.invalid`,
    password = "browser-only-test-password";
  await page.goto("/play.html");
  const form = page.locator("#account-form");
  await form.locator("[name=name]").fill("Practice Player");
  await form.locator("[name=email]").fill(email);
  await form.locator("[name=password]").fill(password);
  await expect(form.locator("button")).toBeEnabled();
  await form.locator("button").click();
  await expect(page.locator("#player-greeting")).toContainText(
    "Practice Player",
  );
  await page.getByRole("button", { name: "New computer game" }).click();
  await expect(page.locator("#game-status")).toHaveText("White to move.");
  await page.locator("#game-board [data-square=e2]").click();
  await page.locator("#game-board [data-square=e5]").click();
  await expect(page.locator("#game-status")).toContainText("not legal");
  await page.locator("#game-board [data-square=e4]").click();
  await expect(page.locator("#move-history")).toContainText("e4");
  await expect(page.locator("#game-status")).toContainText("White to move");
  await page.reload();
  await expect(page.locator("#player-greeting")).toContainText(
    "Practice Player",
  );
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page.locator("#auth-panel")).toBeVisible();
  const login = page.locator("#login-form");
  await login.locator("[name=email]").fill(email);
  await login.locator("[name=password]").fill("not-the-password");
  await login.locator("button").click();
  await expect(login.locator(".auth-status")).toContainText("incorrect");
  await login.locator("[name=password]").fill(password);
  await login.locator("button").click();
  await expect(page.locator("#player-greeting")).toContainText(
    "Practice Player",
  );
  await page.getByRole("button", { name: "Log out", exact: true }).click();
});

test("two distinct authenticated players match, share moves, and handle leaving", async ({
  browser,
}) => {
  const firstContext = await browser.newContext({ baseURL: base }),
    secondContext = await browser.newContext({ baseURL: base });
  try {
    const white = await firstContext.newPage(),
      black = await secondContext.newPage();
    await createPlayer(white, "WhitePlayer");
    await createPlayer(black, "BlackPlayer");
    await white.getByRole("button", { name: "Find online opponent" }).click();
    await expect(white.locator("#game-status")).toContainText(
      "Waiting for another",
    );
    await black.getByRole("button", { name: "Find online opponent" }).click();
    await expect(white.locator("#game-status")).toContainText("You play White");
    await expect(black.locator("#game-status")).toContainText("You play Black");
    await white.locator("#game-board [data-square=e2]").click();
    await white.locator("#game-board [data-square=e4]").click();
    await expect(black.locator("#move-history")).toContainText("e4");
    await black.locator("#game-board [data-square=e7]").click();
    await black.locator("#game-board [data-square=e5]").click();
    await expect(white.locator("#move-history")).toContainText("e5");
    await white
      .getByRole("button", { name: "Cancel / leave online game" })
      .click();
    await expect(black.locator("#game-status")).toContainText("opponent left");
    await expect(black.locator("#find-opponent")).toBeEnabled();
  } finally {
    await firstContext.close();
    await secondContext.close();
  }
});

test("static-only chess hosting displays an honest limitation and never submits passwords via GET", async ({
  page,
}) => {
  await page.route("**/vendor/chess.js", (route) =>
    route.fulfill({
      status: 404,
      contentType: "text/html",
      body: "Static hosting",
    }),
  );
  await page.goto("/play.html");
  await expect(page.locator("#play-service-status")).toContainText(
    "Node.js service",
  );
  await expect(page.locator("#account-form button")).toBeDisabled();
  await expect(page.locator("#login-form")).toHaveAttribute("method", "post");
});

async function mockPush(page, permission = "default") {
  await page.addInitScript((permission) => {
    let granted = permission,
      active = null;
    window.permissionRequests = 0;
    window.workerRegistrations = 0;
    window.subscriptionStops = 0;
    class NotificationMock {
      static get permission() {
        return granted;
      }
      static async requestPermission() {
        window.permissionRequests++;
        granted = "granted";
        return granted;
      }
    }
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: NotificationMock,
    });
    Object.defineProperty(window, "PushManager", {
      configurable: true,
      value: class {},
    });
    const registration = {
      pushManager: {
        async getSubscription() {
          return active;
        },
        async subscribe() {
          active = {
            endpoint:
              "https://fcm.googleapis.com/fcm/send/academy-browser-test-mock",
            toJSON() {
              return {
                endpoint: this.endpoint,
                keys: { p256dh: "mock-browser-key", auth: "mock-browser-auth" },
              };
            },
            async unsubscribe() {
              window.subscriptionStops++;
              active = null;
              return true;
            },
          };
          return active;
        },
      },
    };
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        async getRegistration() {
          return registration;
        },
        async register() {
          window.workerRegistrations++;
          return registration;
        },
        ready: Promise.resolve(registration),
      },
    });
  }, permission);
}

test("notification opt-in and opt-out wire to the backend without prompting on page load (mock browser push)", async ({
  page,
}) => {
  await mockPush(page);
  await page.goto("/registration.html");
  await expect(page.locator("#push-enable")).toBeEnabled();
  expect(await page.evaluate(() => window.permissionRequests)).toBe(0);
  expect(await page.evaluate(() => window.workerRegistrations)).toBe(0);
  await page.locator("#push-enable").click();
  await expect(page.locator("#push-status")).toContainText(
    "Notifications enabled",
  );
  expect(await page.evaluate(() => window.permissionRequests)).toBe(1);
  expect(await page.evaluate(() => window.workerRegistrations)).toBe(1);
  await page.locator("#push-disable").click();
  await expect(page.locator("#push-status")).toContainText(
    "Notifications disabled",
  );
  expect(await page.evaluate(() => window.subscriptionStops)).toBe(1);
});

test("denied notification permission is respected without asking again (mock browser push)", async ({
  page,
}) => {
  await mockPush(page, "denied");
  await page.goto("/events.html");
  await expect(page.locator("#push-status")).toContainText("blocked");
  await expect(page.locator("#push-enable")).toBeDisabled();
  expect(await page.evaluate(() => window.permissionRequests)).toBe(0);
});

test("failed subscription storage cleans up a new browser subscription (mock browser push)", async ({
  page,
}) => {
  await mockPush(page);
  await page.route("**/api/push/subscribe", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Subscription could not be saved." }),
    }),
  );
  await page.goto("/events.html");
  await expect(page.locator("#push-enable")).toBeEnabled();
  await page.locator("#push-enable").click();
  await expect(page.locator("#push-status")).toContainText(
    "could not be saved",
  );
  expect(await page.evaluate(() => window.subscriptionStops)).toBe(1);
  await expect(page.locator("#push-disable")).toBeHidden();
});

test("online matchmaking rejects anonymous users and explicit foreign origins", async ({
  page,
}) => {
  await page.goto("/play.html");
  await page.addScriptTag({ url: "/socket.io/socket.io.js" });
  async function connectionError() {
    return page.evaluate(
      () =>
        new Promise((resolve) => {
          const socket = window.io({
            reconnection: false,
            timeout: 3000,
            transports: ["polling"],
          });
          socket.on("connect_error", (error) => {
            socket.disconnect();
            resolve(error.message);
          });
          socket.on("connect", () => {
            socket.disconnect();
            resolve("unexpectedly connected");
          });
        }),
    );
  }
  expect(await connectionError()).toContain("Please log in to play");
  await createPlayer(page, "OriginPlayer");
  // APIRequest sends exact headers; browsers protect/normalize the Origin header.
  for (const headers of [
    { Origin: "https://foreign.example" },
    { "sec-fetch-site": "cross-site" },
  ]) {
    const handshake = await page.request.get(
      "/socket.io/?EIO=4&transport=polling",
      { headers },
    );
    const sid = JSON.parse((await handshake.text()).slice(1)).sid;
    const url = `/socket.io/?EIO=4&transport=polling&sid=${sid}`;
    await page.request.post(url, {
      headers: { ...headers, "Content-Type": "text/plain" },
      data: "40",
    });
    const response = await page.request.get(url, { headers });
    expect(await response.text()).toContain("Please log in to play");
  }
});
