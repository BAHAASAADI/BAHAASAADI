import { expect, test } from "@playwright/test";
import { acceptDialogs, login, OWNER, PHOTO } from "./helpers";

test.describe.serial("Setup, inventory, pricing, sales", () => {
  let productUrl = "";
  let inventoryId = "";

  test("owner sets up shops, settings, rates and buying prices", async ({ page }) => {
    await login(page, OWNER);
    await expect(page.getByText("Getting started")).toBeVisible();

    await page.goto("/admin/shops");
    await page.locator("#new-name").fill("iZone Centre");
    await page.locator("#new-address").fill("12 Market Street");
    await page.locator("#new-city").fill("Warsaw");
    await page.locator("#new-country").fill("Poland");
    await page.locator("#new-phone").fill("+48 22 000 00 00");
    await page.locator("#new-whatsapp").fill("+48 600 100 200");
    await page.locator("#new-maps").fill("https://maps.google.com/?q=iZone");
    await page.locator("#new-currency").selectOption("EUR");
    await page.locator("#new-hours").fill("Mon–Sat 10:00–20:00\nSun closed");
    await page.getByRole("button", { name: "Add shop" }).click();
    await expect(page.getByText("Shop added.")).toBeVisible();

    await page.locator("#new-name").fill("iZone Oran");
    await page.locator("#new-city").fill("Oran");
    await page.locator("#new-country").fill("Algeria");
    await page.locator("#new-whatsapp").fill("+213 555 00 00 00");
    await page.locator("#new-currency").selectOption("DZD");
    await page.getByRole("button", { name: "Add shop" }).click();
    await expect(page.getByText("Shop added.")).toBeVisible();
    await expect(page.locator("summary", { hasText: "iZone Oran" })).toBeVisible();

    await page.goto("/admin/settings");
    await page.getByLabel("Main WhatsApp number").fill("+48 600 100 200");
    await page.getByLabel("Contact email").fill("hello@izone.test");
    await page.getByLabel("Instagram").fill("https://instagram.com/izone");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Settings saved.")).toBeVisible();

    await page.goto("/admin/currencies");
    await expect(page.getByText("has not been confirmed")).toBeVisible();
    await page.getByRole("button", { name: "Save and confirm rates" }).click();
    await expect(page.getByText("Exchange rates saved and confirmed.")).toBeVisible();

    await page.goto("/admin/buying-prices?q=15 Pro Max");
    await page.locator('input[name="base_256"]').fill("900");
    await page.locator('input[name="base_512"]').fill("1000");
    await page.locator('input[name="good_512"]').fill("700");
    await page.getByRole("button", { name: "Save iPhone 15 Pro Max" }).click();
    await expect(page.getByText("Saved (2 prices changed).")).toBeVisible();
  });

  test("adding a phone with a photo and purchase cost", async ({ page }) => {
    await login(page, OWNER);
    await page.goto("/admin/inventory/new");
    await page.getByLabel("iPhone model").selectOption({ label: "iPhone 15 Pro Max" });
    await page.getByLabel("Storage", { exact: true }).selectOption({ label: "256GB" });
    await page.getByLabel("Colour").fill("Natural Titanium");
    await page.getByLabel("Battery health (%)").fill("91");
    await page.getByLabel("Physical condition").selectOption("excellent");
    await page.getByLabel("Shop", { exact: true }).selectOption({ label: "iZone Centre — Warsaw" });
    await page.getByLabel("Selling price").fill("1100");
    await page.getByLabel("Purchase price").fill("800");
    await page.getByLabel("Supplier / customer name").fill("Supplier Ltd");
    await page.getByLabel("IMEI").fill("356789012345678");
    await page.locator('input[type="file"]').setInputFiles(PHOTO);
    await expect(page.locator('img[src^="blob:"]')).toHaveCount(1);
    await page.getByRole("button", { name: "Add phone to stock" }).click();

    await expect(page).toHaveURL(/\/admin\/inventory\/[0-9a-f-]{36}\?created=1/, { timeout: 30_000 });
    const notice = await page.getByText(/Phone IZ-\d+ added to stock\./).textContent();
    inventoryId = notice!.match(/IZ-\d+/)![0];
    productUrl = page.url().split("?")[0];
    await expect(page.locator('img[alt="Photo 1"]')).toBeVisible();

    // Edit: change battery health
    await page.getByLabel("Battery health (%)").fill("90");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Phone saved.")).toBeVisible();
  });

  test("the phone appears on the website with WhatsApp details", async ({ page }) => {
    await page.goto("/en/buy");
    const card = page.locator(`a[href="/en/buy/${inventoryId}"]`);
    await expect(card).toContainText("iPhone 15 Pro Max");
    await expect(card).toContainText("€1,100");
    await card.click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("iPhone 15 Pro Max 256GB");
    await expect(page.getByText("90%").first()).toBeVisible();
    await expect(page.getByText(inventoryId).first()).toBeVisible();
    const wa = await page.getByRole("link", { name: "Contact us on WhatsApp" }).getAttribute("href");
    expect(wa).toContain("https://wa.me/48600100200?text=");
    const message = decodeURIComponent(wa!.split("text=")[1]);
    expect(message).toContain("iPhone 15 Pro Max 256GB — Natural Titanium");
    expect(message).toContain("Battery health: 90%");
    expect(message).toContain("€1,100");
    expect(message).toContain(inventoryId);
    await expect(page.locator('img[src*="/storage/v1/object/public/product-photos/"]').first()).toBeVisible();
  });

  test("a customer reservation is handled from the dashboard", async ({ page }) => {
    await page.goto(`/en/buy/${inventoryId}`);
    await page.getByRole("button", { name: "Reserve this phone" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Your name").fill("Anna Nowak");
    await dialog.getByLabel("Telephone number").fill("+48 500 600 700");
    await dialog.getByRole("button", { name: "Send" }).click();
    await expect(dialog.getByText("Thank you. We have received your message")).toBeVisible();

    await login(page, OWNER);
    await page.goto("/admin/requests");
    const request = page.locator("li", { hasText: "Anna Nowak" });
    await expect(request).toContainText("Reservation");
    await request.getByRole("button", { name: "Reserve phone" }).click();
    // The request is marked handled, so it leaves the "New" list.
    await expect(page.locator("li", { hasText: "Anna Nowak" })).toHaveCount(0);
    await page.goto("/admin/requests?status=handled");
    await expect(page.locator("li", { hasText: "Anna Nowak" })).toContainText("currently reserved");

    await page.goto("/en/buy");
    await expect(page.locator(`a[href="/en/buy/${inventoryId}"]`)).toHaveCount(0);
    await page.goto("/en/buy?reserved=1");
    await expect(page.locator(`a[href="/en/buy/${inventoryId}"]`)).toContainText("Reserved");
  });

  test("selling prices: individual change, bulk market update and history", async ({ page }) => {
    acceptDialogs(page);
    await login(page, OWNER);
    await page.goto("/admin/selling-prices");
    const row = page.locator("tr", { hasText: inventoryId });
    await row.locator('input[name="price"]').fill("1050");
    await row.locator('input[name="note"]').fill("Market check");
    await row.getByRole("button", { name: "Save" }).click();
    await expect(row.getByText("Saved.")).toBeVisible();

    await page.goto("/admin/market");
    await page.locator("#sell-mode").selectOption("percent");
    await page.locator("#sell-value").fill("10");
    await page.locator("#sell-round").fill("10");
    await page.locator("#sell-note").fill("Market +10%");
    await page.getByRole("button", { name: "Apply to selling prices" }).click();
    await expect(page.getByText("1 phone updated.")).toBeVisible();

    await page.goto("/admin/price-history?kind=sell");
    await expect(page.locator("tr", { hasText: "Market check" })).toContainText("€1,050");
    await expect(page.locator("tr", { hasText: "Market +10%" })).toContainText("€1,160");

    // Special offer: 5% off, rounded to 10 -> 1100
    await page.goto("/admin/market");
    await page.locator("#sell-mode").selectOption("percent_off");
    await page.locator("#sell-value").fill("5");
    await page.locator("#sell-round").fill("10");
    await page.getByRole("button", { name: "Apply to selling prices" }).click();
    await expect(page.getByText("1 phone updated.")).toBeVisible();
    await page.goto(`/en/buy/${inventoryId}`);
    await expect(page.getByText("€1,100").first()).toBeVisible();
    await expect(page.getByText("€1,160").first()).toBeVisible();
  });

  test("transfer between shops, sale, and the phone leaves the catalogue", async ({ page }) => {
    acceptDialogs(page);
    await login(page, OWNER);
    await page.goto(productUrl);
    await page.getByLabel("Destination").selectOption({ label: "iZone Oran (prices in DZD)" });
    await page.getByLabel("Note").first().fill("Customer in Oran");
    await page.getByRole("button", { name: "Transfer", exact: true }).click();
    await expect(page.getByText("Phone transferred.")).toBeVisible();
    await page.reload();
    await expect(page.getByText("iZone Centre → iZone Oran")).toBeVisible();

    await page.getByLabel("Sale price").fill("1100");
    await page.getByLabel("Customer name (optional)").fill("Anna Nowak");
    await page.getByRole("button", { name: "Mark as sold" }).click();
    await expect(page.getByText("Sale recorded.")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Gross profit")).toBeVisible();
    await expect(page.getByText("€300").first()).toBeVisible();

    await page.goto("/en/buy?reserved=1");
    await expect(page.locator(`a[href="/en/buy/${inventoryId}"]`)).toHaveCount(0);
    await page.goto(`/en/buy/${inventoryId}`);
    await expect(page.getByText("Page not found")).toBeVisible();

    await page.goto("/admin?period=month");
    await expect(page.locator("div", { hasText: /^Sold/ }).filter({ hasText: "1" }).first()).toBeVisible();
    await expect(page.getByText("Estimated gross profit").locator("..")).toContainText("€300");

    await page.goto("/admin/transactions");
    await expect(page.locator("tr", { hasText: inventoryId })).toContainText("€300");
    const csv = await page.request.get("/admin/export?type=sales&period=all");
    expect(csv.status()).toBe(200);
    expect(await csv.text()).toContain(inventoryId);
  });

  test("a sold phone can be reversed and a phone can be deleted", async ({ page }) => {
    acceptDialogs(page);
    await login(page, OWNER);
    await page.goto(productUrl);
    await page.getByRole("button", { name: "Reverse sale" }).click();
    await expect(page.getByText("Sale reversed.")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "Mark as sold" })).toBeVisible();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/inventory\?deleted=IZ-\d+$/);
    await expect(page.getByText(`Phone ${inventoryId} deleted.`)).toBeVisible();
    await expect(page.locator("tbody").getByText(inventoryId)).toHaveCount(0);
  });
});
