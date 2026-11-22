/** EXASCALE soundscape. User-gesture Web Audio, local CC0 cues, original synthesis. */
const CLIPS = {
  connect: new URL("../assets/audio/connect.ogg", import.meta.url),
  research: new URL("../assets/audio/research.ogg", import.meta.url),
  alert: new URL("../assets/audio/alert.ogg", import.meta.url),
};
const amount = (value, fallback) =>
  typeof value === "boolean"
    ? value
      ? fallback
      : 0
    : Number.isFinite(value)
      ? Math.max(0, Math.min(1, value)) * fallback
      : fallback;

export class AudioEngine {
  constructor() {
    this.context = null;
    this.settings = { music: false, sfx: true, mute: false };
    this.buffers = new Map();
    this.voices = new Set();
    this.ambient = [];
    this.last = new Map();
    this.destroyed = false;
    this.loading = null;
    this.abort = new AbortController();
    this._visibility = () => {
      if (!this.context || this.context.state === "closed") return;
      if (document.hidden) this.context.suspend().catch(() => {});
      else if (this.unlocked) this.context.resume().catch(() => {});
    };
    if (typeof document !== "undefined")
      document.addEventListener("visibilitychange", this._visibility);
  }

  async unlock() {
    if (this.destroyed) return false;
    try {
      if (!this.context) {
        const AudioContext =
          globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!AudioContext) return false;
        const context = (this.context = new AudioContext({
          latencyHint: "interactive",
        }));
        const compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -18;
        compressor.knee.value = 15;
        compressor.ratio.value = 4;
        this.master = context.createGain();
        this.master.gain.value = 0.6;
        this.musicGain = context.createGain();
        this.sfxGain = context.createGain();
        this.musicGain.gain.value = 0;
        this.sfxGain.gain.value = 0.25;
        this.musicGain.connect(compressor);
        this.sfxGain.connect(compressor);
        compressor.connect(this.master);
        this.master.connect(context.destination);
        this.ambient.push(compressor);
        this._buildAmbient();
        this.loading = this._loadClips();
      }
      if (this.context.state === "suspended") await this.context.resume();
      this.unlocked = this.context.state === "running";
      this.configure(this.settings);
      return this.unlocked;
    } catch {
      return false;
    }
  }

  configure(settings = {}) {
    this.settings = { ...this.settings, ...settings };
    const context = this.context;
    if (!context || context.state === "closed") return;
    const now = context.currentTime;
    this.master.gain.setTargetAtTime(this.settings.mute ? 0 : 0.6, now, 0.04);
    this.musicGain.gain.setTargetAtTime(
      amount(this.settings.music, 0.17),
      now,
      0.6,
    );
    this.sfxGain.gain.setTargetAtTime(
      amount(this.settings.sfx, 0.28),
      now,
      0.04,
    );
  }

  async _loadClips() {
    await Promise.allSettled(
      Object.entries(CLIPS).map(async ([key, url]) => {
        const response = await fetch(url, { signal: this.abort.signal });
        if (!response.ok) return;
        const bytes = await response.arrayBuffer();
        if (this.destroyed || !this.context || this.context.state === "closed")
          return;
        const buffer = await this.context.decodeAudioData(bytes);
        if (!this.destroyed) this.buffers.set(key, buffer);
      }),
    );
  }

  _buildAmbient() {
    const context = this.context;
    // Original slow supercomputer hum, with independent incommensurate modulation.
    // Fixed number of nodes: no timer allocates a fresh synth every musical beat.
    [55, 82.4069, 110, 164.8138].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const amplitude = context.createGain();
      const modulator = context.createOscillator();
      const modulation = context.createGain();
      oscillator.type = index === 3 ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index % 2 ? 3 : -3;
      amplitude.gain.value = 0.055 / (index + 1);
      modulator.frequency.value = 0.023 + index * 0.009;
      modulation.gain.value = 0.025 / (index + 1);
      modulator.connect(modulation);
      modulation.connect(amplitude.gain);
      oscillator.connect(amplitude);
      amplitude.connect(this.musicGain);
      oscillator.start();
      modulator.start();
      this.ambient.push(oscillator, amplitude, modulator, modulation);
    });
  }

  play(kind = "connect") {
    const context = this.context;
    if (
      !context ||
      context.state !== "running" ||
      this.destroyed ||
      this.settings.mute ||
      !this.settings.sfx
    )
      return;
    const now = context.currentTime;
    const delay = kind === "packet" ? 0.15 : kind === "alert" ? 1.5 : 0.06;
    if (now - (this.last.get(kind) ?? -99) < delay || this.voices.size >= 24)
      return;
    this.last.set(kind, now);
    try {
      const clip = this.buffers.get(kind);
      if (clip) {
        const source = context.createBufferSource();
        source.buffer = clip;
        source.connect(this.sfxGain);
        this._track(source);
        source.start();
        return;
      }
      const notes = {
        connect: [660, 990],
        research: [440, 554.365, 659.255, 880],
        alert: [130.81, 123.47],
        packet: [1250],
        era: [220, 329.628, 440, 554.365, 659.255],
      }[kind] || [660];
      notes.forEach((frequency, index) => {
        if (this.voices.size >= 24) return;
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        const start = now + index * (kind === "era" ? 0.13 : 0.055);
        const duration = kind === "era" ? 0.65 : kind === "alert" ? 0.17 : 0.11;
        oscillator.type = kind === "alert" ? "triangle" : "sine";
        oscillator.frequency.setValueAtTime(frequency, start);
        oscillator.frequency.exponentialRampToValueAtTime(
          frequency * 0.98,
          start + duration,
        );
        envelope.gain.setValueAtTime(0.0001, start);
        envelope.gain.exponentialRampToValueAtTime(
          kind === "packet" ? 0.035 : 0.17,
          start + 0.008,
        );
        envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(envelope);
        envelope.connect(this.sfxGain);
        this._track(oscillator, envelope);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.03);
      });
    } catch {
      /* Audio is optional and must never interrupt simulation. */
    }
  }

  _track(source, envelope) {
    this.voices.add(source);
    source.onended = () => {
      source.disconnect();
      envelope?.disconnect();
      this.voices.delete(source);
      source.onended = null;
    };
  }

  destroy() {
    this.destroyed = true;
    this.abort.abort();
    if (typeof document !== "undefined")
      document.removeEventListener("visibilitychange", this._visibility);
    for (const node of [...this.voices, ...this.ambient]) {
      try {
        node.stop?.();
      } catch {
        /* Already stopped. */
      }
      try {
        node.disconnect();
      } catch {
        /* Already disconnected. */
      }
    }
    this.voices.clear();
    this.ambient.length = 0;
    this.buffers.clear();
    this.last.clear();
    if (this.context && this.context.state !== "closed")
      this.context.close().catch(() => {});
  }
}
