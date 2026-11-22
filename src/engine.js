import { STAGES, NODE_TYPES, TECHS, VERSION } from "./data.js";

export const clamp = (x, min = 0, max = 1) =>
  Math.max(min, Math.min(max, Number.isFinite(x) ? x : min));
export const thermalFactor = (T) => clamp(1 - (T - 65) / 35);
export const modelQuality = (P) => (P >= 0.2 ? 1 : (clamp(P) / 0.2) ** 2);
export const cognitiveCoherence = (phi, psi) =>
  clamp(1 - Math.abs(phi - psi) / 100);
const fail = (message) => ({ ok: false, message }),
  ok = (extra = {}) => ({ ok: true, ...extra });
const ZONES = ["Europe", "America", "Asia", "Orbit"];
const coolingFree = new Set([
  "transformer",
  "chiller",
  "smr",
  "reflection",
  "anchor",
  "synapse",
]);
const immune = new Set([
  "firewall",
  "antivirus",
  "lab",
  "importer",
  "generator",
  "rack",
  "sensor",
  "synthetic",
]);
const GPU_COST = { gpu: 10, trainer: 50, synthetic: 1e4, predictor: 5e5 };
const MAX_NODES = 1024,
  MAX_EDGES = 4096;
const sums = (arr) => arr.reduce((a, b) => a + b, 0);
const bytes = (q) => q.reduce((a, b) => a + b.bytes, 0);
function signature(p) {
  return [
    p.type,
    p.zone,
    p.corrupt ? 1 : 0,
    p.corrected ? 1 : 0,
    p.compressed ? 1 : 0,
    p.certified ? 1 : 0,
    p.predicted ? 1 : 0,
    p.archived ? 1 : 0,
    p.awakened ? 1 : 0,
    p.part ?? "",
    p.origin ?? "",
  ].join("|");
}
function push(queue, p) {
  if (!p || p.bytes < 1e-12 || p.units < 1e-15) return;
  const key = signature(p),
    old = queue.find((a) => a.key === key);
  if (old) {
    old.bytes += p.bytes;
    old.units += p.units;
    old.value += p.value;
    old.rp += p.rp;
    old.real += p.real;
  } else if (queue.length < 96) queue.push({ ...p, key });
}
function portion(p, f) {
  const r = { ...p };
  for (const k of ["bytes", "units", "value", "rp", "real"]) r[k] *= f;
  return r;
}
function remove(p, f) {
  for (const k of ["bytes", "units", "value", "rp", "real"]) p[k] *= 1 - f;
}
function prune(q) {
  for (let i = q.length - 1; i >= 0; i--)
    if (q[i].bytes < 1e-9 || q[i].units < 1e-15) q.splice(i, 1);
}
function packet(type, unitBytes, units, value, rp, zone = "Europe", opts = {}) {
  return {
    type,
    bytes: unitBytes * units,
    units,
    value: value * units,
    rp: rp * units,
    real: unitBytes * units,
    zone,
    latency: 0,
    ...opts,
  };
}
function initial() {
  return {
    version: VERSION,
    stage: 1,
    credits: 90,
    rp: 0,
    ne: 0,
    params: 0,
    models: 0,
    archived: 0,
    seeds: 0,
    time: 0,
    savedAt: Date.now(),
    nodes: [],
    edges: [],
    techs: [],
    recipes: {
      predictive: false,
      neuralzip: false,
      anchor: false,
      corruptPackets: 0,
      psychosisSeconds: 0,
    },
    settings: {
      music: 0.35,
      sfx: 0.65,
      mute: false,
      haptics: true,
      quality: "auto",
      speed: 1,
    },
    stats: {},
    history: [],
    phi: 50,
    psi: 50,
    hardware: 0,
    blackout: 0,
    stableSeconds: 0,
    boostedSeconds: 0,
    nextId: 1,
    messages: [],
    tutorial: 0,
    totalEarned: 0,
    concepts: 0,
    sandbox: false,
  };
}

