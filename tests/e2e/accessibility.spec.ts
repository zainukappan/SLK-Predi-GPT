import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile, writeFile } from "node:fs/promises";
test("WCAG checks on welcome, member mobile, Malayalam profile and admin dialog", async ({
  page,
}) => {
  const reports: Record<string, unknown> = {};
  await page.goto("/");
  const scan = async (name: string) => {
    const r = await new AxeBuilder({ page })
      .exclude("nextjs-portal")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    reports[name] = r.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    }));
  };
  await scan("welcome");
  const content = await readFile(".local/demo-accounts.txt", "utf8");
  const password = content.match(/Password \(all accounts\): (.+)/)![1].trim();
  await page.getByLabel("Email address or mobile number").fill("admin@sbk.test");
  await page.getByLabel("Password (at least 10 characters)").fill(password);
  await page
    .locator("form")
    .getByRole("button", { name: "Sign in", exact: true })
    .click();
  await expect(page).toHaveURL("/home");
  await scan("home-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await scan("home-mobile");
  await page.goto("/profile");
  await page.getByRole("button", { name: "Language", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "ml");
  await scan("profile-malayalam");
  await page.getByRole("button", { name: "ഭാഷ", exact: true }).click();
  await page.goto("/admin?tab=teams");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await scan("admin-dialog");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await writeFile(
    ".local/checks/accessibility.json",
    JSON.stringify(reports, null, 2),
  );
  for (const [name, violations] of Object.entries(reports))
    expect(violations, name).toEqual([]);
});
