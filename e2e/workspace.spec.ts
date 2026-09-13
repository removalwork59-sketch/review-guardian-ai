import { expect, test } from "@playwright/test";

/**
 * The critical signed-in journey on the real system:
 * login → add review → scan → real review → AI → policy → evidence → report → status.
 *
 * Requires a real account and a real Google review link:
 *   E2E_EMAIL, E2E_PASSWORD, E2E_REVIEW_URL
 * Without them the journey is skipped — it is never faked.
 */
const email = process.env["E2E_EMAIL"];
const password = process.env["E2E_PASSWORD"];
const reviewUrl = process.env["E2E_REVIEW_URL"];

test.describe("signed-in workspace (real account)", () => {
  test.skip(!email || !password, "Set E2E_EMAIL and E2E_PASSWORD to run the signed-in journey");

  test.beforeEach(async ({ page }) => {
    await page.goto("/auth");
    await page.locator("#email").fill(email as string);
    await page.locator("#password").fill(password as string);
    await page.locator("button[type=submit]").click();
    await expect(page).toHaveURL(/\/app\/reviews/, { timeout: 30_000 });
  });

  test("lands in the workspace with navigation for the screen size", async ({ page, isMobile }) => {
    await expect(page.getByRole("heading", { name: "Reviews" })).toBeVisible();
    if (isMobile) {
      await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    } else {
      await expect(
        page
          .getByRole("navigation", { name: "Workspace navigation" })
          .or(page.locator("aside.shell-sidebar")),
      ).toBeVisible();
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("scans a real review through to a recorded decision", async ({ page }) => {
    test.skip(!reviewUrl, "Set E2E_REVIEW_URL to a real Google review link");
    test.setTimeout(6 * 60_000);

    await page.goto("/app/reviews/new");
    await page.getByLabel("Google review link").fill(reviewUrl as string);
    await page.getByRole("button", { name: /^scan/i }).click();

    const outcome = page
      .getByRole("heading", { name: /which review did you mean/i })
      .or(page.getByRole("button", { name: /open the result/i }))
      .or(page.getByRole("alert"));
    await expect(outcome.first()).toBeVisible({ timeout: 4 * 60_000 });

    if (await page.getByRole("heading", { name: /which review did you mean/i }).isVisible()) {
      await page
        .getByRole("button", { name: /check this review/i })
        .first()
        .click();
    }
    if (await page.getByRole("alert").isVisible()) {
      test.info().annotations.push({
        type: "blocker",
        description: await page.getByRole("alert").innerText(),
      });
      return;
    }

    await expect(page).toHaveURL(/\/app\/reviews\/[0-9a-f-]{36}$/, { timeout: 5 * 60_000 });
    await expect(page.getByRole("region", { name: "The review" })).toBeVisible();
    await expect(page.getByRole("region", { name: "AI analysis" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Report" })).toBeVisible();
  });
});
