import {
  STAGES,
  NODE_TYPES,
  TECHS,
  BRANCHES,
  VERSION,
  format,
} from "./data.js";
import { Engine } from "./engine.js";
import { Renderer } from "./renderer.js";
import { AudioEngine } from "./audio.js";
import {
  saveGame,
  loadGame,
  exportGame,
  parseSave,
  applyOffline,
} from "./storage.js";

const $ = (id) => document.getElementById(id);
const html = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const num = (n, unit = "") =>
  format(Number.isFinite(Number(n)) ? Number(n) : 0, unit);
const pct = (n) =>
  `${Math.round(Math.max(0, Math.min(1, Number(n) || 0)) * 100)} %`;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const def = (type) =>
  NODE_TYPES[type] || { name: type, short: type, color: "#72ead4" };
const stageDef = () =>
  STAGES.find((x) => x.id === engine.state.stage) ||
  STAGES[engine.state.stage - 1];
let saved = null;
try {
  saved = loadGame();
} catch (error) {
  console.warn("Sauvegarde indisponible", error);
}
const engine = new Engine(saved);
engine.state.settings = {
  music: false,
  sfx: true,
  mute: false,
  haptics: true,
  quality: "auto",
  speed: 1,
  ...engine.state.settings,
};
if (!saved && innerWidth <= 700)
  engine.state.nodes.forEach((n, i) => {
    n.x = 0;
    n.y = i;
  });
else if (!saved && innerHeight <= 550)
  engine.state.nodes.forEach((n, i) => {
    n.x = i;
    n.y = 0;
  });
const audio = new AudioEngine();
let offline = { seconds: 0 };
try {
  if (saved) offline = applyOffline(engine);
} catch (error) {
  console.warn("Progression hors-ligne indisponible", error);
}
let activePanel = "",
  selected = null,
  buildFilter = "available",
  researchBranch = 0;
let paused = !!engine.state.paused,
  debugOpen = false,
  lastTime = performance.now(),
  accumulator = 0,
  lastUI = 0,
  lastPanelUI = 0;
let toastTimer = 0,
  versionTaps = [],
  lastStateStage = engine.state.stage;
let statsSamples = [],
  sampleElapsed = 0,
  uiDirty = true,
  lastResearchCount = -1,
  lastAudioPulse = 0,
  lastAlarmSignature = "";
