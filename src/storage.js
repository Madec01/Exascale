import { NODE_TYPES, TECHS, VERSION } from "./data.js";

export const SAVE_KEY = "exascale.save.v1";
export const BACKUP_KEY = "exascale.backup.v1";
export const MAX_OFFLINE_SECONDS = 2 * 60 * 60;
const MAX_SAVE_BYTES = 10 * 1024 * 1024;
const RESOURCE_KEYS = [
  "credits",
  "rp",
  "ne",
  "params",
  "models",
  "archived",
  "seeds",
  "time",
];
const ID = /^[a-zA-Z0-9_-]{1,64}$/;
const ZONES = ["Europe", "America", "Asia", "Orbit"];
const PACKET_TYPES = [
  "text",
  "archive",
  "client",
  "compressed",
  "fragment",
  "dataset",
  "tensor",
  "model",
  "synthetic",
  "real",
  "concept",
  "thought",
];
const fail = (message) => {
  throw new Error(message);
};
const plain = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

function walk(value, depth = 0, budget = { count: 0 }) {
  if (depth > 18 || ++budget.count > 500000) fail("Sauvegarde trop complexe.");
  if (
    typeof value === "number" &&
    (!Number.isFinite(value) || Math.abs(value) > 1e300)
  )
    fail("Une valeur numérique est invalide.");
  if (typeof value === "string" && value.length > 16384)
    fail("Un champ de texte est trop long.");
  if (Array.isArray(value) && value.length > 16384)
    fail("Une liste dépasse la limite autorisée.");
  if (value && typeof value === "object")
    for (const key of Object.keys(value)) {
      if (["__proto__", "prototype", "constructor"].includes(key))
        fail("La sauvegarde contient une propriété interdite.");
      walk(value[key], depth + 1, budget);
    }
}

function numeric(value, min, max, label) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    fail(`${label} invalide.`);
}

function optionalNumbers(object, keys, min = 0, max = 1e100) {
  for (const key of keys)
    if (object[key] !== undefined) numeric(object[key], min, max, key);
}
function boolean(value, label) {
  if (typeof value !== "boolean") fail(`${label} invalide.`);
}
function integer(value, min, max, label) {
  numeric(value, min, max, label);
  if (!Number.isInteger(value)) fail(`${label} doit être entier.`);
}
function queue(value) {
  if (!Array.isArray(value) || value.length > 96)
    fail("File de paquets invalide (96 lots maximum).");
  for (const packet of value) {
    if (
      !plain(packet) ||
      !PACKET_TYPES.includes(packet.type) ||
      !ZONES.includes(packet.zone)
    )
      fail("Paquet de données invalide.");
    for (const key of ["bytes", "units", "value", "rp", "real"])
      numeric(packet[key], 0, 1e100, `Paquet ${key}`);
    if (packet.bytes > 1e-12 && packet.units <= 0)
      fail("Un paquet contient des octets sans unité.");
    if (packet.real > packet.bytes * 1.000001 + 1e-9)
      fail("La part réelle dépasse la taille du paquet.");
    if (packet.part !== undefined)
      integer(packet.part, 0, 3, "Numéro de fragment");
    if (
      packet.origin !== undefined &&
      (typeof packet.origin !== "string" || !ID.test(packet.origin))
    )
      fail("Origine de fragment invalide.");
    if (
      packet.type === "fragment" &&
      (packet.origin === undefined || packet.part === undefined)
    )
      fail("Fragment incomplet.");
    if (
      packet.key !== undefined &&
      (typeof packet.key !== "string" || packet.key.length > 256)
    )
      fail("Signature de paquet invalide.");
    optionalNumbers(packet, ["latency"], 0, 1e6);
    for (const key of [
      "corrupt",
      "corrected",
      "compressed",
      "certified",
      "predicted",
      "archived",
      "awakened",
    ])
      if (packet[key] !== undefined) boolean(packet[key], "Marqueur de paquet");
  }
}

