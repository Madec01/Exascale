import { NODE_TYPES, STAGES, format } from "./data.js";

/* EXASCALE's substrate renderer. All geometry and symbols are authored here;
   visual packets are a bounded representation of actual simulated transfers. */
const CELL_W = 220,
  CELL_H = 160,
  NODE_W = 174,
  NODE_H = 112;
const TAU = Math.PI * 2,
  MAX_PACKETS = 900;
const INK = "#090D14",
  CYAN = "#74E4D3",
  AMBER = "#E9B96B",
  RED = "#F47783";
const ZONE_NAMES = {
  Europe: "EUROPE",
  America: "AMÉRIQUE",
  Asia: "ASIE",
  Orbit: "ORBITE LEO",
};
const FLOW = {
  text: ["#A3CCC9", 2.5, 86],
  raw: ["#A3CCC9", 2.5, 86],
  corrected: ["#9FE6B8", 3, 94],
  compressed: ["#E3B77B", 3.5, 108],
  archive: ["#E3B77B", 4.2, 80],
  fragment: ["#F0C79E", 2, 128],
  audio: ["#A1BCF8", 3.5, 90],
  video: ["#8CABEE", 4.5, 75],
  client: ["#A1BCF8", 3.5, 88],
  certified: ["#C8F7CB", 4, 95],
  dataset: ["#EAC66D", 5, 70],
  parameters: ["#B99DF4", 4, 96],
  model: ["#CEB4FF", 5, 70],
  synthetic: ["#BB9AF0", 3, 138],
  concept: ["#D6FFFF", 4.8, 120],
  real: ["#80DCCF", 3.2, 110],
  corrupt: [RED, 3.8, 76],
  power: ["#E9B96B", 3, 140],
  cooling: ["#8BC8F6", 3, 95],
};
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const val = (v, d = 0) => (Number.isFinite(v) ? v : d);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const nice = (v, u = "") => {
  try {
    return format(val(v), u);
  } catch {
    return `${Math.round(val(v))} ${u}`;
  }
};
const loadColor = (u) => (u >= 0.95 ? RED : u >= 0.7 ? AMBER : CYAN);
const zoneKey = (v) =>
  ({
    Amérique: "America",
    "Amérique du Nord": "America",
    Europe: "Europe",
    Asie: "Asia",
    Orbite: "Orbit",
    "Orbite LEO": "Orbit",
    EU: "Europe",
    US: "America",
    AS: "Asia",
    LEO: "Orbit",
  })[v] ||
  v ||
  "Europe";

function panelPath(ctx, x, y, w, h, c = 9) {
  ctx.beginPath();
  ctx.moveTo(x + c, y);
  ctx.lineTo(x + w - c, y);
  ctx.lineTo(x + w, y + c);
  ctx.lineTo(x + w, y + h - c);
  ctx.lineTo(x + w - c, y + h);
  ctx.lineTo(x + c, y + h);
  ctx.lineTo(x, y + h - c);
  ctx.lineTo(x, y + c);
  ctx.closePath();
}
function bezier(a, b, c, d, t) {
  const s = 1 - t;
  return {
    x:
      s * s * s * a.x +
      3 * s * s * t * b.x +
      3 * s * t * t * c.x +
      t * t * t * d.x,
    y:
      s * s * s * a.y +
      3 * s * s * t * b.y +
      3 * s * t * t * c.y +
      t * t * t * d.y,
  };
}
function pathPoint(path, t) {
  const target = clamp(t, 0, 1) * path.length,
    samples = path.samples;
  let low = 1,
    high = samples.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (samples[mid].length < target) low = mid + 1;
    else high = mid;
  }
  const b = samples[low],
    a = samples[low - 1],
    p = (target - a.length) / (b.length - a.length || 1);
  return {
    x: a.x + (b.x - a.x) * p,
    y: a.y + (b.y - a.y) * p,
    angle: Math.atan2(b.y - a.y, b.x - a.x),
  };
}

