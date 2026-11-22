import test from "node:test";
import assert from "node:assert/strict";
import {
  Engine,
  thermalFactor,
  modelQuality,
  cognitiveCoherence,
} from "../src/engine.js";
import { NODE_TYPES, TECHS, STAGES, format } from "../src/data.js";
const run = (e, seconds) => {
  for (let t = 0; t < seconds; t += 0.25) e.tick(0.25);
};
function blank(stage = 1) {
  const e = new Engine();
  e.setStage(stage);
  e.state.nodes = [];
  e.state.edges = [];
  e.state.blackout = 0;
  return e;
}
const add = (e, type) => {
  const r = e.addNode(type);
  assert.ok(r.ok, r.message);
  return r.node;
};
const wire = (e, a, b, kind = "data", weight = 1) => {
  const r = e.connect(a.id, b.id, weight, kind);
  assert.ok(r.ok, r.message);
  return r.edge;
};

test("catalogue complet : 9 ères, 36 technologies, quatre branches", () => {
  assert.equal(STAGES.length, 9);
  assert.equal(TECHS.length, 36);
  assert.equal(new Set(TECHS.map((t) => t.branch)).size, 4);
  for (const d of Object.values(NODE_TYPES))
    assert.ok(!d.tech || TECHS.some((t) => t.id === d.tech));
});
test("formules exactes : thermique, collapse, cohérence", () => {
  assert.equal(thermalFactor(65), 1);
  assert.equal(thermalFactor(82.5), 0.5);
  assert.equal(thermalFactor(100), 0);
  assert.equal(modelQuality(0.05), 0.0625);
  assert.equal(modelQuality(0.25), 1);
  assert.equal(cognitiveCoherence(70, 65), 0.95);
});
test("aucune recherche passive ; conservation du modem 100 o/s", () => {
  const e = new Engine();
  run(e, 20);
  assert.equal(e.state.rp, 0);
  assert.ok(e.state.credits > 109 && e.state.credits < 110);
  assert.ok(e.state.stats.throughput <= 100);
});
test("R&D par câblage et mono-sortie étape 1", () => {
  const e = new Engine(),
    [gen, modem, lab] = e.state.nodes;
  assert.equal(e.connect(gen.id, lab.id).ok, false);
  e.disconnect(e.state.edges[0].id);
  wire(e, gen, lab);
  run(e, 20);
  assert.ok(e.state.rp >= 19);
  assert.equal(e.state.credits, 90);
  assert.ok(e.buyTech("huffman").ok);
  assert.equal(e.available("compressor"), true);
});
test("ère 1 : les deux branches progressent et chaque niveau déplace le goulot", () => {
  const e = new Engine();
  const [sales, modem, lab] = e.state.nodes;
  const research = add(e, "generator");
  wire(e, research, lab);
  const rates = (credits, rp) => {
    run(e, 3);
    assert.ok(Math.abs(e.state.stats.creditsRate - credits) < 0.001);
    assert.ok(Math.abs(e.state.stats.rpRate - rp) < 0.001);
  };
  const upgrade = (node) => assert.ok(e.upgradeNode(node.id).ok);
  rates(1, 1);
  upgrade(research);
  rates(1, 1);
  upgrade(lab);
  rates(1, 2);
  assert.ok(!e.advance().ok);
  run(e, 12);
  assert.ok(e.buyTech("parity").ok);
  upgrade(sales);
  rates(1, 2);
  upgrade(modem);
  rates(2, 2);
  run(e, 130);
  assert.ok(e.advance().ok);
});
test("poids 3:1 sans duplication : 75 % vente, 25 % RP", () => {
  const e = blank(2);
  const gen = add(e, "generator"),
    router = add(e, "router"),
    sale = add(e, "modem"),
    lab = add(e, "lab");
  wire(e, gen, router);
  wire(e, router, sale, "data", 3);
  wire(e, router, lab, "data", 1);
  const cr = e.state.credits,
    rp = e.state.rp;
  run(e, 20);
  const credits = e.state.credits - cr,
    research = e.state.rp - rp;
  assert.ok(Math.abs(credits / research - 3) < 0.05);
  assert.ok(credits + research < 200);
});
test("fragmentation : reconstruction bloque tant qu’une des quatre branches manque", () => {
  const e = blank(2);
  const source = add(e, "archive"),
    frag = add(e, "fragmenter"),
    recon = add(e, "reconstructor"),
    sale = add(e, "modem");
  wire(e, source, frag);
  const relays = Array.from({ length: 4 }, () => add(e, "router"));
  for (const r of relays) wire(e, frag, r);
  for (const r of relays.slice(0, 3)) wire(e, r, recon);
  wire(e, recon, sale);
  const start = e.state.credits;
  run(e, 15);
  assert.equal(e.state.credits, start);
  wire(e, relays[3], recon);
  run(e, 20);
  assert.ok(e.state.credits > start);
});
test("antivirus + intégrité assainissent les imports ; quarantaine sur chemin brut", () => {
  const e = blank(3),
    source = add(e, "importer"),
    av = add(e, "antivirus"),
    check = add(e, "integrity"),
    sale = add(e, "modem");
  wire(e, source, av);
  wire(e, av, check);
  wire(e, check, sale);
  run(e, 30);
  assert.equal(sale.quarantine, 0);
  assert.ok(e.state.stats.creditsRate > 0);
  assert.ok(e.state.nodes.every((n) => n.temp === 25));
  const raw = blank(3),
    r = add(raw, "importer"),
    m = add(raw, "modem");
  wire(raw, r, m);
  run(raw, 15);
  assert.ok(m.quarantine > 0 || m.infected > 0);
});
test("50 kW produisent 1 °C/s initialement ; refroidissement connecté utile", () => {
  const e = blank(4);
  e.state.techs = e.state.techs.filter((t) => t !== "overclock");
  const rack = add(e, "rack");
  run(e, 20);
  assert.ok(rack.temp > 43 && rack.temp < 46);
  const chiller = add(e, "chiller");
  wire(e, chiller, rack, "cooling");
  run(e, 15);
  assert.ok(rack.temp < 26);
});
test("surcharge déclenche 15 s de blackout et récupération sans verrouillage", () => {
  const e = blank(4);
  e.state.hardware = 0;
  for (let i = 0; i < 12; i++) add(e, "rack");
  e.tick(0.25);
  assert.ok(e.state.blackout > 14);
  assert.equal(e.state.stats.creditsRate, 0);
  for (const n of e.state.nodes.slice(0, 5)) e.removeNode(n.id);
  run(e, 16);
  assert.equal(e.state.blackout, 0);
});
test("GPU nécessite des datasets ; stockage et vente sont exclusifs", () => {
  const e = blank(5),
    source = add(e, "rack"),
    agg = add(e, "aggregator"),
    gpu = add(e, "gpu"),
    sale = add(e, "modem");
  wire(e, source, agg);
  wire(e, agg, gpu);
  wire(e, gpu, sale);
  const ch = add(e, "chiller");
  ch.level = 5;
  wire(e, ch, gpu, "cooling");
  wire(e, ch, source, "cooling");
  const p = e.state.params;
  run(e, 15);
  assert.ok(e.state.params > p);
  const stored = e.state.params,
    cr = e.state.credits;
  e.setNodeMode(gpu.id, "sell");
  run(e, 15);
  assert.equal(e.state.params, stored);
  assert.ok(e.state.credits > cr);
});
test("modèle spécialisé : 10 Go et au moins 30 s, puis coût d’inférence", () => {
  const e = blank(6),
    source = add(e, "rack"),
    agg = add(e, "aggregator"),
    trainer = add(e, "trainer");
  agg.level = 4;
  wire(e, source, agg);
  wire(e, agg, trainer);
  const ch = add(e, "chiller");
  ch.level = 5;
  wire(e, ch, source, "cooling");
  wire(e, ch, trainer, "cooling");
  e.state.models = 0;
  run(e, 20);
  assert.equal(e.state.models, 0);
  run(e, 20);
  assert.ok(e.state.models >= 1);
  assert.ok(e.injectModel(source.id).ok);
  e.tick(0.25);
  assert.ok(source.gpuRequired === 2);
  assert.ok(source.power >= 90);
});
test("recette signatures virales : 100 paquets consommés par laboratoire isolé", () => {
  const e = blank(6),
    source = add(e, "importer"),
    lab = add(e, "lab");
  e.state.recipes.predictive = false;
  e.state.recipes.corruptPackets = 0;
  source.level = 8;
  wire(e, source, lab);
  run(e, 240);
  assert.ok(e.state.recipes.predictive);
});
test("pureté tient compte du réel et du synthétique acheminés ; zéro trafic ne crée aucune ressource", () => {
  const e = blank(7),
    sensor = add(e, "sensor"),
    synthetic = add(e, "synthetic"),
    m1 = add(e, "modem"),
    m2 = add(e, "modem");
  wire(e, sensor, m1);
  wire(e, synthetic, m2);
  e.tick(0.25);
  assert.ok(e.state.stats.purity > 0.9);
  assert.ok(e.state.stats.throughput > 1e13);
  e.state.edges = [];
  run(e, 2);
  const cr = e.state.credits;
  run(e, 10);
  assert.equal(e.state.credits, cr);
});
test("fusion sémantique exige quatre zones et prédiction temporelle", () => {
  const e = blank(8),
    semantic = add(e, "semantic"),
    lab = add(e, "lab");
  const sources = [];
  for (const zone of ["Europe", "America", "Asia", "Orbit"]) {
    const source = add(e, "sensor");
    source.zone = zone;
    sources.push(source);
    wire(e, source, semantic);
  }
  wire(e, semantic, lab);
  run(e, 3);
  assert.ok(e.state.stats.sync < 0.98);
  for (const edge of [...e.state.edges])
    if (edge.to === semantic.id) e.disconnect(edge.id);
  for (const source of sources) {
    const pred = add(e, "predictor");
    pred.zone = source.zone;
    wire(e, source, pred);
    wire(e, pred, semantic);
  }
  run(e, 15);
  assert.ok(e.state.stats.sync > 0.98);
  assert.ok(e.state.stats.conceptsRate >= 1000);
  assert.ok(e.state.stats.rpRate > 0);
});
test("étape 9 : prestige conserve seulement les fondateurs", () => {
  const e = blank(9);
  e.state.techs.push("distillation");
  e.state.seeds = 2;
  e.state.stats.coherence = 1;
  assert.ok(e.prestige().ok);
  assert.equal(e.state.stage, 1);
  assert.equal(e.state.seeds, 3);
  assert.equal(e.state.nodes.length, 3);
  assert.equal(e.state.techs.length, 0);
  assert.equal(e.state.sandbox, false);
});
test("sérialisation bornée et nombres finis après stress", () => {
  const e = blank(7);
  for (let i = 0; i < 20; i++) {
    const a = add(e, "sensor"),
      b = add(e, "modem");
    wire(e, a, b);
  }
  run(e, 30);
  const s = e.serialize();
  assert.ok(s.history.length <= 120);
  assert.ok(
    s.nodes.every((n) => n.input.length <= 96 && n.output.length <= 96),
  );
  const scan = (x) => {
    if (typeof x === "number") assert.ok(Number.isFinite(x));
    else if (x && typeof x === "object") Object.values(x).forEach(scan);
  };
  scan(s);
  assert.ok(new Engine(s).serialize());
});