/** Validate a complete export before replacing the live game. No partially applied imports. */
export function parseSave(text) {
  if (typeof text !== "string" || text.length > MAX_SAVE_BYTES)
    fail("Fichier trop volumineux (10 Mo maximum).");
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    fail("Ce fichier ne contient pas un JSON valide.");
  }
  if (!plain(payload)) fail("Format de sauvegarde non reconnu.");
  walk(payload);
  if (payload.format !== undefined && payload.format !== "EXASCALE")
    fail("Ce fichier ne provient pas d’EXASCALE.");
  if (payload.schema !== undefined && payload.schema !== 1)
    fail("Version de sauvegarde non prise en charge.");
  const state = payload.format === "EXASCALE" ? payload.state : payload;
  if (!plain(state)) fail("La sauvegarde ne contient pas de partie.");
  const major = String(VERSION).split(".")[0];
  if (
    typeof state.version !== "string" ||
    state.version.split(".")[0] !== major
  )
    fail("Version du jeu incompatible.");
  numeric(state.stage, 1, 9, "Étape");
  if (!Number.isInteger(state.stage)) fail("Étape invalide.");
  numeric(state.savedAt, 0, 1e15, "Date de sauvegarde");
  for (const key of RESOURCE_KEYS)
    if (state[key] !== undefined) numeric(state[key], 0, 1e100, "Ressource");
  if (state.time !== undefined)
    numeric(state.time, 0, 1e12, "Temps de simulation");
  if (state.seeds !== undefined)
    integer(state.seeds, 0, 1e9, "Modèles fondateurs");
  optionalNumbers(state, [
    "blackout",
    "stableSeconds",
    "boostedSeconds",
    "totalEarned",
    "concepts",
  ]);
  if (state.hardware !== undefined)
    integer(state.hardware, 0, 4, "Niveau matériel");
  if (state.tutorial !== undefined) integer(state.tutorial, 0, 2, "Tutoriel");
  if (state.sandbox !== undefined) boolean(state.sandbox, "Mode sandbox");
  for (const key of ["paused", "onboardingDone"])
    if (state[key] !== undefined) boolean(state[key], key);
  if (!Array.isArray(state.nodes) || state.nodes.length > 1024)
    fail("Nombre de modules invalide (1 024 maximum).");
  if (!Array.isArray(state.edges) || state.edges.length > 4096)
    fail("Nombre de câbles invalide (4 096 maximum).");
  if (!Array.isArray(state.techs) || state.techs.length > TECHS.length)
    fail("Arbre de recherche invalide.");
  const knownTechs = new Set(TECHS.map((t) => t.id));
  if (
    state.techs.some((t) => typeof t !== "string" || !knownTechs.has(t)) ||
    new Set(state.techs).size !== state.techs.length
  )
    fail("Technologie inconnue ou dupliquée.");
  const nodeIds = new Set();
  for (const node of state.nodes) {
    if (
      !plain(node) ||
      typeof node.id !== "string" ||
      !ID.test(node.id) ||
      nodeIds.has(node.id)
    )
      fail("Identifiant de module invalide ou dupliqué.");
    if (typeof node.type !== "string" || !Object.hasOwn(NODE_TYPES, node.type))
      fail("Type de module inconnu.");
    numeric(node.x, 0, 4095, "Position");
    numeric(node.y, 0, 4095, "Position");
    if (!Number.isInteger(node.x) || !Number.isInteger(node.y))
      fail("Les coordonnées de grille doivent être entières.");
    if (node.level !== undefined) integer(node.level, 1, 8, "Niveau");
    if (node.allocation !== undefined)
      numeric(node.allocation, 0, 100, "Allocation");
    if (node.temp !== undefined) numeric(node.temp, -273, 10000, "Température");
    if (node.ai !== undefined) boolean(node.ai, "Injection IA");
    if (node.zone !== undefined && !ZONES.includes(node.zone))
      fail("Zone géographique inconnue.");
    if (
      node.mode !== undefined &&
      !["stock", "sell", "models", "params", "auto", "audio", "video"].includes(
        node.mode,
      )
    )
      fail("Mode de module inconnu.");
    if (
      node.paidCurrency !== undefined &&
      !["credits", "ne"].includes(node.paidCurrency)
    )
      fail("Devise du module inconnue.");
    if (
      node.status !== undefined &&
      (typeof node.status !== "string" || node.status.length > 64)
    )
      fail("État de module invalide.");
    optionalNumbers(node, [
      "buffer",
      "bufferMax",
      "quarantine",
      "inRate",
      "outRate",
      "capacity",
      "power",
      "infected",
      "loss",
      "paid",
      "training",
      "cpuUsed",
      "cpuAllocated",
      "gpuUsed",
      "gpuAllocated",
      "gpuRequired",
      "drift",
    ]);
    optionalNumbers(node, ["training"], 0, 30);
    optionalNumbers(
      node,
      ["utilization", "progress", "throttle", "purity", "corruption", "sync"],
      0,
      1.000001,
    );
    optionalNumbers(node, ["lastCompressed", "lastModel"], -1e100, 1e100);
    for (const key of ["input", "output"])
      if (node[key] !== undefined) queue(node[key]);
    if (
      node.fragments !== undefined &&
      (!plain(node.fragments) || Object.keys(node.fragments).length > 96)
    )
      fail("Mémoire de fragments invalide.");
    nodeIds.add(node.id);
  }
  const edgeIds = new Set();
  for (const edge of state.edges) {
    if (
      !plain(edge) ||
      typeof edge.id !== "string" ||
      !ID.test(edge.id) ||
      edgeIds.has(edge.id)
    )
      fail("Identifiant de câble invalide ou dupliqué.");
    if (
      !nodeIds.has(edge.from) ||
      !nodeIds.has(edge.to) ||
      edge.from === edge.to
    )
      fail("Un câble référence un module absent ou identique.");
    if (
      edge.kind !== undefined &&
      !["data", "power", "cooling"].includes(edge.kind)
    )
      fail("Calque de câble inconnu.");
    if (edge.weight !== undefined)
      numeric(edge.weight, 0.01, 1000, "Poids de routage");
    optionalNumbers(edge, ["rate", "capacity", "loss"]);
    optionalNumbers(edge, ["load", "progress"], 0, 1.000001);
    if (
      edge.flowType !== undefined &&
      (typeof edge.flowType !== "string" || edge.flowType.length > 64)
    )
      fail("Type de flux invalide.");
    edgeIds.add(edge.id);
  }
  const maxNumericId = [...nodeIds, ...edgeIds].reduce(
    (max, id) =>
      /^\w\d+$/.test(id) ? Math.max(max, Number(id.slice(1))) : max,
    0,
  );
  if (state.nextId === undefined) state.nextId = maxNumericId + 1;
  integer(
    state.nextId,
    1,
    Number.MAX_SAFE_INTEGER - 1,
    "Compteur d’identifiants",
  );
  if (state.nextId <= maxNumericId)
    fail("Le prochain identifiant entrerait en collision avec le réseau.");
  if (state.settings !== undefined && !plain(state.settings))
    fail("Réglages invalides.");
  if (
    state.settings?.speed !== undefined &&
    ![1, 5, 20].includes(state.settings.speed)
  )
    fail("Vitesse de simulation invalide.");
  if (
    state.settings?.quality !== undefined &&
    !["auto", "high", "low"].includes(state.settings.quality)
  )
    fail("Qualité de rendu invalide.");
  for (const key of ["music", "sfx"])
    if (
      state.settings?.[key] !== undefined &&
      typeof state.settings[key] !== "boolean"
    )
      numeric(state.settings[key], 0, 1, "Volume");
  for (const key of ["mute", "haptics"])
    if (state.settings?.[key] !== undefined)
      boolean(state.settings[key], "Réglage");
  if (state.recipes !== undefined) {
    if (!plain(state.recipes)) fail("Recettes invalides.");
    for (const [key, value] of Object.entries(state.recipes))
      if (typeof value !== "boolean")
        numeric(value, 0, 1e100, `Recette ${key}`);
  }
  if (state.stats !== undefined) {
    if (!plain(state.stats)) fail("Statistiques invalides.");
    for (const [key, value] of Object.entries(state.stats))
      numeric(value, key === "maxTemp" ? -273 : 0, 1e100, "Statistique");
  }
  if (state.history !== undefined) {
    if (!Array.isArray(state.history) || state.history.length > 120)
      fail("Historique invalide (120 points maximum).");
    for (const point of state.history) {
      if (!plain(point)) fail("Point d’historique invalide.");
      for (const value of Object.values(point))
        numeric(value, -273, 1e100, "Historique");
    }
  }
  if (state.messages !== undefined) {
    if (!Array.isArray(state.messages) || state.messages.length > 30)
      fail("Journal invalide (30 événements maximum).");
    for (const message of state.messages) {
      if (
        !plain(message) ||
        typeof message.text !== "string" ||
        message.text.length > 2000 ||
        typeof message.kind !== "string" ||
        message.kind.length > 32
      )
        fail("Événement de journal invalide.");
      numeric(message.time, 0, 1e100, "Date d’événement");
    }
  }
  if (state.phi !== undefined) numeric(state.phi, 0, 100, "Plasticité");
  if (state.psi !== undefined) numeric(state.psi, 0, 100, "Ancrage");
  return state;
}

