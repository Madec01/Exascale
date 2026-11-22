/** Optional integration smoke: npm install --no-save linkedom @napi-rs/canvas
 * This tests JS wiring with a DOM substitute. It does NOT validate browser layout or mobile FPS.
 * node tests/dom-smoke.mjs 360 800
 */
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
function dependency(name) {
  try {
    return require(name);
  } catch {}
  for (const base of [
    process.env.EXASCALE_QA_MODULES,
    process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,
  ])
    if (base)
      try {
        return require(`${base}/${name}`);
      } catch {}
  throw new Error(
    `Test optionnel : installer ${name}, ou renseigner EXASCALE_QA_MODULES.`,
  );
}
const { parseHTML } = dependency("linkedom");
const { createCanvas } = dependency("@napi-rs/canvas");
const width = Number(process.argv[2] || 360),
  height = Number(process.argv[3] || 800);
const source = await fs.readFile(
  new URL("../index.html", import.meta.url),
  "utf8",
);
const { window } = parseHTML(source),
  { document } = window;
globalThis.window = window;
globalThis.document = document;
globalThis.innerWidth = width;
globalThis.innerHeight = height;
globalThis.devicePixelRatio = 3;
globalThis.matchMedia = () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
});
globalThis.ResizeObserver = class {
  observe() {}
  disconnect() {}
};
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: { vibrate: () => true, userAgent: "EXASCALE DOM smoke" },
});
const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => storage.get(k) ?? null,
  setItem: (k, v) => storage.set(k, v),
  removeItem: (k) => storage.delete(k),
};
let frames = [];
globalThis.requestAnimationFrame = (fn) => (frames.push(fn), frames.length);
globalThis.cancelAnimationFrame = () => {};
const nativeSetTimeout = globalThis.setTimeout,
  nativeSetInterval = globalThis.setInterval;
globalThis.setTimeout = (fn, ms, ...args) => {
  const t = nativeSetTimeout(fn, ms, ...args);
  t.unref?.();
  return t;
};
globalThis.setInterval = (fn, ms, ...args) => {
  const t = nativeSetInterval(fn, ms, ...args);
  t.unref?.();
  return t;
};
document.hidden = false;
document.activeElement = document.body;
const top = width <= 700 ? 130 : height <= 550 ? 111 : 170,
  canvasHeight = height - top - (width <= 700 ? 68 : 0);
function rect(x, y, w, h) {
  return {
    x,
    y,
    left: x,
    top: y,
    right: x + w,
    bottom: y + h,
    width: w,
    height: h,
    toJSON() {
      return {
        x,
        y,
        width: w,
        height: h,
        top: y,
        left: x,
        right: x + w,
        bottom: y + h,
      };
    },
  };
}
window.HTMLElement.prototype.getBoundingClientRect = function () {
  if (this.id === "network" || this.id === "workspace")
    return rect(0, top, width, canvasHeight);
  if (this.id === "panel")
    return width <= 700
      ? rect(0, top + canvasHeight * 0.6, width, canvasHeight * 0.4)
      : rect(width - 350, top, 350, canvasHeight);
  return rect(0, 0, 44, 44);
};
window.HTMLElement.prototype.focus = function () {
  document.activeElement = this;
};
const canvas = document.querySelector("canvas"),
  native = createCanvas(width, canvasHeight);
canvas.getContext = () => native.getContext("2d");
canvas.setPointerCapture = () => {};
canvas.releasePointerCapture = () => {};
Object.defineProperty(canvas, "width", {
  configurable: true,
  get: () => native.width,
  set: (v) => (native.width = v),
});
Object.defineProperty(canvas, "height", {
  configurable: true,
  get: () => native.height,
  set: (v) => (native.height = v),
});
const dialog = document.querySelector("dialog");
dialog.showModal = () => dialog.setAttribute("open", "");
dialog.close = () => {
  dialog.removeAttribute("open");
  dialog.onclose?.();
};
await import("../src/main.js");
const game = window.EXASCALE;
assert.ok(game?.engine && game?.renderer);
let timestamp = performance.now();
function frame(dt = 100) {
  timestamp += dt;
  const pending = frames;
  frames = [];
  for (const fn of pending) fn(timestamp);
}
const click = (selector) => {
  const el = document.querySelector(selector);
  assert.ok(el, `element exists: ${selector}`);
  el.dispatchEvent(new window.Event("click", { bubbles: true }));
  return el;
};
frame();
click("#start-game");
frame();
assert.equal(document.querySelector("#onboarding").hidden, true);
assert.equal(game.engine.state.nodes.length, 3);
click('[data-panel="build"]');
assert.equal(document.querySelector("#panel").hidden, false);
click('[data-action="build"][data-id="generator"]');
assert.equal(
  game.engine.state.nodes.length,
  4,
  "construction DOM updates live simulation",
);
click("#close-panel");
// Route actual produced data to research; do not fabricate RP for the early UI check.
const engine = game.engine,
  sourceNode = engine.state.nodes[0],
  lab = engine.state.nodes.find((n) => n.type === "lab");
engine.disconnect(engine.state.edges[0].id);
game.renderer.callbacks.onConnect(sourceNode.id, lab.id);
for (let i = 0; i < 36; i++) engine.tick(1);
assert.ok(engine.state.rp >= 25, "laboratory receives real data");
click('[data-panel="research"]');
click('[data-action="research"][data-id="overclock"]');
assert.ok(
  engine.state.techs.includes("overclock"),
  "research purchase via delegated DOM click",
);
click("#close-panel");
click('[data-panel="stats"]');
click(`[data-action="inspect-node"][data-id="${sourceNode.id}"]`);
const slider = document.querySelector('[data-control="allocation"]');
assert.ok(slider);
slider.value = "73";
slider.dispatchEvent(new window.Event("input", { bubbles: true }));
assert.equal(
  sourceNode.allocation,
  73,
  "inspector slider edits CPU allocation",
);
for (const panel of [
  "help",
  "settings",
  "goals",
  "build",
  "research",
  "stats",
]) {
  game.openPanel(panel);
  assert.ok(
    document.querySelector("#panel-body").innerHTML.length > 100,
    `${panel} rendered`,
  );
  frame();
}
game.openPanel("settings");
for (let i = 0; i < 3; i++) click('[data-action="version"]');
assert.ok(
  document.querySelector(".debug-box"),
  "triple-tap unlocks mobile sandbox",
);
const eraResults = [];
for (let stage = 1; stage <= 9; stage++) {
  engine.setStage(stage);
  engine.tick(0.25);
  frame();
  for (const panel of ["build", "research", "stats", "goals", "settings"]) {
    game.openPanel(panel);
    frame();
  }
  eraResults.push({
    stage,
    title: document.querySelector("#world-name").textContent,
    nodes: engine.state.nodes.length,
  });
}
const { saveGame, loadGame } = await import("../src/storage.js");
assert.equal(saveGame(engine).ok, true);
assert.equal(loadGame().stage, 9);
game.renderer.destroy();
game.audio.destroy();
assert.equal(game.renderer._listeners.length, 0);
console.log(
  JSON.stringify(
    {
      ok: true,
      width,
      height,
      scope:
        "DOM JavaScript integration; mocked geometry, not browser CSS layout",
      checks: [
        "onboarding",
        "build",
        "real-data-research",
        "CPU slider",
        "all panels",
        "triple-tap sandbox",
        "9 eras",
        "save/restore",
        "cleanup",
      ],
      eras: eraResults,
    },
    null,
    2,
  ),
);
