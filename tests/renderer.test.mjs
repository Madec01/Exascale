import test from "node:test";
import assert from "node:assert/strict";
import { Renderer } from "../src/renderer.js";
import { NODE_TYPES } from "../src/data.js";

// Deterministic gesture and bounded-memory checks. These do not pretend to be a
// real browser or a physical touch-device benchmark.
const noop = () => {};
const context = () =>
  new Proxy(
    {
      measureText: (s) => ({ width: String(s).length * 6 }),
      createLinearGradient: () => ({ addColorStop: noop }),
      createRadialGradient: () => ({ addColorStop: noop }),
    },
    {
      get: (o, k) => (k in o ? o[k] : noop),
      set: (o, k, v) => ((o[k] = v), true),
    },
  );
globalThis.ResizeObserver = class {
  observe() {}
  disconnect() {
    this.disconnected = true;
  }
};
function node(id, type, x, y) {
  return {
    id,
    type,
    x,
    y,
    zone: "Europe",
    temp: 25,
    status: "ACTIF",
    outRate: 100,
    inRate: 100,
    buffer: 100,
    bufferMax: 500,
    utilization: 0.5,
    progress: 0.5,
  };
}
function setup(width = 360, height = 602, native) {
  const listeners = new Map(),
    canvas = native || { getContext: () => context() };
  Object.assign(canvas, {
    style: {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width, height }),
    setAttribute: noop,
    addEventListener: (k, v) => listeners.set(k, v),
    removeEventListener: (k) => listeners.delete(k),
    focus: noop,
    setPointerCapture: noop,
    releasePointerCapture: noop,
  });
  const engine = {
      state: {
        stage: 1,
        settings: { quality: "high" },
        nodes: [
          node("n1", "generator", 0, 0),
          node("n2", "modem", 0, 1),
          node("n3", "lab", 0, 2),
        ],
        edges: [
          {
            id: "e1",
            from: "n1",
            to: "n2",
            kind: "data",
            rate: 100,
            capacity: 100,
            load: 1,
            flowType: "text",
          },
        ],
      },
    },
    events = [];
  const renderer = new Renderer(canvas, engine, {
    onSelect: (v) => events.push(["select", v]),
    onConnect: (...v) => events.push(["connect", ...v]),
    onMove: (...v) => events.push(["move", ...v]),
    onDeleteEdge: (v) => events.push(["delete", v]),
  });
  renderer.draw(0);
  return { renderer, engine, events, listeners, canvas };
}
function ev(p, id = 1) {
  return {
    clientX: p.x,
    clientY: p.y,
    pointerId: id,
    pointerType: "touch",
    button: 0,
    preventDefault: noop,
  };
}
function tap(r, p) {
  r._down(ev(p));
  r._up(ev(p));
}

