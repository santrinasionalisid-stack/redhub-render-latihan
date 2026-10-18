import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = (process.env.BASE_URL || "https://redhub-render-latihan.onrender.com").replace(/\/$/, "");
const outputDir = "artifacts/ui-audit";
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const roles = [
  { name: "superadmin", email: "superadmin@redhub.demo" },
  { name: "admin", email: "admin@redhub.demo" },
  { name: "pengurus", email: "pengurus@redhub.demo" },
];

async function captureRole(role, viewport, suffix) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on("pageerror", error => console.error(`BROWSER ERROR [${role.name}/${suffix}]: ${error.message}`));

  try {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.locator("#demoLoginForm").waitFor({ state: "visible", timeout: 20000 });

    if (role.name === "superadmin" && suffix === "desktop") {
      await page.screenshot({ path: `${outputDir}/login-desktop.png`, fullPage: true });
    }

    await page.locator("#loginEmail").fill(role.email);
    await page.locator("#loginPassword").fill("Demo123!");
    await page.locator("#demoLoginForm button[type=submit]").click();
    await page.locator(".nav-item").first().waitFor({ state: "visible", timeout: 10000 });
    await page.waitForLoadState("domcontentloaded").catch(() => {});
    // Keep transient success toasts out of baseline dashboard screenshots.
    await page.locator(".demo-toast.is-visible").waitFor({ state: "hidden", timeout: 6000 }).catch(() => {});
    await page.screenshot({
      path: `${outputDir}/dashboard-${role.name}-${suffix}.png`,
      fullPage: true,
    });

    if (suffix === "mobile" && await page.locator(".mobile-nav-toggle").isVisible()) {
      await page.locator(".mobile-nav-toggle").click();
      await page.screenshot({
        path: `${outputDir}/navigation-${role.name}-mobile-open.png`,
        fullPage: true,
      });
    }
  } finally {
    await context.close();
  }
}

try {
  for (const role of roles) {
    await captureRole(role, { width: 1440, height: 1000 }, "desktop");
    await captureRole(role, { width: 390, height: 844 }, "mobile");
  }
  console.log(`Visual screenshots saved to ${outputDir}`);
} finally {
  await browser.close();
}
