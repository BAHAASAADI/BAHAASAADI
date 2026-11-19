import { expect, test } from "@playwright/test";
import { login, OWNER, PHOTO } from "./helpers";

test.describe.serial("Trade-in calculator and enquiries", () => {
  test("customer gets an estimate and submits an enquiry with a photo", async ({ page }) => {
    await page.goto("/en/sell");
    await page.getByPlaceholder("Search for your model").fill("15 Pro Max");
    const model = page.getByRole("button", { name: /iPhone 15 Pro Max/ });
    await expect(model).toContainText("Up to €1,000");
    await model.click();
    await page.getByRole("button", { name: "256GB" }).click();
    await page.getByRole("button", { name: /^3\s*Good/ }).click();

    // Battery: exact value 88% -> 85–89% band
    await page.getByLabel("Exact battery health (%)").fill("88");
    await expect(page.getByRole("button", { name: "85–89%" })).toHaveClass(/bg-white/);
    await page.getByRole("button", { name: "Continue" }).click();

    // Functionality: Face ID broken, everything else works
    const questions = page.getByRole("radiogroup");
    await expect(questions).toHaveCount(9);
    for (let i = 0; i < 9; i++) {
      const group = questions.nth(i);
      const label = await group.getAttribute("aria-label");
      const answer = label?.startsWith("Does Face ID") ? "No" : label?.startsWith("Has the phone had water") ? "No" : "Yes";
      await group.getByRole("radio", { name: answer }).click();
    }
    await page.getByRole("button", { name: "Continue" }).click();

    // Components all original
    await page.getByRole("radiogroup", { name: "Is the screen original?" }).getByRole("radio", { name: "Yes" }).click();
    await page.getByRole("radiogroup", { name: "Is the battery original?" }).getByRole("radio", { name: "Yes" }).click();
    await page.getByRole("radiogroup", { name: "Are the cameras original?" }).getByRole("radio", { name: "Yes" }).click();
    await page.getByRole("radiogroup", { name: "Have any other components been replaced?" }).getByRole("radio", { name: "No" }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Photos
    await page.locator('input[type="file"]').setInputFiles(PHOTO);
    await expect(page.locator('img[src^="blob:"]')).toHaveCount(1);
    await page.getByRole("button", { name: "Continue" }).click();

    // 900 − 12% condition (108) − 5% battery (45) − 15% Face ID (135) = 612 → rounded down to 610
    await expect(page.getByTestId("estimate-amount")).toHaveText("€610");
    await expect(page.getByText("Condition: good")).toBeVisible();
    await expect(page.getByText("Face ID / Touch ID")).toBeVisible();
    await expect(
      page.getByText("This is an estimated offer based on the information provided. The final purchase price will be confirmed after physical inspection of the device."),
    ).toBeVisible();

    const wa = await page.getByRole("link", { name: "Send on WhatsApp" }).getAttribute("href");
    const text = decodeURIComponent(wa!.split("text=")[1]);
    expect(text).toContain("iPhone 15 Pro Max 256GB");
    expect(text).toContain("Battery health: 88%");
    expect(text).toContain("Condition: Good");
    expect(text).toContain("Face ID / Touch ID");
    expect(text).toContain("€610");

    await page.getByLabel("Preferred shop").selectOption({ label: "iZone Centre — Warsaw" });
    await page.getByLabel("Your name").fill("Jan Kowalski");
    await page.getByLabel("Telephone number").fill("+48 600 111 222");
    await page.getByRole("button", { name: "Submit enquiry" }).click();
    await expect(page.getByText("Enquiry received")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("trade-in-reference")).toContainText(/TI-\d+/);
  });

  test("model without a buying price asks for an offer instead", async ({ page }) => {
    await page.goto("/en/sell");
    await page.getByPlaceholder("Search for your model").fill("iPhone X");
    await page.getByRole("button", { name: /^iPhone X\b/ }).first().click();
    await page.getByRole("button", { name: "64GB" }).click();
    await page.getByRole("button", { name: /^1\s*Like new/ }).click();
    await page.getByRole("button", { name: "90–100%" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    for (const group of await page.getByRole("radiogroup").all()) {
      const label = await group.getAttribute("aria-label");
      await group.getByRole("radio", { name: label?.startsWith("Has the phone had water") ? "No" : "Yes" }).click();
    }
    await page.getByRole("button", { name: "Continue" }).click();
    for (const group of await page.getByRole("radiogroup").all()) {
      const label = await group.getAttribute("aria-label");
      await group.getByRole("radio", { name: label?.startsWith("Have any other") ? "No" : "Yes" }).click();
    }
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("We don’t have an online price for this model yet.")).toBeVisible();
  });

  test("the enquiry is managed in the dashboard and added to stock", async ({ page }) => {
    await login(page, OWNER);
    await page.goto("/admin/enquiries");
    const row = page.locator("tr", { hasText: "Jan Kowalski" });
    await expect(row).toContainText("€610");
    await expect(row).toContainText("1 photo(s)");
    await row.getByRole("link").first().click();

    await expect(page.getByText("Face ID / Touch ID").first()).toBeVisible();
    const photo = page.locator('img[alt="Customer photo 1"]');
    await expect(photo).toBeVisible();
    expect(await photo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    const waHref = await page.getByRole("link", { name: "WhatsApp customer" }).getAttribute("href");
    expect(waHref).toContain("https://wa.me/48600111222");

    await page.getByLabel("Status").selectOption("contacted");
    await page.getByLabel("Final offer (override)").fill("600");
    await page.getByLabel("Internal notes").fill("Small scratch on the frame");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Enquiry updated.")).toBeVisible();

    await page.getByRole("link", { name: "Add to inventory" }).click();
    await expect(page.getByText(/Pre-filled from trade-in TI-\d+/)).toBeVisible();
    await expect(page.getByLabel("Purchase price")).toHaveValue("600");
    await expect(page.getByLabel("Battery health (%)")).toHaveValue("88");
    await page.getByLabel("Colour").fill("Black Titanium");
    await page.getByLabel("Selling price").fill("1000");
    await page.getByRole("button", { name: "Add phone to stock" }).click();
    await expect(page).toHaveURL(/\/admin\/inventory\/[0-9a-f-]{36}\?created=1/);
    await expect(page.getByText("Trade-in", { exact: true })).toBeVisible();

    await page.goto("/admin/enquiries?status=completed");
    await expect(page.locator("tr", { hasText: "Jan Kowalski" })).toContainText("Completed");
    await page.goto("/admin/transactions?tab=purchases&period=all");
    await expect(page.locator("tr", { hasText: "Jan Kowalski" })).toContainText("Trade-in");
  });

  test("changing buying prices and deductions changes the estimate", async ({ page }) => {
    await login(page, OWNER);
    await page.goto("/admin/buying-prices");
    // Battery below 80% deduction 20% -> 30%
    const lowBand = page.locator('input[aria-label="From %"][value="0"]').locator("..");
    await lowBand.locator('input[aria-label="Deduction"]').fill("30");
    await page.getByRole("button", { name: "Save battery bands" }).click();
    await expect(page.getByText("Battery deductions saved.")).toBeVisible();

    const { data } = await page.request
      .post(`${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321"}/rest/v1/rpc/estimate_trade_in`, {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", "content-type": "application/json" },
        data: { p: { model_id: await modelId(page), storage_gb: 256, condition: "like_new", battery_health: 70 } },
      })
      .then(async (r) => ({ data: await r.json() }));
    // 900 − 30% = 630
    expect(data.estimate).toBe(630);
  });
});

async function modelId(page: import("@playwright/test").Page): Promise<string> {
  const r = await page.request.get(`${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321"}/rest/v1/iphone_models?slug=eq.iphone-15-pro-max&select=id`, {
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" },
  });
  return (await r.json())[0].id;
}