const palette = ["#72ead4", "#b7a1f7", "#e9b56a", "#8dc8f4"];
const icons = {
  generator: "▤",
  corrector: "✓",
  compressor: "⇥",
  modem: "↗",
  lab: "⌬",
  router: "⑂",
  disk: "▱",
  fragmenter: "⋮",
  reconstructor: "⋈",
  importer: "↓",
  firewall: "⌑",
  antivirus: "✧",
  integrity: "◇",
  rack: "▥",
  transformer: "ϟ",
  chiller: "❄",
  aggregator: "⊞",
  gpu: "⊠",
  trainer: "◉",
  synthetic: "∞",
  agent: "⤨",
  smr: "◎",
  predictor: "◷",
  semantic: "⋈",
  reflection: "◈",
  synapse: "⁂",
  anchor: "⊥",
  archive: "▣",
  sensor: "⌁",
  founder: "◈",
};
const renderer = new Renderer($("network"), engine, {
  onSelect(selection) {
    selected = selection;
    if (selection) {
      openPanel("inspect");
      if (selection.kind === "node")
        requestAnimationFrame(() => renderer.focus(selection.id));
    } else if (activePanel === "inspect") closePanel();
  },
  isPaused() {
    return paused;
  },
  onConnect(from, to) {
    const result = engine.connect(from, to, 1, renderer.layer || "data");
    respond(result, "Connexion établie.", "connect");
    uiDirty = true;
  },
  onMove(id, x, y) {
    const r = engine.moveNode(id, x, y);
    if (r.ok === false) notify(r.message, true);
    uiDirty = true;
  },
  onDeleteEdge(id) {
    confirmAction(
      "Retirer cette liaison ?",
      "Les modules restent en place. Vous pourrez les reconnecter à tout moment.",
      () => {
        respond(engine.disconnect(id), "Liaison retirée.");
        if (selected?.id === id) closePanel();
      },
    );
  },
  onNotice(message) {
    notify(message);
  },
});
audio.configure(engine.state.settings);
function haptic() {
  if (engine.state.settings.haptics && navigator.vibrate) navigator.vibrate(15);
}
function notify(message, error = false) {
  if (!message) return;
  clearTimeout(toastTimer);
  $("toast").textContent = message;
  $("toast").className = `toast${error ? " error" : ""}`;
  $("toast").hidden = false;
  toastTimer = setTimeout(
    () => ($("toast").hidden = true),
    error ? 5500 : 3800,
  );
}
function respond(result, fallback, sound) {
  if (result?.ok === false) {
    notify(result.message || "Action indisponible.", true);
    return false;
  }
  notify(result?.message || fallback);
  if (sound) audio.play(sound);
  haptic();
  uiDirty = true;
  return true;
}
function confirmAction(title, message, action) {
  const dialog = $("confirm-dialog");
  $("confirm-title").textContent = title;
  $("confirm-text").textContent = message;
  dialog.returnValue = "";
  dialog.showModal();
  dialog.onclose = () => {
    if (dialog.returnValue === "confirm") action();
    dialog.onclose = null;
  };
}
function persist(quiet = true) {
  engine.state.paused = paused;
  const r = saveGame(engine);
  if (!r?.ok) {
    $("session-status").textContent = "SAUVEGARDE INDISPONIBLE";
    if (!quiet)
      notify(
        r?.message || "Sauvegarde impossible. Exportez votre partie.",
        true,
      );
  } else if (!quiet) notify("Partie sauvegardée.");
  return r;
}
function occlude() {
  const panel = $("panel");
  const rect = panel.getBoundingClientRect();
  renderer.setOcclusion?.({
    right: activePanel && innerWidth > 700 ? rect.width + 34 : 0,
    bottom: activePanel && innerWidth <= 700 ? rect.height : 0,
  });
}
function openPanel(name) {
  activePanel = name;
  document.body.classList.add("has-panel");
  $("panel").hidden = false;
  document
    .querySelectorAll("[data-panel]")
    .forEach((b) => b.classList.toggle("active", b.dataset.panel === name));
  renderPanel();
  requestAnimationFrame(occlude);
}
function closePanel() {
  activePanel = "";
  document.body.classList.remove("has-panel");
  $("panel").hidden = true;
  document
    .querySelectorAll("[data-panel]")
    .forEach((b) =>
      b.classList.toggle("active", b.dataset.panel === "circuit"),
    );
  occlude();
}
function setPanel(title, kicker, body) {
  $("panel-title").textContent = title;
  $("panel-kicker").textContent = kicker;
  $("panel-body").innerHTML = body;
}
function renderPanel() {
  if (!activePanel) return;
  const methods = {
    build: renderBuild,
    research: renderResearch,
    inspect: renderInspector,
    stats: renderStats,
    settings: renderSettings,
    help: renderHelp,
    goals: renderGoals,
  };
  methods[activePanel]?.();
  uiDirty = false;
}
function available(type) {
  const r = engine.available?.(type);
  if (typeof r === "boolean") return r;
  if (r && typeof r === "object") return r.ok ?? r.available ?? false;
  const d = def(type);
  return (
    engine.state.stage >= d.stage &&
    (!d.tech || engine.state.techs.includes(d.tech))
  );
}
function constructionPrice(d) {
  return (
    engine.nodeCost?.(d.id) || {
      cost: d.cost || 0,
      currency: d.stage === 9 ? "ne" : "credits",
    }
  );
}
function constructionCost(d) {
  return constructionPrice(d).cost;
}
function renderBuild() {
  const s = engine.state;
  const cards = Object.entries(NODE_TYPES).filter(
    ([id, d]) =>
      buildFilter === "all" ||
      (buildFilter === "available"
        ? d.stage <= s.stage
        : d.kind === buildFilter),
  );
  setPanel(
    "Assembler le futur",
    "MODULES / " + String(s.stage).padStart(2, "0"),
    `<p class="panel-subtitle">Un module, une fonction. Ajoutez une pièce, puis reliez ses ports.</p><div class="filters">${[
      ["available", "Cette ère"],
      ["source", "Sources"],
      ["process", "Traitement"],
      ["utility", "Infrastructure"],
      ["all", "Tous"],
    ]
      .map(
        ([id, label]) =>
          `<button class="chip ${buildFilter === id ? "active" : ""}" data-action="build-filter" data-id="${id}">${label}</button>`,
      )
      .join("")}</div><div class="build-list">${cards
      .map(([id, d]) => {
        const unlocked = available(id),
          cost = constructionCost(d);
        const tech = TECHS.find((t) => t.id === d.tech);
        return `<article class="build-card ${unlocked ? "" : "locked-card"}"><div class="node-symbol" style="--node-color:${html(d.color || "#72ead4")}">${icons[id] || "◇"}</div><div class="build-details"><h3 class="build-title">${html(d.name)}</h3><p class="build-desc">${html(d.description)}</p><div class="build-bottom"><span class="cost">${num(cost)} ${constructionPrice(d).currency === "ne" ? "Nₑ" : "Cr"}</span>${unlocked ? `<button class="small-button" data-action="build" data-id="${id}" ${s[constructionPrice(d).currency] < cost ? "disabled" : ""} aria-label="Construire ${html(d.name)}">+ Ajouter</button>` : `<span class="locked-label">${d.stage > s.stage ? "Ère " + d.stage : html(d.seedRequired ? "Modèle fondateur requis" : tech?.name || "Recherche requise")}</span>`}</div></div></article>`;
      })
      .join(
        "",
      )}</div><div class="notice">Les modules sont placés dans la première cellule libre. Faites-les glisser pour organiser le circuit.</div>`,
  );
}
function branches() {
  return BRANCHES.map((b, i) =>
    typeof b === "string"
      ? { id: i, name: b }
      : { id: b.id ?? i, name: b.name || b.title || String(b) },
  );
}
function renderResearch() {
  const bs = branches(),
    branch = bs[researchBranch] || bs[0];
  const relevant = TECHS.filter(
    (t) =>
      t.branch === branch.id ||
      t.branch === researchBranch ||
      t.branch === branch.name,
  );
  const source = relevant.length
    ? relevant
    : TECHS.filter((t) => Number(t.branch) === researchBranch + 1);
  setPanel(
    "La matière apprend",
    "LABORATOIRE / " + num(engine.state.rp) + " RP",
    `<p class="panel-subtitle">Acheminez des fichiers vers le laboratoire. Chaque découverte transforme votre circuit.</p><div class="branch-tabs">${bs.map((b, i) => `<button data-action="research-branch" data-id="${i}" class="${researchBranch === i ? "active" : ""}">${html(["Calcul", "Réseaux", "Stabilité", "Cognition"][i] || b.name)}</button>`).join("")}</div><div class="section-label">${html(branch.name)}</div>${source
      .map((t) => {
        const owned = engine.state.techs.includes(t.id),
          status = engine.researchStatus?.(t.id),
          affordable =
            engine.state.rp >= t.cost && engine.state.ne >= (t.neCost || 0),
          eligible = t.stage <= engine.state.stage;
        return `<article class="tech-card ${owned ? "acquired" : ""}" style="--branch-color:${palette[researchBranch]}"><div class="tech-top"><h3>${html(t.name)}</h3><span class="tech-tier">T${t.stage}</span></div><p>${html(t.description)}</p>${t.recipe ? `<p class="recipe-hint">⌘ ${html(typeof t.recipe === "string" ? recipeText(t.recipe) : "Une découverte expérimentale est requise.")}</p>` : ""}<div class="tech-bottom"><span class="tech-cost">${num(t.cost)} RP${t.neCost ? " + " + num(t.neCost) + " Nₑ" : ""}</span>${owned ? '<span class="tech-state">✓ ACQUIS</span>' : `<button class="small-button" data-action="research" data-id="${t.id}" ${!affordable || !eligible || status?.ok === false ? "disabled" : ""}>${eligible ? "Rechercher" : "Ère " + t.stage}</button>`}</div>${!owned && status?.message ? `<p>${html(status.message)}</p>` : ""}</article>`;
      })
      .join(
        "",
      )}<div class="notice">${num(engine.state.stats.rpRate)} RP/s · Les crédits ne se convertissent pas en recherche : le laboratoire doit recevoir vos données.</div>`,
  );
}
function recipeText(recipe) {
  return (
    {
      predictive: "Exposez un laboratoire isolé à 100 paquets corrompus.",
      neuralzip:
        "Faites converger données compressées et modèle IA dans un laboratoire.",
      antiviral: "Exposez un laboratoire isolé à 100 paquets corrompus.",
      viral: "Exposez un laboratoire isolé à 100 paquets corrompus.",
      neural:
        "Faites converger données compressées et modèle IA dans un laboratoire.",
      compression:
        "Faites converger données compressées et modèle IA dans un laboratoire.",
      anchor: "Traversez 60 secondes de psychose numérique sans effondrement.",
      psychosis:
        "Traversez 60 secondes de psychose numérique sans effondrement.",
    }[recipe] ||
    "Recette expérimentale : consultez les découvertes dans Mesures."
  );
}
function detail(label, value, id = "") {
  return `<div class="detail-row"><span>${label}</span><strong ${id ? `data-live="${id}"` : ""}>${value}</strong></div>`;
}
function renderInspector() {
  const s = engine.state;
  if (!selected) {
    closePanel();
    return;
  }
  if (selected.kind === "edge") {
    const e = s.edges.find((x) => x.id === selected.id);
    if (!e) {
      closePanel();
      return;
    }
    const a = s.nodes.find((n) => n.id === e.from),
      b = s.nodes.find((n) => n.id === e.to);
    setPanel(
      "Liaison " +
        (e.kind === "data"
          ? "de données"
          : e.kind === "power"
            ? "électrique"
            : "hydraulique"),
      "INSPECTEUR / CÂBLE",
      `<p class="panel-subtitle">${html(def(a?.type).name)} <span style="color:var(--cyan)">→</span> ${html(def(b?.type).name)}</p>${detail("Débit réel", num(e.rate, e.kind === "data" ? "o/s" : "kW"), "edge-rate")}${detail("Capacité", num(e.capacity, e.kind === "data" ? "o/s" : "kW"), "edge-capacity")}${detail("Utilisation", pct(e.load), "edge-load")}${detail("Pertes", num(e.loss), "edge-loss")}<div class="meter"><i data-live-bar="edge-load" style="width:${(e.load || 0) * 100}%"></i></div><label class="range-field"><span class="range-caption">Poids de routage <output id="weight-value">${e.weight || 1}</output></span><input type="range" min="1" max="12" step="1" value="${e.weight || 1}" data-control="weight" aria-label="Poids de routage"></label><p class="panel-subtitle">Les sorties d’un routeur ou d’un distributeur se partagent le flux selon ces poids. Exemple : 3 et 1 donnent 75 % et 25 %.</p><button class="small-button danger wide" data-action="delete-edge" data-id="${html(e.id)}">Retirer le câble</button>`,
    );
    return;
  }
  const n = s.nodes.find((x) => x.id === selected.id);
  if (!n) {
    closePanel();
    return;
  }
  const d = def(n.type),
    hardware = s.stage >= 4;
  setPanel(
    d.name,
    "INSPECTEUR / " + String(n.id).toUpperCase(),
    `<div class="inspector-header"><div class="node-symbol" style="--node-color:${html(d.color)}">${icons[n.type] || "◇"}</div><div><h3>${html(d.short || d.name)} · niveau ${n.level || 1}</h3><span class="status-pill" data-live="status">${html(n.status || "ATTENTE")}</span></div></div>${detail("Débit entrant", num(n.inRate, "o/s"), "inRate")}${detail("Débit sortant", num(n.outRate, "o/s"), "outRate")}${detail("Capacité maximale", num(n.capacity, "o/s"), "capacity")}${detail("Utilisation", pct(n.utilization), "utilization")}<div class="meter"><i data-live-bar="utilization" style="width:${(n.utilization || 0) * 100}%"></i></div>${detail("Mémoire tampon", num(n.buffer, "o") + " / " + num(n.bufferMax, "o") + " · " + pct(n.buffer / (n.bufferMax || 1)), "buffer")}${detail("Allocation de calcul", num(n.cpuUsed || n._cpuUsed || n.cycles || 0, "Hz") + " / " + num(n.cpuAllocated || 0, "Hz"), "cpuAllocation")}${n.gpuAllocated > 0 ? detail("Calcul GPU utilisé / alloué", num(n.gpuUsed || n._gpuUsed || 0, "TFLOPS") + " / " + num(n.gpuAllocated || 0, "TFLOPS"), "gpuAllocation") : ""}${hardware ? detail("Puissance absorbée", num(n.power, "kW"), "power") + detail("Température", num(n.temp, "°C"), "temp") + detail("Bridage thermique", pct(1 - Math.max(0, Math.min(1, 1 - ((n.temp || 20) - 65) / 35))), "throttle") : ""}${detail("Corruption", pct(n.corruption || 0), "corruption")}${detail("Pureté", pct(n.purity ?? 1), "purity")}${n.type === "compressor" ? detail("Compression", n.ai && s.techs.includes("neuralzip") ? "15:1" : "2,5:1") : ""}<label class="range-field"><span class="range-caption">Priorité CPU / GPU <output id="allocation-value">${n.allocation || 10}</output></span><input type="range" min="1" max="100" step="1" value="${n.allocation || 10}" data-control="allocation" aria-label="Allocation du calcul"></label>${
      s.stage >= 8
        ? `<label class="field-select">Zone<select data-control="zone">${[
            ["Europe", "Europe"],
            ["America", "Amérique"],
            ["Asia", "Asie"],
            ["Orbit", "Orbite LEO"],
          ]
            .map(
              ([id, l]) =>
                `<option value="${id}" ${n.zone === id ? "selected" : ""}>${l}</option>`,
            )
            .join("")}</select>`
        : ""
    }${
      ["gpu", "trainer"].includes(n.type)
        ? `<label class="field-select">Destination<select data-control="node-mode">${(n.type ===
          "gpu"
            ? [
                ["stock", "Stocker les paramètres"],
                ["sell", "Vendre les paramètres"],
              ]
            : [
                ["models", "Forger des modèles IA"],
                ["params", "Produire des paramètres"],
              ]
          )
            .map(
              ([id, l]) =>
                `<option value="${id}" ${n.mode === id ? "selected" : ""}>${l}</option>`,
            )
            .join("")}</select></label>`
        : ""
    }<div class="control-row"><button class="small-button" data-action="focus-node" data-id="${html(n.id)}">Centrer</button>${engine.upgradeNode ? `<button class="small-button" data-action="upgrade-node" data-id="${html(n.id)}">Améliorer${engine.nodeUpgradeCost ? " · " + num(engine.nodeUpgradeCost(n.id).cost) + " " + (engine.nodeUpgradeCost(n.id).currency === "ne" ? "Nₑ" : "Cr") : ""}</button>` : ""}</div>${s.stage >= 6 && d.stage <= 5 ? `<button class="small-button wide" data-action="inject-model" data-id="${html(n.id)}" ${n.ai ? "disabled" : ""}>${n.ai ? "✓ Modèle IA injecté" : "+ Injecter un modèle · " + num(s.models) + " disponible(s)"}</button><p class="panel-subtitle" style="margin-top:9px">Inférence : ${s.techs.includes("neuro") ? "1,2" : "2"} TFLOPS et 40 kW en continu.</p>` : ""}<div class="section-label">LIAISONS</div>${
      s.edges
        .filter((e) => e.from === n.id || e.to === n.id)
        .map((e) => {
          const other = s.nodes.find(
            (x) => x.id === (e.from === n.id ? e.to : e.from),
          );
          return `<button class="node-list-button" data-action="inspect-edge" data-id="${html(e.id)}"><span>${e.from === n.id ? "↗" : "↙"}</span><span class="type-name">${html(def(other?.type).name)}</span><small>${num(e.rate, e.kind === "data" ? "o/s" : "kW")}</small></button>`;
        })
        .join("") ||
      '<p class="panel-subtitle">Touchez un port de sortie, puis une entrée compatible pour établir une liaison.</p>'
    }<div class="control-row"><button class="small-button danger wide" data-action="delete-node" data-id="${html(n.id)}">Démonter le module</button></div>`,
  );
}
function renderStats() {
  const s = engine.state;
  setPanel(
    "L’état du système",
    "TÉLÉMÉTRIE / TEMPS RÉEL",
    `<div class="stat-grid">${[
      ["creditsRate", "Revenus", "Cr/s"],
      ["rpRate", "Recherche", "RP/s"],
      ["cpuLoad", "Charge CPU", "%"],
      ["gpuLoad", "Charge GPU", "%"],
      ["networkLoad", "Saturation réseau", "%"],
      ["power", "Puissance", "kW"],
      ["maxTemp", "Température max", "°C"],
      ["purity", "Données réelles", "%"],
      ["throughput", "Débit utile", "o/s"],
      ["conceptsRate", "Concepts", "/s"],
      ["neRate", "Néguentropie", "Nₑ/s"],
      ["coherence", "Cohérence", "%"],
    ]
      .map(
        ([key, label, unit]) =>
          `<div class="stat-cell"><span>${label}</span><strong data-stat="${key}" data-unit="${unit}">${unit === "%" ? pct(s.stats[key]) : num(s.stats[key], unit)}</strong></div>`,
      )
      .join(
        "",
      )}</div><div class="section-label">REVENUS · 60 DERNIÈRES SECONDES</div><svg class="sparkline" id="income-chart" viewBox="0 0 300 55" preserveAspectRatio="none" aria-label="Évolution des revenus"><path d="M0 54H300" stroke="#2b3a46"/><path id="income-path" fill="none" stroke="#72ead4" stroke-width="1.5" d=""/></svg>${detail("Données archivées", num(s.archived, "o"), "archived")}${detail("Paramètres stockés", num(s.params), "params")}${detail("Modèles IA disponibles", num(s.models), "models")}${detail("Modèles fondateurs", num(s.seeds), "seeds")}<div class="section-label">DÉCOUVERTES EXPÉRIMENTALES</div><div class="notice" id="recipes-info">${renderRecipeInfo()}</div><div class="section-label">PARC / ${s.nodes.length} MODULES</div>${s.nodes.map((n) => `<button class="node-list-button" data-action="inspect-node" data-id="${html(n.id)}"><span style="color:${html(def(n.type).color)}">${icons[n.type] || "◇"}</span><span class="type-name">${html(def(n.type).name)}</span><small>${pct(n.utilization)}</small></button>`).join("")}<div class="section-label">JOURNAL DU SYSTÈME</div>${
      (s.messages || [])
        .slice(0, 8)
        .map(
          (m) =>
            `<div class="log-entry">${html(typeof m === "string" ? m : m.message || m.text || JSON.stringify(m))}</div>`,
        )
        .join("") ||
      '<p class="panel-subtitle">Les événements importants du réseau apparaîtront ici.</p>'
    }`,
  );
  updateStats();
}
function renderRecipeInfo() {
  const r = engine.state.recipes || {};
  return Object.keys(r).length
    ? Object.entries(r)
        .map(
          ([k, v]) =>
            `${html({ predictive: "Antivirus prédictif", neuralzip: "Compression neuronale", anchor: "Ancrage logique", corruptPackets: "Signatures virales analysées / 100", psychosisSeconds: "Psychose traversée (s) / 60" }[k] || k)} : ${typeof v === "boolean" ? (v ? "découvert" : "à découvrir") : html(typeof v === "number" ? num(v) : String(v))}`,
        )
        .join("<br>")
    : "Trois recettes attendent vos expérimentations : signatures virales, compression et ancrage logique.";
}
function goalAmount(g, value) {
  return /Pureté|Cohérence|Synchronisation/i.test(g.label)
    ? pct(value)
    : /archivées/i.test(g.label)
      ? num(value, "o")
      : num(value);
}
function goals() {
  try {
    return engine.goalProgress() || [];
  } catch {
    return [];
  }
}
function renderGoals() {
  const s = engine.state,
    st = stageDef(),
    next = STAGES.find((t) => t.id === s.stage + 1);
  setPanel(
    s.stage === 9
      ? "Distillation cosmique"
      : "Vers " + (next?.name || "la prochaine ère"),
    "ÉVOLUTION / ÈRE " + s.stage + " SUR 9",
    `<div class="era-badge">${String(s.stage).padStart(2, "0")}<span style="font-size:20px;letter-spacing:0"> → ${s.stage === 9 ? "∞" : String(s.stage + 1).padStart(2, "0")}</span></div><p class="era-description">${html(st.description || st.goal || "Votre architecture est prête à changer d’échelle.")}</p><div class="goals">${goals()
      .map(
        (g, i) =>
          `<div class="goal-item"><div class="goal-top"><span>${html(g.label)}</span><strong data-goal="${i}">${goalAmount(g, g.value)} / ${goalAmount(g, g.target)}</strong></div><div class="meter"><i data-goal-bar="${i}" style="width:${clamp(g.ratio || g.value / g.target || 0, 0, 1) * 100}%"></i></div></div>`,
      )
      .join(
        "",
      )}</div><button class="primary-button wide" data-action="${s.stage === 9 ? "prestige" : "advance"}" id="advance-button">${s.stage === 9 ? "Distiller la conscience" : "Accéder à l’ère suivante"} <span>↗</span></button><div class="section-label">MATÉRIEL / CAPACITÉ</div>${detail("Grille", typeof st.grid === "number" ? st.grid + " × " + st.grid : html(st.grid))}${detail("Bande passante par câble", num(st.bandwidth, "o/s"))}${detail("Calcul CPU de base", num(st.cpu, "Hz"))}<button class="secondary-button wide" style="margin-top:13px" data-action="upgrade-hardware">Améliorer le matériel${engine.hardwareCost ? " · " + num(engine.hardwareCost()) + (s.stage === 9 ? " Nₑ" : " Cr") : ""}</button>${s.stage === 9 ? `<div class="section-label">ÉQUILIBRE COGNITIF</div><label class="range-field"><span class="range-caption">Plasticité Φ <output id="phi-value">${s.phi}</output></span><input type="range" min="0" max="100" value="${s.phi}" data-control="phi" aria-label="Plasticité" ${s.techs.includes("fractal") ? "" : "disabled"}></label><label class="range-field"><span class="range-caption">Ancrage Ψ <output id="psi-value">${s.psi}</output></span><input type="range" min="0" max="100" value="${s.psi}" data-control="psi" aria-label="Ancrage" ${s.techs.includes("anchor") ? "" : "disabled"}></label><div class="notice">C = 100 − |Φ − Ψ|. Les régions d’ancrage ajoutent chacune 5 points à Ψ. Préservez plus de 90 % de cohérence pour préparer un modèle fondateur. Les réglages demandent Auto-topologie fractale et Nœuds d’ancrage logique.</div>` : ""}<div class="notice">Les objectifs utilisent vos ressources disponibles. La transition conserve votre circuit, vos ressources et vos découvertes ; elle ouvre une nouvelle échelle de calcul.</div>`,
  );
}
function renderSettings() {
  const s = engine.state.settings;
  setPanel(
    "Le poste de contrôle",
    "PRÉFÉRENCES & SAUVEGARDE",
    `<div class="section-label">AMBIANCE <img src="./assets/img/audioOn.png" width="18" height="18" alt=""></div>${[
      ["music", "Musique générative", "Une nappe évolutive, discrète."],
      ["sfx", "Sons d’interface", "Connexions, découvertes et alertes."],
      ["mute", "Couper tous les sons", "Prioritaire sur Musique et SFX."],
      ["haptics", "Retour haptique", "Une impulsion lors des connexions."],
    ]
      .map(
        ([key, label, note]) =>
          `<label class="toggle-row"><span>${label}<small>${note}</small></span><input type="checkbox" data-setting="${key}" ${s[key] ? "checked" : ""}></label>`,
      )
      .join(
        "",
      )}<label class="field-select">Qualité de rendu<select data-setting="quality">${[
      ["auto", "Adaptative"],
      ["high", "Haute fidélité"],
      ["low", "Économie d’énergie"],
    ]
      .map(
        ([id, l]) =>
          `<option value="${id}" ${s.quality === id ? "selected" : ""}>${l}</option>`,
      )
      .join(
        "",
      )}</select></label><div class="section-label">VOTRE PARTIE</div><p class="panel-subtitle">Sauvegarde automatique toutes les 30 secondes et à la sortie de l’onglet. Exportez une copie pour changer d’appareil.</p><button class="secondary-button wide" data-action="save">Sauvegarder maintenant</button><div class="control-row"><button class="small-button neutral" data-action="export">↓ Exporter JSON</button><button class="small-button neutral" data-action="import">↑ Importer JSON</button></div><div class="notice">Hors-ligne : 2 minutes de simulation exacte. Pour un circuit stable des ères 1 à 5, les gains sont prolongés jusqu’à 2 heures à 90 % du rendement. Les objectifs chronométrés avancés restent simulés sur 2 minutes. Aucun serveur.</div><div class="section-label">SIMULATION</div><button class="secondary-button wide" data-action="toggle-pause">${paused ? "Reprendre" : "Mettre en pause"}</button><button class="small-button danger wide" style="margin-top:15px" data-action="reset">Recommencer une partie</button>${debugOpen ? renderDebug() : ""}<button class="version-button" data-action="version">EXASCALE / v${html(VERSION)} · LOCAL ENGINE</button>`,
  );
}
function renderDebug() {
  return `<div class="debug-box"><h3>ATELIER SANDBOX</h3><p class="panel-subtitle">Ces outils modifient la partie courante. Exportez votre sauvegarde avant d’expérimenter.</p><label class="field-select">Vitesse<select data-setting="speed">${[1, 5, 20].map((n) => `<option value="${n}" ${engine.state.settings.speed === n ? "selected" : ""}>×${n}</option>`).join("")}</select></label><label class="field-select">Ère<select id="debug-stage">${STAGES.map((s) => `<option value="${s.id}" ${s.id === engine.state.stage ? "selected" : ""}>${s.id} · ${html(s.name)}</option>`).join("")}</select></label><button class="small-button wide" data-action="debug-stage">Aller à cette ère</button><div class="control-row"><button class="small-button neutral" data-action="debug-resources">+ Ressources</button><button class="small-button neutral" data-action="debug-research">Toutes les R&D</button></div></div>`;
}
function renderHelp() {
  setPanel(
    "Dessiner l’émergence",
    "GUIDE DE L’ARCHITECTE",
    `<div class="help-card"><h3>01 / Votre premier réseau</h3><p>Le générateur écrit des documents. Le modem les vend. Touchez « Modules » pour ajouter un laboratoire ou un traitement. Chaque pièce occupe une cellule.</p></div><div class="help-card"><h3>02 / Câbler au doigt</h3><p>Touchez le port de sortie à droite d’un module, puis le port d’entrée à gauche d’un autre. Vous pouvez aussi tirer le câble. Une pression longue sur un câble propose sa suppression.</p></div><div class="help-card"><h3>03 / Explorer le circuit</h3><p>Glissez sur le fond pour déplacer la caméra. Pincez à deux doigts ou utilisez la molette pour zoomer. Double-touchez un module pour le centrer. Glissez le boîtier pour le déplacer.</p></div><div class="help-card"><h3>04 / Le premier arbitrage</h3><p>Retirez la liaison vers le modem et reliez votre générateur au laboratoire. Débloquez le correcteur et la compression, puis reprenez les ventes. À l’ère 2, les routeurs répartiront vos données automatiquement.</p></div><div class="help-card"><h3>05 / Lire les flux</h3><p><span style="color:var(--cyan)">Cyan : moins de 70 %</span> de charge. <span style="color:var(--amber)">Ambre : 70–95 %</span>. <span style="color:var(--danger)">Rouge : saturation</span>. Les paquets voyagent réellement ; leur couleur révèle la nature des données. Un module en ATTENTE manque de flux ou de ressources.</p></div><div class="help-card"><h3>06 / Calcul, courant et chaleur</h3><p>La priorité CPU se règle dans l’inspecteur. À l’ère 4, changez de calque pour relier les transformateurs et les chillers aux modules. Au-dessus de 65 °C, le calcul ralentit. À 100 °C, il s’arrête.</p></div><div class="help-card"><h3>07 / Les neuf ères</h3><p>Poste isolé → Réseau local → Salle serveur → Datacenter → Big Data → IA spécialisée → Agents → Réseau planétaire → Conscience générale. Touchez l’objectif de progression pour voir les conditions de chaque transition.</p></div><div class="help-card"><h3>08 / Après l’éveil</h3><p>Réglez plasticité et ancrage dans le panneau Évolution. Un réseau cohérent produit de la néguentropie. La distillation transforme cette intelligence en modèle fondateur pour votre prochaine architecture.</p></div><div class="help-card"><h3>Raccourcis</h3><p><kbd>Espace</kbd> pause · <kbd>Échap</kbd> fermer · <kbd>F</kbd> centrer · <kbd>B</kbd> modules · <kbd>R</kbd> recherche.<br>Les commandes restent disponibles dans l’interface tactile.</p></div><button class="secondary-button wide" data-action="open-settings">Ouvrir les paramètres</button>`,
  );
}
function updateInspector() {
  if (activePanel !== "inspect" || !selected) return;
  const s = engine.state;
  if (selected.kind === "edge") {
    const e = s.edges.find((x) => x.id === selected.id);
    if (!e) return;
    live("edge-rate", num(e.rate, e.kind === "data" ? "o/s" : "kW"));
    live("edge-capacity", num(e.capacity, e.kind === "data" ? "o/s" : "kW"));
    live("edge-load", pct(e.load));
    live("edge-loss", num(e.loss));
    bar("edge-load", e.load);
    return;
  }
  const n = s.nodes.find((x) => x.id === selected.id);
  if (!n) return;
  for (const k of ["inRate", "outRate", "capacity"]) live(k, num(n[k], "o/s"));
  live("utilization", pct(n.utilization));
  bar("utilization", n.utilization);
  live("status", n.status || "ATTENTE");
  live(
    "buffer",
    num(n.buffer, "o") +
      " / " +
      num(n.bufferMax, "o") +
      " · " +
      pct(n.buffer / (n.bufferMax || 1)),
  );
  live(
    "cpuAllocation",
    num(n.cpuUsed || n._cpuUsed || n.cycles || 0, "Hz") +
      " / " +
      num(n.cpuAllocated || 0, "Hz"),
  );
  live(
    "gpuAllocation",
    num(n.gpuUsed || n._gpuUsed || 0, "TFLOPS") +
      " / " +
      num(n.gpuAllocated || 0, "TFLOPS"),
  );
  live("power", num(n.power, "kW"));
  live("temp", num(n.temp, "°C"));
  live("throttle", pct(clamp((n.temp - 65) / 35, 0, 1)));
  live("corruption", pct(n.corruption || 0));
  live("purity", pct(n.purity ?? 1));
  const el = document.querySelector('[data-live="status"]');
  if (el)
    el.className =
      "status-pill " +
      (/QUARANTAINE|ARRÊT|BLACKOUT/.test(n.status)
        ? "danger"
        : /CHAUD|SATUR|FAMINE/.test(n.status)
          ? "warn"
          : "");
}
function live(key, value) {
  const el = document.querySelector(`[data-live="${key}"]`);
  if (el) el.textContent = value;
}
function bar(key, value) {
  const el = document.querySelector(`[data-live-bar="${key}"]`);
  if (el) {
    el.style.width = clamp(value || 0, 0, 1) * 100 + "%";
    el.style.background =
      value >= 0.95
        ? "var(--danger)"
        : value >= 0.7
          ? "var(--amber)"
          : "var(--cyan)";
  }
}
function updateStats() {
  if (activePanel !== "stats") return;
  document.querySelectorAll("[data-stat]").forEach((el) => {
    const v = engine.state.stats[el.dataset.stat];
    el.textContent = el.dataset.unit === "%" ? pct(v) : num(v, el.dataset.unit);
  });
  for (const k of ["archived", "params", "models", "seeds"])
    live(k, num(engine.state[k], k === "archived" ? "o" : ""));
  const points = statsSamples.map((s) => s.creditsRate || 0),
    max = Math.max(1, ...points),
    d = points
      .map(
        (p, i) =>
          `${i ? "L" : "M"}${((i / Math.max(1, points.length - 1)) * 300).toFixed(1)},${(51 - (p / max) * 46).toFixed(1)}`,
      )
      .join(" ");
  $("income-path")?.setAttribute("d", d);
}
function updateGoals() {
  if (activePanel !== "goals") return;
  const gs = goals();
  gs.forEach((g, i) => {
    const el = document.querySelector(`[data-goal="${i}"]`),
      bar = document.querySelector(`[data-goal-bar="${i}"]`);
    if (el)
      el.textContent = goalAmount(g, g.value) + " / " + goalAmount(g, g.target);
    if (bar)
      bar.style.width =
        clamp(g.ratio ?? g.value / g.target ?? 0, 0, 1) * 100 + "%";
  });
  const b = $("advance-button");
  if (b) b.disabled = gs.some((g) => (g.ratio ?? g.value / g.target) < 1);
}
function updateAffordability() {
  if (activePanel === "build")
    document.querySelectorAll("[data-action=build]").forEach((b) => {
      const d = def(b.dataset.id);
      b.disabled =
        !available(d.id) ||
        engine.state[constructionPrice(d).currency] < constructionPrice(d).cost;
    });
  if (activePanel === "research")
    document.querySelectorAll("[data-action=research]").forEach((b) => {
      b.disabled = engine.researchStatus?.(b.dataset.id)?.ok === false;
    });
}
function updateHUD() {
  const s = engine.state,
    st = stageDef(),
    stats = s.stats || {},
    late = s.stage === 9;
  const primary = late ? s.ne : s.credits;
  const primaryRate = late ? stats.neRate : stats.creditsRate;
  $("primary-label").textContent = late ? "NÉGUENTROPIE" : "CRÉDITS";
  $("credits").textContent = num(primary);
  $("credits-rate").textContent = "+" + num(primaryRate) + " /s";
  $("rp").innerHTML = num(s.rp) + " <small>RP</small>";
  $("rp-rate").textContent = "+" + num(stats.rpRate) + " /s";
  $("cpu").innerHTML =
    Math.round((stats.cpuLoad || 0) * 100) + "<small>%</small>";
  $("throughput").textContent = num(stats.throughput, "o/s");
  $("world-name").textContent = st.name;
  $("world-index").innerHTML =
    String(s.stage).padStart(2, "0") + "<span>/09</span>";
  $("grid-label").textContent =
    typeof st.grid === "number"
      ? String(st.grid).padStart(2, "0") +
        " × " +
        String(st.grid).padStart(2, "0")
      : st.grid || "FRACTALE";
  if (s.stage === 9) $("grid-label").textContent = "FRACTALE · " + st.grid;
  $("clock").textContent = new Date((s.time || 0) * 1000)
    .toISOString()
    .slice(11, 19);
  $("pause-toggle").textContent = paused ? "▷" : "Ⅱ";
  $("pause-toggle").setAttribute(
    "aria-label",
    paused ? "Reprendre la simulation" : "Mettre en pause",
  );
  $("session-status").textContent = paused
    ? "SIMULATION EN PAUSE"
    : s.settings.speed > 1
      ? "SANDBOX ×" + s.settings.speed
      : "SYSTÈME EN LIGNE";
  $("audio-toggle").style.color = s.settings.mute
    ? "var(--muted)"
    : "var(--cyan)";
  $("audio-toggle").textContent = s.settings.mute ? "♩" : "♪";
  $("layer-bar").hidden = s.stage < 4;
  $("zone-select").hidden = s.stage < 8;
  const gs = goals(),
    ratio = gs.length
      ? Math.min(
          ...gs.map((g) => clamp(g.ratio ?? g.value / g.target ?? 0, 0, 1)),
        )
      : 0;
  $("mission-title").textContent =
    s.stage === 9
      ? "Distillation cosmique"
      : STAGES[s.stage]?.name || "Prochaine évolution";
  $("mission-percent").textContent = Math.floor(ratio * 100) + "%";
  $("mission-fill").style.width = ratio * 100 + "%";
  $("mission").classList.toggle("ready", ratio >= 1);
  $("grid-status").textContent = paused
    ? "SIMULATION EN PAUSE"
    : renderer.pendingPort
      ? "CONNEXION EN ATTENTE"
      : s.stage >= 4 && stats.maxTemp > 65
        ? "ALERTE THERMIQUE"
        : `${s.nodes.length} MODULES · ${s.edges.filter((e) => e.kind === "data").length} LIAISONS`;
  $("connection-hint").hidden = !renderer.pendingPort;
  document
    .querySelectorAll(".mini-bars i")
    .forEach((el, i) =>
      el.classList.toggle("on", i < Math.ceil((stats.cpuLoad || 0) * 8)),
    );
  const count = TECHS.filter(
    (t) =>
      !s.techs.includes(t.id) &&
      t.stage <= s.stage &&
      s.rp >= t.cost &&
      s.ne >= (t.neCost || 0),
  ).length;
  $("research-dot").hidden = count === 0;
  if (count !== lastResearchCount) {
    lastResearchCount = count;
    if (activePanel === "research") uiDirty = true;
  }
}
function performAction(action, id) {
  const s = engine.state;
  switch (action) {
    case "build-filter":
      buildFilter = id;
      renderBuild();
      break;
    case "build": {
      const r = engine.addNode(id);
      if (respond(r, "Module installé.", "connect")) {
        renderer.burst?.(r.node?.id, def(id).color);
        renderBuild();
        if (r.node) renderer.focus(r.node.id);
      }
      break;
    }
    case "research-branch":
      researchBranch = Number(id);
      renderResearch();
      break;
    case "research":
      if (respond(engine.buyTech(id), "Recherche validée.", "research")) {
        renderer.burst?.(null, "#b7a1f7");
        renderResearch();
        persist();
      }
      break;
    case "inspect-node":
      selected = { kind: "node", id };
      renderer.selection = selected;
      openPanel("inspect");
      renderer.focus(id);
      break;
    case "inspect-edge":
      selected = { kind: "edge", id };
      renderer.selection = selected;
      openPanel("inspect");
      break;
    case "focus-node":
      renderer.focus(id);
      break;
    case "upgrade-node":
      if (respond(engine.upgradeNode(id), "Module amélioré.", "research"))
        renderInspector();
      break;
    case "inject-model":
      if (respond(engine.injectModel(id), "Modèle IA injecté.", "research"))
        renderInspector();
      break;
    case "delete-edge":
      confirmAction(
        "Retirer le câble ?",
        "Le flux sera interrompu jusqu’à la prochaine connexion.",
        () => {
          respond(engine.disconnect(id), "Liaison retirée.");
          closePanel();
        },
      );
      break;
    case "delete-node":
      confirmAction(
        "Démonter ce module ?",
        "Ses câbles seront retirés et son buffer sera perdu. Une partie du coût de construction est remboursée.",
        () => {
          respond(engine.removeNode(id), "Module démonté.");
          closePanel();
        },
      );
      break;
    case "upgrade-hardware":
      respond(engine.upgradeHardware(), "Matériel amélioré.", "research");
      renderGoals();
      break;
    case "advance":
      if (respond(engine.advance(), "Nouvelle ère atteinte.", "era")) {
        renderer.burst?.();
        renderer.fit();
        renderGoals();
        persist();
      }
      break;
    case "prestige":
      confirmAction(
        "Distillation cosmique",
        "Votre circuit et ses ressources seront condensés en modèle fondateur. Vous redémarrerez avec un bonus permanent.",
        () => {
          if (
            respond(engine.prestige(), "Un modèle fondateur est né.", "era")
          ) {
            renderer.fit();
            renderGoals();
            persist();
          }
        },
      );
      break;
    case "open-settings":
      openPanel("settings");
      break;
    case "save":
      persist(false);
      break;
    case "export": {
      const blob = new Blob([exportGame(engine)], { type: "application/json" });
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `EXASCALE-ere-${s.stage}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify("Sauvegarde JSON exportée.");
      break;
    }
    case "import":
      $("import-file").click();
      break;
    case "toggle-pause":
      paused = !paused;
      persist();
      renderSettings();
      break;
    case "reset":
      confirmAction(
        "Recommencer depuis le premier octet ?",
        "Cette action remplace votre partie locale et efface ses modèles fondateurs. Exportez-la avant de confirmer si vous souhaitez la conserver.",
        () => {
          engine.state = new Engine().state;
          audio.configure(engine.state.settings);
          selected = null;
          renderer.selection = null;
          renderer.pendingPort = null;
          paused = false;
          statsSamples = [];
          renderer.fit();
          persist();
          closePanel();
          notify("Un nouveau circuit vous attend.");
        },
      );
      break;
    case "version": {
      const now = Date.now();
      versionTaps = versionTaps.filter((t) => now - t < 1000);
      versionTaps.push(now);
      if (versionTaps.length >= 3) {
        debugOpen = !debugOpen;
        renderSettings();
        versionTaps = [];
        haptic();
      }
      break;
    }
    case "debug-stage": {
      const n = Number($("debug-stage").value);
      engine.setStage(n);
      renderer.fit();
      renderSettings();
      notify("Sandbox · ère " + n);
      break;
    }
    case "debug-resources":
      s.credits += Math.max(10000, 10 ** (s.stage + 4));
      s.rp += Math.max(10000, 10 ** (s.stage + 3));
      s.ne += 1e5;
      s.models += 100;
      s.params += 1e12;
      notify("Sandbox · ressources ajoutées.");
      break;
    case "debug-research":
      s.techs = TECHS.filter((t) => t.stage <= s.stage).map((t) => t.id);
      notify("Sandbox · recherches de cette ère débloquées.");
      break;
  }
}
document.querySelectorAll("[data-panel]").forEach((button) =>
  button.addEventListener("click", () => {
    audio.unlock();
    const name = button.dataset.panel;
    if (name === "circuit" || name === activePanel) closePanel();
    else openPanel(name);
  }),
);
$("panel-body").addEventListener("click", (event) => {
  const b = event.target.closest("[data-action]");
  if (b && !b.disabled) performAction(b.dataset.action, b.dataset.id);
});
$("panel-body").addEventListener("input", (event) => {
  const el = event.target,
    s = engine.state;
  if (el.dataset.control) {
    const n = s.nodes.find((x) => x.id === selected?.id);
    switch (el.dataset.control) {
      case "allocation":
        if (n) n.allocation = Number(el.value);
        $("allocation-value").textContent = el.value;
        break;
      case "weight": {
        const e = s.edges.find((x) => x.id === selected?.id);
        if (e) e.weight = Number(el.value);
        $("weight-value").textContent = el.value;
        break;
      }
      case "phi":
      case "psi":
        engine.setCognition?.(
          el.dataset.control === "phi" ? Number(el.value) : s.phi,
          el.dataset.control === "psi" ? Number(el.value) : s.psi,
        );
        el.value = s[el.dataset.control];
        $(el.dataset.control + "-value").textContent = el.value;
        break;
    }
  }
});
$("panel-body").addEventListener("change", (event) => {
  const el = event.target,
    s = engine.state;
  if (el.dataset.setting) {
    const key = el.dataset.setting;
    s.settings[key] =
      el.type === "checkbox"
        ? el.checked
        : key === "speed"
          ? Number(el.value)
          : el.value;
    audio.unlock();
    audio.configure(s.settings);
    if (key === "quality") renderer.resize();
    persist();
  }
  const n = s.nodes.find((x) => x.id === selected?.id);
  if (el.dataset.control === "zone" && n) {
    if (engine.setNodeZone) {
      const r = engine.setNodeZone(n.id, el.value);
      respond(r, "Zone modifiée.");
      if (r.ok === false) el.value = n.zone;
    } else n.zone = el.value;
    uiDirty = true;
  }
  if (el.dataset.control === "node-mode" && n) {
    if (engine.setNodeMode)
      respond(engine.setNodeMode(n.id, el.value), "Destination modifiée.");
    else n.mode = el.value;
  }
});
$("close-panel").onclick = closePanel;
$("settings-top").onclick = () => openPanel("settings");
$("mission-toggle").onclick = () => openPanel("goals");
$("pause-toggle").onclick = () => {
  paused = !paused;
  persist();
  updateHUD();
};
$("audio-toggle").onclick = () => {
  audio.unlock();
  engine.state.settings.mute = !engine.state.settings.mute;
  audio.configure(engine.state.settings);
  updateHUD();
};
$("zoom-in").onclick = () => renderer.zoomBy(1.2);
$("zoom-out").onclick = () => renderer.zoomBy(1 / 1.2);
$("fit-view").onclick = () => renderer.fit();
$("cancel-wire").onclick = () => (renderer.pendingPort = null);
document.querySelectorAll("[data-layer]").forEach(
  (b) =>
    (b.onclick = () => {
      renderer.setLayer(b.dataset.layer);
      document
        .querySelectorAll("[data-layer]")
        .forEach((x) => x.classList.toggle("active", x === b));
      notify(
        b.dataset.layer === "data"
          ? "Calque données."
          : b.dataset.layer === "power"
            ? "Reliez un transformateur aux modules à alimenter."
            : "Reliez un chiller aux modules à refroidir.",
      );
    }),
);
$("zone-select").onchange = (e) => {
  renderer.setZone(e.target.value);
  renderer.fit();
};
$("import-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > 10 * 1024 * 1024)
      throw new Error("Fichier trop volumineux (10 Mo maximum).");
    const imported = parseSave(await file.text());
    confirmAction(
      "Charger cette architecture ?",
      `Votre partie locale sera remplacée par cette sauvegarde de l’ère ${imported.stage}.`,
      () => {
        engine.state = new Engine(imported).state;
        paused = !!engine.state.paused;
        selected = null;
        renderer.selection = null;
        renderer.pendingPort = null;
        audio.configure(engine.state.settings);
        renderer.fit();
        statsSamples = [];
        persist();
        renderSettings();
        notify("Architecture restaurée.");
      },
    );
  } catch (error) {
    notify(error.message || "Sauvegarde invalide.", true);
  }
  event.target.value = "";
});
$("start-game").onclick = () => {
  $("onboarding").hidden = true;
  engine.state.onboardingDone = true;
  audio.unlock();
  renderer.fit();
  persist();
  notify("Touchez un module pour inspecter son activité.");
};
if (!saved && !engine.state.onboardingDone) $("onboarding").hidden = false;
document.addEventListener("touchstart", () => audio.unlock(), {
  once: true,
  passive: true,
});
document.addEventListener("pointerdown", () => audio.unlock(), { once: true });
window.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.shiftKey && event.code === "KeyD") {
    event.preventDefault();
    debugOpen = !debugOpen;
    openPanel("settings");
    return;
  }
  if (["INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName)) return;
  if (event.code === "Escape") {
    $("onboarding").hidden = true;
    renderer.pendingPort = null;
    closePanel();
  } else if (event.code === "Space" && !event.target.closest("button")) {
    event.preventDefault();
    paused = !paused;
    persist();
  } else if (event.code === "KeyF") renderer.fit();
  else if (event.code === "KeyB") openPanel("build");
  else if (event.code === "KeyR") openPanel("research");
});
setInterval(() => persist(), 30000);
let hiddenAt = 0;
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    hiddenAt = Date.now();
    persist();
  } else {
    if (hiddenAt && !paused) {
      try {
        engine.state.savedAt = hiddenAt;
        const result = applyOffline(engine);
        if (result.seconds > 30)
          notify(
            `Retour au circuit · ${num(result.credits)} Cr et ${num(result.rp)} RP produits hors-ligne.`,
          );
      } catch {}
    }
    hiddenAt = 0;
    lastTime = performance.now();
    accumulator = 0;
  }
});
window.addEventListener("pagehide", () => persist());
window.addEventListener("resize", () => {
  renderer.resize();
  occlude();
});
function frame(now) {
  const elapsed = Math.min(0.25, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;
  if (!document.hidden && !paused) {
    accumulator += elapsed * (engine.state.settings.speed || 1);
    let steps = 0;
    while (accumulator >= 0.1 && steps < 60) {
      engine.tick(0.1);
      accumulator -= 0.1;
      steps++;
    }
    sampleElapsed += elapsed;
    if (sampleElapsed >= 1) {
      statsSamples.push({ ...engine.state.stats });
      if (statsSamples.length > 60) statsSamples.shift();
      sampleElapsed = 0;
    }
  }
  renderer.draw(now);
  if (now - lastUI >= 250) {
    updateHUD();
    if (!paused) {
      const st = engine.state.stats,
        alarm =
          engine.state.blackout > 0
            ? "Surcharge électrique : le réseau est en blackout."
            : engine.state.nodes.some((n) => n.quarantine > 0)
              ? "Un module est en quarantaine. Vérifiez le filtrage."
              : st.maxTemp > 65
                ? "Le réseau chauffe : renforcez le refroidissement."
                : "";
      if (alarm && alarm !== lastAlarmSignature) {
        audio.play("alert");
        notify(alarm, true);
      }
      lastAlarmSignature = alarm;
      if (now - lastAudioPulse > 1400 && st.throughput > 0) {
        audio.play("packet");
        lastAudioPulse = now;
      }
    }
    updateInspector();
    updateStats();
    updateGoals();
    updateAffordability();
    const diag = renderer.getDiagnostics?.();
    if (diag?.medianFrameMs > 0)
      $("fps-label").textContent =
        Math.round(1000 / diag.medianFrameMs) + " Hz";
    lastUI = now;
    if (engine.state.stage !== lastStateStage) {
      lastStateStage = engine.state.stage;
      uiDirty = true;
      renderer.resize();
    }
  }
  if (
    activePanel &&
    now - lastPanelUI >= 1800 &&
    uiDirty &&
    !$("panel-body").contains(document.activeElement)
  ) {
    const scroll = $("panel-body").scrollTop;
    renderPanel();
    $("panel-body").scrollTop = scroll;
    lastPanelUI = now;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(() => {
  renderer.resize();
  renderer.fit();
  updateHUD();
  requestAnimationFrame(frame);
});
if (offline.seconds > 30)
  setTimeout(
    () =>
      notify(
        `Retour au circuit · ${Math.round(offline.seconds / 60)} min prises en compte : +${num(offline.credits)} Cr, +${num(offline.rp)} RP.`,
      ),
    700,
  );
// Read-only reference for local diagnostics; sandbox actions remain in the explicit UI.
window.EXASCALE = {
  engine,
  renderer,
  audio,
  openPanel,
  get paused() {
    return paused;
  },
  set paused(v) {
    paused = !!v;
  },
};
