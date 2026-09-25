import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("organizer teams, rounds, bilingual announcements, rules history and reports", async ({
  page,
}) => {
  await page.goto("/");
  const credentials = await readFile(".local/demo-accounts.txt", "utf8");
  const password = credentials
    .match(/Password \(all accounts\): (.+)/)![1]
    .trim();
  await page.getByLabel("Email address or mobile number").fill("admin@sbk.test");
  await page.getByLabel("Password (at least 10 characters)").fill(password);
  await page
    .locator("form")
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await expect(page).toHaveURL("/home");
  const suffix = String(Date.now()).slice(-6),
    team = "Demo Test Club " + suffix;
  await page.goto("/admin?tab=teams");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("English name", { exact: true }).fill(team);
  await dialog.getByLabel("Short name").fill("TST");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await dialog.getByRole("button", { name: "Confirm and save" }).click();
  await expect(dialog).toHaveCount(0);
  const record = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: team, exact: true }) });
  await expect(record).toContainText("Malayalam name is missing");
  await record.getByRole("button", { name: "Edit", exact: true }).click();
  await dialog
    .getByLabel("Malayalam name", { exact: true })
    .fill("മാതൃക പരീക്ഷണ ടീം " + suffix);
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await dialog.getByRole("button", { name: "Confirm and save" }).click();
  await expect(dialog).toHaveCount(0);
  await page.goto("/admin?tab=rounds");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await dialog
    .getByLabel("English name", { exact: true })
    .fill("Demo Test Round " + suffix);
  await dialog
    .getByLabel("Malayalam name", { exact: true })
    .fill("മാതൃക പരീക്ഷണ റൗണ്ട് " + suffix);
  await dialog
    .getByLabel("Stage in English (optional)")
    .fill("Demo group stage");
  await dialog
    .getByLabel("Stage in Malayalam (optional)")
    .fill("മാതൃക ഗ്രൂപ്പ് ഘട്ടം");
  await dialog
    .getByLabel("Round starts (IST, optional)")
    .fill("2026-10-01T18:00");
  await dialog
    .getByLabel("Round ends (IST, optional)")
    .fill("2026-10-31T20:00");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await dialog.getByRole("button", { name: "Confirm and save" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "Demo Test Round " + suffix,
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/admin?tab=content");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await dialog
    .getByLabel("Title in English")
    .fill("Demo browser announcement " + suffix);
  await dialog
    .getByLabel("Title in Malayalam")
    .fill("മാതൃക അറിയിപ്പ് " + suffix);
  await dialog
    .getByLabel("Text in English")
    .fill("This sample announcement was created during local verification.");
  await dialog
    .getByLabel("Text in Malayalam")
    .fill("പ്രാദേശിക പരിശോധനയ്ക്കായി സൃഷ്ടിച്ച മാതൃക അറിയിപ്പാണിത്.");
  await dialog.getByLabel("Published", { exact: true }).check();
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await dialog.getByRole("button", { name: "Confirm and save" }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Publish rules revision" }).click();
  await dialog
    .getByLabel("Text in English")
    .fill(
      "Demo organizer note: please verify all times in IST. This is sample content.",
    );
  await dialog
    .getByLabel("Text in Malayalam")
    .fill(
      "മാതൃക സംഘാടക കുറിപ്പ്: എല്ലാ സമയവും IST പ്രകാരം പരിശോധിക്കുക. ഇത് മാതൃക ഉള്ളടക്കമാണ്.",
    );
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await dialog.getByRole("button", { name: "Confirm and save" }).click();
  await expect(dialog).toHaveCount(0);
  await page.goto("/home");
  await expect(
    page.getByRole("heading", { name: "Demo browser announcement " + suffix }),
  ).toBeVisible();
  await page.goto("/rules");
  await expect(
    page.getByText(
      "Demo organizer note: please verify all times in IST. This is sample content.",
    ),
  ).toBeVisible();
  for (const type of ["fixtures", "predictions", "standings"]) {
    const response = await page.request.get("/api/export?type=" + type);
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
  await page.goto("/admin?tab=audit");
  await expect(page.locator(".audit-list details").first()).toBeVisible();
  await page.locator(".audit-list details").first().click();
  await expect(page.locator(".audit-values").first()).toBeVisible();
});
