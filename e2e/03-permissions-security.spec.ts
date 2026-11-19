import { expect, test } from "@playwright/test";
import { login, STAFF } from "./helpers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

test("dashboard requires sign-in", async ({ page }) => {
  await page.goto("/admin/inventory");
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Finventory/);
  await page.getByLabel("Email").fill("owner@izone.test");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Incorrect email or password.")).toBeVisible();
});

test("staff cannot change prices or reach owner pages", async ({ page }) => {
  await login(page, STAFF);
  const nav = page.getByRole("navigation", { name: "Dashboard" }).first();
  await expect(nav.getByRole("link", { name: "Inventory" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Market updates" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Settings" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Team" })).toHaveCount(0);

  await page.goto("/admin/settings");
  await expect(page).toHaveURL(/\/admin\?denied=1/);
  await expect(page.getByText("Your role does not have access to that page.")).toBeVisible();

  await page.goto("/admin/selling-prices");
  await expect(page.getByText("Only owners and managers can change selling prices.")).toBeVisible();
  await page.goto("/admin/buying-prices");
  await expect(page.getByText("You can view buying prices.")).toBeVisible();

  await page.goto("/admin/inventory");
  await page.locator("tbody a").first().click();
  await expect(page.getByLabel("Selling price")).toHaveAttribute("readonly", "");
  await expect(page.getByRole("button", { name: "Delete", exact: true })).toHaveCount(0);
});

test("visitors cannot read private data or write to the database", async ({ request }) => {
  const headers = { apikey: ANON, "content-type": "application/json" };
  for (const table of ["trade_in_enquiries", "customers", "purchases", "sales", "admins", "product_private", "price_history"]) {
    const r = await request.get(`${SUPABASE_URL}/rest/v1/${table}?select=*`, { headers });
    // Either refused outright or filtered to nothing by row level security.
    if (r.ok()) expect(await r.json(), table).toEqual([]);
    else expect(r.status(), table).toBeGreaterThanOrEqual(401);
  }
  const insert = await request.post(`${SUPABASE_URL}/rest/v1/products`, { headers, data: { color: "x" } });
  expect(insert.status()).toBeGreaterThanOrEqual(400);
  const update = await request.patch(`${SUPABASE_URL}/rest/v1/buy_prices?storage_gb=eq.256`, { headers, data: { base_price: 99999 } });
  expect(update.status()).toBeGreaterThanOrEqual(400);
  const rpc = await request.post(`${SUPABASE_URL}/rest/v1/rpc/bulk_adjust_sell_prices`, {
    headers,
    data: { p_filter: {}, p_target: "price", p_mode: "set", p_value: 1 },
  });
  expect(rpc.status()).toBeGreaterThanOrEqual(400);
  const upload = await request.post(`${SUPABASE_URL}/storage/v1/object/product-photos/hack.jpg`, {
    headers: { apikey: ANON, authorization: `Bearer ${ANON}`, "content-type": "image/jpeg" },
    data: Buffer.from([0xff, 0xd8, 0xff]),
  });
  expect(upload.status()).toBeGreaterThanOrEqual(400);
});