export class Engine {
  constructor(saved) {
    this.state = saved ? structuredClone(saved) : initial();
    const defaults = initial();
    for (const k of Object.keys(defaults))
      if (this.state[k] === undefined) this.state[k] = defaults[k];
    this.state.settings = { ...defaults.settings, ...this.state.settings };
    this.state.recipes = { ...defaults.recipes, ...this.state.recipes };
    this.state.version = VERSION;
    this._historyAt = 0;
    this._autoAt = 0;
    this._events = {};
    if (!saved) {
      const a = this._makeNode("generator", 0, 1),
        b = this._makeNode("modem", 2, 1),
        c = this._makeNode("lab", 2, 2);
      this.state.nodes.push(a, b, c);
      this.connect(a.id, b.id);
    }
    for (const n of this.state.nodes) {
      n.input ??= [];
      n.output ??= [];
      n.fragments ??= {};
      n.allocation ??= 50;
      n.temp ??= 25;
      n.zone ??= "Europe";
      n.paid ??= NODE_TYPES[n.type]?.cost || 0;
      n.paidCurrency ??= NODE_TYPES[n.type]?.stage === 9 ? "ne" : "credits";
      n.mode ??=
        n.type === "gpu" ? "stock" : n.type === "trainer" ? "models" : "auto";
      n.level ??= 1;
      n.infected ??= 0;
      n.loss ??= 0;
      n.training ??= 0;
    }
    this._refreshStats(0);
  }
  get stage() {
    return STAGES[this.state.stage - 1];
  }
  has(id) {
    return this.state.techs.includes(id);
  }
  multiplier() {
    return 1 + this.state.seeds * 0.25;
  }
  message(text, kind = "info") {
    this.state.messages.unshift({ text, kind, time: this.state.time });
    if (this.state.messages.length > 30) this.state.messages.length = 30;
  }
  available(type) {
    const d = NODE_TYPES[type];
    return (
      !!d &&
      d.stage <= this.state.stage &&
      (!d.tech || this.has(d.tech)) &&
      (!d.seedRequired || this.state.seeds >= d.seedRequired)
    );
  }
  researchStatus(id) {
    const t = TECHS.find((x) => x.id === id);
    if (!t) return fail("Technologie inconnue.");
    if (this.has(id)) return fail("Déjà recherchée.");
    if (t.stage > this.state.stage)
      return fail(`Disponible à l’étape ${t.stage}.`);
    if (t.recipe && !this.state.recipes[t.recipe])
      return fail("Recette expérimentale encore inconnue.");
    if (this.state.rp < t.cost || this.state.ne < t.neCost)
      return fail("Ressources insuffisantes.");
    return ok();
  }
  buyTech(id) {
    const r = this.researchStatus(id);
    if (!r.ok) return r;
    const t = TECHS.find((x) => x.id === id);
    this.state.rp -= t.cost;
    this.state.ne -= t.neCost;
    this.state.techs.push(id);
    this.message(`${t.name} — recherche achevée.`, "research");
    return ok();
  }
  _makeNode(type, x, y) {
    const d = NODE_TYPES[type];
    return {
      id: `n${this.state.nextId++}`,
      type,
      x,
      y,
      level: 1,
      allocation: 50,
      ai: false,
      zone: "Europe",
      buffer: 0,
      bufferMax: this._buffer(type),
      temp: 25,
      quarantine: 0,
      utilization: 0,
      inRate: 0,
      outRate: 0,
      capacity: 0,
      power: 0,
      status: "ATTENTE",
      progress: 0,
      input: [],
      output: [],
      fragments: {},
      infected: 0,
      loss: 0,
      paid: d.cost,
      paidCurrency: this.state.stage === 9 ? "ne" : "credits",
      mode: type === "gpu" ? "stock" : type === "trainer" ? "models" : "auto",
      training: 0,
    };
  }
  _buffer(type) {
    const b = this.stage.bandwidth;
    if (type === "disk") return Math.max(5e4, b * 12);
    if (type === "gpu") return 16e9;
    if (type === "trainer") return 32e9;
    if (type === "aggregator") return Math.max(1e9, b * 2);
    return Math.max(500, b * 4);
  }
  addNode(type, x, y) {
    if (!this.available(type)) return fail("Module non débloqué.");
    if (this.state.nodes.length >= MAX_NODES)
      return fail("Limite de modules atteinte.");
    const d = NODE_TYPES[type],
      price = this.nodeCost(type),
      isNe = price.currency === "ne";
    let cost = price.cost;
    if (
      this.state.stage < 9 &&
      type === "generator" &&
      !this.state.nodes.some((n) => NODE_TYPES[n.type]?.kind === "source") &&
      this.state.credits < cost
    )
      cost = 0;
    if (
      this.state.stage < 9 &&
      type === "modem" &&
      !this.state.nodes.some((n) => n.type === "modem" || n.type === "lab") &&
      this.state.credits < cost
    )
      cost = 0;
    const resource = isNe ? "ne" : "credits";
    if (this.state[resource] < cost)
      return fail(`Ressources insuffisantes pour ${d.name}.`);
    const grid = this.stage.grid;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      let found = false;
      for (let yy = 0; yy < grid && !found; yy++)
        for (let xx = 0; xx < grid; xx++)
          if (!this.state.nodes.some((n) => n.x === xx && n.y === yy)) {
            x = xx;
            y = yy;
            found = true;
            break;
          }
      if (!found)
        return fail("Grille pleine. Déplacez ou améliorez un module.");
    }
    x = Math.round(clamp(x, 0, grid - 1));
    y = Math.round(clamp(y, 0, grid - 1));
    if (this.state.nodes.some((n) => n.x === x && n.y === y))
      return fail("Emplacement occupé.");
    this.state[resource] -= cost;
    const node = this._makeNode(type, x, y);
    node.paid = cost;
    this.state.nodes.push(node);
    return ok({ node });
  }
  removeNode(id) {
    const n = this.state.nodes.find((x) => x.id === id);
    if (!n) return fail("Module introuvable.");
    this.state.nodes = this.state.nodes.filter((x) => x.id !== id);
    this.state.edges = this.state.edges.filter(
      (e) => e.from !== id && e.to !== id,
    );
    const resource =
        this.state.stage === 9 ? "ne" : n.paidCurrency || "credits",
      value =
        resource === "ne" && n.paidCurrency === "credits"
          ? n.paid / 1e7
          : n.paid;
    this.state[resource] += value * 0.75;
    return ok();
  }
  moveNode(id, x, y) {
    const n = this.state.nodes.find((a) => a.id === id);
    if (!n) return fail("Module introuvable.");
    x = Math.round(clamp(x, 0, this.stage.grid - 1));
    y = Math.round(clamp(y, 0, this.stage.grid - 1));
    if (this.state.nodes.some((a) => a.id !== id && a.x === x && a.y === y))
      return fail("Emplacement occupé.");
    n.x = x;
    n.y = y;
    return ok();
  }
  connect(from, to, weight = 1, kind = "data") {
    const a = this.state.nodes.find((n) => n.id === from),
      b = this.state.nodes.find((n) => n.id === to);
    if (!a || !b || from === to)
      return fail("Sélectionnez deux modules distincts.");
    if (this.state.edges.length >= MAX_EDGES)
      return fail("Limite de câbles atteinte.");
    if (!["data", "power", "cooling"].includes(kind))
      return fail("Calque inconnu.");
    if (
      this.state.edges.some(
        (e) => e.from === from && e.to === to && e.kind === kind,
      )
    )
      return fail("Ces modules sont déjà reliés.");
    if (kind === "data") {
      if (
        NODE_TYPES[a.type].kind === "sink" ||
        NODE_TYPES[a.type].kind === "utility" ||
        NODE_TYPES[b.type].kind === "source" ||
        NODE_TYPES[b.type].kind === "utility"
      )
        return fail("Ports de données incompatibles.");
      if (
        !["router", "fragmenter", "synapse"].includes(a.type) &&
        this.state.edges.some((e) => e.from === from && e.kind === "data")
      )
        return fail(
          this.state.stage === 1
            ? "Débranchez la sortie avant de choisir une destination. Le routeur arrive à l’étape 2."
            : "Ajoutez un routeur pour partager ce flux.",
        );
    } else {
      if (this.state.stage < 4)
        return fail("Les réseaux techniques arrivent à l’étape 4.");
      if (kind === "power" && !["transformer", "smr"].includes(a.type))
        return fail("L’énergie part d’un transformateur ou SMR.");
      if (kind === "cooling" && a.type !== "chiller")
        return fail("Les fluides partent d’un chiller.");
    }
    if (
      a.zone !== b.zone &&
      this.state.stage >= 8 &&
      !this.has("submarine") &&
      kind === "data"
    )
      return fail("Recherchez les câbles sous-marins pour relier les zones.");
    const edge = {
      id: `e${this.state.nextId++}`,
      from,
      to,
      weight: clamp(weight, 1, 100),
      kind,
      rate: 0,
      capacity: this._bandwidth(a, b, kind),
      load: 0,
      loss: 0,
      flowType: "text",
      progress: 0,
    };
    this.state.edges.push(edge);
    return ok({ edge });
  }
  disconnect(id) {
    if (!this.state.edges.some((e) => e.id === id))
      return fail("Câble introuvable.");
    this.state.edges = this.state.edges.filter((e) => e.id !== id);
    return ok();
  }
  setNodeZone(id, zone) {
    const n = this.state.nodes.find((a) => a.id === id);
    if (!n || !ZONES.includes(zone)) return fail("Zone inconnue.");
    if (this.state.stage < 8 && zone !== "Europe")
      return fail("Les zones géographiques arrivent à l’étape 8.");
    if (zone === "Orbit" && !this.has("orbital"))
      return fail("Recherchez le calcul orbital.");
    if (
      !this.has("submarine") &&
      this.state.edges.some(
        (edge) =>
          edge.kind === "data" &&
          (edge.from === id || edge.to === id) &&
          this.state.nodes.find(
            (a) => a.id === (edge.from === id ? edge.to : edge.from),
          )?.zone !== zone,
      )
    )
      return fail(
        "Recherchez les câbles sous-marins avant de déplacer ce module connecté.",
      );
    n.zone = zone;
    return ok();
  }
  setNodeMode(id, mode) {
    const n = this.state.nodes.find((a) => a.id === id);
    if (
      !n ||
      !["stock", "sell", "models", "params", "auto", "audio", "video"].includes(
        mode,
      )
    )
      return fail("Mode indisponible.");
    n.mode = mode;
    return ok();
  }
  setCognition(phi, psi) {
    if (this.has("fractal")) this.state.phi = clamp(phi, 0, 100);
    if (this.has("anchor")) this.state.psi = clamp(psi, 0, 100);
    return ok();
  }
  nodeCost(type) {
    const d = NODE_TYPES[type];
    if (!d) return { cost: Infinity, currency: "credits" };
    return this.state.stage === 9
      ? {
          cost: d.stage === 9 ? d.cost : Math.max(2, Math.ceil(d.cost / 1e7)),
          currency: "ne",
        }
      : { cost: d.cost, currency: "credits" };
  }
  nodeUpgradeCost(id) {
    const n = this.state.nodes.find((a) => a.id === id);
    if (!n) return { cost: Infinity, currency: "credits" };
    const price = this.nodeCost(n.type);
    return { cost: price.cost * 2 ** (n.level - 1), currency: price.currency };
  }
  hardwareCost() {
    return (
      [75, 500, 15000, 250000, 2e6, 15e6, 250e6, 2e9, 100][
        this.state.stage - 1
      ] *
      2 ** this.state.hardware
    );
  }
  upgradeHardware() {
    if (this.state.hardware >= 4)
      return fail("Matériel maximal pour cette ère.");
    if (this.state.stage === 1 && !this.has("overclock"))
      return fail("Recherchez l’overclocking basique.");
    const k = this.state.stage === 9 ? "ne" : "credits",
      cost = this.hardwareCost();
    if (this.state[k] < cost) return fail("Ressources insuffisantes.");
    this.state[k] -= cost;
    this.state.hardware++;
    return ok();
  }
  upgradeNode(id) {
    const n = this.state.nodes.find((a) => a.id === id);
    if (!n) return fail("Module introuvable.");
    if (n.level >= 8) return fail("Module au niveau maximal.");
    if (
      this.state.stage < 4 &&
      !["generator", "archive", "disk", "modem", "lab"].includes(n.type)
    )
      return fail("Empilement disponible avec les lames haute densité.");
    const price = this.nodeUpgradeCost(id),
      cost = price.cost,
      r = price.currency;
    if (this.state[r] < cost) return fail("Ressources insuffisantes.");
    this.state[r] -= cost;
    if (n.paidCurrency !== r) {
      n.paid = r === "ne" ? n.paid / 1e7 : n.paid;
      n.paidCurrency = r;
    }
    n.paid += cost;
    n.level++;
    return ok();
  }
  injectModel(id) {
    const n = this.state.nodes.find((a) => a.id === id);
    if (
      !n ||
      n.ai ||
      NODE_TYPES[n.type].stage > 5 ||
      NODE_TYPES[n.type].kind === "utility"
    )
      return fail("Ce module n’accepte pas de modèle.");
    if (!this.has("injection"))
      return fail("Recherchez l’injection de modèles.");
    if (this.state.models < 1) return fail("Entraînez un modèle spécialisé.");
    if (n.type === "compressor" && !this.has("neuralzip"))
      return fail("Découvrez la compression neuronale.");
    this.state.models--;
    n.ai = true;
    return ok();
  }
  _cpu() {
    if (this.state.stage === 1) return 10 + this.state.hardware * 10;
    return (
      this.stage.cpu *
      (this.stage.cpuMax / this.stage.cpu) ** (this.state.hardware / 4) *
      (this.has("multicore") ? 1.2 : 1)
    );
  }
  _gpu() {
    const max = [0, 0, 0, 0, 200, 1e4, 5e5, 1e8, 1e12][this.state.stage - 1];
    return this.stage.gpu
      ? this.stage.gpu * (max / this.stage.gpu) ** (this.state.hardware / 4)
      : 0;
  }
  _powerBase() {
    const max = [0, 0, 0, 5000, 5e4, 3e5, 1e6, 5e7, 1e11][this.state.stage - 1];
    return this.stage.power
      ? this.stage.power * (max / this.stage.power) ** (this.state.hardware / 4)
      : 0;
  }
  _bandwidth(a, b, kind) {
    if (kind === "power")
      return a.type === "smr"
        ? 1e6 * 2 ** (a.level - 1)
        : Math.min(5000, 500 * 2 ** (a.level - 1));
    if (kind === "cooling") return 150 * 2 ** (a.level - 1);
    let v = this.stage.bandwidth;
    if (this.state.stage === 1 && !["modem", "lab"].includes(b.type)) v = 500;
    if (this.state.stage === 3 && !this.has("fiber")) v = 1000;
    if (this.state.stage === 5 && !this.has("infiniband")) v = 1e7;
    if (
      this.state.stage >= 9 &&
      this.has("entanglement") &&
      a.type === "synapse" &&
      b.type === "synapse"
    )
      v = 1e24;
    return v;
  }
  _basePower(n) {
    if (this.state.stage < 4) return 0;
    const scale = 2 ** (n.level - 1);
    let p =
      {
        rack: 50,
        chiller: 30,
        gpu: 250,
        trainer: 500,
        synthetic: 1e4,
        sensor: 5000,
        agent: 500,
        semantic: 50000,
        predictor: 25000,
        reflection: 1e7,
        synapse: 1e7,
        anchor: 1e6,
        transformer: 0,
        smr: 0,
      }[n.type] ?? 0.2;
    if (n.type === "gpu" && n.utilization < 0.1) p *= 0.6;
    return p * scale * (this.has("overclock") ? 1.15 : 1) + (n.ai ? 40 : 0);
  }
  _allocation(dt) {
    const s = this.state,
      nodes = s.nodes,
      edges = s.edges,
      byId = new Map(nodes.map((n) => [n.id, n]));
    this._byId = byId;
    this._outgoing = new Map();
    this._incoming = new Map();
    for (const e of edges) {
      if (!byId.has(e.from) || !byId.has(e.to)) continue;
      if (!this._outgoing.has(e.from)) this._outgoing.set(e.from, []);
      this._outgoing.get(e.from).push(e);
      if (!this._incoming.has(e.to)) this._incoming.set(e.to, []);
      this._incoming.get(e.to).push(e);
      e.capacity = this._bandwidth(byId.get(e.from), byId.get(e.to), e.kind);
      e.rate = 0;
      e.load = 0;
      e.loss = 0;
    }
    const cpuNodes = nodes.filter(
      (n) =>
        NODE_TYPES[n.type].cycles > 0 && !["gpu", "trainer"].includes(n.type),
    );
    const totalWeight = sums(cpuNodes.map((n) => clamp(n.allocation, 1, 100))),
      totalCpu = this._cpu();
    const gpuNeed = (n) =>
      (GPU_COST[n.type] || 0) * 2 ** (n.level - 1) +
      (n.ai ? (this.has("neuro") ? 1.2 : 2) : 0);
    const gpuSum = sums(nodes.map(gpuNeed)),
      totalGpu = this._gpu(),
      gpuGrants = new Map();
    let gpuRemaining = totalGpu,
      gpuActive = nodes.filter((n) => gpuNeed(n) > 0);
    while (gpuRemaining > 1e-9 && gpuActive.length) {
      const total = sums(gpuActive.map((n) => clamp(n.allocation, 1, 100))),
        budget = gpuRemaining;
      let used = 0;
      for (const n of gpuActive) {
        const already = gpuGrants.get(n.id) || 0,
          grant = Math.min(
            gpuNeed(n) - already,
            (budget * clamp(n.allocation, 1, 100)) / total,
          );
        gpuGrants.set(n.id, already + grant);
        used += grant;
      }
      gpuRemaining -= used;
      gpuActive = gpuActive.filter(
        (n) => gpuNeed(n) - (gpuGrants.get(n.id) || 0) > 1e-8,
      );
      if (used < 1e-9) break;
    }
    let available = this._powerBase(),
      power = 0;
    const supplied = new Map();
    for (const n of nodes) {
      n.power = this._basePower(n);
      power += n.power;
    }
    for (const n of nodes)
      if (["smr", "transformer"].includes(n.type)) {
        const outs = (this._outgoing.get(n.id) || []).filter(
            (e) => e.kind === "power",
          ),
          totalWeight = sums(outs.map((e) => e.weight));
        const capacity =
          n.type === "smr"
            ? 1e6 * 2 ** (n.level - 1)
            : Math.min(5000, 500 * 2 ** (n.level - 1));
        for (const e of outs) {
          const target = byId.get(e.to),
            need = Math.max(0, target.power - (supplied.get(target.id) || 0));
          const delivered = Math.min(
            need,
            (capacity * e.weight) / (totalWeight || 1),
          );
          e._delivered = delivered;
          supplied.set(target.id, (supplied.get(target.id) || 0) + delivered);
          available += delivered;
        }
      }
    if (s.stage >= 4 && power > available * 1.000001 && s.blackout <= 0) {
      s.blackout = 15;
      this.message(
        "Surcharge électrique : disjonction de 15 secondes.",
        "alert",
      );
    }
    s.blackout = Math.max(0, s.blackout - dt);
    const blackout = s.blackout > 0;
    const cooling = new Map();
    for (const n of nodes)
      if (n.type === "chiller" && !blackout) {
        const outs = (this._outgoing.get(n.id) || []).filter(
          (e) => e.kind === "cooling",
        );
        const sum = sums(outs.map((e) => e.weight));
        for (const e of outs) {
          const q = (150 * 2 ** (n.level - 1) * e.weight) / (sum || 1);
          cooling.set(e.to, (cooling.get(e.to) || 0) + q);
          e.rate = q;
          e.load = clamp(q / e.capacity);
        }
      }
    for (const n of nodes) {
      const d = NODE_TYPES[n.type],
        level = 2 ** (n.level - 1);
      n.bufferMax = this._buffer(n.type) * level;
      n.cpuAllocated = d.cycles
        ? (totalCpu * clamp(n.allocation, 1, 100)) / (totalWeight || 1)
        : 0;
      n.gpuAllocated = gpuGrants.get(n.id) || 0;
      n.gpuRequired = gpuNeed(n);
      n.quarantine = Math.max(0, n.quarantine - dt);
      n.inRate = 0;
      n.outRate = 0;
      n._processed = 0;
      n._received = 0;
      n._sent = 0;
      n._cpuUsed = 0;
      n._gpuUsed = 0;
      n._dropped = 0;
      n.powerDelivered = blackout ? 0 : n.power;
      if (s.stage >= 4 && !coolingFree.has(n.type)) {
        const orbit = n.zone === "Orbit" && this.has("orbital");
        const heat = blackout ? 0 : n.power;
        // Passive losses permit natural recovery after shutdown, but cannot cool a loaded rack.
        const thermalMass = Math.max(50, n.power / 2);
        n.temp = clamp(
          n.temp +
            ((heat -
              (cooling.get(n.id) || 0) -
              (orbit ? heat + 50 : Math.max(0, n.temp - 25) * 0.2)) *
              dt) /
              thermalMass,
          20,
          110,
        );
      } else if (coolingFree.has(n.type)) n.temp = 25;
      n.throttle = 1 - thermalFactor(n.temp);
      n._factor = blackout || n.quarantine > 0 ? 0 : thermalFactor(n.temp);
      if (n.ai || GPU_COST[n.type])
        n._factor *= gpuNeed(n) ? Math.min(1, n.gpuAllocated / gpuNeed(n)) : 1;
      n._bonus = nodes.some(
        (a) =>
          a.type === "agent" && Math.abs(a.x - n.x) + Math.abs(a.y - n.y) <= 2,
      )
        ? 1.25
        : 1;
      n._factor *= n._bonus * this.multiplier();
      n.status = blackout
        ? "BLACKOUT"
        : n.quarantine > 0
          ? "QUARANTAINE"
          : n.temp >= 100
            ? "ARRÊT"
            : n.temp > 65
              ? "CHAUD"
              : "ATTENTE";
    }
    for (const e of edges)
      if (e.kind === "power") {
        e.rate = blackout ? 0 : e._delivered || 0;
        e.load = clamp(e.rate / e.capacity);
        e.flowType = "power";
      }
    this._power = power;
    this._powerAvailable = available;
    this._totalCpu = totalCpu;
    this._totalGpu = totalGpu;
  }
  _emit(n, p) {
    let room = Math.max(0, n.bufferMax - bytes(n.output) - bytes(n.input));
    if (this.state.stage === 1)
      room = Math.min(
        room,
        Math.max(
          0,
          500 / Math.max(1, this.state.nodes.length) -
            bytes(n.input) -
            bytes(n.output),
        ),
        Math.max(
          0,
          500 -
            this.state.nodes.reduce(
              (sum, node) => sum + bytes(node.input) + bytes(node.output),
              0,
            ),
        ),
      );
    const f = Math.min(1, room / p.bytes);
    if (f < 1) {
      n.loss += p.bytes * (1 - f);
      n._dropped = (n._dropped || 0) + p.bytes * (1 - f);
    }
    if (f > 0) {
      push(n.output, portion(p, f));
      if (NODE_TYPES[n.type].kind === "source") n._processed += p.bytes * f;
    }
    return f;
  }
  _produce(n, dt) {
    if (!n._factor) return;
    const d = NODE_TYPES[n.type],
      lev = 2 ** (n.level - 1),
      f = n._factor,
      s = this.state,
      zone = n.zone;
    let p = null,
      cap = 0,
      units;
    if (n.type === "generator" || n.type === "founder") {
      const size = n.type === "founder" ? 80 : 100,
        value = n.type === "founder" ? 3 : 1;
      cap = (n.cpuAllocated / 2) * size * f;
      units = (cap * dt) / size;
      p = packet("text", size, units, value, value, zone);
      n._cpuUsed = (units * 2) / dt;
    }
    if (n.type === "archive") {
      cap = (n.cpuAllocated / 20) * 2000 * f;
      units = (cap * dt) / 2000;
      p = packet("archive", 2000, units, 25, 40, zone);
      n._cpuUsed = (units * 20) / dt;
    }
    if (n.type === "importer") {
      const unit = n.mode === "audio" ? 1e4 : 4e4;
      cap = Math.min(5e4 * lev, (n.cpuAllocated / 4) * unit) * f;
      units = (cap * dt) / unit;
      const clean = packet(
        "client",
        unit,
        units * 0.85,
        unit === 1e4 ? 150 : 800,
        unit === 1e4 ? 200 : 800,
        zone,
      );
      this._emit(n, clean);
      p = packet(
        "client",
        unit,
        units * 0.15,
        unit === 1e4 ? 150 : 800,
        unit === 1e4 ? 200 : 800,
        zone,
        { corrupt: true },
      );
      n._cpuUsed = (units * 4) / dt;
    }
    if (n.type === "rack") {
      const rates = [0, 0, 0, 1e7, 2e7, 1e9, 5e10, 1e13, 1e15];
      cap = rates[s.stage - 1] * lev * f * Math.min(1, n.cpuAllocated / 1000);
      units = (cap * dt) / 1e4;
      p = packet("client", 1e4, units, s.stage <= 4 ? 200 : 50, 350, zone, {
        certified: true,
      });
      n._cpuUsed = Math.min(n.cpuAllocated, 1000 * lev);
    }
    if (n.type === "sensor") {
      cap = 1e13 * lev * f * Math.min(1, n.cpuAllocated / 1000);
      units = (cap * dt) / 1e9;
      p = packet("real", 1e9, units, 1000, 5e4, zone, { certified: true });
      n._cpuUsed = Math.min(n.cpuAllocated, 1000 * lev);
    }
    if (n.type === "synthetic") {
      cap = 5e11 * lev * f;
      units = (cap * dt) / 1e9;
      p = packet("synthetic", 1e9, units, 800, 4e4, zone, { real: 0 });
      n._gpuUsed = n.gpuAllocated;
    }
    n.capacity = cap;
    if (p) this._emit(n, p);
    n._desired = cap;
  }
  _process(n, dt) {
    if (!n._factor) return;
    const s = this.state,
      d = NODE_TYPES[n.type],
      lev = 2 ** (n.level - 1),
      f = n._factor,
      band =
        (this.state.stage === 1 && ["corrector", "compressor"].includes(n.type)
          ? 500
          : this.stage.bandwidth) * lev,
      room = () => Math.max(0, n.bufferMax - bytes(n.output));
    if (
      n.type === "trainer" &&
      s.stage >= 6 &&
      this.has("tpu") &&
      n.mode !== "params"
    ) {
      n.capacity = (1e10 / 30) * lev * f;
      if (n.training <= 0) {
        const datasets = n.input.filter((p) => p.type === "dataset");
        if (bytes(datasets) >= 1e10) {
          let need = 1e10;
          for (const p of datasets) {
            const take = Math.min(need, p.bytes),
              ratio = take / p.bytes;
            remove(p, ratio);
            need -= take;
            if (need < 1) break;
          }
          n.training = 30;
        }
      }
      if (n.training > 0) {
        n.training = Math.max(0, n.training - dt * f * lev);
        n.progress = 1 - n.training / 30;
        n._processed = n.capacity * dt;
        n._gpuUsed = n.gpuAllocated;
        if (n.training === 0) {
          s.models++;
          this._emit(n, packet("model", 5e8, 1, 0, 2e6, n.zone));
          this.message("Un modèle spécialisé est prêt.", "research");
        }
      }
      prune(n.input);
      return;
    }
    if (n.type === "semantic") {
      this._semantic(n, dt);
      return;
    }
    if (n.type === "reconstructor") {
      this._reconstruct(n, dt);
      return;
    }
    let budget = band * dt * f;
    if (n.type === "aggregator") budget = 5e6 * lev * dt * f;
    if (["gpu", "trainer"].includes(n.type)) budget = 2e9 * lev * dt * f;
    if (n.type === "predictor") budget = 1e15 * lev * dt * f;
    let cycles = n.cpuAllocated * dt * f,
      neBudget = dt;
    n.capacity = budget / dt;
    const lastPurity = s.stats.purity ?? 1,
      quality = s.stage >= 7 ? modelQuality(lastPurity) : 1;
    for (const p of n.input) {
      if (p.bytes < 1e-9 || budget <= 0) continue;
      if (
        n.type === "aggregator" &&
        (p.corrupt ||
          p.type === "dataset" ||
          p.type === "model" ||
          p.type === "concept")
      )
        continue;
      if (["gpu", "trainer"].includes(n.type) && p.type !== "dataset") continue;
      if (n.type === "reflection" && p.type !== "concept") continue;
      if (n.type === "synapse" && !["concept", "thought"].includes(p.type))
        continue;
      if (n.type === "fragmenter" && p.type !== "archive") continue;
      let cost = d.cycles || 0;
      if (["corrector", "compressor"].includes(n.type) && this.has("simd"))
        cost *= 0.75;
      if (n.type === "antivirus") cost = (20 * (p.bytes / p.units)) / 1e4;
      if (["aggregator", "predictor"].includes(n.type)) cost = 0;
      const rate = Math.min(
        1,
        budget / p.bytes,
        cost ? cycles / (p.units * cost) : 1,
      );
      let take = clamp(rate);
      let expansion = n.type === "aggregator" ? 100 : 1;
      if (n.type === "compressor" && !p.compressed)
        expansion = n.ai && this.has("neuralzip") ? 1 / 15 : 0.4;
      if (
        !["modem", "lab", "reflection", "synapse"].includes(n.type) &&
        !(n.type === "gpu" && n.mode === "stock")
      )
        take = Math.min(take, room() / (p.bytes * expansion));
      if (take <= 1e-15) continue;
      const q = portion(p, take);
      remove(p, take);
      budget -= q.bytes;
      cycles -= q.units * cost;
      n._cpuUsed += (q.units * cost) / dt;
      n._processed += q.bytes;
      if (n.type === "modem") {
        if (!q.corrupt) {
          const gain = q.value * quality * this.multiplier();
          if (s.stage < 9) {
            s.credits += gain;
            s.totalEarned += gain;
            this._delta.credits += gain;
          }
        }
        continue;
      }
      if (n.type === "lab") {
        if (q.corrupt) {
          s.recipes.corruptPackets += q.units;
          if (s.recipes.corruptPackets >= 100 && !s.recipes.predictive) {
            s.recipes.predictive = true;
            this.message(
              "Recette découverte : signatures virales.",
              "research",
            );
          }
          n.infected += q.units;
          if (n.infected >= 1) {
            n.infected %= 1;
            n.quarantine = Math.max(n.quarantine, 10);
          }
        } else {
          s.rp += q.rp * quality * this.multiplier();
          this._delta.rp += q.rp * quality * this.multiplier();
        }
        if (q.compressed) n.lastCompressed = s.time;
        if (q.type === "model") n.lastModel = s.time;
        if (
          Math.abs((n.lastCompressed ?? -1e8) - (n.lastModel ?? 1e8)) <= 30 &&
          !s.recipes.neuralzip
        ) {
          s.recipes.neuralzip = true;
          this.message(
            "Recette découverte : compression neuronale.",
            "research",
          );
        }
        continue;
      }
      if (n.type === "reflection") {
        s.concepts += q.units;
        this._delta.reflected += q.units;
        if (s.stage === 9) {
          const ne = Math.min(neBudget, q.units * 0.002) * this._coherence();
          neBudget = Math.max(0, neBudget - ne);
          s.ne += ne;
          this._delta.ne += ne;
        }
        continue;
      }
      if (n.type === "synapse") {
        const coherence = this._coherence(),
          effectivePsi = clamp(
            s.psi + s.nodes.filter((a) => a.type === "anchor").length * 5,
            0,
            100,
          ),
          stagnation = effectivePsi - s.phi > 30 ? 0.1 : 1;
        const ne = q.awakened
          ? 0
          : q.units * 0.02 * (s.phi / 50) * coherence * stagnation;
        q.awakened = true;
        s.ne += ne;
        this._delta.ne += ne;
        q.type = "thought";
        q.bytes *= 0.8;
        q.real *= 0.8;
        q.rp = 0;
        q.value = 0;
        this._emit(n, q);
        continue;
      }
      if (n.type === "corrector" && q.type === "text" && !q.corrected) {
        q.value *= 2;
        q.rp *= 2.5;
        q.corrected = true;
      }
      if (n.type === "compressor" && !q.compressed) {
        const ratio = n.ai && this.has("neuralzip") ? 1 / 15 : 0.4;
        q.bytes *= ratio;
        q.real *= ratio;
        q.compressed = true;
        q.type = "compressed";
        if (q.corrected) q.rp *= 1.2;
      }
      if (n.type === "firewall" && q.corrupt) {
        for (const k of ["bytes", "units", "value", "rp", "real"]) q[k] *= 0.2;
      }
      if (n.type === "antivirus") {
        const predictive = n.ai && this.has("predictive");
        if (predictive) {
          if (q.corrupt) {
            this._emit(n, portion(q, 0.001));
            for (const k of ["bytes", "units", "value", "rp", "real"])
              q[k] *= 0.999;
          }
          q.corrupt = false;
        } else {
          q.bytes *= 0.95;
          q.real *= 0.95;
          q.corrupt = false;
        }
      }
      if (n.type === "integrity" && !q.certified && !q.corrupt) {
        q.value *= 1.5;
        q.rp = (350 * q.bytes) / 1e4;
        q.certified = true;
      }
      if (n.type === "disk" && !q.archived) {
        s.archived += q.bytes;
        this._delta.archived += q.bytes;
        q.archived = true;
      }
      if (n.type === "fragmenter") {
        for (let part = 0; part < 4; part++)
          push(n.output, {
            ...portion(q, 0.25),
            type: "fragment",
            part,
            origin: n.id,
            units: q.units,
          });
        continue;
      }
      if (n.type === "aggregator") {
        const units = q.bytes / 1e7;
        this._emit(
          n,
          packet("dataset", 1e9, units, 50000, 50000, q.zone, {
            real: q.real * 100,
            corrupt: false,
            certified: true,
          }),
        );
        continue;
      }
      if (["gpu", "trainer"].includes(n.type)) {
        const units = (q.bytes / 1e9) * quality;
        n._gpuUsed += ((q.bytes / 1e9) * 5) / dt;
        if (
          n.mode === "stock" ||
          (n.type === "trainer" && (s.stage === 5 || n.mode === "params"))
        ) {
          s.params += units * 1e8;
          this._delta.params += units * 1e8;
        } else
          this._emit(n, packet("tensor", 1e6, units, 250000, 50000, q.zone));
        continue;
      }
      if (n.type === "predictor") {
        q.predicted = true;
        q.latency = 2;
        n._gpuUsed = n.gpuAllocated;
      }
      if (
        n.type === "router" &&
        this.has("hallucination") &&
        q.type === "synthetic" &&
        lastPurity < 0.22
      ) {
        n.loss += q.bytes;
        continue;
      }
      this._emit(n, q);
    }
    prune(n.input);
  }
  _reconstruct(n, dt) {
    const lev = 2 ** (n.level - 1),
      f = n._factor,
      keys = new Set(
        n.input.filter((p) => p.type === "fragment").map((p) => p.origin),
      );
    let budget = (n.cpuAllocated * dt * f) / 6;
    n.capacity = (n.cpuAllocated / 6) * 2000 * f;
    for (const key of keys) {
      const parts = [0, 1, 2, 3].map((i) =>
        n.input.find((p) => p.origin === key && p.part === i),
      );
      if (parts.some((p) => !p)) continue;
      const units = Math.min(budget, ...parts.map((p) => p.units));
      if (units <= 0) continue;
      let val = 0,
        rp = 0,
        real = 0;
      for (const p of parts) {
        const ratio = units / p.units;
        val += p.value * ratio;
        rp += p.rp * ratio;
        real += p.real * ratio;
        remove(p, ratio);
      }
      this._emit(n, {
        ...packet("archive", 2000, units, 25, 40, parts[0].zone),
        value: val,
        rp,
        real,
      });
      budget -= units;
      n._cpuUsed += (units * 6) / dt;
      n._processed += units * 2000;
    }
    prune(n.input);
  }
  _coherence() {
    const s = this.state;
    return cognitiveCoherence(
      s.phi,
      clamp(
        s.psi + s.nodes.filter((n) => n.type === "anchor").length * 5,
        0,
        100,
      ),
    );
  }
  _semantic(n, dt) {
    const perZone = ZONES.map((z) =>
      n.input.filter((p) => p.zone === z && !p.corrupt),
    );
    const available = perZone.map(bytes),
      min = Math.min(...available);
    n.capacity = this.stage.bandwidth * 2 ** (n.level - 1) * n._factor;
    if (min <= 0) {
      n.sync = 0;
      return;
    }
    const latencies = perZone.map((list) =>
      list[0]?.predicted
        ? 2
        : { Europe: 0, America: 90, Asia: 180, Orbit: 250 }[list[0]?.zone],
    );
    const drift = Math.max(...latencies) - Math.min(...latencies);
    n.drift = drift;
    n.sync = drift <= 20 ? 1 - drift / 1000 : Math.max(0.02, 1 - drift / 250);
    const take = Math.min(min, (n.capacity * dt) / 4),
      quality = modelQuality(this.state.stats.purity ?? 1);
    for (const list of perZone) {
      let left = take;
      for (const p of list) {
        const v = Math.min(p.bytes, left);
        remove(p, v / p.bytes);
        left -= v;
        if (left < 1e-6) break;
      }
    }
    const units = ((take * 4) / 1e9) * n.sync * quality;
    this._emit(
      n,
      packet("concept", 1000, units, 1e6, 1e7, n.zone, { predicted: true }),
    );
    this._delta.concepts += units;
    this._delta.synchronized += units * n.sync;
    n._processed += take * 4;
    prune(n.input);
  }
  _transmit(dt) {
    const s = this.state;
    let deliveredReal = 0,
      deliveredBytes = 0;
    for (const n of s.nodes) {
      const outs = (this._outgoing.get(n.id) || []).filter(
        (e) => e.kind === "data",
      );
      if (!outs.length) continue;
      const budgets = new Map(outs.map((e) => [e.id, e.capacity * dt]));
      for (const p of n.output) {
        if (p.bytes < 1e-9) continue;
        let chosen = outs;
        if (n.type === "fragmenter" && p.part !== undefined && outs.length >= 4)
          chosen = [outs[p.part % outs.length]];
        const dynamicWeight = (e) => {
          if (!(n.type === "router" && n.ai)) return e.weight;
          const target = this._byId.get(e.to);
          return target.quarantine > 0
            ? 0
            : Math.max(
                0,
                target.bufferMax - bytes(target.input) - bytes(target.output),
              ) * Math.max(0, budgets.get(e.id));
        };
        const weights = chosen.reduce((sum, e) => sum + dynamicWeight(e), 0),
          original = p.bytes;
        if (weights <= 0) continue;
        for (const e of chosen) {
          const target = this._byId.get(e.to);
          if (!target) continue;
          const maxByte = Math.min(
            budgets.get(e.id),
            (original * dynamicWeight(e)) / weights,
          );
          let room = Math.max(
            0,
            target.bufferMax - bytes(target.input) - bytes(target.output),
          );
          if (s.stage === 1)
            room = Math.min(
              room,
              Math.max(
                0,
                500 / Math.max(1, s.nodes.length) -
                  bytes(target.input) -
                  bytes(target.output),
              ),
            );
          if (target.type === "reconstructor" && p.part !== undefined)
            room = Math.min(
              room,
              Math.max(
                0,
                target.bufferMax / 4 -
                  bytes(target.input.filter((q) => q.part === p.part)),
              ),
            );
          let amount = Math.min(maxByte, room, p.bytes);
          if (target.quarantine > 0) amount = 0;
          if (amount <= 1e-12) {
            if (p.bytes > 0) {
              e.load = 1;
              e.loss += (n._dropped || 0) / dt / chosen.length;
            }
            continue;
          }
          const q = portion(p, amount / p.bytes);
          remove(p, amount / p.bytes);
          budgets.set(e.id, budgets.get(e.id) - amount);
          e.rate += amount / dt;
          e.flowType = q.corrupt
            ? "corrupt"
            : q.compressed
              ? "compressed"
              : q.certified && q.type === "client"
                ? "certified"
                : q.corrected
                  ? "corrected"
                  : q.type;
          e.load = clamp(e.rate / e.capacity);
          e.progress = (e.progress + dt * Math.max(0.2, e.load)) % 1;
          target.inRate += amount / dt;
          target._received += amount;
          n.outRate += amount / dt;
          n._sent += amount;
          if (q.corrupt && !immune.has(target.type)) {
            target.infected += q.units;
            if (target.infected >= 1) {
              target.infected %= 1;
              target.quarantine = 10;
              target.status = "QUARANTAINE";
            }
          }
          if (n.zone !== target.zone && !q.predicted)
            q.latency = { Europe: 0, America: 90, Asia: 180, Orbit: 250 }[
              n.zone
            ];
          push(target.input, q);
          // Count unique external source traffic, not each downstream hop.
          if (NODE_TYPES[n.type].kind === "source") {
            deliveredBytes += amount;
            deliveredReal += q.real;
          }
        }
      }
      prune(n.output);
    }
    this._delta.traffic = deliveredBytes;
    this._delta.real = deliveredReal;
  }
  _refreshStats(dt) {
    const s = this.state,
      prev = s.stats || {},
      d = this._delta || {
        credits: 0,
        rp: 0,
        ne: 0,
        traffic: 0,
        real: 0,
        concepts: 0,
      };
    for (const n of s.nodes) {
      n.buffer = bytes(n.input || []) + bytes(n.output || []);
      n.cpuUsed = Math.min(n._cpuUsed || 0, n.cpuAllocated || 0);
      n.gpuUsed = n._gpuUsed || 0;
      n.utilization =
        NODE_TYPES[n.type].cycles > 0
          ? clamp(n.cpuUsed / (n.cpuAllocated || 1))
          : GPU_COST[n.type]
            ? clamp(n.gpuUsed / (n.gpuAllocated || 1))
            : clamp(
                n._processed / (Math.max(n.capacity || 0, 1e-20) * dt || 1),
              );
      if (NODE_TYPES[n.type].kind === "utility")
        n.utilization =
          n.type === "chiller"
            ? (this._outgoing?.get(n.id) || []).some((e) => e.rate > 0)
              ? 1
              : 0
            : n.power
              ? 1
              : 0;
      if (n._factor > 0 && n.status === "ATTENTE")
        n.status =
          n.buffer >= n.bufferMax * 0.95 || n._dropped > 0
            ? "SATURÉ"
            : n.utilization > 0.01
              ? "ACTIF"
              : "ATTENTE";
      if (n.type === "gpu" && n.utilization < 0.1 && n.status !== "BLACKOUT") {
        n.status = "FAMINE VRAM";
        n.gpuEffective = (n.gpuAllocated || 0) * 0.1;
        n._gpuUsed = Math.max(n._gpuUsed || 0, n.gpuEffective);
      } else n.gpuEffective = n.gpuAllocated || 0;
      n.gpuUsed = n._gpuUsed || 0;
      n.progress =
        n.type === "trainer" && n.training > 0
          ? n.progress
          : ((s.time * (n.utilization || 0.05)) / 2) % 1;
      n.purity = n.buffer
        ? clamp(
            [...n.input, ...n.output].reduce((a, p) => a + p.real, 0) /
              n.buffer,
          )
        : 1;
      n.corruption = n.buffer
        ? [...n.input, ...n.output]
            .filter((p) => p.corrupt)
            .reduce((a, p) => a + p.bytes, 0) / n.buffer
        : 0;
    }
    const purity =
      d.traffic > 0 ? clamp(d.real / d.traffic) : (prev.purity ?? 1);
    const boosted = s.nodes.filter(
      (n) =>
        n.ai &&
        n._factor > 0 &&
        n.temp < 70 &&
        (n.utilization > 0.001 || n.inRate > 0 || n.outRate > 0),
    ).length;
    const psi = clamp(
        s.psi + s.nodes.filter((n) => n.type === "anchor").length * 5,
        0,
        100,
      ),
      coherence = cognitiveCoherence(s.phi, psi);
    s.stats = {
      creditsRate: dt ? d.credits / dt : 0,
      rpRate: dt ? d.rp / dt : 0,
      neRate: dt ? d.ne / dt : 0,
      cpuLoad: clamp(
        sums(s.nodes.map((n) => n._cpuUsed || 0)) / (this._totalCpu || 1),
      ),
      gpuLoad: clamp(
        sums(s.nodes.map((n) => n._gpuUsed || 0)) / (this._totalGpu || 1),
      ),
      networkLoad: s.edges.length
        ? sums(s.edges.filter((e) => e.kind === "data").map((e) => e.load)) /
          (s.edges.filter((e) => e.kind === "data").length || 1)
        : 0,
      power: this._power || 0,
      powerCapacity: this._powerAvailable || 0,
      maxTemp: s.nodes.length ? Math.max(...s.nodes.map((n) => n.temp)) : 25,
      purity,
      quality: modelQuality(purity),
      throughput: dt ? d.traffic / dt : 0,
      conceptsRate: dt ? d.concepts / dt : 0,
      sync: d.concepts > 0 ? d.synchronized / d.concepts : 0,
      coherence,
      boosted,
      cpuCapacity: this._totalCpu || this._cpu(),
      gpuCapacity: this._totalGpu || this._gpu(),
      cpuUsed: sums(s.nodes.map((n) => n._cpuUsed || 0)),
      gpuUsed: sums(s.nodes.map((n) => n._gpuUsed || 0)),
      loss: sums(s.edges.map((e) => e.loss || 0)),
      models: s.models,
    };
    if (dt > 0) {
      if (s.stage === 6)
        s.boostedSeconds = boosted >= 25 ? s.boostedSeconds + dt : 0;
      if (s.stage === 7)
        s.stableSeconds =
          s.stats.throughput >= 1e14 * (1 - 1e-8) && purity >= 0.25
            ? s.stableSeconds + dt
            : 0;
      if (
        s.stage === 9 &&
        s.phi - psi > 30 &&
        s.edges.length > 0 &&
        s.nodes.length > 1 &&
        !s.blackout
      ) {
        s.recipes.psychosisSeconds += dt;
        if (s.recipes.psychosisSeconds >= 60 && !s.recipes.anchor) {
          s.recipes.anchor = true;
          this.message(
            "Recette découverte : ancrage logique après 60 s de psychose.",
            "research",
          );
        }
        if (Math.floor(s.time / 10) > Math.floor((s.time - dt) / 10)) {
          const links = s.edges.filter((e) => e.kind === "data");
          if (links.length > 1)
            this.disconnect(
              links[(Math.floor(s.time / 10) * 7) % links.length].id,
            );
        }
      } else if (!s.recipes.anchor) s.recipes.psychosisSeconds = 0;
      if (s.stage === 9 && this.has("fractal") && s.time - this._autoAt > 5) {
        this._autoAt = s.time;
        const syn = s.nodes.filter((n) => n.type === "synapse");
        for (let i = 1; i < syn.length; i++) {
          if (
            !s.edges.some((e) => e.from === syn[i - 1].id && e.to === syn[i].id)
          ) {
            this.connect(syn[i - 1].id, syn[i].id);
            break;
          }
        }
      }
      if (s.time - this._historyAt >= 1) {
        this._historyAt = s.time;
        s.history.push({
          time: s.time,
          credits: s.stats.creditsRate,
          rp: s.stats.rpRate,
          ne: s.stats.neRate,
          purity,
          temperature: s.stats.maxTemp,
          cpu: s.stats.cpuLoad,
          network: s.stats.networkLoad,
        });
        if (s.history.length > 120) s.history.splice(0, s.history.length - 120);
      }
    }
  }
  tick(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    let left = Math.min(dt, 5);
    while (left > 1e-8) {
      const step = Math.min(0.25, left);
      this._step(step);
      left -= step;
    }
  }
  _step(dt) {
    this._delta = {
      credits: 0,
      rp: 0,
      ne: 0,
      params: 0,
      archived: 0,
      traffic: 0,
      real: 0,
      concepts: 0,
      synchronized: 0,
      reflected: 0,
    };
    this.state.time += dt;
    this._allocation(dt);
    for (const n of this.state.nodes)
      if (NODE_TYPES[n.type].kind === "source") this._produce(n, dt);
      else if (NODE_TYPES[n.type].kind !== "utility") this._process(n, dt);
    this._transmit(dt);
    this._refreshStats(dt);
  }
  goalProgress() {
    const s = this.state,
      st = s.stats,
      m = (label, value, target) => ({
        label,
        value,
        target,
        ratio: clamp(value / target),
      });
    return {
      1: [m("Crédits", s.credits, 500)],
      2: [m("Crédits", s.credits, 15000), m("Recherche disponible", s.rp, 500)],
      3: [m("Crédits", s.credits, 500000)],
      4: [
        m("Crédits", s.credits, 25e6),
        m("Données archivées", s.archived, 1e10),
      ],
      5: [
        m("Crédits", s.credits, 1e9),
        m("Paramètres en stock", s.params, 1e10),
      ],
      6: [
        m("Modules IA actifs <70 °C", st.boosted || 0, 25),
        m("Stabilité simultanée (s)", s.boostedSeconds, 10),
      ],
      7: [
        m("Crédits", s.credits, 1e11),
        m("Débit utile (o/s)", st.throughput || 0, 1e14),
        m("Pureté", st.purity || 0, 0.25),
        m("Stabilité (s)", s.stableSeconds, 300),
      ],
      8: [
        m("Concepts par seconde", st.conceptsRate || 0, 1000),
        m("Synchronisation", st.sync || 0, 0.980001),
        m(
          "Noyau réflexif alimenté",
          s.nodes.some((n) => n.type === "reflection" && n._factor > 0) ? 1 : 0,
          1,
        ),
      ],
      9: [
        m("Cohérence cognitive", st.coherence || 0, 0.900001),
        m("Distillation recherchée", this.has("distillation") ? 1 : 0, 1),
      ],
    }[s.stage];
  }
  advance() {
    if (this.state.stage >= 9) return this.prestige();
    if (this.goalProgress().some((g) => g.ratio < 1))
      return fail("Les objectifs de cette ère ne sont pas encore remplis.");
    this.state.stage++;
    if (this.state.stage === 9) this.state.credits = 0;
    this.state.hardware = 0;
    this.state.stableSeconds = 0;
    this.state.boostedSeconds = 0;
    for (const n of this.state.nodes) {
      n.bufferMax = this._buffer(n.type) * 2 ** (n.level - 1);
      n.temp = Math.min(n.temp, 45);
    }
    this.message(`Ère ${this.state.stage} — ${this.stage.name}`, "era");
    return ok();
  }
  prestige() {
    if (
      this.state.stage !== 9 ||
      !this.has("distillation") ||
      (this.state.stats.coherence || 0) <= 0.9
    )
      return fail("La Distillation exige sa recherche et une cohérence >90 %.");
    const seeds = this.state.seeds + 1;
    this.state = initial();
    this.state.seeds = seeds;
    this.state.credits = 90 + seeds * 50;
    const a = this._makeNode("generator", 0, 1),
      b = this._makeNode("modem", 2, 1),
      c = this._makeNode("lab", 2, 2);
    this.state.nodes.push(a, b, c);
    this.connect(a.id, b.id);
    this._refreshStats(0);
    this.message(
      `Modèle Fondateur ${seeds} : rendement permanent +${seeds * 25} %.`,
      "era",
    );
    return ok();
  }
  setStage(stage) {
    stage = Math.round(clamp(stage, 1, 9));
    this.state.stage = stage;
    this.state.hardware = 4;
    this.state.credits = 1e14;
    this.state.rp = 1e13;
    this.state.ne = 1e5;
    this.state.params = 1e12;
    this.state.models = 100;
    this.state.archived = 1e15;
    this.state.sandbox = true;
    this.state.recipes.predictive = true;
    this.state.recipes.neuralzip = true;
    this.state.recipes.anchor = true;
    this.state.techs = TECHS.filter(
      (t) => t.stage <= stage && t.id !== "distillation",
    ).map((t) => t.id);
    for (const n of this.state.nodes) {
      n.temp = 25;
      n.quarantine = 0;
    }
    this.message(`Banc d’essai : étape ${stage}.`, "info");
    return ok();
  }
  serialize() {
    const copy = structuredClone(this.state);
    copy.savedAt = Date.now();
    for (const n of copy.nodes)
      for (const k of Object.keys(n)) if (k.startsWith("_")) delete n[k];
    return copy;
  }
}
