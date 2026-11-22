import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  SAVE_KEY,
  BACKUP_KEY,
  MAX_OFFLINE_SECONDS,
  parseSave,
  exportGame,
  loadGame,
  saveGame,
  applyOffline,
} from "../src/storage.js";
import { AudioEngine } from "../src/audio.js";
import { Engine } from "../src/engine.js";

const initial = () => ({
  version: "1.0.0",
  stage: 1,
  credits: 80,
  rp: 0,
  ne: 0,
  models: 0,
  params: 0,
  archived: 0,
  seeds: 0,
  time: 0,
  savedAt: 1800000000000,
  techs: [],
  recipes: {},
  phi: 50,
  psi: 50,
  settings: { music: false, sfx: true, mute: false, haptics: true, speed: 1 },
  nodes: [
    {
      id: "n1",
      type: "generator",
      x: 0,
      y: 0,
      level: 1,
      allocation: 100,
      temp: 20,
      buffer: 0,
    },
    {
      id: "n2",
      type: "modem",
      x: 2,
      y: 0,
      level: 1,
      allocation: 100,
      temp: 20,
      buffer: 0,
    },
  ],
  edges: [{ id: "e1", from: "n1", to: "n2", kind: "data", weight: 1 }],
  stats: { maxTemp: 20, purity: 1 },
});
const fakeEngine = (state = initial()) => ({
  state,
  serialize() {
    return structuredClone(this.state);
  },
  tick(dt) {
    this.state.time += dt;
    this.state.credits += 2 * dt;
    this.state.rp += 0.5 * dt;
  },
});
let previousStorage;
beforeEach(() => {
  previousStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
      clear: () => values.clear(),
    },
  });
});
afterEach(() => {
  if (previousStorage)
    Object.defineProperty(globalThis, "localStorage", previousStorage);
  else delete globalThis.localStorage;
});

test("export/import preserves the complete graph, settings and metadata", () => {
  const engine = fakeEngine();
  const result = parseSave(exportGame(engine));
  assert.deepEqual(result.nodes, engine.state.nodes);
  assert.deepEqual(result.edges, engine.state.edges);
  assert.deepEqual(result.settings, engine.state.settings);
  assert.equal(result.credits, 80);
  assert.ok(Math.abs(result.savedAt - Date.now()) < 1000);
  assert.equal(
    parseSave(JSON.stringify(initial())).stage,
    1,
    "plain previous save accepted",
  );
});

test("rejects malformed JSON, unsupported versions, NaN-equivalent and malicious keys", () => {
  for (const text of [
    "[]",
    "no JSON",
    '{"stage": 1}',
    '{"__proto__":{"polluted":true}}',
    '{"x":1e999}',
  ]) {
    assert.throws(() => parseSave(text));
  }
  const state = initial();
  state.version = "99.0.0";
  assert.throws(() => parseSave(JSON.stringify(state)), /incompatible/);
  state.version = "1.0.0";
  state.credits = -1;
  assert.throws(() => parseSave(JSON.stringify(state)), /Ressource/);
  assert.equal({}.polluted, undefined);
});

test("rejects duplicate graph IDs, dangling edges, unknown types and unsafe bounds", () => {
  const mutations = [
    (s) => s.nodes.push({ ...s.nodes[0] }),
    (s) => (s.edges[0].to = "missing"),
    (s) => (s.nodes[0].type = "constructor"),
    (s) => (s.nodes[0].x = -1),
    (s) => (s.edges[0].weight = 0),
    (s) => (s.settings.speed = 999),
    (s) => (s.techs = ["made-up"]),
    (s) => (s.stage = 1.5),
    (s) => (s.edges[0].kind = "unknown"),
    (s) => (s.edges[0].to = s.edges[0].from),
  ];
  for (const mutate of mutations) {
    const state = initial();
    mutate(state);
    assert.throws(() => parseSave(JSON.stringify(state)));
  }
});

test("bounded parser rejects oversize and excessively nested inputs", () => {
  assert.throws(
    () => parseSave(" ".repeat(10 * 1024 * 1024 + 1)),
    /volumineux/,
  );
  const state = initial();
  let branch = state;
  for (let i = 0; i < 20; i++) {
    branch.nested = {};
    branch = branch.nested;
  }
  assert.throws(() => parseSave(JSON.stringify(state)), /complexe/);
});

test("autosave keeps a validated previous version and recovers from corrupt main save", () => {
  const engine = fakeEngine();
  assert.equal(saveGame(engine).ok, true);
  engine.state.credits = 120;
  assert.equal(saveGame(engine).ok, true);
  assert.equal(loadGame().credits, 120);
  assert.equal(parseSave(localStorage.getItem(BACKUP_KEY)).credits, 80);
  localStorage.setItem(SAVE_KEY, "CORRUPTED");
  assert.equal(loadGame().credits, 80);
  engine.state.credits = 160;
  assert.equal(saveGame(engine).ok, true);
  assert.equal(
    parseSave(localStorage.getItem(BACKUP_KEY)).credits,
    80,
    "corrupt main does not replace good backup",
  );
});

test("quota or unavailable localStorage returns actionable failure without throwing", () => {
  const engine = fakeEngine();
  assert.equal(saveGame(engine).ok, true);
  const old = localStorage.getItem(SAVE_KEY);
  localStorage.setItem = () => {
    throw new DOMException("Quota exceeded", "QuotaExceededError");
  };
  assert.equal(saveGame(engine).ok, false);
  assert.equal(localStorage.getItem(SAVE_KEY), old);
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() {
      throw new Error("Disabled");
    },
  });
  assert.equal(loadGame(), null);
  assert.equal(saveGame(engine).ok, false);
});

