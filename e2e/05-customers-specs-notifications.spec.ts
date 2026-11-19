import { expect, test, type APIRequestContext } from "@playwright/test";
import { login, OWNER } from "./helpers";

/**
 * Runs after 01–04 (same database). Email checks need E2E_MAIL_MOCK_URL: a local
 * stand-in for the Resend API that the app is configured to call
 * (RESEND_API_URL) and that records every email it receives.
 */
const MAIL = process.env.E2E_MAIL_MOCK_URL;

async function emails(request: APIRequestContext): Promise<{ subject: string; text: string; to: string[] }[]> {
  const r = await request.get(`${MAIL}/emails`);
  return r.json();
}

test.describe.serial("Customers, technical details and notifications", () => {
  test("the trade-in enquiry from the calculator was emailed to the team", async ({ request }) => {
    test.skip(!MAIL, "E2E_MAIL_MOCK_URL not set");
    await expect
      .poll(async () => (await emails(request)).find((e) => e.subject.startsWith("New trade-in enquiry TI-"))?.text ?? "")
      .toContain("Estimated offer: €610");
    const mail = (await emails(request)).find((e) => e.subject.startsWith("New trade-in enquiry TI-"))!;
    expect(mail.to).toEqual(["team@izone.test"]);
    expect(mail.text).toContain("iPhone 15 Pro Max 256GB · Good · battery 88%");
    expect(mail.text).toContain("Defects / replaced parts: Face ID / Touch ID");
    expect(mail.text).toContain("Customer: Jan Kowalski — +48 600 111 222");
    expect(mail.text).toContain("Preferred shop: iZone Centre");
    expect(mail.text).toContain("Photos: 1");
    expect(mail.text).toMatch(/\/admin\/enquiries\/[0-9a-f-]{36}/);
  });

  test("phone cards and the product page show parts, availability and technical details", async ({ page }) => {
    await page.goto("/en/buy");
    const card = page.locator('main a[href^="/en/buy/IZ-"]').first();
    await expect(card).toContainText("Available");
    await expect(card).toContainText("Original parts: All original");
    await card.click();
    await expect(page.getByRole("heading", { name: "Technical details" })).toBeVisible();
    for (const value of ["6.7″", "A17 Pro", "Face ID", "USB-C"]) {
      await expect(page.locator("dd", { hasText: value }).first()).toBeVisible();
    }
    // French labels
    await page.goto(page.url().replace("/en/", "/fr/"));
    await expect(page.getByRole("heading", { name: "Caractéristiques techniques" })).toBeVisible();
  });

  test("a question about a phone and a contact message reach the dashboard and the team inbox", async ({ page, request }) => {
    await page.goto("/en/buy");
    await page.locator('main a[href^="/en/buy/IZ-"]').first().click();
    const inventoryId = (await page.locator("h1").locator("..").getByText(/^IZ-\d+$/).first().textContent())!;
    await page.getByRole("button", { name: "Ask about this phone" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Your name").fill("Ewa Test");
    await dialog.getByLabel("Telephone number").fill("+48 511 000 111");
    await dialog.getByLabel("Message").fill("Is it unlocked for all networks?");
    await dialog.getByRole("button", { name: "Send" }).click();
    await expect(dialog.getByText("Thank you.")).toBeVisible();

    await page.goto("/en/contact");
    await page.getByLabel("Your name").fill("Ewa Test");
    await page.getByLabel("Telephone number").fill("+48 511 000 111");
    await page.getByLabel("Message").fill("Do you buy iPads?");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Thank you. We will get back to you shortly.")).toBeVisible();

    if (MAIL) {
      await expect.poll(async () => (await emails(request)).map((e) => e.subject)).toContain("Question about a phone from Ewa Test");
      const all = await emails(request);
      const question = all.find((e) => e.subject === "Question about a phone from Ewa Test")!;
      expect(question.text).toContain(`Phone: ${inventoryId} · iPhone 15 Pro Max 256GB Black Titanium · €1,000`);
      expect(question.text).toContain("Message: Is it unlocked for all networks?");
      expect(question.text).toContain("https://wa.me/48511000111");
      expect(all.map((e) => e.subject)).toContain("Contact message from Ewa Test");
    }

    await login(page, OWNER);
    await page.goto("/admin/customers?q=Ewa");
    const row = page.locator("tr", { hasText: "Ewa Test" });
    await expect(row).toContainText("+48511000111");
    await expect(row.locator("td").nth(3)).toHaveText("2");
  });

  test("customer history combines trade-ins, purchases and notes", async ({ page }) => {
    await login(page, OWNER);
    await page.goto("/admin/customers");
    const row = page.locator("tr", { hasText: "Jan Kowalski" });
    await expect(row.locator("td").nth(2)).toHaveText("1");
    await expect(row.locator("td").nth(5)).toHaveText("1");
    await row.getByRole("link", { name: "Jan Kowalski" }).click();
    await expect(page.getByText(/TI-\d+/).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Phones sold to iZone (1)" })).toBeVisible();
    await page.getByLabel("Internal notes").fill("Prefers WhatsApp");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Customer saved.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Internal notes")).toHaveValue("Prefers WhatsApp");
  });

  test("model technical details are editable", async ({ page }) => {
    await login(page, OWNER);
    await page.goto("/admin/models");
    const model = page.locator("details", { hasText: "iPhone 18 Pro Max" });
    await model.locator("summary").click();
    await model.getByLabel("Chip").fill("A20 Pro");
    await model.getByLabel("Display (inches)").fill("6.9");
    await model.getByRole("button", { name: "Save" }).click();
    await expect(model.getByText("Model saved.")).toBeVisible();
    await page.reload();
    await expect(page.locator("summary", { hasText: "iPhone 18 Pro Max" })).toContainText("A20 Pro");
  });

  test("dashboard lists use cards on a phone", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await login(page, OWNER);
    for (const path of ["/admin/inventory", "/admin/enquiries?status=all", "/admin/customers", "/admin/transactions?tab=purchases&period=all"]) {
      await page.goto(path);
      await expect(page.locator("main ul").first()).toBeVisible();
      await expect(page.locator("main table").first()).toBeHidden();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
    await context.close();
  });
});
