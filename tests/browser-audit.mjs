/** Run after starting a static server at the project root: EXASCALE_URL=http://127.0.0.1:8080 node tests/browser-audit.mjs */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("playwright");
} catch {
  playwright = require(
    `${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || "/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules"}/playwright`,
  );
}
const base = process.env.EXASCALE_URL || "http://127.0.0.1:8080";
const out = process.env.EXASCALE_AUDIT_DIR || "/tmp/exascale-browser-audit";
await fs.mkdir(out, { recursive: true });
const browser = await playwright.chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const reports = [];
try {
  for (const [name, width, height, mobile] of [
    ["mobile-360", 360, 800, true],
    ["mobile-430", 430, 932, true],
    ["landscape", 932, 430, true],
    ["desktop", 1440, 1000, false],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: mobile ? 3 : 1,
      isMobile: mobile,
      hasTouch: mobile,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base, { waitUntil: "networkidle" });
    await page.waitForFunction(() => !!window.EXASCALE?.renderer, {
      timeout: 30000,
    });
    if (await page.locator("#start-game").isVisible())
      await page.locator("#start-game").click();
    await page.waitForTimeout(500);
    const initial = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      canvas: document.querySelector("canvas").getBoundingClientRect().toJSON(),
      diagnostics: window.EXASCALE.renderer.getDiagnostics(),
      resources: document.querySelector(".resource-strip").innerText,
      targets: [...document.querySelectorAll("button")]
        .filter((b) => b.getClientRects().length && !b.disabled)
        .map((b) => ({
          label: b.getAttribute("aria-label") || b.textContent.trim(),
          width: b.getBoundingClientRect().width,
          height: b.getBoundingClientRect().height,
        }))
        .filter((b) => b.width < 43.5 || b.height < 43.5),
    }));
    assert.equal(initial.overflow, false, `${name}: page horizontal overflow`);
    assert.ok(initial.diagnostics.dpr <= 2, `${name}: DPR capped`);
    assert.ok(initial.canvas.height > 150, `${name}: canvas usable height`);
    assert.deepEqual(
      initial.targets,
      [],
      `${name}: visible buttons have 44 px touch targets`,
    );
    await page.screenshot({ path: path.join(out, `${name}-circuit.png`) });
    await page.locator('[data-panel="build"]').click();
    await page.waitForTimeout(150);
    const sheet = await page.evaluate(() => ({
      panel: document.querySelector("#panel").getBoundingClientRect().toJSON(),
      canvas: document.querySelector("canvas").getBoundingClientRect().toJSON(),
      scroll:
        document.querySelector("#panel-body").scrollHeight >
        document.querySelector("#panel-body").clientHeight,
    }));
    if (width <= 700)
      assert.ok(
        (sheet.panel.top - sheet.canvas.top) / sheet.canvas.height >= 0.595,
        `${name}: minimum 60% canvas remains`,
      );
    await page.screenshot({ path: path.join(out, `${name}-build.png`) });
    await page.locator("#close-panel").click();
    await page.locator('[data-panel="research"]').click();
    await page.waitForTimeout(150);
    assert.ok(
      await page.locator("#panel-body").innerText(),
      `${name}: research panel content`,
    );
    await page.screenshot({ path: path.join(out, `${name}-research.png`) });
    await page.locator("#close-panel").click();
    const storage = await page.evaluate(async () => {
      const { saveGame, parseSave, exportGame, loadGame } =
        await import("./src/storage.js");
      const e = window.EXASCALE.engine;
      const result = saveGame(e);
      const parsed = parseSave(exportGame(e));
      return {
        ok: result.ok,
        nodes: parsed.nodes.length,
        edges: parsed.edges.length,
        restored: loadGame()?.nodes.length,
      };
    });
    assert.equal(storage.ok, true, `${name}: real engine save validation`);
    assert.equal(storage.nodes, storage.restored);
    reports.push({ name, width, height, initial, sheet, storage, errors });
    assert.deepEqual(errors, [], `${name}: no browser runtime errors`);
    await context.close();
  }
  // Draw workload fixture: 64 visible modules, 56 loaded cables, actual renderer pool.
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto(`${base}/tests/render-harness.html`, {
    waitUntil: "networkidle",
  });
  await page.waitForFunction(() => !!window.harness);
  await page.waitForTimeout(7000);
  const render = await page.evaluate(() =>
    window.harness.renderer.getDiagnostics(),
  );
  assert.ok(
    render.packets >= 300,
    `stress fixture must animate hundreds of packets (${render.packets})`,
  );
  assert.ok(render.packets <= render.packetCap, "bounded particle pool");
  assert.ok(render.dpr <= 2, "stress DPR bound");
  await page.screenshot({ path: path.join(out, "stress-render.png") });
  const pan = await page.evaluate(() => ({
    ...window.harness.renderer.camera,
  }));
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 200, y: 800 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: 250, y: 825 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  const moved = await page.evaluate(() => ({
    ...window.harness.renderer.camera,
  }));
  assert.ok(Math.abs(moved.x - pan.x) > 20, "one-finger camera pan");
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: 140, y: 450 },
      { x: 260, y: 450 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: 100, y: 450 },
      { x: 300, y: 450 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  const zoom = await page.evaluate(() => window.harness.renderer.camera.zoom);
  assert.ok(zoom > moved.zoom, "two-finger pinch zoom");
  const cleanup = await page.evaluate(() => {
    window.harness.stop();
    const r = window.harness.renderer;
    return {
      listeners: r._listeners.length,
      packets: r._packets.length,
      cache: r._paths.size,
      pool: r._packetPool.length,
    };
  });
  assert.deepEqual(
    cleanup,
    { listeners: 0, packets: 0, cache: 0, pool: 0 },
    "renderer destruction clears caches/listeners/pool",
  );
  reports.push({ name: "renderer-stress", render, pan, moved, zoom, cleanup });
  await context.close();
  await fs.writeFile(
    path.join(out, "report.json"),
    JSON.stringify(reports, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        ok: true,
        profiles: reports.map((r) => ({
          name: r.name,
          diagnostics: r.render || r.initial?.diagnostics,
          smallTargets: r.initial?.targets,
        })),
        output: out,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
