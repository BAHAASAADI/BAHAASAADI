import { devices, expect, test } from "@playwright/test";

test("Arabic uses a right-to-left layout", async ({ page }) => {
  await page.goto("/ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.getByRole("link", { name: "اشترِ هاتف iPhone" })).toBeVisible();
});

test("language switcher keeps the page", async ({ page }) => {
  await page.goto("/en/sell");
  await page.getByLabel("Language").selectOption("fr");
  await expect(page).toHaveURL(/\/fr\/sell$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Vendre votre iPhone");
  await page.getByLabel("Langue").selectOption("pl");
  await expect(page).toHaveURL(/\/pl\/sell$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sprzedaj iPhone'a");
});

test("currency switcher converts prices with manual rates", async ({ page }) => {
  await page.goto("/en/buy");
  await expect(page.locator("main").getByText("€1,000").first()).toBeVisible();
  await page.getByLabel("Currency").selectOption("PLN");
  // 1,000 EUR × 4.25 = 4,250 PLN (approximate)
  await expect(page.locator("main").getByText(/≈\s*PLN\s*4,250|≈\s*4,250\s*zł|≈\s*zł\s*4,250/).first()).toBeVisible();
  await page.getByLabel("Currency").selectOption("EUR");
  await expect(page.locator("main").getByText("€1,000").first()).toBeVisible();
});

test("homepage: logo is the main element and the shop photo is smaller", async ({ page }) => {
  await page.goto("/en");
  const logo = await page.locator("h1 img[alt='iZone']").boundingBox();
  const photo = await page.locator("img[alt='The iZone shop']").boundingBox();
  expect(logo!.width).toBeGreaterThan(photo!.width);
  await expect(page.getByText("BUY. SELL. UPGRADE.")).toBeVisible();
  await expect(page.getByText("ONLY APPLE PRODUCTS").first()).toBeVisible();
  await page.getByRole("link", { name: "SELL YOUR IPHONE" }).first().click();
  await expect(page).toHaveURL(/\/en\/sell$/);
  await page.goBack();
  await page.getByRole("link", { name: "BUY AN IPHONE" }).first().click();
  await expect(page).toHaveURL(/\/en\/buy$/);
});

// iPhone 13 viewport and touch, rendered with Chromium.
const { defaultBrowserType: _browser, ...iphone } = devices["iPhone 13"]; // eslint-disable-line @typescript-eslint/no-unused-vars

test.describe("mobile", () => {
  test.use(iphone);

  for (const path of ["/en", "/en/buy", "/en/sell", "/ar", "/en/contact"]) {
    test(`no horizontal scrolling on ${path}`, async ({ page }) => {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("mobile navigation opens and navigates", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("button", { name: "Menu" }).click();
    await page.locator("#mobile-nav").getByRole("link", { name: "Shops" }).click();
    await expect(page).toHaveURL(/\/en\/shops$/);
    await expect(page.locator("#mobile-nav")).toHaveCount(0);
  });

  test("dashboard is usable on a phone", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email").fill(process.env.E2E_OWNER_EMAIL ?? "owner@izone.test");
    await page.getByLabel("Password").fill(process.env.E2E_PASSWORD ?? "Test-password-123");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/admin$/);
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("link", { name: "Inventory" }).click();
    await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible();
  });
});
