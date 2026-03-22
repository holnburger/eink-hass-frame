import { expect, test } from "@playwright/test";

test("renders the minimal onboarding state", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "E-Ink Frame Configurator" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Flash Device" }),
  ).toBeVisible();
});

test("renders the configurator for an active device", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "hass.savedDevices",
      JSON.stringify([
        {
          id: "192.168.1.10",
          name: "Kitchen Display",
          ip: "192.168.1.10",
          lastSeen: "2026-03-21T10:00:00.000Z",
        },
      ]),
    );
    window.localStorage.setItem("hass.activeDeviceId", "192.168.1.10");
  });

  await page.goto("/");

  await expect(page.getByRole("combobox").first()).toHaveValue("192.168.1.10");
  await expect(
    page.getByRole("heading", { name: "Pages & Widgets" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Live Preview" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Build & Update" }),
  ).toBeVisible();

  const fontSelect = page.locator("#fontSelect");
  await fontSelect.selectOption("7 Segment");
  await expect(fontSelect).toHaveValue("7 Segment");
  await expect(page.getByLabel("Preview clock time")).toBeVisible();
  await expect
    .poll(() =>
      page
        .getByLabel("Preview clock time")
        .evaluate((node) => window.getComputedStyle(node).fontFamily),
    )
    .toContain("Seven Segment");

  const toggle = page.getByRole("switch", { name: "Preview mode: Light" });
  await toggle.click();
  await expect(page.getByRole("switch", { name: "Preview mode: Dark" })).toBeVisible();
});
