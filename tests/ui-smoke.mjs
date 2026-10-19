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

  await check("Pengurus hero displays REDHUB logo on desktop and mobile", async () => {
    for (const width of [390, 1440]) {
      const { context, page, pageErrors } = await freshPage({ width, height: 900 });
      try {
        await signIn(page, "pengurus@redhub.demo");
        const logo = page.locator(".member-welcome .stage-core-logo");
        await logo.waitFor({ state: "visible" });
        assert(await logo.evaluate(el => el.complete && el.naturalWidth > 0), "Hero logo image must load");
        const bounds = await logo.boundingBox();
        assert(bounds && bounds.width >= 40 && bounds.height >= 40, "Hero logo must be large enough to see");
        assert.deepEqual(pageErrors, [], "Browser JavaScript errors detected");
      } finally { await context.close(); }
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
  await check("Mobile viewport stays contained at 320, 375, 390 and 430px", async () => {
    for (const width of [320, 375, 390, 430]) {
      const { context, page, pageErrors } = await freshPage({ width, height: 844 });
      try {
        await signIn(page, "admin@redhub.demo");
        const metrics = await page.evaluate(() => ({
          viewport: document.documentElement.clientWidth,
          pageWidth: document.documentElement.scrollWidth,
          inputs: [...document.querySelectorAll("input, select, textarea")].filter(el => el.getClientRects().length).map(el => parseFloat(getComputedStyle(el).fontSize)),
        }));
        assert(metrics.pageWidth <= metrics.viewport + 1, `Horizontal overflow at ${width}px: ${JSON.stringify(metrics)}`);
        assert.deepEqual(pageErrors, [], `Browser errors at ${width}px`);
      } finally { await context.close(); }
    }
  });
  await check("V16.5 role pages and QR Saya follow mobile-first layout", async () => {
    for (const width of [320, 390, 430]) {
      for (const account of ["superadmin@redhub.demo", "admin@redhub.demo", "pengurus@redhub.demo"]) {
        const { context, page, pageErrors } = await freshPage({ width, height: 844 });
        try {
          const loginWidth = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          assert(loginWidth <= 1, "Login page overflows mobile viewport");
          await signIn(page, account);
          const routes = await page.locator(".sidebar .nav-item").evaluateAll(links => links.map(a => a.dataset.page));
          for (const route of routes) {
            await page.locator(`.sidebar .nav-item[data-page="${route}"]`).evaluate(el => el.click());
            const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
            assert(overflow <= 1, `Mobile horizontal overflow: ${account} / ${route} / ${width}px`);
            if (account.startsWith("pengurus") && route === "qr-saya") {
              const positions = await page.evaluate(() => {
                const identity = document.querySelector(".member-id-card")?.getBoundingClientRect();
                const instructions = document.querySelector(".member-id-layout > .analytics-card")?.getBoundingClientRect();
                return {identity: identity && {left:identity.left,right:identity.right,bottom:identity.bottom}, instructions:instructions && {left:instructions.left,top:instructions.top}};
              });
              assert(positions.identity && positions.instructions, "QR identity and instructions must exist");
              assert(positions.instructions.top >= positions.identity.bottom, "Check-in instructions must be below identity card");
              assert(Math.abs(positions.instructions.left - positions.identity.left) <= 2, "QR cards must align vertically");
            }
          }
          assert.deepEqual(pageErrors, [], `Unexpected JavaScript errors for ${account} on ${width}px`);
        } finally { await context.close(); }
      }
    }
  });
  await check("V16.6 branded login mobile layout", async () => {
    for (const width of [320, 390, 430, 768]) {
      const { context, page, pageErrors } = await freshPage({ width, height: 844 });
      try {
        const result = await page.evaluate(() => {
          const brand = document.querySelector(".login-brand");
          const form = document.querySelector(".login-form-side");
          const image = document.querySelector(".login-logo img");
          const b = brand.getBoundingClientRect(), f = form.getBoundingClientRect();
          return {brandVisible: getComputedStyle(brand).display !== "none", bBottom:b.bottom, fTop:f.top, formWithin:f.right <= innerWidth + 1, pageWidth:document.documentElement.scrollWidth, viewport:document.documentElement.clientWidth, logoLoaded:image.complete && image.naturalWidth>0};
        });
        assert(result.brandVisible && result.logoLoaded, `Missing brand or logo at ${width}px`);
        assert(result.fTop >= result.bBottom - 1, `Brand and form must stack at ${width}px`);
        assert(result.formWithin && result.pageWidth <= result.viewport + 1, `Mobile login overflow at ${width}px`);
        assert.deepEqual(pageErrors, []);
      } finally { await context.close(); }
    }
  });
  await check("V16.7 minimal login eye toggle and first-screen footer", async () => {
    for (const [width, height] of [[320, 667], [390, 844], [430, 932], [768, 1024]]) {
      const { context, page, pageErrors } = await freshPage({ width, height });
      try {
        const eye = page.locator(".password-visibility");
        const pass = page.locator("#loginPassword");
        assert.equal(await eye.count(), 1, "Password eye must exist");
        await pass.fill("Demo123!");
        await eye.click();
        assert.equal(await pass.getAttribute("type"), "text");
        assert.equal(await eye.getAttribute("aria-pressed"), "true");
        await eye.click();
        assert.equal(await pass.getAttribute("type"), "password");
        const geometry = await page.evaluate(() => {
          const shell = document.querySelector(".login-shell");
          const footer = document.querySelector(".login-copyright");
          const brand = document.querySelector(".login-brand");
          return { footerBottom: footer.getBoundingClientRect().bottom,
            brandBottom: brand.getBoundingClientRect().bottom,
            shellBottom: shell.getBoundingClientRect().bottom,
            viewportHeight: innerHeight,
            pageWidth: document.documentElement.scrollWidth,
            viewportWidth: document.documentElement.clientWidth };
        });
        assert(geometry.footerBottom <= height + 1, `Footer not visible at ${width}x${height}: ${JSON.stringify(geometry)}`);
        assert(geometry.pageWidth <= geometry.viewportWidth + 1, "Login overflow");
        assert.deepEqual(pageErrors, []);
      } finally { await context.close(); }
    }
  });
} finally {
  await browser.close();
}

console.log(`\n${checks} checks passed; ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;
