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
  await check("V16.8 mobile Pengurus hero, CTAs, report, profile and safe logout", async () => {
    const { context, page, pageErrors } = await freshPage({ width: 390, height: 844 });
    try {
      const logo = page.locator(".login-brand .login-logo img");
      assert(await logo.evaluate(el => el.complete && el.naturalWidth > 0), "Login bull logo must load");
      const logoStyle = await logo.evaluate(el => getComputedStyle(el).borderRadius);
      assert.equal(logoStyle, "50%", "Mobile login emblem must be circular");
      await signIn(page, "pengurus@redhub.demo");
      assert(await page.locator(".member-welcome .stage-core-logo").isVisible(), "Pengurus hero logo must be visible");
      assert(await page.getByText("2025–2030", { exact: true }).count() > 0, "Period should show full year");
      assert.equal(await page.locator(".member-quick-actions [data-action='go-qr']").evaluate(el => el.classList.contains("button-primary")), true);
      assert.equal(await page.locator(".footer-promo").isVisible(), false);
      await page.locator('.sidebar .nav-item[data-page="rapor-saya"]').evaluate(el => el.click());
      assert.equal(await page.locator("[data-mobile-personal-report-action]").count(), 2, "Export and print actions must exist for desktop");
      assert.equal(await page.locator("[data-mobile-personal-report-action]").first().isVisible(), false, "Export and print hidden on mobile");
      await page.locator('.sidebar .nav-item[data-page="profil"]').evaluate(el => el.click());
      const columns = await page.locator(".profile-detail-grid").evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length);
      assert.equal(columns, 1, "Profile must use one column on mobile");
      assert.equal(await page.locator(".profile-logout").isVisible(), false, "Header logout must be hidden on mobile");
      const menuToggle = page.locator(".mobile-nav-toggle");
      await menuToggle.click();
      await page.waitForTimeout(400);
      const drawerLogout = page.locator(".sidebar .mobile-logout");
      assert(await drawerLogout.isVisible(), "Drawer logout must be visible");
      console.log("LOGOUT_GEOMETRY", JSON.stringify(await page.evaluate(() => {
        const sidebar=document.querySelector(".sidebar"), button=document.querySelector(".mobile-logout");
        const s=sidebar.getBoundingClientRect(), b=button.getBoundingClientRect();
        return {isOpen:document.body.classList.contains("mobile-nav-open"),match:sidebar.matches("body.mobile-nav-open .sidebar"),transform:getComputedStyle(sidebar).transform,inline:sidebar.getAttribute("style"),sidebar:{x:s.x,y:s.y,width:s.width,height:s.height},button:{x:b.x,y:b.y,width:b.width,height:b.height}, viewport:{w:innerWidth,h:innerHeight}};
      })));
      { const rect = await drawerLogout.boundingBox(); assert(rect && rect.x >= 0 && rect.y >= 0 && rect.y + rect.height <= 844, "Logout must fit inside viewport"); await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2); }
      const confirm = page.locator(".logout-dialog-layer");
      assert(await confirm.isVisible(), "Logout confirmation must open");
      await page.locator('[data-action="logout-cancel"]').click();
      assert.equal(await confirm.isVisible(), false, "Cancellation must close confirmation");
      assert.equal(await page.locator(".login-screen").isVisible(), false, "Cancel must preserve login session");
      if (!await drawerLogout.evaluate(el => el.getBoundingClientRect().left >= 0)) await menuToggle.click();
      { const rect = await drawerLogout.boundingBox(); assert(rect && rect.x >= 0 && rect.y >= 0 && rect.y + rect.height <= 844, "Logout must fit inside viewport"); await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2); }
      await page.locator('[data-action="logout-accept"]').click();
      assert(await page.locator(".login-screen").isVisible(), "Confirmed logout must open login");
      assert.deepEqual(pageErrors, [], "No JS exceptions");
    } finally { await context.close(); }
  });
  await check("V16.9 compact drawer and Pengurus identity card", async () => {
    for (const width of [320, 390, 430]) {
      const { context, page, pageErrors } = await freshPage({ width, height: 844 });
      try {
        await signIn(page, "pengurus@redhub.demo");
        await page.locator('.sidebar .nav-item[data-page="profil"]').evaluate(el => el.click());
        const profile = page.locator(".profile-detail-grid");
        assert(await profile.locator(".profile-identity").isVisible(), "Mobile identity heading must be visible");
        const geometry = await profile.evaluate(el => {
          const header = el.querySelector(".profile-identity").getBoundingClientRect();
          const rows = [...el.querySelectorAll(":scope > div:not(.profile-identity):not(.profile-detail-avatar)")].map(x => x.getBoundingClientRect());
          return { header, rows: rows.map(r => ({top:r.top,bottom:r.bottom,width:r.width})), width:el.getBoundingClientRect().width };
        });
        assert(geometry.rows[0].top >= geometry.header.bottom - 1, "Profile detail rows must be below identity header");
        assert(geometry.rows.every((r,i) => i===0 || r.top >= geometry.rows[i-1].bottom - 1), "Profile rows must stack vertically");
        await page.locator(".mobile-nav-toggle").click();
        await page.waitForTimeout(350);
        const drawer = await page.locator(".sidebar").boundingBox();
        assert(drawer && drawer.x >= -1 && drawer.width <= 236, "Mobile drawer must be compact and visible");
        assert(drawer.width <= width - 80, "Mobile drawer must leave space outside for dismissal");
        assert(await page.locator(".sidebar .mobile-logout").isVisible(), "Logout must remain visible");
        await page.mouse.click(width - 16, 180);
        assert.equal(await page.locator("body").evaluate(el => el.classList.contains("mobile-nav-open")), false, "Tap outside must close drawer");
        assert.deepEqual(pageErrors, [], "No JavaScript errors");
      } finally { await context.close(); }
    }
  });
  await check("V16.10 release copy across login and permitted role pages", async () => {
    const disallowed = /\\b(?:mode latihan|data demo|simulasi|prototype|pratinjau ui|organisasi demo|mode demo)\\b/i;
    for (const account of ["superadmin@redhub.demo", "admin@redhub.demo", "pengurus@redhub.demo"]) {
      const { context, page, pageErrors } = await freshPage({ width: 390, height: 844 });
      try {
        const loginText = await page.locator("#loginScreen").innerText();
        assert(!disallowed.test(loginText), "Login copy must be release-ready");
        await signIn(page, account);
        const routes = await page.locator(".sidebar .nav-item").evaluateAll(items => items.map(el => el.dataset.page));
        for (const route of routes) {
          await page.locator(`.sidebar .nav-item[data-page="${route}"]`).evaluate(el => el.click());
          const visibleText = await page.locator(".workspace").innerText();
          assert(!disallowed.test(visibleText), `Release copy not complete: ${account}/${route}`);
        }
        assert.deepEqual(pageErrors, []);
      } finally { await context.close(); }
    }
  });
} finally {
  await browser.close();
}

console.log(`\n${checks} checks passed; ${failures.length} failed.`);
if (failures.length) process.exitCode = 1;
