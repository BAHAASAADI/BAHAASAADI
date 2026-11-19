import { expect, type Page } from "@playwright/test";

export const PASSWORD = process.env.E2E_PASSWORD ?? "Test-password-123";
export const OWNER = process.env.E2E_OWNER_EMAIL ?? "owner@izone.test";
export const MANAGER = process.env.E2E_MANAGER_EMAIL ?? "manager@izone.test";
export const STAFF = process.env.E2E_STAFF_EMAIL ?? "staff@izone.test";
export const PHOTO = "e2e/fixtures/test-phone.jpg";

export async function login(page: Page, email: string) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

export async function logout(page: Page) {
  await page.context().clearCookies();
}

/** Accept every confirm() dialog for the rest of the test. */
export function acceptDialogs(page: Page) {
  page.on("dialog", (dialog) => void dialog.accept());
}