export function exportGame(engine) {
  const state = engine.serialize();
  state.savedAt = Date.now();
  return JSON.stringify({
    format: "EXASCALE",
    schema: 1,
    exportedAt: state.savedAt,
    state,
  });
}

export function saveGame(engine) {
  try {
    const storage = globalThis.localStorage;
    if (!storage)
      return {
        ok: false,
        message: "Le stockage local est indisponible. Exportez votre partie.",
      };
    const text = exportGame(engine);
    parseSave(text);
    const previous = storage.getItem(SAVE_KEY);
    if (previous) {
      try {
        parseSave(previous);
        storage.setItem(BACKUP_KEY, previous);
      } catch {
        /* Preserve earlier valid backup. */
      }
    }
    storage.setItem(SAVE_KEY, text);
    engine.state.savedAt = JSON.parse(text).state.savedAt;
    return { ok: true, message: "Partie sauvegardée." };
  } catch {
    return {
      ok: false,
      message:
        "Sauvegarde locale impossible. Exportez votre partie pour la conserver.",
    };
  }
}

export function loadGame() {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return null;
    for (const key of [SAVE_KEY, BACKUP_KEY]) {
      const text = storage.getItem(key);
      if (!text) continue;
      try {
        return parseSave(text);
      } catch {
        /* Try last validated backup. */
      }
    }
  } catch {
    /* Disabled storage, private mode, or unavailable browser API. */
  }
  return null;
}