test("unités décimales cohérentes", () => {
  assert.equal(format(1000, "o/s"), "1 Ko/s");
  assert.equal(format(1000, "kW"), "1 MW");
  assert.equal(format(1000, "Hz"), "1 kHz");
  assert.equal(format(1000, "TFLOPS"), "1 PFLOPS");
});

test("bus interne PC : compression augmente vraiment les ventes et RAM partagée ≤500 o", () => {
  const e = blank(1);
  const g = add(e, "generator"),
    c = add(e, "corrector"),
    z = add(e, "compressor"),
    m = add(e, "modem");
  g.level = 2;
  g.allocation = 2;
  c.allocation = 3;
  z.allocation = 4;
  wire(e, g, c);
  wire(e, c, z);
  wire(e, z, m);
  run(e, 20);
  assert.ok(e.state.stats.creditsRate >= 3.99);
  assert.equal(e.state.edges[0].capacity, 500);
  assert.equal(e.state.edges[2].capacity, 100);
  assert.ok(e.state.nodes.reduce((s, n) => s + n.buffer, 0) <= 500.001);
});
test("énergie supplémentaire uniquement aux destinataires : une prise ne fournit pas le parc", () => {
  const e = blank(4);
  e.state.hardware = 0;
  e.state.techs = e.state.techs.filter((t) => t !== "overclock");
  const racks = Array.from({ length: 12 }, () => add(e, "rack"));
  const transformer = add(e, "transformer");
  wire(e, transformer, racks[0], "power");
  e.tick(0.25);
  assert.ok(e.state.blackout > 0);
  assert.equal(e.state.stats.powerCapacity, 550);
  wire(e, transformer, racks[1], "power");
  run(e, 16);
  assert.equal(e.state.blackout, 0);
  assert.equal(e.state.stats.powerCapacity, 600);
});
test("priorité GPU 75:25 distribue réellement un budget insuffisant", () => {
  const e = blank(5);
  e.state.hardware = 0;
  const a = add(e, "gpu"),
    b = add(e, "gpu");
  a.allocation = 75;
  b.allocation = 25;
  e.tick(0.25);
  assert.equal(a.gpuAllocated, 7.5);
  assert.equal(b.gpuAllocated, 2.5);
});
test("boucle disque : les mêmes octets ne sont pas archivés deux fois", () => {
  const e = blank(2),
    a = add(e, "archive"),
    disk = add(e, "disk"),
    router = add(e, "router");
  const edge = wire(e, a, disk);
  wire(e, disk, router);
  wire(e, router, disk);
  run(e, 10);
  e.disconnect(edge.id);
  run(e, 5);
  const before = e.state.archived;
  run(e, 20);
  assert.equal(e.state.archived, before);
});
test("découverte fondatrice et restrictions orbitales", () => {
  const e = new Engine();
  assert.equal(e.available("founder"), false);
  e.state.seeds = 1;
  assert.equal(e.available("founder"), true);
  assert.equal(e.setNodeZone(e.state.nodes[0].id, "Orbit").ok, false);
  e.setStage(8);
  e.state.techs = e.state.techs.filter((t) => t !== "orbital");
  assert.equal(e.setNodeZone(e.state.nodes[0].id, "Orbit").ok, false);
});
test("achats de l’ère9 uniquement en néguentropie", () => {
  const e = blank(9),
    before = e.state.ne,
    cr = e.state.credits;
  const n = add(e, "generator");
  assert.equal(e.state.ne, before - 2);
  assert.equal(e.state.credits, cr);
  assert.equal(e.nodeUpgradeCost(n.id).currency, "ne");
});

test("un générateur orphelin ne bloque pas le laboratoire en RAM partagée", () => {
  const e = new Engine(),
    [g, , lab] = e.state.nodes;
  add(e, "generator");
  e.disconnect(e.state.edges[0].id);
  wire(e, g, lab);
  run(e, 36);
  assert.ok(e.state.rp >= 25);
  assert.ok(e.state.nodes.reduce((s, n) => s + n.buffer, 0) <= 500.001);
});

test("antivirus prédictif préserve les octets et laisse exactement 0,1 % des menaces", () => {
  const e = blank(6),
    a = add(e, "antivirus");
  assert.ok(e.injectModel(a.id).ok);
  a.input.push({
    type: "client",
    bytes: 1e6,
    units: 100,
    value: 15000,
    rp: 20000,
    real: 1e6,
    zone: "Europe",
    corrupt: true,
  });
  e.tick(0.25);
  const all = a.output.reduce((s, p) => s + p.bytes, 0),
    bad = a.output.filter((p) => p.corrupt).reduce((s, p) => s + p.bytes, 0);
  assert.equal(all, 1e6);
  assert.ok(Math.abs(bad / all - 0.001) < 1e-10);
});
