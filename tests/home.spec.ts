import { expect, test } from "@playwright/test";

test("renders dashboard sections", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "E-Ink Home Assistant Manager" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "1. USB Setup & Initial Flash" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "2. Active Device + Interactive Layout" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "3. OTA Update To Active Device" })).toBeVisible();
  await expect(page.getByText("M5PaperS3 Preview")).toBeVisible();
});

test("supports dark/light UI toggle", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /UI$/ });
  await expect(toggle).toBeVisible();

  const initialLabel = await toggle.textContent();
  await toggle.click();

  if (initialLabel?.includes("Dark")) {
    await expect(page.getByRole("button", { name: /Light UI/ })).toBeVisible();
  } else {
    await expect(page.getByRole("button", { name: /Dark UI/ })).toBeVisible();
  }
});