/**
 * Replay at most 120 real seconds (0.25 s simulation steps). Up to 2 h rewards
 * are extrapolated only for a verified stable, safe early-stage network.
 * Timed late-stage objectives, psychosis and dynamic topology are NEVER invented.
 */
export function applyOffline(engine, now = Date.now()) {
  const state = engine.state;
  const elapsed = Math.max(
    0,
    Math.min(MAX_OFFLINE_SECONDS, (now - (state.savedAt || now)) / 1000),
  );
  const before = Object.fromEntries(
    RESOURCE_KEYS.map((k) => [k, state[k] || 0]),
  );
  if (state.paused || !Number.isFinite(elapsed) || elapsed < 2) {
    state.savedAt = now;
    return {
      seconds: 0,
      elapsedSeconds: 0,
      simulatedSeconds: 0,
      credits: 0,
      rp: 0,
      ne: 0,
      conservative: false,
    };
  }
  const simulated = Math.min(120, elapsed);
  const ratesStart = Math.max(0, simulated - 30);
  let rateSnapshot = before;
  let bufferSnapshot = new Map();
  let actualTime = 0;
  let safe =
    state.stage < 6 &&
    state.nodes.some((n) => NODE_TYPES[n.type]?.kind === "source");
  for (let t = 0; t < simulated; t += 0.25) {
    const dt = Math.min(0.25, simulated - t);
    if (t <= ratesStart && t + dt > ratesStart) {
      rateSnapshot = Object.fromEntries(
        RESOURCE_KEYS.map((k) => [k, state[k] || 0]),
      );
      bufferSnapshot = new Map(state.nodes.map((n) => [n.id, n.buffer || 0]));
    }
    engine.tick(dt);
    actualTime += dt;
    if (
      (state.stats?.maxTemp || 20) > 60 ||
      (state.blackout || 0) > 0 ||
      (state.stats?.purity ?? 1) < 0.25 ||
      state.nodes.some((n) => (n.quarantine || 0) > 0 || (n.temp || 20) > 60)
    )
      safe = false;
  }
  // A finite reservoir is not a perpetual source. Falling buffers invalidate
  // extrapolation, even when another disconnected source remains on the board.
  if (
    state.nodes.some(
      (n) =>
        (n.buffer || 0) +
          Math.max(1e-6, (bufferSnapshot.get(n.id) || 0) * 1e-6) <
        (bufferSnapshot.get(n.id) || 0),
    )
  )
    safe = false;
  let credited = actualTime;
  if (safe && elapsed > simulated && state.stage < 6) {
    const remainder = elapsed - simulated;
    const sampleSeconds = Math.min(30, simulated);
    // 90% yield explicitly accounts for sub-step/buffer transients during approximation.
    for (const key of ["credits", "rp", "ne", "archived", "params"]) {
      const average = Math.max(
        0,
        ((state[key] || 0) - (rateSnapshot[key] || 0)) / sampleSeconds,
      );
      state[key] = Math.min(
        1e300,
        (state[key] || 0) + average * remainder * 0.9,
      );
    }
    state.time = (state.time || 0) + remainder;
    credited = elapsed;
  }
  state.savedAt = now;
  return {
    seconds: credited,
    elapsedSeconds: elapsed,
    simulatedSeconds: actualTime,
    credits: (state.credits || 0) - before.credits,
    rp: (state.rp || 0) - before.rp,
    ne: (state.ne || 0) - before.ne,
    conservative: credited < elapsed,
  };
}
