(function (global) {
  'use strict';

  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const midi = note => {
    const match = /^([A-G])(#|b)?(-?\d+)$/.exec(note);
    if (!match) throw new Error(`Invalid note: ${note}`);
    const pitch = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[match[1]] + (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0);
    return (+match[3] + 1) * 12 + pitch;
  };

  const melodic = (folder, extension, notes, options = {}) => ({
    type: 'melodic',
    attack: options.attack ?? 0.008,
    release: options.release ?? 0.16,
    gain: options.gain ?? 1,
    samples: Object.fromEntries(notes.map(note => [midi(note), `assets/samples/${folder}/${note}.${extension}`]))
  });

  const INSTRUMENTS = {
    Piano: melodic('piano', 'mp3', ['C2', 'C3', 'C4', 'C5', 'C6'], { attack: 0.006, release: 0.35, gain: 0.72 }),
    Bass: melodic('bass', 'mp3', ['C1', 'C2', 'C3'], { attack: 0.005, release: 0.12, gain: 0.95 }),
    Guitar: melodic('guitar', 'mp3', ['C3', 'C4', 'C5'], { attack: 0.003, release: 0.15, gain: 0.7 }),
    Ukulele: melodic('ukulele', 'flac', ['C4', 'E4', 'G4', 'A4', 'C6'], { attack: 0.002, release: 0.1, gain: 0.74 }),
    Drums: {
      type: 'drums', gain: 0.88, samples: {
        Kick: 'assets/samples/drums/kick.mp3', Snare: 'assets/samples/drums/snare.mp3',
        'Closed Hi-Hat': 'assets/samples/drums/hatClosed.mp3', 'Open Hi-Hat': 'assets/samples/drums/hatOpen.mp3',
        Crash: 'assets/samples/drums/crash.mp3', Ride: 'assets/samples/drums/ride.mp3',
        'High Tom': 'assets/samples/drums/tomHigh.mp3', 'Mid Tom': 'assets/samples/drums/tomMid.mp3',
        'Floor Tom': 'assets/samples/drums/tomLow.mp3', Rimshot: 'assets/samples/drums/snare.mp3'
      }
    }
  };

  class StageWriteAudioEngine extends EventTarget {
    constructor() {
      super();
      this.context = null;
      this.master = null;
      this.compressor = null;
      this.buses = new Map();
      this.buffers = new Map();
      this.loading = new Map();
      this.status = new Map(Object.keys(INSTRUMENTS).map(name => [name, 'idle']));
      this.active = new Set();
      this.mix = {};
    }

    async unlock() {
      if (!this.context) {
        const AudioContextClass = global.AudioContext || global.webkitAudioContext;
        if (!AudioContextClass) throw new Error('Web Audio is not supported in this browser.');
        this.context = new AudioContextClass({ latencyHint: 'interactive' });
        this.master = this.context.createGain();
        this.compressor = this.context.createDynamicsCompressor();
        this.compressor.threshold.value = -14;
        this.compressor.knee.value = 18;
        this.compressor.ratio.value = 5;
        this.compressor.attack.value = 0.004;
        this.compressor.release.value = 0.16;
        this.master.gain.value = 0.82;
        this.master.connect(this.compressor).connect(this.context.destination);
      }
      if (this.context.state === 'suspended') await this.context.resume();
      return this.context;
    }

    bus(name) {
      if (!this.buses.has(name)) {
        const gain = this.context.createGain();
        gain.connect(this.master);
        this.buses.set(name, gain);
      }
      return this.buses.get(name);
    }

    setMix(mix) {
      this.mix = mix || {};
      if (!this.context) return;
      const soloed = Object.entries(this.mix).filter(([name, value]) => name !== 'Master' && value.solo).map(([name]) => name);
      for (const name of Object.keys(INSTRUMENTS)) {
        const value = this.mix[name] || { volume: 75, mute: false };
        const audible = !value.mute && (!soloed.length || soloed.includes(name));
        this.bus(name).gain.setTargetAtTime(audible ? Math.pow(value.volume / 100, 1.35) : 0, this.context.currentTime, 0.012);
      }
      const master = this.mix.Master || { volume: 82, mute: false };
      this.master.gain.setTargetAtTime(master.mute ? 0 : Math.pow(master.volume / 100, 1.25), this.context.currentTime, 0.012);
    }

    emitStatus(instrument, status, detail = '') {
      this.status.set(instrument, status);
      this.dispatchEvent(new CustomEvent('instrumentstatus', { detail: { instrument, status, detail } }));
    }

    async fetchBuffer(url, retry = true) {
      try {
        const response = await fetch(url, { cache: 'force-cache' });
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        return await this.context.decodeAudioData(await response.arrayBuffer());
      } catch (error) {
        if (retry) return this.fetchBuffer(url, false);
        throw error;
      }
    }

    async loadInstrument(instrument) {
      if (this.status.get(instrument) === 'ready') return true;
      if (this.loading.has(instrument)) return this.loading.get(instrument);
      const definition = INSTRUMENTS[instrument];
      if (!definition) return false;
      await this.unlock();
      this.emitStatus(instrument, 'loading');
      const job = Promise.all(Object.entries(definition.samples).map(async ([key, url]) => {
        this.buffers.set(`${instrument}:${key}`, await this.fetchBuffer(url));
      })).then(() => {
        this.emitStatus(instrument, 'ready');
        return true;
      }).catch(error => {
        console.warn(`${instrument} samples unavailable; using fallback.`, error);
        this.emitStatus(instrument, 'fallback', error.message);
        return false;
      }).finally(() => this.loading.delete(instrument));
      this.loading.set(instrument, job);
      return job;
    }

    async prepare(instruments) {
      await this.unlock();
      await Promise.all([...new Set(instruments)].map(name => this.loadInstrument(name)));
      this.setMix(this.mix);
    }

    nearestSample(instrument, note) {
      const keys = Object.keys(INSTRUMENTS[instrument].samples).map(Number);
      return keys.reduce((best, value) => Math.abs(value - note) < Math.abs(best - note) ? value : best, keys[0]);
    }

    scheduleNote({ instrument, midi: note, time, duration = 0.5, velocity = 90, attack, release }) {
      if (!this.context || time < this.context.currentTime - 0.03) return null;
      const definition = INSTRUMENTS[instrument];
      const root = definition && this.nearestSample(instrument, note);
      const buffer = this.buffers.get(`${instrument}:${root}`);
      if (!buffer) return this.scheduleFallback({ instrument, midi: note, time, duration, velocity });
      const source = this.context.createBufferSource();
      const envelope = this.context.createGain();
      const level = Math.max(0.015, Math.min(1, velocity / 127)) * definition.gain;
      const a = Math.max(0.001, attack ?? definition.attack);
      const r = Math.max(0.02, release ?? definition.release);
      const end = time + Math.max(0.04, duration);
      source.buffer = buffer;
      source.playbackRate.value = Math.pow(2, (note - root) / 12);
      envelope.gain.setValueAtTime(0.0001, time);
      envelope.gain.exponentialRampToValueAtTime(level, time + a);
      envelope.gain.setValueAtTime(level, Math.max(time + a, end - r));
      envelope.gain.exponentialRampToValueAtTime(0.0001, end);
      source.connect(envelope).connect(this.bus(instrument));
      source.start(time);
      source.stop(Math.min(end + 0.03, time + buffer.duration / source.playbackRate.value));
      return this.track(source);
    }

    scheduleDrum({ lane, time, velocity = 100 }) {
      if (!this.context || time < this.context.currentTime - 0.03) return null;
      const buffer = this.buffers.get(`Drums:${lane}`) || this.buffers.get('Drums:Snare');
      if (!buffer) return this.scheduleFallback({ instrument: 'Drums', midi: lane === 'Kick' ? 36 : 48, time, duration: 0.12, velocity });
      const source = this.context.createBufferSource();
      const gain = this.context.createGain();
      gain.gain.value = Math.max(0.03, Math.min(1, velocity / 127)) * INSTRUMENTS.Drums.gain;
      source.buffer = buffer;
      source.connect(gain).connect(this.bus('Drums'));
      source.start(time);
      return this.track(source);
    }

    scheduleFallback({ instrument, midi: note, time, duration, velocity }) {
      if (!this.context) return null;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = instrument === 'Bass' || instrument === 'Drums' ? 'triangle' : 'sine';
      oscillator.frequency.value = 440 * Math.pow(2, (note - 69) / 12);
      const level = Math.max(0.008, velocity / 127 * 0.06);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(level, time + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(0.06, duration));
      oscillator.connect(gain).connect(this.bus(instrument));
      oscillator.start(time);
      oscillator.stop(time + Math.max(0.07, duration) + 0.02);
      return this.track(oscillator);
    }

    track(source) {
      this.active.add(source);
      source.addEventListener('ended', () => this.active.delete(source), { once: true });
      return source;
    }

    stopAll() {
      for (const source of this.active) {
        try { source.stop(); } catch (_) { /* already stopped */ }
      }
      this.active.clear();
    }
  }

  StageWriteAudioEngine.instruments = Object.freeze(Object.keys(INSTRUMENTS));
  StageWriteAudioEngine.noteToMidi = midi;
  global.StageWriteAudioEngine = StageWriteAudioEngine;
})(window);
