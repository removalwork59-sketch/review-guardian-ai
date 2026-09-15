import { expect, test } from "@playwright/test";

/** Names of retired projects that must never appear on the Removal Work site. */
const LEGACY_IDENTITY = /OrbitRep|SEO ?Val[ae]|Ranking ?Star/i;

test.describe("public production surface", () => {
  test("serves the Removal Work application, not the retired app", async ({ page, request }) => {
    const version = await (await request.get("/api/public/version")).json();
    expect(version.app).toBe("review-guardian-ai");

    await page.goto("/");
    await expect(page).toHaveTitle(/Removal Work/);
    await expect(page.locator("body")).not.toContainText(LEGACY_IDENTITY);
    await page.goto("/auth");
    await expect(page).toHaveTitle(/Removal Work/);
    await expect(page.locator("body")).not.toContainText(LEGACY_IDENTITY);
  });

  test("sends the security headers", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();
    expect(headers["strict-transport-security"]).toContain("max-age=");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'self'");
    expect(headers["server"]).toBe("nginx");
  });

  test("reports health without exposing configuration", async ({ request }) => {
    const response = await request.get("/api/public/health");
    const body = await response.json();
    expect(["ok", "degraded"]).toContain(body.status);
    expect(JSON.stringify(body)).not.toMatch(/key|secret|token/i);
  });

  test("keeps internal worker routes off the internet", async ({ request }) => {
    const response = await request.get("/api/internal/worker");
    expect(response.status()).toBe(403);
  });

  test("sends signed-out visitors from the workspace to sign in", async ({ page }) => {
    await page.goto("/app/reviews");
    await expect(page).toHaveURL(/\/auth/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("keeps old links working", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("rejects wrong credentials through the real auth backend", async ({ page }) => {
    await page.goto("/auth");
    await page.locator("#email").fill("e2e-invalid-login@removalwork.online");
    await page.locator("#password").fill("definitely-not-the-password");
    await page.locator("button[type=submit]").click();
    await expect(page.getByRole("status")).toContainText(/invalid/i);
  });

  test("identifies a real business from a pasted Google link", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: /get your free review audit/i })
      .first()
      .click();
    await page
      .getByLabel("Google review URL")
      .fill("https://www.google.com/maps/place/Eiffel+Tower/@48.8583701,2.2944813,17z");
    await page.locator("#scan form button[type=submit]").click();
    await expect(page.getByRole("heading", { name: "Eiffel Tower" })).toBeVisible({
      timeout: 45_000,
    });
  });

  test("has no horizontal overflow", async ({ page }) => {
    for (const path of ["/", "/auth"]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(1);
    }
  });
});

test("publishes robots and a sitemap on the canonical domain", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Sitemap: https://removalwork.online/sitemap.xml");
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain("<loc>https://removalwork.online/</loc>");
});