test("Retina resolution and 44 CSS-pixel port hit targets", () => {
  globalThis.devicePixelRatio = 4;
  const { renderer: r, engine } = setup();
  assert.equal(r.dpr, 2);
  const p = r.worldToScreen(r.portPosition(engine.state.nodes[0], "out"));
  assert.equal(r._hit({ x: p.x + 21, y: p.y + 21 })?.kind, "port");
  assert.notEqual(r._hit({ x: p.x + 23, y: p.y + 23 })?.kind, "port");
  engine.state.settings.quality = "low";
  r.resize();
  assert.equal(r.dpr, 1);
  r.destroy();
});
test("Tap output then input connects the intended nodes once", () => {
  const { renderer: r, engine, events } = setup();
  tap(r, r.worldToScreen(r.portPosition(engine.state.nodes[0], "out")));
  assert.equal(r.pendingPort, "n1");
  tap(r, r.worldToScreen(r.portPosition(engine.state.nodes[2], "in")));
  assert.deepEqual(events, [["connect", "n1", "n3"]]);
  assert.equal(r.pendingPort, null);
  r.destroy();
});
test("Dragging a node calls the placement callback without mutating model coordinates", () => {
  const { renderer: r, engine, events } = setup();
  const p = r.worldToScreen({ x: 100, y: 70 }),
    q = { x: p.x + 220 * r.camera.zoom, y: p.y };
  r._down(ev(p));
  r._move(ev(q));
  r._up(ev(q));
  assert.deepEqual(events.at(-1), ["move", "n1", 1, 0]);
  assert.equal(engine.state.nodes[0].x, 0);
  r.destroy();
});
test("Double tap keeps its target after the inspector moves the camera", () => {
  const { renderer: r, events } = setup();
  const p = r.worldToScreen({ x: 100, y: 70 });
  tap(r, p);
  r.setOcclusion({ bottom: 241 });
  tap(r, p);
  assert.equal(events.filter((e) => e[0] === "select").length, 1);
  assert.equal(r.camera.zoom, 1.12);
  r.destroy();
});
test("Pinch zoom preserves the world coordinate under the finger midpoint", () => {
  const { renderer: r } = setup();
  const a = { x: 100, y: 230 },
    b = { x: 250, y: 230 };
  r._down(ev(a, 1));
  r._down(ev(b, 2));
  const anchor = { ...r._gesture.anchor };
  r._move(ev({ x: 300, y: 250 }, 2));
  const mid = { x: 200, y: 240 },
    screen = r.worldToScreen(anchor);
  assert.ok(Math.abs(screen.x - mid.x) < 1e-8);
  assert.ok(Math.abs(screen.y - mid.y) < 1e-8);
  r._cancel(ev(a, 1));
  r._cancel(ev(b, 2));
  r.destroy();
});
test("Removed edges purge cached curves, emission state and live visual packets", () => {
  const { renderer: r, engine } = setup();
  for (let i = 1; i < 120; i++) r.draw(i * 16.666);
  assert.ok(r.packetCount > 0);
  engine.state.edges = [];
  r.draw(2200);
  assert.equal(r.getDiagnostics().cacheSize, 0);
  assert.equal(r.packetCount, 0);
  assert.equal(r._emission.size, 0);
  r.destroy();
});
test("Idle edges emit no packets, and already emitted packets drain", () => {
  const { renderer: r, engine } = setup();
  engine.state.edges[0].rate = 0;
  for (let i = 1; i < 30; i++) r.draw(i * 16.666);
  assert.equal(r.packetCount, 0);
  engine.state.edges[0].rate = 100;
  for (let i = 30; i < 90; i++) r.draw(i * 16.666);
  assert.ok(r.packetCount > 0);
  engine.state.edges[0].rate = 0;
  for (let i = 90; i < 900; i++) r.draw(i * 16.666);
  assert.equal(r.packetCount, 0);
  r.destroy();
});
test("Paused simulation freezes packet positions and emits no new visual packets", () => {
  const { renderer: r } = setup();
  for (let i = 1; i < 30; i++) r.draw(i * 16.666);
  const before = r._packets.map((p) => p.progress);
  r.callbacks.isPaused = () => true;
  for (let i = 30; i < 120; i++) r.draw(i * 16.666);
  assert.deepEqual(
    r._packets.map((p) => p.progress),
    before,
  );
  r.destroy();
});
test("Dense graph particle, history and cache storage stay bounded", () => {
  const { renderer: r, engine, listeners } = setup(1440, 760);
  engine.state.stage = 9;
  engine.state.nodes = [];
  engine.state.edges = [];
  for (let y = 0; y < 10; y++)
    for (let x = 0; x < 10; x++) {
      const id = `n${y * 10 + x}`;
      engine.state.nodes.push(
        node(
          id,
          Object.keys(NODE_TYPES)[
            (y * 10 + x) % Object.keys(NODE_TYPES).length
          ],
          x,
          y,
        ),
      );
      if (x)
        engine.state.edges.push({
          id: `e${id}`,
          from: `n${y * 10 + x - 1}`,
          to: id,
          rate: 100,
          load: 1,
          kind: "data",
          flowType: "concept",
        });
    }
  r.fit();
  for (let i = 1; i < 480; i++) r.draw(i * 16.666);
  const d = r.getDiagnostics();
  assert.ok(d.packets <= 900);
  assert.ok(d.packetPool <= 900);
  assert.equal(d.cacheSize, 90);
  assert.ok(r._drawDurations.length <= 180);
  assert.ok(r._fpsSamples.length <= 180);
  r.destroy();
  assert.equal(listeners.size, 0);
  assert.equal(r._paths.size, 0);
  assert.equal(r._packets.length, 0);
  assert.ok(r._resizeObserver.disconnected);
});
test("Fractal substrate appears only at era nine and stays bounded at every zoom", () => {
  const { renderer: r, engine } = setup(1440, 960);
  engine.state.stage = 8;
  r.draw(16);
  assert.equal(r.getDiagnostics().fractalRegions, 0);
  engine.state.stage = 9;
  r.camera = { x: 30, y: 30, zoom: 0.24 };
  r.draw(32);
  assert.ok(r.getDiagnostics().fractalRegions > 0);
  assert.ok(r.getDiagnostics().fractalRegions <= 336);
  r.camera = { x: 180, y: 300, zoom: 2.4 };
  r.draw(48);
  assert.ok(r.getDiagnostics().fractalRegions <= 336);
  assert.doesNotThrow(() => r._icon("founder", 0, 0, 24, "#BCE4D8"));
  r.destroy();
});
test("Native Canvas raster renders portrait and landscape without drawing exceptions", async (t) => {
  let native;
  try {
    native = await import("@napi-rs/canvas");
  } catch {
    try {
      if (process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES)
        native = await import(
          `${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/@napi-rs/canvas/index.js`
        );
    } catch {}
  }
  if (!native) {
    t.skip(
      "Optional @napi-rs/canvas not installed; browser validation is separate.",
    );
    return;
  }
  for (const [w, h] of [
    [360, 602],
    [430, 734],
    [850, 319],
    [1338, 790],
  ]) {
    const { renderer: r, canvas } = setup(w, h, native.createCanvas(w, h));
    for (let i = 0; i < 5; i++) r.draw(i * 16.666);
    const encoded = await canvas.encode("png");
    assert.ok(encoded.length > 3000);
    r.destroy();
  }
});
