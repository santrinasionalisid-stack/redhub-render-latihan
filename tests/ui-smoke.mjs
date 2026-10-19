import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = (process.env.BASE_URL || "https://redhub-render-latihan.onrender.com").replace(/\/$/, "");
const browser = await chromium.launch({ headless: true });
const failures = [];
let checks = 0;

async function check(name, run) {
  try {
    await run();
    checks += 1;
    console.log(`PASS — ${name}`);
  } catch (error) {
    failures.push({ name, error });
    console.error(`FAIL — ${name}: ${error.message}`);
  }
}

async function freshPage(viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.locator("#demoLoginForm").waitFor({ state: "visible", timeout: 20000 });
  return { context, page, pageErrors };
}

async function signIn(page, email) {
  await page.locator("#loginEmail").fill(email);
  await page.locator("#loginPassword").fill("Demo123!");
  await page.locator("#demoLoginForm button[type=submit]").click();
  await page.locator(".nav-item").first().waitFor({ state: "visible", timeout: 10000 });
}

try {
  await check("V14 login remains minimal: email, password, and Masuk only", async () => {
    const { context, page } = await freshPage();
    try {
      assert.equal(await page.locator("#demoLoginForm input").count(), 2);
      assert.equal((await page.locator("#demoLoginForm button[type=submit]").innerText()).trim().replace(/\s*→$/, ""), "Masuk");
      const bodyText = await page.locator("body").innerText();
      assert.doesNotMatch(bodyText, /Masuk sebagai|Coba cepat/i);
      assert.equal(await page.locator("#demoLoginForm select").count(), 0);
    } finally {
      await context.close();
    }
  });

  await check("Super Admin sees platform controls", async () => {
    const { context, page, pageErrors } = await freshPage();
    try {
      await signIn(page, "superadmin@redhub.demo");
      const nav = await page.locator(".nav-item").allInnerTexts();
      assert(nav.some(label => label.includes("Kelola Admin")), "Kelola Admin missing");
      assert(nav.some(label => label.includes("Pengaturan WhatsApp")), "Pengaturan WhatsApp missing");
      assert(nav.some(label => label.includes("Pengurus & Anggota")), "Pengurus & Anggota missing");
      assert.deepEqual(pageErrors, [], "Browser JavaScript errors detected");
    } finally {
      await context.close();
    }
  });

  await check("Admin Kesekretariatan does not see Super Admin controls", async () => {
    const { context, page, pageErrors } = await freshPage();
    try {
      await signIn(page, "admin@redhub.demo");
      const nav = await page.locator(".nav-item").allInnerTexts();
      assert(nav.some(label => label.includes("Rapat / Kegiatan")), "Rapat / Kegiatan missing");
      assert(nav.some(label => label.includes("Laporan")), "Laporan missing");
      assert(!nav.some(label => label.includes("Kelola Admin")), "Kelola Admin must be hidden");
      assert(!nav.some(label => label.includes("Pengaturan WhatsApp")), "Pengaturan WhatsApp must be hidden");
      assert.deepEqual(pageErrors, [], "Browser JavaScript errors detected");
    } finally {
      await context.close();
    }
  });

  await check("Pengurus sees personal portal without admin controls", async () => {
    const { context, page, pageErrors } = await freshPage();
    try {
      await signIn(page, "pengurus@redhub.demo");
      const nav = await page.locator(".nav-item").allInnerTexts();
      assert(nav.some(label => label.includes("QR Saya")), "QR Saya missing");
      assert(nav.some(label => label.includes("Riwayat Kehadiran")), "Riwayat Kehadiran missing");
      assert(!nav.some(label => label.includes("Kelola Admin")), "Admin controls must be hidden");
      assert.deepEqual(pageErrors, [], "Browser JavaScript errors detected");
    } finally {
      await context.close();
    }
  });

  await check("Mobile navigation opens and closes when tapping outside", async () => {
    const { context, page, pageErrors } = await freshPage({ width: 390, height: 844 });
    try {
      await signIn(page, "superadmin@redhub.demo");
      const toggle = page.locator(".mobile-nav-toggle");
      await toggle.click();
      assert.equal(await page.locator("body").evaluate(el => el.classList.contains("mobile-nav-open")), true);
      assert.equal(await toggle.getAttribute("aria-expanded"), "true");
      // Tap a real viewport coordinate outside the open drawer. Clicking main at
      // (10, 10) can target the covered area underneath the sidebar and time out.
      const viewport = page.viewportSize();
      const navItems = page.locator(".sidebar .nav-item");
      const first = await navItems.nth(0).boundingBox();
      const second = await navItems.nth(1).boundingBox();
      assert(first && second, "First two navigation items must be measurable");
      assert(second.y >= first.y + first.height, "Mobile navigation must stack vertically");
      assert(Math.abs(first.x - second.x) <= 2, "Mobile navigation items must align to one column");
      const sidebarBounds = await page.locator(".sidebar").boundingBox();
      assert(sidebarBounds, "Sidebar must be visible when the mobile navigation is open");
      const outsideX = Math.min(
        viewport.width - 4,
        Math.ceil(sidebarBounds.x + sidebarBounds.width + 8)
      );
      assert(
        outsideX > sidebarBounds.x + sidebarBounds.width,
        "Expected a tappable area outside the mobile sidebar"
      );
      await page.mouse.click(outsideX, Math.min(160, viewport.height - 4));
      assert.equal(await page.locator("body").evaluate(el => el.classList.contains("mobile-nav-open")), false);
      assert.equal(await toggle.getAttribute("aria-expanded"), "false");
      assert.deepEqual(pageErrors, [], "Browser JavaScript errors detected");
    } finally {
      await context.close();
    }
  });
} finally {
  await browser.close();
}

console.log(`\n${checks} checks passed; ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;