test("offline short absence replays exactly and a future timestamp never creates rewards", () => {
  const engine = fakeEngine();
  const when = engine.state.savedAt;
  const gain = applyOffline(engine, when + 10000);
  assert.equal(gain.seconds, 10);
  assert.equal(gain.credits, 20);
  assert.equal(gain.rp, 5);
  assert.equal(engine.state.savedAt, when + 10000);
  const future = applyOffline(engine, when);
  assert.equal(future.seconds, 0);
  assert.equal(future.credits, 0);
});

test("offline rewards cap at two hours with conservative 90% extrapolation", () => {
  const engine = fakeEngine();
  const gain = applyOffline(engine, engine.state.savedAt + 86400000);
  assert.equal(gain.seconds, MAX_OFFLINE_SECONDS);
  assert.equal(gain.simulatedSeconds, 120);
  assert.equal(gain.credits, 120 * 2 + (7200 - 120) * 2 * 0.9);
  assert.equal(engine.state.time, 7200);
});

test("no extrapolation for advanced, quarantined or hot networks", () => {
  for (const alter of [
    (s) => (s.stage = 6),
    (s) => (s.nodes[0].quarantine = 10),
    (s) => (s.stats.maxTemp = 80),
  ]) {
    const engine = fakeEngine();
    alter(engine.state);
    const gain = applyOffline(engine, engine.state.savedAt + 7200000);
    assert.equal(gain.seconds, 120);
    assert.equal(gain.credits, 240);
    assert.equal(gain.conservative, true);
    assert.equal(engine.state.time, 120);
  }
});

test("a saved pause stays paused offline and does not accrue rewards", () => {
  const engine = fakeEngine();
  engine.state.paused = true;
  const before = engine.state.credits,
    now = engine.state.savedAt + 7200000;
  const result = applyOffline(engine, now);
  assert.equal(result.seconds, 0);
  assert.equal(result.credits, 0);
  assert.equal(engine.state.credits, before);
  assert.equal(engine.state.time, 0);
  assert.equal(engine.state.savedAt, now);
  const invalid = initial();
  invalid.paused = "true";
  assert.throws(() => parseSave(JSON.stringify(invalid)));
});

test("finite buffer reserves never become perpetual offline resource sources", () => {
  const engine = fakeEngine();
  engine.state.nodes[1].buffer = 1e7;
  engine.tick = function (dt) {
    this.state.credits += 2 * dt;
    this.state.nodes[1].buffer -= dt * 100;
    this.state.time += dt;
  };
  const result = applyOffline(engine, engine.state.savedAt + 7200000);
  assert.equal(result.seconds, 120);
  assert.equal(result.conservative, true);
  assert.equal(result.credits, 240);
  const noSource = fakeEngine();
  noSource.state.nodes = noSource.state.nodes.filter(
    (n) => n.type !== "generator",
  );
  const other = applyOffline(noSource, noSource.state.savedAt + 7200000);
  assert.equal(other.seconds, 120);
});

test("audio construction does not create a context before a user gesture", async () => {
  const audio = new AudioEngine();
  assert.equal(audio.context, null);
  assert.equal(
    await audio.unlock(),
    false,
    "headless environment without AudioContext is harmless",
  );
  audio.configure({ music: true, sfx: false });
  audio.play("research");
  audio.destroy();
  assert.equal(audio.voices.size, 0);
  assert.equal(await audio.unlock(), false);
});

test("rejects malformed semantic queues and state containers before constructing the engine", () => {
  const mutations = [
    (s) => (s.nodes[0].input = "oops"),
    (s) => (s.nodes[0].output = null),
    (s) => (s.nodes[0].input = [null]),
    (s) => (s.nodes[0].input = [{ type: "text", bytes: 100, units: 1 }]),
    (s) =>
      (s.nodes[0].input = [
        {
          type: "text",
          bytes: -100,
          units: 1,
          value: 1,
          rp: 1,
          real: 100,
          zone: "Europe",
        },
      ]),
    (s) =>
      (s.nodes[0].input = [
        {
          type: "text",
          bytes: 100,
          units: 0,
          value: 1,
          rp: 1,
          real: 100,
          zone: "Europe",
        },
      ]),
    (s) => (s.nodes[0].fragments = []),
    (s) => (s.nodes[0].level = 9),
    (s) => (s.nodes[0].zone = "unknown"),
    (s) => (s.nodes[0].paidCurrency = "__proto__"),
    (s) => (s.hardware = 5),
    (s) => (s.nextId = 1),
    (s) => (s.stats = []),
    (s) => (s.history = "not an array"),
    (s) => (s.messages = [null]),
    (s) => (s.recipes = false),
    (s) => (s.time = 1e100),
    (s) => (s.seeds = 0.5),
  ];
  for (const mutate of mutations) {
    const state = new Engine().serialize();
    mutate(state);
    assert.throws(() => parseSave(JSON.stringify(state)));
  }
});

test("every era exports, validates, restores and ticks the actual Engine without nonfinite fields", () => {
  for (let stage = 1; stage <= 9; stage++) {
    const engine = new Engine();
    if (stage > 1) engine.setStage(stage);
    for (let i = 0; i < 40; i++) engine.tick(0.25);
    const state = parseSave(exportGame(engine));
    const restored = new Engine(state);
    restored.tick(0.25);
    assert.equal(restored.state.stage, stage);
    assert.equal(restored.state.nodes.length, state.nodes.length);
    assert.doesNotThrow(() => parseSave(exportGame(restored)));
  }
});
