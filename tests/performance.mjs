/** Headless engine workload, not a browser/mobile FPS benchmark. */
import { performance } from "node:perf_hooks";
import assert from "node:assert/strict";
import { Engine } from "../src/engine.js";
import { applyOffline, exportGame, parseSave } from "../src/storage.js";
const e = new Engine();
e.setStage(7);
e.state.nodes = [];
e.state.edges = [];
for (let i = 0; i < 128; i++) {
  const a = e.addNode("generator", i % 12, Math.floor(i / 12) * 2).node;
  const b = e.addNode("lab", i % 12, Math.floor(i / 12) * 2 + 1).node;
  assert.ok(a && b);
  assert.equal(e.connect(a.id, b.id).ok, true);
}
for (let i = 0; i < 100; i++) e.tick(0.1);
globalThis.gc?.();
const heapBefore = process.memoryUsage().heapUsed;
const samples = [];
for (let i = 0; i < 1000; i++) {
  const start = performance.now();
  e.tick(0.1);
  samples.push(performance.now() - start);
}
globalThis.gc?.();
const heapAfter = process.memoryUsage().heapUsed;
const queues = e.state.nodes.flatMap((n) => [n.input.length, n.output.length]);
assert.ok(Math.max(...queues) <= 96);
assert.ok(e.state.history.length <= 120);
assert.ok(e.state.messages.length <= 30);
const state = parseSave(exportGame(e));
assert.equal(state.nodes.length, 256);
e.state.savedAt = Date.now() - 3600000;
const before = performance.now(),
  offline = applyOffline(e);
const offlineMs = performance.now() - before;
samples.sort((a, b) => a - b);
console.log(
  JSON.stringify(
    {
      scope:
        "headless Node simulation; no browser or hardware-mobile FPS claim",
      nodes: e.state.nodes.length,
      edges: e.state.edges.length,
      ticks: samples.length,
      stepSeconds: 0.1,
      medianTickMs: samples[Math.floor(samples.length * 0.5)],
      p95TickMs: samples[Math.floor(samples.length * 0.95)],
      heapDeltaBytes: heapAfter - heapBefore,
      gcAvailable: !!globalThis.gc,
      maxQueueLots: Math.max(...queues),
      historyPoints: e.state.history.length,
      offline: {
        wallMs: offlineMs,
        creditedSeconds: offline.seconds,
        simulatedSeconds: offline.simulatedSeconds,
      },
    },
    null,
    2,
  ),
);
