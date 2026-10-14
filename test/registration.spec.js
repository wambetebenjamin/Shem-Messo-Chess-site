import { test, expect } from "@playwright/test";

test("registration is a guided experience with deliberate path selection and honest progress", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/registration.html");
  await expect(page.locator("#journey-next")).toBeDisabled();
  await expect(page.locator('[data-journey-step="1"]')).toBeDisabled();
  await page.locator("#joining-self").focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#joining-self")).toBeChecked();
  await page.locator("#journey-next").click();
  await expect(page.locator('[data-journey-screen="1"] h2')).toBeFocused();
  await expect(page.locator("#membership-guidance")).toContainText(
    "your member details",
  );
  await expect(page.locator('[data-journey-step="1"]')).toHaveAttribute(
    "aria-current",
    "step",
  );
  await expect(
    page.locator('[data-journey-step="0"] .step-caption'),
  ).toHaveText("Opened in this guide");
  await expect(page.locator("#membership-frame")).not.toHaveAttribute("src");
  await page.locator("#journey-next").click();
  await expect(page.locator("#consent-guidance")).toContainText(
    "it may not apply",
  );
  await page.locator("#journey-next").click();
  await expect(page.locator('[data-journey-screen="3"]')).toContainText(
    "not a membership confirmation",
  );
  await expect(page.locator('[data-journey-screen="3"]')).toContainText(
    "This website cannot check",
  );
  await expect(page.locator("#journey-next")).toBeHidden();
  await page.locator("#restart-registration").click();
  await expect(page.locator("#journey-position")).toContainText("Step 1 of 4");
  await expect(page.locator("#joining-self")).not.toBeChecked();
  await expect(page.locator("#journey-next")).toBeDisabled();
  expect(errors).toEqual([]);
});

test("parent path gives child-specific guidance without collecting duplicate personal data", async ({
  page,
}) => {
  await page.goto("/registration.html");
  await page.locator("#joining-child").check();
  await page.locator("#journey-next").click();
  await expect(page.locator("#membership-guidance")).toContainText(
    "your child",
  );
  await page.locator('[data-journey-step="2"]').click();
  await expect(page.locator("#consent-guidance")).toContainText(
    "one official consent form for each child",
  );
  await expect(page.locator('[data-journey-screen="2"]')).toContainText(
    "No permission is granted",
  );
  await page.locator("#journey-back").click();
  await page.locator("#journey-back").click();
  await expect(page.locator("#joining-child")).toBeChecked();
  await expect(page.locator("#registration input")).toHaveCount(2);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
});

test("every registration step fits mobile and intermediate widths", async ({
  page,
}) => {
  await page.goto("/registration.html");
  await page.locator("#joining-child").check();
  for (const width of [320, 390, 600, 851, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (let step = 0; step < 4; step++) {
      await page.locator(`[data-journey-step="${step}"]`).click();
      await expect(
        page.locator(`[data-journey-screen="${step}"]`),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${width}, step ${step}`,
      ).toBe(true);
    }
  }
});

test("restart warns before clearing embedded form work and can be cancelled", async ({
  page,
}) => {
  await page.route("https://docs.google.com/**", (route) => route.abort());
  await page.goto("/registration.html");
  await page.locator("#joining-child").check();
  await page.locator("#journey-next").click();
  await page
    .getByRole("button", {
      name: "Open membership registration form",
      exact: true,
    })
    .click();
  await page.locator('[data-journey-step="3"]').click();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.locator("#restart-registration").click();
  await expect(page.locator("#journey-position")).toContainText("Step 4 of 4");
  await expect(page.locator("#membership-frame")).toHaveAttribute(
    "src",
    /embedded=true/,
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#restart-registration").click();
  await expect(page.locator("#journey-position")).toContainText("Step 1 of 4");
  await expect(page.locator("#membership-frame")).not.toHaveAttribute("src");
  await page.locator("#joining-self").check();
  await page.locator("#journey-next").click();
  await expect(
    page.getByRole("button", {
      name: "Open membership registration form",
      exact: true,
    }),
  ).toBeVisible();
});
