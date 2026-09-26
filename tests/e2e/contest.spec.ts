import { test, expect, type Page } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
import sharp from "sharp";
async function api(page: Page, kind: string, data: unknown) {
  return page.evaluate(
    async ({ kind, data }) => {
      const response = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, data }),
      });
      return { status: response.status, ...(await response.json()) };
    },
    { kind, data },
  );
}
test("complete community flow, deadline enforcement, admin result and bilingual PNG", async ({
  browser,
}) => {
  await mkdir(".local/checks", { recursive: true });
  const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    member = await context.newPage();
  const errors: string[] = [];
  member.on("pageerror", (e) => errors.push(e.message));
  const email = `e2e-${Date.now()}@sbk.test`,
    name = "Demo E2E Fan",
    password = "OnlyForLocalTest2026!";
  await member.goto("/");
  await member
    .getByRole("button", { name: "Request access", exact: true })
    .click();
  await member.getByLabel("Display name", { exact: true }).fill(name);
  await member.getByLabel("Email address").fill(email);
  await member.getByLabel("Password (at least 10 characters)").fill(password);
  await member
    .locator("form")
    .getByRole("button", { name: "Request access" })
    .click();
  await expect(
    member.getByRole("heading", {
      name: "Your request is with the organizers",
    }),
  ).toBeVisible();
  const denied = await api(member, "prediction", {
    fixture_id: "00000000-0000-4000-8000-000000000000",
    home_goals: 1,
    away_goals: 0,
    predicted_winner: "home",
    first_goal: "home",
  });
  expect(denied.status).toBe(403);
  const adminContext = await browser.newContext({
      viewport: { width: 1440, height: 1100 },
    }),
    admin = await adminContext.newPage();
  await admin.goto("/");
  const credentials = await readFile(".local/demo-accounts.txt", "utf8"),
    adminPassword = credentials
      .match(/Password \(all accounts\): (.+)/)![1]
      .trim();
  await admin.getByLabel("Login type").selectOption("email");
  await admin.getByRole("textbox", { name: "Email address", exact: true }).fill("admin@sbk.test");
  await admin
    .getByLabel("Password (at least 10 characters)")
    .fill(adminPassword);
  await admin
    .locator("form")
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await expect(admin).toHaveURL("/home");
  await admin.goto("/admin?tab=members");
  const row = admin.getByRole("row").filter({ hasText: email });
  await row.getByRole("button", { name: "Review membership" }).click();
  await admin
    .getByRole("dialog")
    .getByLabel("Private review note")
    .fill("Verified sample WhatsApp membership for local browser test.");
  await admin
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm and save" })
    .click();
  await expect(admin.getByRole("dialog")).toHaveCount(0);
  await member.getByRole("button", { name: "Check status" }).click();
  await expect(member).toHaveURL("/home");
  await expect(
    member.getByRole("heading", { name: "Welcome back, Demo." }),
  ).toBeVisible();
  await member.screenshot({
    path: ".local/checks/home-mobile-en.png",
    fullPage: true,
  });
  expect(
    await member.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await admin.goto("/admin?tab=fixtures");
  await admin.getByRole("button", { name: "Create", exact: true }).click();
  const dialog = admin.getByRole("dialog");
  await dialog.getByLabel("Round", { exact: true }).selectOption({ index: 1 });
  await dialog.getByLabel("Home team").selectOption({ index: 1 });
  await dialog.getByLabel("Away team").selectOption({ index: 2 });
  const future = new Date(Date.now() + 86400000 + 330 * 60000)
    .toISOString()
    .slice(0, 16);
  await dialog.getByLabel("Kickoff date and time (IST)").fill(future);
  await dialog.getByLabel("Sample / demo fixture").check();
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await dialog.getByRole("button", { name: "Confirm and save" }).click();
  await expect(dialog).toHaveCount(0);
  // Use the first scheduled sample match; the API returns authoritative saved timestamps.
  await member.goto("/matches");
  await member
    .getByRole("link", { name: "Make your prediction" })
    .first()
    .click();
  await member.getByRole("spinbutton", { name: /^Home goals ·/ }).fill("1");
  await member.getByRole("spinbutton", { name: /^Away goals ·/ }).fill("0");
  await member.getByRole("group", { name: /Who will win/ }).locator('input[value="home"]').check();
  await member.getByRole("group", { name: /Who will score first/ }).locator('input[value="home"]').check();
  await member
    .getByRole("button", { name: "Save prediction", exact: true })
    .click();
  await expect(member.getByRole("status")).toContainText("Prediction saved");
  await member.getByRole("spinbutton", { name: /^Home goals ·/ }).fill("2");
  await member.getByRole("spinbutton", { name: /^Away goals ·/ }).fill("1");
  await member
    .getByRole("button", { name: "Update prediction", exact: true })
    .click();
  await expect(member.locator(".saved-score")).toHaveText("2 – 1");
  const fixtureId = new URL(member.url()).searchParams.get("id")!;
  // Read admin fixture fields from the real editing form, then reschedule through the normal endpoint.
  await admin.goto("/admin?tab=fixtures");
  const fixtureCard = admin
    .locator(".admin-fixtures article")
    .filter({ has: admin.locator(`a[href="/match?id=${fixtureId}"]`) });
  await fixtureCard.getByRole("button", { name: "Edit", exact: true }).click();
  const fixture = await admin
    .getByRole("dialog")
    .locator("form")
    .evaluate((form) => {
      const values = Object.fromEntries(new FormData(form as HTMLFormElement));
      return {
        round_id: values.round_id,
        home_id: values.home_id,
        away_id: values.away_id,
        venue_en: values.venue_en,
        venue_ml: values.venue_ml,
      };
    });
  await admin.getByRole("button", { name: "Close", exact: true }).click();
  const locked = await api(admin, "fixtures", {
    id: fixtureId,
    ...fixture,
    kickoff: new Date(Date.now() - 7200000).toISOString(),
    status: "awaiting_result",
    knockout: false,
    demo: true,
    schedule_note_en: "Local test: moved kickoff earlier",
    schedule_note_ml: "പ്രാദേശിക പരീക്ഷണം: മത്സരം നേരത്തെയാക്കി",
  });
  expect(locked.status).toBe(200);
  const stale = await api(member, "prediction", {
    fixture_id: fixtureId,
    home_goals: 3,
    away_goals: 1,
    predicted_winner: "home",
    first_goal: "home",
  });
  expect(stale.status).toBe(400);
  expect(stale.error).toBe("prediction_locked");
  await member.reload();
  await expect(
    member.getByRole("button", { name: "Update prediction", exact: true }),
  ).toBeDisabled();
  await admin.goto("/admin?tab=results");
  await admin.getByLabel("Choose a fixture").selectOption(fixtureId);
  await admin.getByRole("spinbutton", { name: /^Home goals ·/ }).fill("2");
  await admin.getByRole("spinbutton", { name: /^Away goals ·/ }).fill("1");
  await admin.getByLabel("Who will win the match?").selectOption("home");
  await admin.getByLabel("Who will score first?").selectOption("home");
  await admin.getByRole("button", { name: "Preview points changes" }).click();
  await expect(admin.locator(".confirm-box")).toContainText(name);
  await admin
    .getByRole("button", { name: "Finalize result", exact: true })
    .click();
  await expect(admin.getByRole("status")).toHaveText("Saved successfully");
  await member.goto("/leaderboard?mine=1");
  await expect(member.locator("#my-rank")).toContainText(name);
  await expect(member.locator("#my-rank td").last()).toHaveText("3");
  await member.goto("/profile");
  await expect(member.locator("canvas")).toBeVisible();
  await member.waitForFunction(
    () => document.querySelector("canvas")?.height === 1350,
  );
  const downloadPromise = member.waitForEvent("download");
  await member.getByRole("button", { name: "Download PNG" }).click();
  const download = await downloadPromise;
  await download.saveAs(".local/checks/rank-en.png");
  const meta = await sharp(".local/checks/rank-en.png").metadata();
  expect(meta.format).toBe("png");
  expect(meta.width).toBe(1080);
  expect(meta.height).toBe(1350);
  await member.evaluate(() =>
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => false,
    }),
  );
  const fallbackPromise = member.waitForEvent("download");
  await member
    .getByRole("button", { name: "Share rank card", exact: true })
    .click();
  await fallbackPromise;
  await expect(member.getByRole("status")).toContainText(
    "Native file sharing is unavailable",
  );
  await member.getByRole("button", { name: "Language", exact: true }).click();
  await expect(member.locator("html")).toHaveAttribute("lang", "ml");
  await expect(
    member.getByRole("heading", { name: "പ്രൊഫൈൽ", exact: true }),
  ).toBeVisible();
  await member.waitForTimeout(500);
  const mlDownload = member.waitForEvent("download");
  await member.getByRole("button", { name: "പിഎൻജി ഡൗൺലോഡ്" }).click();
  await (await mlDownload).saveAs(".local/checks/rank-ml.png");
  await member.screenshot({
    path: ".local/checks/profile-mobile-ml.png",
    fullPage: true,
  });
  expect(
    await member.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await member.goto("/home");
  await member.screenshot({
    path: ".local/checks/home-mobile-ml.png",
    fullPage: true,
  });
  expect(
    await member.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await member.setViewportSize({ width: 1440, height: 1100 });
  await member.screenshot({
    path: ".local/checks/home-desktop-ml.png",
    fullPage: true,
  });
  await member.getByRole("button", { name: "ഭാഷ", exact: true }).click();
  await member.screenshot({
    path: ".local/checks/home-desktop-en.png",
    fullPage: true,
  });
  // Correcting a result changes the member's score without duplicated point rows.
  await admin.goto("/admin?tab=results");
  await admin.getByLabel("Choose a fixture").selectOption(fixtureId);
  await admin.getByRole("spinbutton", { name: /^Home goals ·/ }).fill("1");
  await admin.getByRole("spinbutton", { name: /^Away goals ·/ }).fill("0");
  await admin.getByLabel("Who will win the match?").selectOption("home");
  await admin.getByLabel("Who will score first?").selectOption("home");
  await admin
    .getByLabel("Correction reason (required for corrections)")
    .fill("Local demo result correction for verification.");
  await admin.getByRole("button", { name: "Preview points changes" }).click();
  await admin
    .getByRole("button", { name: "Correct result", exact: true })
    .click();
  await expect(admin.getByRole("status")).toHaveText("Saved successfully");
  await member.goto("/leaderboard?mine=1");
  await expect(member.locator("#my-rank td").last()).toHaveText("2");
  const exportResponse = await admin.request.get("/api/export?type=membership");
  expect(exportResponse.status()).toBe(200);
  expect(exportResponse.headers()["content-type"]).toContain("text/csv");
  expect(
    (await member.request.get("/api/export?type=membership")).status(),
  ).toBe(403);
  expect(errors).toEqual([]);
  await context.close();
  await adminContext.close();
});
