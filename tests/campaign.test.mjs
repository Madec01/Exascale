/** Reproducible campaign. No debug stage jump, no resources injected, no forged packets. */
import test from "node:test";
import assert from "node:assert/strict";
import { Engine } from "../src/engine.js";
import { TECHS } from "../src/data.js";
export function campaign(verbose = false) {
  const e = new Engine(),
    marks = [];
  const checked = (r) => {
    assert.ok(
      r.ok,
      `${r.message} (étape ${e.state.stage}, Cr ${e.state.credits}, RP ${e.state.rp})`,
    );
    return r;
  };
  const wait = (condition, limit = 10000) => {
    let spent = 0;
    while (!condition() && spent < limit) {
      e.tick(1);
      spent++;
    }
    assert.ok(
      condition(),
      `Objectif bloqué après ${limit}s : ${JSON.stringify(e.goalProgress())}; stats ${JSON.stringify(e.state.stats)}`,
    );
  };
  const add = (t) => checked(e.addNode(t)).node;
  const wire = (a, b, kind = "data", weight = 1) =>
    checked(e.connect(a.id, b.id, weight, kind));
  const clear = () => {
    for (const n of [...e.state.nodes]) checked(e.removeNode(n.id));
  };
  const unlink = (n) => {
    for (const edge of [...e.state.edges])
      if (edge.from === n.id && edge.kind === "data")
        checked(e.disconnect(edge.id));
  };
  const tech = (id) => {
    const t = TECHS.find((t) => t.id === id);
    wait(() => e.state.rp >= t.cost && e.state.ne >= t.neCost);
    checked(e.buyTech(id));
  };
  const upgrade = (n, level) => {
    while (n.level < level) checked(e.upgradeNode(n.id));
  };
  const cool = (targets, level = 1) => {
    const c = add("chiller");
    upgrade(c, level);
    for (const n of targets) wire(c, n, "cooling");
    return c;
  };
  const advance = () => {
    wait(() => e.goalProgress().every((g) => g.ratio >= 1));
    marks.push({
      stage: e.state.stage,
      at: e.state.time,
      credits: e.state.credits,
      rp: e.state.rp,
      nodes: e.state.nodes.length,
      stats: { ...e.state.stats },
    });
    if (verbose)
      console.log(
        "ERA",
        e.state.stage,
        "@",
        e.state.time,
        "s",
        e.state.nodes.length,
        "nodes",
      );
    checked(e.advance());
  };
  // 1. The initial 100-o/s modem earns every credit used later.
  advance();
  // 2. Two archive pipelines; route one temporarily to R&D for genuine RP.
  clear();
  const lab = add("lab");
  const archives = [];
  for (let i = 0; i < 2; i++) {
    const a = add("archive"),
      m = add("modem");
    wire(a, m);
    archives.push(a);
  }
  unlink(archives[0]);
  wire(archives[0], lab);
  wait(() => e.state.rp >= 600);
  tech("routing");
  unlink(archives[0]);
  wire(
    archives[0],
    e.state.nodes.find((n) => n.type === "modem"),
  );
  advance();
  // 3. Archive research finances the client API, fiber and antivirus chain.
  for (const a of archives) {
    unlink(a);
    wire(a, lab);
  }
  for (const id of ["api", "fiber", "antivirus"]) tech(id);
  clear();
  const research = add("lab"),
    source = add("importer"),
    antivirus = add("antivirus"),
    integrity = add("integrity"),
    sale = add("modem");
  wire(source, antivirus);
  wire(antivirus, integrity);
  wire(integrity, sale);
  advance();
  // 4. Four cooled and archived server streams; enough time to archive 10 GB.
  unlink(integrity);
  wire(integrity, research);
  for (const id of ["blades", "power", "cooling", "infiniband"]) tech(id);
  clear();
  const racks = [];
  for (let i = 0; i < 4; i++) {
    const r = add("rack"),
      disk = add("disk"),
      m = add("modem");
    wire(r, disk);
    wire(disk, m);
    cool([r]);
    racks.push(r);
  }
  advance();
  // 5. Four GPUs; three sell parameters and one stores them. All datasets are processed.
  const l5 = add("lab");
  unlink(racks[0]);
  wire(racks[0], l5);
  for (const id of ["bigdata", "gpu", "supervised"]) tech(id);
  clear();
  checked(e.upgradeHardware());
  checked(e.upgradeHardware());
  for (let g = 0; g < 4; g++) {
    const gpu = add("gpu");
    if (g < 3) {
      checked(e.setNodeMode(gpu.id, "sell"));
      const m = add("modem");
      wire(gpu, m);
    }
    cool([gpu], 3);
    for (let a = 0; a < 4; a++) {
      const r = add("rack"),
        agg = add("aggregator");
      wire(r, agg);
      wire(agg, gpu);
      cool([r]);
    }
  }
  advance();
  // 6. Five training chains forge 25 models, then 25 active generators are injected.
  const l6 = add("lab"),
    r6 = e.state.nodes.find((n) => n.type === "rack");
  unlink(r6);
  wire(r6, l6);
  for (const id of ["tpu", "injection"]) tech(id);
  clear();
  for (let i = 0; i < 5; i++) {
    const r = add("rack"),
      a = add("aggregator"),
      t = add("trainer");
    upgrade(a, 4);
    wire(r, a);
    wire(a, t);
    cool([r]);
    cool([t], 3);
  }
  wait(() => e.state.models >= 25, 400);
  clear();
  for (let i = 0; i < 25; i++) {
    const g = add("generator"),
      m = add("modem");
    wire(g, m);
    checked(e.injectModel(g.id));
    cool([g]);
  }
  advance();
  // 7. Ten independent 10-To/s real feeds, with four genuinely connected chillers.
  clear();
  const real = [];
  for (let i = 0; i < 10; i++) {
    const r = add("sensor"),
      m = add("modem");
    wire(r, m);
    real.push(r);
  }
  for (let i = 0; i < real.length; i += 3) cool(real.slice(i, i + 3), 8);
  advance();
  // 8. Route sensor data to the lab. Each of four zones gets an actual predictor.
  const l8 = add("lab");
  for (const r of real) {
    unlink(r);
    wire(r, l8);
  }
  for (const id of ["submarine", "orbital", "semantic", "prediction", "smr"])
    tech(id);
  clear();
  checked(e.upgradeHardware());
  const bus = add("semantic"),
    router = add("router"),
    l = add("lab"),
    reflection = add("reflection");
  wire(bus, router);
  wire(router, l);
  wire(router, reflection);
  for (let i = 0; i < 8; i++) {
    const smr = add("smr");
    wire(smr, reflection, "power");
  }
  const sensors = [];
  for (const zone of ["Europe", "America", "Asia", "Orbit"]) {
    const r = add("sensor"),
      p = add("predictor");
    checked(e.setNodeZone(r.id, zone));
    checked(e.setNodeZone(p.id, zone));
    wire(r, p);
    wire(p, bus);
    sensors.push(r);
    cool([p], 8);
    cool([p], 8);
  }
  cool(sensors.slice(0, 2), 8);
  cool(sensors.slice(2), 8);
  cool([bus], 8);
  cool([bus], 8);
  cool([bus], 8);
  advance();
  // 9. Reflection initializes Ne. A synapse then makes consciousness productive.
  tech("quantum");
  wait(() => e.state.ne >= 40);
  const syn = add("synapse");
  wire(router, syn, "data", 4);
  tech("fractal");
  // Survive the hidden recipe by repairing actual destroyed links every 5 seconds.
  checked(e.setCognition(90, 50));
  const plan = e.state.edges.map((x) => ({ ...x }));
  for (let sec = 0; sec < 65; sec++) {
    e.tick(1);
    if (sec % 5 === 0)
      for (const edge of plan)
        if (
          !e.state.edges.some(
            (x) =>
              x.from === edge.from && x.to === edge.to && x.kind === edge.kind,
          )
        )
          checked(e.connect(edge.from, edge.to, edge.weight, edge.kind));
  }
  assert.ok(e.state.recipes.anchor);
  tech("anchor");
  checked(e.setCognition(90, 90));
  tech("distillation");
  e.tick(1);
  marks.push({
    stage: 9,
    at: e.state.time,
    credits: e.state.credits,
    rp: e.state.rp,
    ne: e.state.ne,
    nodes: e.state.nodes.length,
    stats: { ...e.state.stats },
  });
  checked(e.prestige());
  assert.equal(e.state.stage, 1);
  assert.equal(e.state.seeds, 1);
  assert.equal(e.state.sandbox, false);
  return marks;
}
test("campagne complète 1→9→prestige sans debug ni ressources injectées", () => {
  const marks = campaign(!!process.env.EXASCALE_AUDIT_VERBOSE);
  assert.equal(marks.length, 9);
});
