(function (global) {
  'use strict';

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
    GuitarNylon: melodic('guitar/nylon', 'mp3', ['C3', 'C4', 'C5'], { attack: 0.004, release: 0.18, gain: 0.76 }),
    GuitarClean: melodic('guitar/clean', 'mp3', ['C3', 'C4', 'C5'], { attack: 0.003, release: 0.2, gain: 0.68 }),
    GuitarJazz: melodic('guitar/jazz', 'mp3', ['C3', 'C4', 'C5'], { attack: 0.004, release: 0.22, gain: 0.7 }),
    GuitarOverdrive: melodic('guitar/overdrive', 'mp3', ['C3', 'C4', 'C5'], { attack: 0.002, release: 0.16, gain: 0.58 }),
    GuitarDistortion: melodic('guitar/distortion', 'mp3', ['C3', 'C4', 'C5'], { attack: 0.002, release: 0.15, gain: 0.52 }),
    Ukulele: melodic('ukulele', 'flac', ['C4', 'E4', 'G4', 'A4', 'C6'], { attack: 0.002, release: 0.1, gain: 0.74 }),
    Drums: {
      type: 'drums', gain: 0.88, samples: {
        Kick: 'assets/samples/drums/kick.mp3', 'Soft Kick': 'assets/samples/drums/kick.mp3',
        'Punchy Kick': 'assets/samples/drums/kick.mp3', Snare: 'assets/samples/drums/snare.mp3',
        'Closed Hi-Hat': 'assets/samples/drums/hatClosed.mp3', 'Open Hi-Hat': 'assets/samples/drums/hatOpen.mp3',
        Crash: 'assets/samples/drums/crash.mp3', Ride: 'assets/samples/drums/ride.mp3',
        'High Tom': 'assets/samples/drums/tomHigh.mp3', 'Mid Tom': 'assets/samples/drums/tomMid.mp3',
        'Floor Tom': 'assets/samples/drums/tomLow.mp3', Rimshot: 'assets/samples/drums/snare2.mp3',
        'Ghost Note': 'assets/samples/drums/snare3.mp3', Sidestick: 'assets/samples/drums/snare3.mp3',
        'Pedal Hi-Hat': 'assets/samples/drums/hatClosed2.mp3', 'Bright Hi-Hat': 'assets/samples/drums/hatOpen2.mp3',
        'Ride Bell': 'assets/samples/drums/ride.mp3', Splash: 'assets/samples/drums/crash.mp3'
      }
    }
  };

  const GUITAR_PRESETS = {
    'Steel Acoustic': 'Guitar', 'Nylon Acoustic': 'GuitarNylon', 'Fingerpicked Acoustic': 'GuitarNylon',
    'Acoustic Strumming': 'Guitar', 'Clean Electric': 'GuitarClean', 'Warm Jazz': 'GuitarJazz',
    'Crunch Electric': 'GuitarOverdrive', 'Distorted Rock': 'GuitarDistortion', 'High-Gain Metal': 'GuitarDistortion'
  };

  const DRUM_KITS = {
    'Studio Acoustic': { rate: 1, tone: 12000, gain: 1 }, Rock: { rate: 1, tone: 10000, gain: 1.08 },
    Metal: { rate: 1.04, tone: 14000, gain: 1.12 }, Jazz: { rate: .98, tone: 8500, gain: .82 },
    Funk: { rate: 1.02, tone: 11000, gain: .94 }, 'Indie Rock': { rate: .97, tone: 7200, gain: .96 },
    'Punk Rock': { rate: 1.05, tone: 13500, gain: 1.1 }
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
      this.guitarPreset = 'Steel Acoustic';
      this.drumKit = 'Studio Acoustic';
      this.quality = 'High Quality';
      this.latencyHint = 'interactive';
      this.guitarEffects = { reverb: 12, delay: 0, chorus: 0, drive: 0, compression: 25 };
      this.globalReverbEnabled = true;
      this.globalReverbWet = null;
      this.globalConvolver = null;
      this.fx = null;
    }

    async unlock() {
      if (!this.context) {
        const AudioContextClass = global.AudioContext || global.webkitAudioContext;
        if (!AudioContextClass) throw new Error('Web Audio is not supported in this browser.');
        this.context = new AudioContextClass({ latencyHint: this.latencyHint });
        this.master = this.context.createGain();
        this.compressor = this.context.createDynamicsCompressor();
        this.compressor.threshold.value = -14;
        this.compressor.knee.value = 18;
        this.compressor.ratio.value = 5;
        this.compressor.attack.value = 0.004;
        this.compressor.release.value = 0.16;
        this.master.gain.value = 0.82;
        this.master.connect(this.compressor).connect(this.context.destination);
        this.globalConvolver = this.context.createConvolver();
        this.globalConvolver.buffer = this.makeImpulse(1.25, 2.8);
        this.globalReverbWet = this.context.createGain();
        this.globalReverbWet.gain.value = this.globalReverbEnabled ? .08 : 0;
        this.master.connect(this.globalConvolver).connect(this.globalReverbWet).connect(this.compressor);
      }
      if (this.context.state === 'suspended') await this.context.resume();
      return this.context;
    }

    makeImpulse(seconds, decay) {
      const length = Math.floor(this.context.sampleRate * seconds);
      const impulse = this.context.createBuffer(2, length, this.context.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const data = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
      }
      return impulse;
    }

    definitionKey(instrument) {
      return instrument === 'Guitar' ? (GUITAR_PRESETS[this.guitarPreset] || 'Guitar') : instrument;
    }

    setGuitarPreset(preset) {
      if (GUITAR_PRESETS[preset]) this.guitarPreset = preset;
    }

    setDrumKit(kit) {
      if (DRUM_KITS[kit]) this.drumKit = kit;
    }

    setQuality(quality) {
      this.quality = quality === 'Performance' ? 'Performance' : 'High Quality';
      if (this.fx) this.updateGuitarEffects();
    }

    setLatencyHint(hint) {
      this.latencyHint = hint === 'balanced' ? 'balanced' : 'interactive';
      return !this.context;
    }

    setGlobalReverb(enabled) {
      this.globalReverbEnabled = !!enabled;
      if (this.globalReverbWet) this.globalReverbWet.gain.setTargetAtTime(enabled ? .08 : 0, this.context.currentTime, .03);
    }

    setGuitarEffects(effects) {
      this.guitarEffects = { ...this.guitarEffects, ...effects };
      if (this.fx) this.updateGuitarEffects();
    }

    bus(name) {
      if (!this.buses.has(name)) {
        const gain = this.context.createGain();
        gain.connect(this.master);
        this.buses.set(name, gain);
      }
      return this.buses.get(name);
    }

    guitarInput() {
      if (this.fx) return this.fx.input;
      const input = this.context.createGain();
      const shaper = this.context.createWaveShaper();
      const compressor = this.context.createDynamicsCompressor();
      const chorusDelay = this.context.createDelay(.05);
      const chorusGain = this.context.createGain();
      const chorusLfo = this.context.createOscillator();
      const chorusDepth = this.context.createGain();
      const delay = this.context.createDelay(1);
      const delayGain = this.context.createGain();
      const feedback = this.context.createGain();
      const reverb = this.context.createConvolver();
      const reverbGain = this.context.createGain();
      reverb.buffer = this.makeImpulse(1.5, 2.5);
      input.connect(shaper).connect(compressor).connect(this.bus('Guitar'));
      input.connect(chorusDelay).connect(chorusGain).connect(this.bus('Guitar'));
      chorusLfo.frequency.value = .72;
      chorusDepth.gain.value = .0035;
      chorusLfo.connect(chorusDepth).connect(chorusDelay.delayTime);
      chorusLfo.start();
      compressor.connect(delay).connect(delayGain).connect(this.bus('Guitar'));
      delay.connect(feedback).connect(delay);
      compressor.connect(reverb).connect(reverbGain).connect(this.bus('Guitar'));
      this.fx = { input, shaper, compressor, chorusDelay, chorusGain, chorusLfo, chorusDepth, delay, delayGain, feedback, reverbGain };
      this.updateGuitarEffects();
      return input;
    }

    updateGuitarEffects() {
      if (!this.fx) return;
      const now = this.context.currentTime;
      const e = this.guitarEffects;
      const drive = Math.max(0, Math.min(100, e.drive)) / 100;
      const curve = new Float32Array(1024);
      const amount = 1 + drive * 45;
      for (let i = 0; i < curve.length; i++) {
        const x = i * 2 / (curve.length - 1) - 1;
        curve[i] = drive ? Math.tanh(x * amount) / Math.tanh(amount) : x;
      }
      this.fx.shaper.curve = curve;
      this.fx.shaper.oversample = this.quality === 'High Quality' ? '4x' : 'none';
      this.fx.compressor.ratio.value = 1 + Math.max(0, e.compression) / 8;
      this.fx.compressor.threshold.value = -8 - Math.max(0, e.compression) * .22;
      this.fx.chorusDelay.delayTime.value = .018;
      this.fx.chorusGain.gain.setTargetAtTime(this.quality === 'Performance' ? 0 : e.chorus / 250, now, .03);
      this.fx.delay.delayTime.value = .24;
      this.fx.delayGain.gain.setTargetAtTime(this.quality === 'Performance' ? 0 : e.delay / 260, now, .03);
      this.fx.feedback.gain.value = Math.min(.42, e.delay / 260);
      this.fx.reverbGain.gain.setTargetAtTime(this.quality === 'Performance' ? 0 : e.reverb / 220, now, .03);
    }

    connectVoice(node, instrument) {
      node.connect(instrument === 'Guitar' ? this.guitarInput() : this.bus(instrument));
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
      const definitionKey = this.definitionKey(instrument);
      if (this.status.get(definitionKey) === 'ready') return true;
      if (this.loading.has(definitionKey)) return this.loading.get(definitionKey);
      const definition = INSTRUMENTS[definitionKey];
      if (!definition) return false;
      await this.unlock();
      this.emitStatus(instrument, 'loading');
      const job = Promise.all(Object.entries(definition.samples).map(async ([key, url]) => {
        this.buffers.set(`${definitionKey}:${key}`, await this.fetchBuffer(url));
      })).then(() => {
        this.status.set(definitionKey, 'ready');
        this.emitStatus(instrument, 'ready');
        return true;
      }).catch(error => {
        console.warn(`${instrument} samples unavailable; using fallback.`, error);
        this.emitStatus(instrument, 'fallback', error.message);
        return false;
      }).finally(() => this.loading.delete(definitionKey));
      this.loading.set(definitionKey, job);
      return job;
    }

    async prepare(instruments) {
      await this.unlock();
      await Promise.all([...new Set(instruments)].map(name => this.loadInstrument(name)));
      this.setMix(this.mix);
    }

    nearestSample(instrument, note) {
      const keys = Object.keys(INSTRUMENTS[this.definitionKey(instrument)].samples).map(Number);
      return keys.reduce((best, value) => Math.abs(value - note) < Math.abs(best - note) ? value : best, keys[0]);
    }

    scheduleNote({ instrument, midi: note, time, duration = 0.5, velocity = 90, attack, release }) {
      if (!this.context || time < this.context.currentTime - 0.03) return null;
      if (this.quality === 'Performance' && this.active.size > 48) return null;
      if (this.quality === 'High Quality' && this.active.size > 96) return null;
      const definitionKey = this.definitionKey(instrument);
      const definition = INSTRUMENTS[definitionKey];
      const root = definition && this.nearestSample(instrument, note);
      const buffer = this.buffers.get(`${definitionKey}:${root}`);
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
      source.connect(envelope);
      this.connectVoice(envelope, instrument);
      source.start(time);
      source.stop(Math.min(end + 0.03, time + buffer.duration / source.playbackRate.value));
      return this.track(source);
    }

    scheduleDrum({ lane, time, velocity = 100 }) {
      if (!this.context || time < this.context.currentTime - 0.03) return null;
      const kit = DRUM_KITS[this.drumKit] || DRUM_KITS['Studio Acoustic'];
      let articulation = lane;
      if (lane === 'Kick') articulation = this.drumKit === 'Jazz' || velocity < 76 ? 'Soft Kick' : ['Rock', 'Metal', 'Punk Rock'].includes(this.drumKit) ? 'Punchy Kick' : 'Kick';
      if (lane === 'Snare' && velocity < 72) articulation = this.drumKit === 'Jazz' ? 'Sidestick' : 'Ghost Note';
      if (lane === 'Closed Hi-Hat' && velocity < 68) articulation = 'Pedal Hi-Hat';
      if (lane === 'Ride' && velocity > 112) articulation = 'Ride Bell';
      if (lane === 'Crash' && velocity < 72) articulation = 'Splash';
      const buffer = this.buffers.get(`Drums:${articulation}`) || this.buffers.get(`Drums:${lane}`) || this.buffers.get('Drums:Snare');
      if (!buffer) return this.scheduleFallback({ instrument: 'Drums', midi: lane === 'Kick' ? 36 : 48, time, duration: 0.12, velocity });
      const source = this.context.createBufferSource();
      const gain = this.context.createGain();
      const filter = this.context.createBiquadFilter();
      gain.gain.value = Math.max(0.03, Math.min(1, velocity / 127)) * INSTRUMENTS.Drums.gain * kit.gain;
      filter.type = 'lowpass';
      filter.frequency.value = kit.tone;
      source.buffer = buffer;
      source.playbackRate.value = kit.rate * (lane === 'Kick' && this.drumKit === 'Metal' ? 1.08 : 1);
      source.connect(filter).connect(gain).connect(this.bus('Drums'));
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