export class Renderer {
  constructor(canvas, engine, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.engine = engine;
    this.callbacks = callbacks;
    this.camera = { x: 0, y: 0, zoom: 1 };
    this.selection = null;
    this.pendingPort = null;
    this.layer = "data";
    this.zone = "all";
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    this.packetCount = 0;
    this._occlusion = { right: 0, bottom: 0 };
    this._pointers = new Map();
    this._paths = new Map();
    this._packetPool = [];
    this._packets = [];
    this._emission = new Map();
    this._bursts = [];
    this._listeners = [];
    this._lastFrame = 0;
    this._lastTap = null;
    this._gesture = null;
    this._longPress = null;
    this._fpsSamples = [];
    this._frameCount = 0;
    this._drawDurations = [];
    this._nodeMap = new Map();
    this._visibleNodes = [];
    this._quality = engine.state.settings?.quality || "auto";
    this._resolutionScale = 1;
    this._destroyed = false;
    this._fitted = false;
    this._reducedMotion =
      globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ||
      false;
    canvas.style.touchAction = "none";
    canvas.style.userSelect = "none";
    canvas.style.cursor = "grab";
    canvas.setAttribute(
      "aria-label",
      "Circuit EXASCALE. Touchez un module pour l’inspecter. Reliez sa sortie à une entrée. Glissez le fond pour déplacer la vue.",
    );
    canvas.setAttribute("role", "img");
    canvas.tabIndex = 0;
    this._on("pointerdown", (e) => this._down(e));
    this._on("pointermove", (e) => this._move(e));
    this._on("pointerup", (e) => this._up(e));
    this._on("pointercancel", (e) => this._cancel(e));
    this._on("lostpointercapture", (e) => {
      if (this._pointers.has(e.pointerId)) this._cancel(e);
    });
    this._on("wheel", (e) => this._wheel(e), { passive: false });
    this._on("contextmenu", (e) => e.preventDefault());
    this._on("keydown", (e) => this._key(e));
    this._resizeObserver = new ResizeObserver(() => this.resize());
    this._resizeObserver.observe(canvas);
    this.resize();
  }
  _on(type, fn, options) {
    this.canvas.addEventListener(type, fn, options);
    this._listeners.push([type, fn, options]);
  }
  _coords(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  screenToWorld(p) {
    return {
      x: (p.x - this.camera.x) / this.camera.zoom,
      y: (p.y - this.camera.y) / this.camera.zoom,
    };
  }
  worldToScreen(p) {
    return {
      x: p.x * this.camera.zoom + this.camera.x,
      y: p.y * this.camera.zoom + this.camera.y,
    };
  }
  nodeBounds(n) {
    return {
      x: val(n.x) * CELL_W + 23,
      y: val(n.y) * CELL_H + 24,
      w: NODE_W,
      h: NODE_H,
    };
  }
  portPosition(n, side) {
    const b = this.nodeBounds(n);
    return { x: side === "out" ? b.x + b.w : b.x, y: b.y + 66 };
  }
  _hasPort(n, side) {
    const d = NODE_TYPES[n.type] || {};
    if (this.layer === "power")
      return side === "in" || ["transformer", "smr"].includes(n.type);
    if (this.layer === "cooling") return side === "in" || n.type === "chiller";
    if (["transformer", "smr", "chiller", "agent", "anchor"].includes(n.type))
      return false;
    return side === "in" ? d.kind !== "source" : d.kind !== "sink";
  }
  _nodeVisible(n) {
    return this.zone === "all" || zoneKey(n.zone) === this.zone;
  }
  resize() {
    if (this._destroyed) return;
    const b = this.canvas.getBoundingClientRect(),
      w = Math.max(1, b.width),
      h = Math.max(1, b.height),
      oldW = this.width,
      oldH = this.height;
    this.width = w;
    this.height = h;
    const quality = this.engine.state.settings?.quality || "auto";
    this._quality = quality;
    this.dpr =
      Math.min(
        val(globalThis.devicePixelRatio, 1),
        quality === "low" ? 1 : quality === "high" ? 2 : 1.75,
      ) * this._resolutionScale;
    this.canvas.width = Math.max(1, Math.round(w * this.dpr));
    this.canvas.height = Math.max(1, Math.round(h * this.dpr));
    if (!this._fitted && w > 10 && h > 10) {
      this.fit();
      this._fitted = true;
    } else {
      this.camera.x += (w - oldW) / 2;
      this.camera.y += (h - oldH) / 2;
    }
  }
  fit() {
    const nodes = (this.engine.state.nodes || []).filter((n) =>
      this._nodeVisible(n),
    );
    if (!nodes.length) {
      this.camera = {
        x: this.width / 2 - 110,
        y: this.height / 2 - 80,
        zoom: 1,
      };
      return;
    }
    let x = Infinity,
      y = Infinity,
      r = -Infinity,
      b = -Infinity;
    for (const n of nodes) {
      const q = this.nodeBounds(n);
      x = Math.min(x, q.x);
      y = Math.min(y, q.y);
      r = Math.max(r, q.x + q.w);
      b = Math.max(b, q.y + q.h);
    }
    const vw = Math.max(180, this.width - this._occlusion.right),
      vh = Math.max(160, this.height - this._occlusion.bottom);
    const padX = vw < 600 ? 32 : 60,
      padY = vh < 400 ? 16 : 40;
    const zoom = clamp(
      Math.min((vw - padX * 2) / (r - x + 50), (vh - padY * 2) / (b - y + 40)),
      0.24,
      1.15,
    );
    this.camera = {
      x: vw / 2 - ((x + r) / 2) * zoom,
      y: vh / 2 - ((y + b) / 2) * zoom,
      zoom,
    };
  }
  focus(id) {
    const n = this.engine.state.nodes.find((n) => n.id === id);
    if (!n) return;
    const b = this.nodeBounds(n),
      vw = this.width - this._occlusion.right,
      vh = this.height - this._occlusion.bottom;
    const zoom = vw < 500 ? 1.12 : 1.25;
    this.camera = {
      x: vw / 2 - (b.x + b.w / 2) * zoom,
      y: vh * 0.45 - (b.y + b.h / 2) * zoom,
      zoom,
    };
  }
  setOcclusion({ right = 0, bottom = 0 } = {}) {
    const previous = this._occlusion;
    this._occlusion = {
      right: clamp(right, 0, Math.max(0, this.width - 180)),
      bottom: clamp(bottom, 0, Math.max(0, this.height - 160)),
    };
    this.camera.x += (previous.right - this._occlusion.right) / 2;
    this.camera.y += (previous.bottom - this._occlusion.bottom) / 2;
  }
  zoomBy(
    factor,
    center = {
      x: (this.width - this._occlusion.right) / 2,
      y: (this.height - this._occlusion.bottom) / 2,
    },
  ) {
    const before = this.screenToWorld(center);
    this.camera.zoom = clamp(this.camera.zoom * factor, 0.24, 2.4);
    this.camera.x = center.x - before.x * this.camera.zoom;
    this.camera.y = center.y - before.y * this.camera.zoom;
  }
  setLayer(layer) {
    if (!["data", "power", "cooling"].includes(layer)) return;
    this.layer = layer;
    this.pendingPort = null;
    this._packets.length = 0;
    this._emission.clear();
    this._paths.clear();
  }
  setZone(zone) {
    this.zone = zone === "all" ? "all" : zoneKey(zone);
    this.pendingPort = null;
    this.fit();
  }
  burst(id, color = CYAN) {
    const n = this.engine.state.nodes.find((n) => n.id === id);
    let p = n
      ? this.nodeBounds(n)
      : this.screenToWorld({ x: this.width / 2, y: this.height / 2 });
    this._bursts.push({
      x: p.x + (n ? NODE_W / 2 : 0),
      y: p.y + (n ? NODE_H / 2 : 0),
      color,
      age: 0,
    });
    if (this._bursts.length > 16) this._bursts.shift();
  }
  _select(value) {
    this.selection = value;
    this.callbacks.onSelect?.(value);
  }
  _notice(msg) {
    this.callbacks.onNotice?.(msg);
  }
  _hit(p) {
    const nodes = this.engine.state.nodes.filter((n) => this._nodeVisible(n));
    let nearest = null,
      best = Infinity;
    // A 44×44 CSS-pixel target, independent of the world zoom.
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      for (const side of ["out", "in"]) {
        if (!this._hasPort(n, side)) continue;
        const q = this.worldToScreen(this.portPosition(n, side));
        if (Math.abs(p.x - q.x) <= 22 && Math.abs(p.y - q.y) <= 22) {
          const d = distance(p, q);
          if (d < best) {
            nearest = { kind: "port", id: n.id, side };
            best = d;
          }
        }
      }
    }
    if (nearest) return nearest;
    const q = this.screenToWorld(p);
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i],
        b = this.nodeBounds(n);
      if (q.x >= b.x && q.x <= b.x + b.w && q.y >= b.y && q.y <= b.y + b.h)
        return { kind: "node", id: n.id };
    }
    let edge = null,
      min = 17 / this.camera.zoom;
    for (const e of this.engine.state.edges) {
      if ((e.kind || "data") !== this.layer) continue;
      const path = this._getPath(e);
      if (!path) continue;
      for (let j = 1; j < path.samples.length; j++) {
        const a = path.samples[j - 1],
          b = path.samples[j],
          dx = b.x - a.x,
          dy = b.y - a.y,
          t = clamp(
            ((q.x - a.x) * dx + (q.y - a.y) * dy) / (dx * dx + dy * dy || 1),
            0,
            1,
          );
        const d = Math.hypot(q.x - a.x - t * dx, q.y - a.y - t * dy);
        if (d < min) {
          min = d;
          edge = { kind: "edge", id: e.id };
        }
      }
    }
    return edge;
  }
  _down(e) {
    if (e.button !== 0 && e.pointerType !== "touch") return;
    e.preventDefault();
    this.canvas.focus({ preventScroll: true });
    const p = this._coords(e);
    this._pointers.set(e.pointerId, p);
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {}
    this._clearLong();
    if (this._pointers.size === 2) {
      const [a, b] = [...this._pointers.values()],
        mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      this._gesture = {
        mode: "pinch",
        distance: Math.max(1, distance(a, b)),
        zoom: this.camera.zoom,
        anchor: this.screenToWorld(mid),
      };
      this.pendingPort = null;
      return;
    }
    if (this._pointers.size > 2) return;
    const now = performance.now();
    let hit = this._hit(p);
    // Opening the inspector can recenter the view after the first tap. A second
    // tap in the same screen position still focuses that originally tapped node.
    if (
      this._lastTap &&
      now - this._lastTap.time < 340 &&
      distance(p, this._lastTap.p) < 28 &&
      this.engine.state.nodes.some((n) => n.id === this._lastTap.id)
    )
      hit = { kind: "node", id: this._lastTap.id };
    this._gesture = {
      mode:
        hit?.kind === "port" ? "wire" : hit?.kind === "node" ? "node" : "pan",
      start: p,
      last: p,
      hit,
      started: now,
      moved: false,
      from: hit?.side === "out" ? hit.id : null,
      camera: { ...this.camera },
    };
    if (hit?.kind === "node") {
      const n = this.engine.state.nodes.find((n) => n.id === hit.id);
      this._gesture.node = { x: n.x, y: n.y };
    }
    if (hit?.kind === "port" && hit.side === "out") {
      this.pendingPort = hit.id;
      this._wirePointer = p;
      this.canvas.style.cursor = "crosshair";
      this._notice("Sortie sélectionnée · touchez une entrée pour relier.");
    }
    if (hit?.kind === "edge") {
      this._longPress = setTimeout(() => {
        if (!this._gesture?.moved && this._pointers.size === 1) {
          this.callbacks.onDeleteEdge?.(hit.id);
          this._gesture.long = true;
          this._notice("Retrait du câble demandé.");
        }
      }, 650);
    }
  }
  _move(e) {
    const p = this._coords(e);
    this._hover = p;
    if (!this._pointers.has(e.pointerId)) {
      this._wirePointer = p;
      return;
    }
    e.preventDefault();
    this._pointers.set(e.pointerId, p);
    const g = this._gesture;
    if (!g) return;
    if (this._pointers.size >= 2) {
      if (g.mode !== "pinch") return;
      const [a, b] = [...this._pointers.values()],
        mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      this.camera.zoom = clamp(
        (g.zoom * distance(a, b)) / g.distance,
        0.24,
        2.4,
      );
      this.camera.x = mid.x - g.anchor.x * this.camera.zoom;
      this.camera.y = mid.y - g.anchor.y * this.camera.zoom;
      return;
    }
    if (distance(p, g.start) > 7) {
      g.moved = true;
      this._clearLong();
    }
    if (g.mode === "wire") {
      this._wirePointer = p;
      return;
    }
    if (g.mode === "node" && g.moved) {
      const n = this.engine.state.nodes.find((n) => n.id === g.hit.id);
      if (n) {
        // The visual drag is temporary; occupancy and bounds are checked on release.
        const stage = STAGES[this.engine.state.stage - 1],
          grid = val(stage?.grid, 32);
        this._dragPreview = {
          id: n.id,
          x: clamp(
            g.node.x + (p.x - g.start.x) / (this.camera.zoom * CELL_W),
            0,
            grid - 1,
          ),
          y: clamp(
            g.node.y + (p.y - g.start.y) / (this.camera.zoom * CELL_H),
            0,
            grid - 1,
          ),
        };
      }
      this.canvas.style.cursor = "grabbing";
      return;
    }
    if (g.mode === "pan" && g.moved) {
      this.camera.x = g.camera.x + p.x - g.start.x;
      this.camera.y = g.camera.y + p.y - g.start.y;
      this.canvas.style.cursor = "grabbing";
    }
    g.last = p;
  }
  _up(e) {
    if (!this._pointers.has(e.pointerId)) return;
    e.preventDefault();
    const p = this._coords(e),
      g = this._gesture;
    this._pointers.delete(e.pointerId);
    this._clearLong();
    if (g?.mode === "pinch") {
      if (this._pointers.size === 1) {
        const [id, q] = [...this._pointers.entries()][0];
        this._gesture = {
          mode: "pan",
          start: q,
          last: q,
          moved: true,
          camera: { ...this.camera },
          started: performance.now(),
        };
      } else this._gesture = null;
      return;
    }
    if (!g || this._pointers.size) return;
    if (g.mode === "node" && g.moved && this._dragPreview) {
      const d = this._dragPreview;
      this.callbacks.onMove?.(d.id, Math.round(d.x), Math.round(d.y));
      this._dragPreview = null;
      this._paths.clear();
    } else if (!g.long) {
      const hit = !g.moved && g.hit?.kind === "node" ? g.hit : this._hit(p);
      if (
        g.mode === "wire" ||
        (!g.moved && this.pendingPort && hit?.kind === "port")
      ) {
        if (
          hit?.kind === "port" &&
          hit.side === "in" &&
          this.pendingPort &&
          hit.id !== this.pendingPort
        ) {
          const from = this.pendingPort;
          this.pendingPort = null;
          this.callbacks.onConnect?.(from, hit.id);
          this.burst(hit.id, CYAN);
        } else if (hit?.kind === "port" && hit.side === "out")
          this.pendingPort = hit.id;
      } else if (!g.moved) {
        if (hit?.kind === "node") {
          const now = performance.now();
          if (this._lastTap?.id === hit.id && now - this._lastTap.time < 340) {
            this.focus(hit.id);
            this._lastTap = null;
          } else {
            this._select(hit);
            this._lastTap = { id: hit.id, time: now, p };
          }
        } else if (hit?.kind === "edge") this._select(hit);
        else {
          this.pendingPort = null;
          this._select(null);
        }
      }
    }
    this._gesture = null;
    this.canvas.style.cursor = this.pendingPort ? "crosshair" : "grab";
    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch {}
  }
  _cancel(e) {
    this._pointers.delete(e.pointerId);
    this._clearLong();
    this._gesture = null;
    this._dragPreview = null;
    this.canvas.style.cursor = "grab";
  }
  _clearLong() {
    if (this._longPress) {
      clearTimeout(this._longPress);
      this._longPress = null;
    }
  }
  _wheel(e) {
    e.preventDefault();
    this.zoomBy(
      Math.exp(-clamp(e.deltaY, -160, 160) * 0.0017),
      this._coords(e),
    );
  }
  _key(e) {
    if (e.key === "Escape") {
      this.pendingPort = null;
      this._select(null);
    }
    if (e.key === "Delete" && this.selection?.kind === "edge") {
      this.callbacks.onDeleteEdge?.(this.selection.id);
      this._select(null);
    }
    if (e.key === "0") {
      this.fit();
      e.preventDefault();
    }
    if (e.key === "+" || e.key === "=") {
      this.zoomBy(1.2);
      e.preventDefault();
    }
    if (e.key === "-") {
      this.zoomBy(1 / 1.2);
      e.preventDefault();
    }
  }
  _displayNode(n) {
    return this._dragPreview?.id === n.id
      ? { ...n, x: this._dragPreview.x, y: this._dragPreview.y }
      : n;
  }
  _getPath(e) {
    const from =
        this._nodeMap.get(e.from) ||
        this.engine.state.nodes.find((n) => n.id === e.from),
      to =
        this._nodeMap.get(e.to) ||
        this.engine.state.nodes.find((n) => n.id === e.to);
    if (!from || !to || (!this._nodeVisible(from) && !this._nodeVisible(to)))
      return null;
    const a = this.portPosition(this._displayNode(from), "out"),
      d = this.portPosition(this._displayNode(to), "in");
    const key = `${a.x},${a.y},${d.x},${d.y}`;
    let path = this._paths.get(e.id);
    if (path?.key === key) return path;
    const dx = d.x - a.x,
      reach =
        dx > 0
          ? Math.max(36, Math.min(170, dx * 0.5))
          : Math.max(90, Math.min(280, Math.abs(dx) * 0.48));
    const b = { x: a.x + reach, y: a.y },
      c = { x: d.x - reach, y: d.y };
    const samples = [{ ...a, length: 0 }];
    let length = 0,
      prev = a;
    for (let i = 1; i <= 36; i++) {
      const p = bezier(a, b, c, d, i / 36);
      length += distance(p, prev);
      samples.push({ ...p, length });
      prev = p;
    }
    path = {
      key,
      a,
      b,
      c,
      d,
      length: Math.max(1, length),
      samples,
      bounds: {
        x: Math.min(a.x, b.x, c.x, d.x),
        y: Math.min(a.y, b.y, c.y, d.y),
        w: Math.max(a.x, b.x, c.x, d.x) - Math.min(a.x, b.x, c.x, d.x),
        h: Math.max(a.y, b.y, c.y, d.y) - Math.min(a.y, b.y, c.y, d.y),
      },
    };
    this._paths.set(e.id, path);
    return path;
  }
  _trace(path) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(path.a.x, path.a.y);
    c.bezierCurveTo(path.b.x, path.b.y, path.c.x, path.c.y, path.d.x, path.d.y);
  }
  _inView(b, pad = 0) {
    const a = this.worldToScreen({ x: b.x - pad, y: b.y - pad }),
      d = this.worldToScreen({ x: b.x + b.w + pad, y: b.y + b.h + pad });
    return d.x >= 0 && a.x <= this.width && d.y >= 0 && a.y <= this.height;
  }
  _pathInView(p) {
    return this._inView(p.bounds, 15);
  }
  draw(timestamp) {
    if (this._destroyed) return;
    const start = performance.now(),
      dt = this._lastFrame
        ? Math.min(0.1, (timestamp - this._lastFrame) / 1000)
        : 0;
    if (this._lastFrame && timestamp > this._lastFrame) {
      this._fpsSamples.push(timestamp - this._lastFrame);
      if (this._fpsSamples.length > 180) this._fpsSamples.shift();
    }
    this._lastFrame = timestamp;
    this._frameCount++;
    const c = this.ctx,
      z = this.camera.zoom,
      t = timestamp / 1000,
      settings = this.engine.state.settings || {};
    if ((settings.quality || "auto") !== this._quality) this.resize();
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.fillStyle = INK;
    c.fillRect(0, 0, this.width, this.height);
    this._nodeMap.clear();
    for (const n of this.engine.state.nodes) this._nodeMap.set(n.id, n);
    this._background(t);
    c.save();
    c.translate(this.camera.x, this.camera.y);
    c.scale(z, z);
    this._grid(t);
    const edges = this.engine.state.edges || [],
      edgeIds = new Set(edges.map((e) => e.id));
    for (const id of this._paths.keys())
      if (!edgeIds.has(id)) this._paths.delete(id);
    for (const id of this._emission.keys())
      if (!edgeIds.has(id)) this._emission.delete(id);
    const visibleEdges = [];
    for (const e of edges) {
      if ((e.kind || "data") !== this.layer) continue;
      const path = this._getPath(e);
      if (!path || !this._pathInView(path)) continue;
      visibleEdges.push([e, path]);
      this._drawEdge(e, path, t);
    }
    this._drawPackets(
      visibleEdges,
      edgeIds,
      this.callbacks.isPaused?.() ? 0 : dt,
      t,
    );
    if (this.pendingPort) this._drawPending(t);
    this._visibleNodes.length = 0;
    for (const original of this.engine.state.nodes) {
      if (!this._nodeVisible(original)) continue;
      const n = this._displayNode(original),
        b = this.nodeBounds(n);
      if (!this._inView(b, 30)) continue;
      this._visibleNodes.push(n);
      this._drawNode(n, b, t);
    }
    this._drawBursts(dt);
    c.restore();
    if (this.callbacks.showOverlay) this._overlay(t);
    this._drawDurations.push(performance.now() - start);
    if (this._drawDurations.length > 180) this._drawDurations.shift();
    // Adaptive raster resolution preserves legible CSS geometry and touch targets.
    if (
      this._frameCount % 240 === 0 &&
      this._quality === "auto" &&
      this._drawDurations.length > 60
    ) {
      const mean =
        this._drawDurations.reduce((a, b) => a + b, 0) /
        this._drawDurations.length;
      if (mean > 13 && this._resolutionScale > 0.65) {
        this._resolutionScale = Math.max(0.65, this._resolutionScale - 0.15);
        this.resize();
      }
    }
  }
  _background(t) {
    const c = this.ctx,
      w = this.width,
      h = this.height;
    const gradient = c.createRadialGradient(
      w * 0.57,
      h * 0.45,
      0,
      w * 0.5,
      h * 0.5,
      Math.max(w, h) * 0.7,
    );
    gradient.addColorStop(0, "#101B23");
    gradient.addColorStop(0.64, "#0C121B");
    gradient.addColorStop(1, INK);
    c.fillStyle = gradient;
    c.fillRect(0, 0, w, h);
    // Fixed-screen micro-etching is bounded independently of grid size.
    c.strokeStyle = "#19242D";
    c.lineWidth = 0.5;
    c.globalAlpha = 0.3;
    for (let y = 13; y < h; y += 32) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w, y);
      c.stroke();
    }
    c.globalAlpha = 1;
  }
  _grid(t) {
    const c = this.ctx,
      z = this.camera.zoom,
      stage = STAGES[this.engine.state.stage - 1],
      grid = val(stage?.grid, 32);
    this._fractalRegions = 0;
    if (this.engine.state.stage === 9) this._fractalSubstrate(grid);
    const a = this.screenToWorld({ x: 0, y: 0 }),
      b = this.screenToWorld({ x: this.width, y: this.height });
    const x0 = Math.max(0, Math.floor(a.x / CELL_W)),
      x1 = Math.min(grid, Math.ceil(b.x / CELL_W));
    const y0 = Math.max(0, Math.floor(a.y / CELL_H)),
      y1 = Math.min(grid, Math.ceil(b.y / CELL_H));
    c.lineWidth = 1 / z;
    c.strokeStyle = "#203039";
    c.globalAlpha = 0.64;
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++) {
        const xx = x * CELL_W,
          yy = y * CELL_H;
        c.beginPath();
        c.moveTo(xx - 4 / z, yy);
        c.lineTo(xx + 4 / z, yy);
        c.moveTo(xx, yy - 4 / z);
        c.lineTo(xx, yy + 4 / z);
        c.stroke();
      }
    c.globalAlpha = 0.32;
    c.strokeStyle = "#24313B";
    c.setLineDash([2 / z, 9 / z]);
    c.strokeRect(0, 0, grid * CELL_W, grid * CELL_H);
    c.setLineDash([]);
    c.globalAlpha = 1;
    if (z > 0.55) {
      c.fillStyle = "#354650";
      c.font = "9px monospace";
      for (let x = x0; x < x1; x++)
        for (let y = y0; y < y1; y++)
          c.fillText(
            `${String.fromCharCode(65 + (x % 26))}${String(y + 1).padStart(2, "0")}`,
            x * CELL_W + 8,
            y * CELL_H + 15,
          );
    }
    if (this.engine.state.stage === 8) {
      const s = (grid * CELL_W) / 2,
        h = (grid * CELL_H) / 2;
      c.strokeStyle = "#36515E";
      c.globalAlpha = 0.35;
      c.setLineDash([12, 10]);
      c.beginPath();
      c.moveTo(s, 0);
      c.lineTo(s, grid * CELL_H);
      c.moveTo(0, h);
      c.lineTo(grid * CELL_W, h);
      c.stroke();
      c.setLineDash([]);
      c.globalAlpha = 1;
      c.font = "12px monospace";
      c.fillStyle = "#4A636B";
      [
        ["EUROPE · LOGIQUE", 18, 38],
        ["AMÉRIQUE · MÉMOIRE", s + 18, 38],
        ["ASIE · PERCEPTION", 18, h + 38],
        ["ORBITE · CALCUL", s + 18, h + 38],
      ].forEach(([v, x, y]) => c.fillText(v, x, y));
    }
  }
  _fractalSubstrate(grid) {
    // Three self-similar levels in at most 16 roots: 16 × (1 + 4 + 16)
    // regions maximum, culled before drawing. Pure substrate decoration; no
    // changes to simulation coordinates, ports or cable hit testing.
    const c = this.ctx,
      z = this.camera.zoom,
      roots = Math.min(4, Math.ceil(grid / 8));
    const width = (grid * CELL_W) / roots,
      height = (grid * CELL_H) / roots;
    const visit = (x, y, w, h, depth) => {
      if (!this._inView({ x, y, w, h })) return;
      this._fractalRegions++;
      const inset = Math.min(w, h) * 0.075,
        corner = Math.min(w, h) * 0.08;
      c.strokeStyle = "#60A99F";
      c.globalAlpha = 0.1 + depth * 0.025;
      c.lineWidth = 0.65 / z;
      panelPath(c, x + inset, y + inset, w - inset * 2, h - inset * 2, corner);
      c.stroke();
      // Forks repeat at each scale, creating a recursive synaptic fabric.
      const cx = x + w / 2,
        cy = y + h / 2,
        arm = Math.min(w, h) * 0.1;
      c.beginPath();
      c.moveTo(cx - arm, cy);
      c.lineTo(cx, cy - arm);
      c.lineTo(cx + arm, cy);
      c.lineTo(cx, cy + arm);
      c.closePath();
      for (const dx of [-1, 1])
        for (const dy of [-1, 1]) {
          c.moveTo(cx + dx * arm * 0.5, cy + dy * arm * 0.5);
          c.lineTo(cx + dx * w * 0.25, cy + dy * h * 0.25);
        }
      c.stroke();
      if (depth < 2)
        for (let row = 0; row < 2; row++)
          for (let col = 0; col < 2; col++)
            visit(
              x + (col * w) / 2,
              y + (row * h) / 2,
              w / 2,
              h / 2,
              depth + 1,
            );
    };
    for (let y = 0; y < roots; y++)
      for (let x = 0; x < roots; x++)
        visit(x * width, y * height, width, height, 0);
    c.globalAlpha = 1;
  }
  _drawEdge(e, p, t) {
    const c = this.ctx,
      z = this.camera.zoom,
      u = clamp(val(e.load), 0, 1.1),
      selected = this.selection?.kind === "edge" && this.selection.id === e.id;
    const kind = e.kind || "data",
      color =
        kind === "power"
          ? AMBER
          : kind === "cooling"
            ? "#81BFEF"
            : loadColor(u),
      active = val(e.rate) > 0;
    if (selected) {
      this._trace(p);
      c.strokeStyle = "#D7EBDF";
      c.globalAlpha = 0.18;
      c.lineWidth = 14 / z;
      c.stroke();
      c.globalAlpha = 1;
    }
    this._trace(p);
    c.strokeStyle = "#080C13";
    c.lineWidth = (active ? 6 : 4) / z;
    c.stroke();
    this._trace(p);
    c.strokeStyle = active ? color : "#35434D";
    c.lineWidth = (active ? 1.5 + u * 1.7 : 1.2) / z;
    c.globalAlpha = active
      ? u >= 0.999
        ? 0.56 + 0.3 * Math.sin(t * 7)
        : 0.6
      : 0.65;
    if (kind === "cooling") c.setLineDash([9 / z, 4 / z]);
    c.stroke();
    c.setLineDash([]);
    c.globalAlpha = 1;
    const m = pathPoint(p, 0.52);
    if (z > 0.65 && (selected || u >= 0.95)) {
      const label = u >= 0.999 ? "SATURÉ" : `${Math.round(u * 100)} %`;
      c.font = "9px monospace";
      const width = c.measureText(label).width + 16;
      c.fillStyle = "#0D1720";
      panelPath(c, m.x - width / 2, m.y - 23, width, 19, 3);
      c.fill();
      c.strokeStyle = color;
      c.lineWidth = 0.5;
      c.stroke();
      c.fillStyle = color;
      c.textAlign = "center";
      c.fillText(label, m.x, m.y - 10);
      c.textAlign = "left";
    }
    // Direction notch remains visible while a cable is idle.
    if (p.length > 60) {
      c.save();
      c.translate(m.x, m.y);
      c.rotate(m.angle);
      c.beginPath();
      c.moveTo(-3, -3);
      c.lineTo(2, 0);
      c.lineTo(-3, 3);
      c.strokeStyle = active ? color : "#61737B";
      c.lineWidth = 1 / z;
      c.stroke();
      c.restore();
    }
  }
  _flowStyle(e) {
    let type = (e.flowType || "text").toLowerCase();
    if (e.corruption > 0 || /corrupt|virus/.test(type)) type = "corrupt";
    if (e.kind && e.kind !== "data") type = e.kind;
    if (type.includes("compress")) type = "compressed";
    if (type.includes("param") || type === "tensor") type = "parameters";
    if (type.includes("frag")) type = "fragment";
    if (type === "thought") type = "concept";
    return { type, style: FLOW[type] || FLOW.text };
  }
  _drawPackets(edges, edgeIds, dt, t) {
    const c = this.ctx,
      z = this.camera.zoom,
      cap = this._quality === "low" ? 400 : MAX_PACKETS;
    if (!this._reducedMotion) {
      for (const [e, path] of edges) {
        if (val(e.rate) <= 0) continue;
        const { type, style } = this._flowStyle(e),
          rate = Math.min(
            2 + Math.sqrt(clamp(val(e.load), 0, 1)) * 14,
            style[2] / (style[1] * 8),
          );
        let credit = (this._emission.get(e.id) || 0) + dt * rate;
        while (credit >= 1 && this._packets.length < cap) {
          credit--;
          const p = this._packetPool.pop() || {};
          Object.assign(p, {
            edgeId: e.id,
            progress: 0,
            speed: style[2] / Math.max(100, path.length),
            color: style[0],
            size: style[1],
            type,
          });
          this._packets.push(p);
        }
        this._emission.set(e.id, Math.min(credit, 1));
      }
    }
    let write = 0;
    for (let i = 0; i < this._packets.length; i++) {
      const p = this._packets[i],
        path = this._paths.get(p.edgeId);
      p.progress += dt * p.speed;
      if (p.progress > 1 || !path || !edgeIds.has(p.edgeId)) {
        if (this._packetPool.length < MAX_PACKETS) this._packetPool.push(p);
        continue;
      }
      this._packets[write++] = p;
      if (!this._pathInView(path)) continue;
      const q = pathPoint(path, p.progress),
        size = p.size / Math.max(0.8, z);
      c.save();
      c.translate(q.x, q.y);
      c.rotate(q.angle);
      c.fillStyle = p.color;
      if (p.type === "corrupt") {
        c.globalAlpha = 0.65 + 0.35 * Math.sin(t * 14);
        c.fillRect(-size, -size, size * 2, size * 2);
        c.strokeStyle = "#FFCED2";
        c.lineWidth = 1 / z;
        c.beginPath();
        c.moveTo(-size, -size);
        c.lineTo(size, size);
        c.stroke();
      } else if (
        p.type === "dataset" ||
        p.type === "model" ||
        p.type === "concept" ||
        p.type === "parameters"
      ) {
        c.beginPath();
        c.moveTo(size + 1, 0);
        c.lineTo(0, -size);
        c.lineTo(-size - 1, 0);
        c.lineTo(0, size);
        c.closePath();
        c.fill();
        if (p.type === "concept") {
          c.globalAlpha = 0.22;
          c.beginPath();
          c.arc(0, 0, size * 2.5, 0, TAU);
          c.fill();
        }
      } else if (p.type === "fragment") {
        c.fillRect(-size, -size / 2, size * 2, size);
        c.fillRect(-size * 2.7, -size / 2, size * 0.7, size);
      } else if (p.type === "power") {
        c.beginPath();
        c.moveTo(-size, -size);
        c.lineTo(size, 0);
        c.lineTo(-size, size);
        c.closePath();
        c.fill();
      } else {
        c.fillRect(-size * 1.7, -size * 0.65, size * 3.4, size * 1.3);
      }
      c.globalAlpha = 0.13;
      c.fillRect(-size * 4.4, -size * 0.5, size * 3, size);
      c.restore();
    }
    this._packets.length = write;
    this.packetCount = write;
  }
  _drawPending(t) {
    const n = this._nodeMap.get(this.pendingPort);
    if (!n) return;
    const a = this.portPosition(this._displayNode(n), "out");
    let d = this._wirePointer
      ? this.screenToWorld(this._wirePointer)
      : { x: a.x + 60, y: a.y };
    if (distance(a, d) < 10) d = { x: a.x + 80, y: a.y };
    const c = this.ctx;
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.bezierCurveTo(a.x + 70, a.y, d.x - 40, d.y, d.x, d.y);
    c.strokeStyle = CYAN;
    c.lineWidth = 1.5 / this.camera.zoom;
    c.setLineDash([5, 5]);
    c.lineDashOffset = -t * 16;
    c.stroke();
    c.setLineDash([]);
    c.lineDashOffset = 0;
  }
  _drawNode(n, b, t) {
    if (this.camera.zoom < 0.6) {
      this._drawCompactNode(n, b, t);
      return;
    }
    const c = this.ctx,
      z = this.camera.zoom,
      def = NODE_TYPES[n.type] || {},
      accent = def.color || CYAN;
    const selected =
        this.selection?.kind === "node" && this.selection.id === n.id,
      hot = val(n.temp) > 65,
      quarantine = val(n.quarantine) > 0;
    const u = clamp(val(n.utilization), 0, 1),
      color = quarantine ? RED : hot ? AMBER : accent;
    const isUtility = [
        "transformer",
        "chiller",
        "smr",
        "agent",
        "anchor",
      ].includes(n.type),
      dim = this.layer !== "data" && !isUtility;
    c.save();
    c.globalAlpha = dim ? 0.78 : 1;
    if (selected) {
      panelPath(c, b.x - 5, b.y - 5, b.w + 10, b.h + 10, 12);
      c.fillStyle = "#5BDAC90B";
      c.fill();
      c.strokeStyle = "#92E6D0";
      c.lineWidth = 1 / z;
      c.stroke();
    }
    panelPath(c, b.x, b.y + 4, b.w, b.h, 10);
    c.fillStyle = "#03070B";
    c.fill();
    panelPath(c, b.x, b.y, b.w, b.h, 10);
    const g = c.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
    g.addColorStop(0, selected ? "#203139" : "#19262F");
    g.addColorStop(1, "#101922");
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = quarantine ? RED : selected ? "#77CABD" : "#3B4A51";
    c.lineWidth = 1 / z;
    c.stroke();
    // Chamfered copper trace and tiny etched fixation pads.
    c.strokeStyle = color;
    c.globalAlpha = 0.8;
    c.lineWidth = 1.8 / z;
    c.beginPath();
    c.moveTo(b.x + 12, b.y);
    c.lineTo(b.x + 51, b.y);
    c.stroke();
    c.globalAlpha = dim ? 0.78 : 1;
    c.fillStyle = "#637077";
    c.fillRect(b.x + 9, b.y + 9, 2, 2);
    c.fillRect(b.x + b.w - 11, b.y + b.h - 11, 2, 2);
    c.fillStyle = "#96A7AE";
    c.font = "8px monospace";
    const serial = String(n.id)
      .replace(/[^0-9]/g, "")
      .slice(-3)
      .padStart(3, "0");
    c.fillText(
      `${def.kind === "source" ? "SRC" : def.kind === "sink" ? "OUT" : isUtility ? "AUX" : "PRC"} / ${serial}`,
      b.x + 13,
      b.y + 20,
    );
    if (n.ai) {
      c.fillStyle = "#C8ACF2";
      c.fillText("IA", b.x + b.w - 25, b.y + 20);
    }
    this._icon(n.type, b.x + 15, b.y + 31, 21, color);
    c.fillStyle = "#DCE9EA";
    c.font = "600 11px monospace";
    let name = def.short || def.name || n.type;
    while (c.measureText(name).width > 116) name = name.slice(0, -2) + "…";
    c.fillText(name, b.x + 43, b.y + 45);
    c.fillStyle = "#78919A";
    c.font = "9px monospace";
    const rate = n.outRate || n.inRate || 0;
    let sub =
      this.layer === "power"
        ? nice(n.power, "kW")
        : this.layer === "cooling"
          ? `${val(n.temp, 20).toFixed(1)} °C`
          : nice(rate, "o/s");
    c.fillText(sub, b.x + 43, b.y + 60);
    const progress = clamp(val(n.progress), 0, 1),
      ringX = b.x + b.w - 28,
      ringY = b.y + 82;
    c.lineWidth = 2.5 / z;
    c.strokeStyle = "#2A3B43";
    c.beginPath();
    c.arc(ringX, ringY, 13, -Math.PI / 2, TAU - Math.PI / 2);
    c.stroke();
    if (progress > 0 || u > 0) {
      c.strokeStyle = color;
      c.beginPath();
      c.arc(
        ringX,
        ringY,
        13,
        -Math.PI / 2,
        -Math.PI / 2 + TAU * (progress || u),
      );
      c.stroke();
    }
    c.textAlign = "center";
    c.fillStyle = loadColor(u);
    c.font = "600 9px monospace";
    c.fillText(`${Math.round(u * 100)}%`, ringX, ringY + 3);
    c.textAlign = "left";
    const status = quarantine
      ? "QUARANTAINE"
      : hot
        ? "CHAUD"
        : n.status || (u > 0 ? "ACTIF" : "ATTENTE");
    c.fillStyle = quarantine ? RED : hot ? AMBER : u > 0 ? CYAN : "#758991";
    c.beginPath();
    c.arc(b.x + 15, b.y + 78, 2, 0, TAU);
    c.fill();
    c.font = "8px monospace";
    c.fillText(
      status.length > 15 ? status.slice(0, 14) + "…" : status,
      b.x + 23,
      b.y + 81,
    );
    c.fillStyle = "#24363E";
    c.fillRect(b.x + 13, b.y + 94, 103, 3);
    const buffer = clamp(
      val(n.buffer) / Math.max(1, val(n.bufferMax, 500)),
      0,
      1,
    );
    c.fillStyle = loadColor(buffer);
    c.fillRect(b.x + 13, b.y + 94, 103 * buffer, 3);
    c.fillStyle = "#5E7881";
    c.font = "7px monospace";
    c.fillText("BUFFER", b.x + 13, b.y + 107);
    if (this.engine.state.stage >= 4) {
      c.fillStyle = hot ? AMBER : "#5E7881";
      c.fillText(`${Math.round(val(n.temp, 20))}°C`, b.x + 81, b.y + 107);
    }
    if (quarantine) {
      c.globalAlpha = 0.05 + 0.07 * Math.sin(t * 8);
      panelPath(c, b.x, b.y, b.w, b.h, 10);
      c.fillStyle = RED;
      c.fill();
      c.globalAlpha = 1;
    }
    if (hot && !this._reducedMotion) {
      c.strokeStyle = "#ECAD6B";
      c.globalAlpha = 0.22;
      for (let j = 0; j < 3; j++) {
        const xx = b.x + 45 + j * 25;
        c.beginPath();
        c.moveTo(xx, b.y - 4);
        c.bezierCurveTo(
          xx + Math.sin(t * 3 + j) * 4,
          b.y - 12,
          xx - 4,
          b.y - 15,
          xx + 3,
          b.y - 23,
        );
        c.stroke();
      }
      c.globalAlpha = 1;
    }
    for (const side of ["in", "out"]) {
      if (!this._hasPort(n, side)) continue;
      const p = this.portPosition(n, side),
        pending = side === "out" && this.pendingPort === n.id;
      if (pending) {
        c.fillStyle = "#75E4D31C";
        c.beginPath();
        c.arc(p.x, p.y, (15 + Math.sin(t * 4) * 3) / Math.max(0.7, z), 0, TAU);
        c.fill();
        c.strokeStyle = CYAN;
        c.lineWidth = 1 / z;
        c.stroke();
      }
      const receiving = side === "in" ? val(n.inRate) > 0 : val(n.outRate) > 0;
      c.fillStyle = "#0A141D";
      c.beginPath();
      c.arc(p.x, p.y, 6, 0, TAU);
      c.fill();
      c.strokeStyle = receiving ? color : "#788C94";
      c.lineWidth = 1.5 / z;
      c.stroke();
      c.fillStyle = receiving ? color : "#57707A";
      c.fillRect(p.x - 2, p.y - 2, 4, 4);
      if (receiving && !this._reducedMotion) {
        c.globalAlpha = 0.1 + 0.12 * Math.sin(t * 8 + (side === "in" ? 0 : 2));
        c.beginPath();
        c.arc(p.x, p.y, 10, 0, TAU);
        c.fill();
        c.globalAlpha = 1;
      }
    }
    c.restore();
  }
  _drawCompactNode(n, b, t) {
    const c = this.ctx,
      z = this.camera.zoom,
      d = NODE_TYPES[n.type] || {},
      u = clamp(val(n.utilization), 0, 1),
      accent = d.color || CYAN;
    const selected =
        this.selection?.kind === "node" && this.selection.id === n.id,
      quarantine = val(n.quarantine) > 0,
      color = quarantine ? RED : accent;
    panelPath(c, b.x, b.y, b.w, b.h, 10);
    c.fillStyle = selected ? "#20343D" : "#14212A";
    c.fill();
    c.strokeStyle = selected ? CYAN : "#41515A";
    c.lineWidth = 1 / z;
    c.stroke();
    c.fillStyle = color;
    c.fillRect(b.x + 12, b.y + 1, 42, 2 / z);
    c.font = `${8 / z}px monospace`;
    c.fillStyle = "#C3D6D8";
    let name = d.short || d.name || n.type;
    const maxWidth = b.w - 18;
    while (c.measureText(name).width > maxWidth && name.length > 1)
      name = name.slice(0, -2) + "…";
    c.fillText(name, b.x + 9, b.y + 30);
    c.font = `600 ${9 / z}px monospace`;
    c.fillStyle = loadColor(u);
    c.fillText(`${Math.round(u * 100)}%`, b.x + 10, b.y + 77);
    c.fillStyle = quarantine ? RED : u > 0 ? CYAN : "#658089";
    c.beginPath();
    c.arc(b.x + b.w - 20, b.y + 66, 3 / z, 0, TAU);
    c.fill();
    c.fillStyle = "#2D424B";
    c.fillRect(b.x + 10, b.y + b.h - 14, b.w - 20, 3 / z);
    c.fillStyle = loadColor(val(n.buffer) / Math.max(1, val(n.bufferMax, 500)));
    c.fillRect(
      b.x + 10,
      b.y + b.h - 14,
      (b.w - 20) *
        clamp(val(n.buffer) / Math.max(1, val(n.bufferMax, 500)), 0, 1),
      3 / z,
    );
    for (const side of ["in", "out"]) {
      if (!this._hasPort(n, side)) continue;
      const p = this.portPosition(n, side);
      c.fillStyle = this.pendingPort === n.id && side === "out" ? CYAN : color;
      c.beginPath();
      c.arc(p.x, p.y, 3.4 / z, 0, TAU);
      c.fill();
    }
  }
  _icon(type, x, y, s, color) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.scale(s / 24, s / 24);
    c.strokeStyle = color;
    c.fillStyle = color;
    c.lineWidth = 1.35;
    c.lineCap = "square";
    c.lineJoin = "miter";
    const line = (a, b, d, e) => {
      c.beginPath();
      c.moveTo(a, b);
      c.lineTo(d, e);
      c.stroke();
    };
    const rect = (a, b, d, e) => c.strokeRect(a, b, d, e);
    const circle = (a, b, r) => {
      c.beginPath();
      c.arc(a, b, r, 0, TAU);
      c.stroke();
    };
    switch (type) {
      case "generator":
        rect(4, 2, 13, 18);
        line(8, 7, 14, 7);
        line(8, 11, 14, 11);
        line(8, 15, 11, 15);
        line(17, 7, 21, 7);
        line(21, 7, 21, 18);
        break;
      case "founder":
        c.beginPath();
        c.moveTo(12, 1);
        c.lineTo(21, 6);
        c.lineTo(21, 18);
        c.lineTo(12, 23);
        c.lineTo(3, 18);
        c.lineTo(3, 6);
        c.closePath();
        c.stroke();
        rect(8, 8, 8, 8);
        line(12, 3, 12, 8);
        line(12, 16, 12, 21);
        line(5, 8, 8, 10);
        line(19, 8, 16, 10);
        line(5, 16, 8, 14);
        line(19, 16, 16, 14);
        circle(12, 12, 1.4);
        break;
      case "archive":
        rect(3, 6, 18, 15);
        rect(2, 2, 20, 4);
        line(9, 11, 15, 11);
        line(9, 14, 15, 14);
        break;
      case "sensor":
        circle(12, 12, 3);
        c.beginPath();
        c.arc(12, 12, 7, -Math.PI * 0.75, Math.PI * 0.75);
        c.stroke();
        c.beginPath();
        c.arc(12, 12, 11, -Math.PI * 0.75, Math.PI * 0.75);
        c.stroke();
        line(2, 12, 6, 12);
        break;
      case "corrector":
        rect(2, 3, 15, 17);
        line(6, 8, 13, 8);
        c.beginPath();
        c.moveTo(9, 15);
        c.lineTo(13, 19);
        c.lineTo(22, 9);
        c.stroke();
        break;
      case "compressor":
        line(3, 3, 8, 3);
        line(3, 3, 3, 8);
        line(21, 3, 16, 3);
        line(21, 3, 21, 8);
        line(3, 21, 8, 21);
        line(3, 21, 3, 16);
        line(21, 21, 16, 21);
        line(21, 21, 21, 16);
        rect(8, 8, 8, 8);
        line(3, 3, 8, 8);
        line(21, 21, 16, 16);
        break;
      case "modem":
        rect(3, 12, 18, 8);
        line(7, 12, 7, 8);
        line(17, 12, 17, 8);
        c.beginPath();
        c.arc(12, 9, 7, Math.PI * 1.15, Math.PI * 1.85);
        c.stroke();
        c.beginPath();
        c.arc(12, 9, 11, Math.PI * 1.18, Math.PI * 1.82);
        c.stroke();
        line(7, 16, 10, 16);
        break;
      case "lab":
        c.beginPath();
        c.moveTo(8, 2);
        c.lineTo(16, 2);
        c.moveTo(10, 2);
        c.lineTo(10, 10);
        c.lineTo(3, 21);
        c.lineTo(21, 21);
        c.lineTo(14, 10);
        c.lineTo(14, 2);
        c.stroke();
        line(7, 16, 17, 16);
        break;
      case "router":
        rect(8, 8, 8, 8);
        line(12, 1, 12, 8);
        line(1, 12, 8, 12);
        line(16, 12, 23, 12);
        line(12, 16, 12, 23);
        break;
      case "disk":
        c.beginPath();
        c.ellipse(12, 5, 9, 3, 0, 0, TAU);
        c.stroke();
        c.beginPath();
        c.ellipse(12, 19, 9, 3, 0, 0, Math.PI);
        c.stroke();
        line(3, 5, 3, 19);
        line(21, 5, 21, 19);
        c.beginPath();
        c.ellipse(12, 12, 9, 3, 0, 0, Math.PI);
        c.stroke();
        break;
      case "fragmenter":
        rect(2, 7, 6, 10);
        rect(16, 2, 6, 4);
        rect(16, 10, 6, 4);
        rect(16, 18, 6, 4);
        line(8, 12, 12, 12);
        line(12, 4, 12, 20);
        line(12, 4, 16, 4);
        line(12, 12, 16, 12);
        line(12, 20, 16, 20);
        break;
      case "reconstructor":
        rect(16, 7, 6, 10);
        rect(2, 2, 6, 4);
        rect(2, 10, 6, 4);
        rect(2, 18, 6, 4);
        line(12, 12, 16, 12);
        line(12, 4, 12, 20);
        line(8, 4, 12, 4);
        line(8, 12, 12, 12);
        line(8, 20, 12, 20);
        break;
      case "importer":
        rect(3, 3, 18, 18);
        line(8, 12, 22, 12);
        line(8, 12, 12, 8);
        line(8, 12, 12, 16);
        break;
      case "firewall":
      case "antivirus":
      case "integrity":
        c.beginPath();
        c.moveTo(12, 1);
        c.lineTo(21, 5);
        c.lineTo(20, 15);
        c.lineTo(12, 23);
        c.lineTo(4, 15);
        c.lineTo(3, 5);
        c.closePath();
        c.stroke();
        if (type === "firewall") {
          line(7, 8, 17, 8);
          line(7, 12, 17, 12);
          line(11, 8, 11, 12);
        } else if (type === "antivirus") {
          line(12, 7, 12, 17);
          line(7, 12, 17, 12);
        } else {
          c.beginPath();
          c.moveTo(7, 12);
          c.lineTo(11, 16);
          c.lineTo(17, 8);
          c.stroke();
        }
        break;
      case "rack":
        rect(4, 2, 16, 20);
        for (let k = 0; k < 3; k++) {
          line(4, 8 + k * 6, 20, 8 + k * 6);
          c.fillRect(7, 4 + k * 6, 2, 2);
          line(12, 5 + k * 6, 17, 5 + k * 6);
        }
        break;
      case "transformer":
      case "smr":
        c.beginPath();
        c.moveTo(13, 1);
        c.lineTo(5, 13);
        c.lineTo(12, 13);
        c.lineTo(10, 23);
        c.lineTo(20, 10);
        c.lineTo(13, 10);
        c.closePath();
        c.stroke();
        if (type === "smr") circle(12, 12, 11);
        break;
      case "chiller":
        for (let k = 0; k < 3; k++) {
          c.save();
          c.translate(12, 12);
          c.rotate((k * Math.PI) / 3);
          line(0, -11, 0, 11);
          line(0, -6, -4, -9);
          line(0, -6, 4, -9);
          line(0, 6, -4, 9);
          line(0, 6, 4, 9);
          c.restore();
        }
        break;
      case "aggregator":
        rect(3, 3, 6, 6);
        rect(15, 3, 6, 6);
        rect(9, 16, 6, 6);
        line(6, 9, 12, 16);
        line(18, 9, 12, 16);
        break;
      case "gpu":
      case "trainer":
        rect(5, 5, 14, 14);
        rect(9, 9, 6, 6);
        for (let k = 7; k < 20; k += 5) {
          line(k, 1, k, 5);
          line(k, 19, k, 23);
          line(1, k, 5, k);
          line(19, k, 23, k);
        }
        if (type === "trainer") {
          c.beginPath();
          c.moveTo(10, 12);
          c.lineTo(14, 12);
          c.stroke();
        }
        break;
      case "synthetic":
      case "synapse":
        circle(12, 12, 4);
        for (let i = 0; i < 5; i++) {
          const a = (i * TAU) / 5;
          line(
            12 + Math.cos(a) * 4,
            12 + Math.sin(a) * 4,
            12 + Math.cos(a) * 10,
            12 + Math.sin(a) * 10,
          );
          circle(12 + Math.cos(a) * 10, 12 + Math.sin(a) * 10, 1.7);
        }
        break;
      case "agent":
        rect(4, 6, 16, 14);
        line(12, 1, 12, 6);
        circle(12, 2, 1);
        circle(8, 12, 1.5);
        circle(16, 12, 1.5);
        line(9, 17, 15, 17);
        break;
      case "predictor":
        circle(12, 12, 10);
        line(12, 4, 12, 12);
        line(12, 12, 18, 9);
        line(3, 20, 7, 20);
        line(7, 20, 7, 16);
        break;
      case "semantic":
        for (let k = 0; k < 4; k++) {
          const a = (k * TAU) / 4 + Math.PI / 4;
          circle(12 + Math.cos(a) * 9, 12 + Math.sin(a) * 9, 3);
          line(12 + Math.cos(a) * 6, 12 + Math.sin(a) * 6, 12, 12);
        }
        circle(12, 12, 3);
        break;
      case "reflection":
        c.beginPath();
        c.moveTo(12, 1);
        c.lineTo(23, 12);
        c.lineTo(12, 23);
        c.lineTo(1, 12);
        c.closePath();
        c.stroke();
        circle(12, 12, 5);
        circle(12, 12, 1.5);
        break;
      case "anchor":
        line(12, 3, 12, 21);
        circle(12, 3, 2);
        line(6, 9, 18, 9);
        c.beginPath();
        c.moveTo(3, 14);
        c.quadraticCurveTo(3, 22, 12, 21);
        c.quadraticCurveTo(21, 22, 21, 14);
        c.stroke();
        break;
      default:
        rect(4, 4, 16, 16);
        circle(12, 12, 4);
        line(1, 12, 4, 12);
        line(20, 12, 23, 12);
    }
    c.restore();
  }
  _drawBursts(dt) {
    const c = this.ctx;
    let write = 0;
    for (const b of this._bursts) {
      b.age += dt;
      if (b.age > 1.1) continue;
      this._bursts[write++] = b;
      const p = b.age / 1.1;
      c.strokeStyle = b.color;
      c.lineWidth = 1 / this.camera.zoom;
      c.globalAlpha = (1 - p) * 0.6;
      for (let k = 0; k < 12; k++) {
        const a = (k * TAU) / 12,
          r = 15 + p * 70;
        c.beginPath();
        c.moveTo(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r);
        c.lineTo(
          b.x + Math.cos(a) * (r + 5 * (1 - p)),
          b.y + Math.sin(a) * (r + 5 * (1 - p)),
        );
        c.stroke();
      }
    }
    this._bursts.length = write;
    c.globalAlpha = 1;
  }
  _overlay(t) {
    const c = this.ctx,
      w = this.width,
      h = this.height;
    c.font = "9px monospace";
    c.fillStyle = "#516972";
    if (w > 640) {
      c.fillText("SUBSTRAT / SILICIUM", 24, 26);
      c.fillText(
        `${this.layer === "data" ? "PLAN 01 · DONNÉES" : this.layer === "power" ? "PLAN 02 · ÉNERGIE" : "PLAN 03 · FLUIDES"}`,
        24,
        42,
      );
    }
    c.textAlign = "right";
    c.fillText(`${Math.round(this.camera.zoom * 100)}%`, w - 18, h - 18);
    c.textAlign = "left";
    const nodes = this.engine.state.nodes.length,
      stage = STAGES[this.engine.state.stage - 1];
    c.fillText(
      `${nodes} MODULE${nodes > 1 ? "S" : ""}  /  ${val(stage?.grid, 32)} × ${val(stage?.grid, 32)}`,
      18,
      h - 18,
    );
    if (this.pendingPort) {
      const label = "SORTIE VERROUILLÉE · CHOISIR UNE ENTRÉE",
        boxw = Math.min(w - 28, 360);
      c.fillStyle = "#11262B";
      panelPath(c, w / 2 - boxw / 2, 14, boxw, 30, 5);
      c.fill();
      c.strokeStyle = "#326359";
      c.lineWidth = 1;
      c.stroke();
      c.fillStyle = CYAN;
      c.textAlign = "center";
      c.font = `${w < 380 ? 8 : 9}px monospace`;
      c.fillText(label, w / 2, 33);
      c.textAlign = "left";
    }
  }
  getDiagnostics() {
    const frames = [...this._fpsSamples].sort((a, b) => a - b),
      draw = [...this._drawDurations].sort((a, b) => a - b);
    return {
      width: this.width,
      height: this.height,
      dpr: this.dpr,
      zoom: this.camera.zoom,
      visibleNodes: this._visibleNodes.length,
      packets: this._packets.length,
      packetPool: this._packetPool.length,
      packetCap: MAX_PACKETS,
      cacheSize: this._paths.size,
      portTargetPx: 44,
      fractalRegions: this._fractalRegions || 0,
      medianFrameMs: frames[Math.floor(frames.length * 0.5)] || 0,
      p95FrameMs: frames[Math.floor(frames.length * 0.95)] || 0,
      medianDrawMs: draw[Math.floor(draw.length * 0.5)] || 0,
      p95DrawMs: draw[Math.floor(draw.length * 0.95)] || 0,
    };
  }
  destroy() {
    this._destroyed = true;
    this._clearLong();
    this._resizeObserver.disconnect();
    for (const [type, fn, opt] of this._listeners)
      this.canvas.removeEventListener(type, fn, opt);
    this._listeners.length = 0;
    this._pointers.clear();
    this._paths.clear();
    this._packets.length = 0;
    this._packetPool.length = 0;
    this._emission.clear();
    this._bursts.length = 0;
  }
}
