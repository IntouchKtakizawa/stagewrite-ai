// Web Audio engine: lazy-loaded multisamples, drum kit, metronome and a lookahead scheduler.
import { pianoVoicing, findShapes, shapeNotes, bassNote } from '../music/voicings';
import type { Chord } from '../music/theory';

const BASE = import.meta.env.BASE_URL + 'samples/';

export type InstrumentId = 'piano' | 'guitar-clean' | 'guitar-nylon' | 'guitar-jazz' | 'guitar-overdrive' | 'guitar-distortion' | 'ukulele' | 'bass';
export type DrumVoice = 'kick' | 'snare' | 'hat' | 'open' | 'ride' | 'tom';
export const DRUM_VOICES: DrumVoice[] = ['kick', 'snare', 'hat', 'open', 'ride', 'tom'];

export const INSTRUMENTS: Record<Exclude<InstrumentId, 'bass'>, { label: string; kind: 'keys' | 'guitar' | 'ukulele' }> = {
  piano: { label: 'Grand piano', kind: 'keys' },
  'guitar-clean': { label: 'Clean electric', kind: 'guitar' },
  'guitar-nylon': { label: 'Nylon acoustic', kind: 'guitar' },
  'guitar-jazz': { label: 'Jazz guitar', kind: 'guitar' },
  'guitar-overdrive': { label: 'Overdrive', kind: 'guitar' },
  'guitar-distortion': { label: 'Distortion', kind: 'guitar' },
  ukulele: { label: 'Ukulele', kind: 'ukulele' },
};

const SAMPLE_MAPS: Record<InstrumentId, Record<number, string>> = {
  piano: { 36: 'piano/C2.mp3', 48: 'piano/C3.mp3', 60: 'piano/C4.mp3', 72: 'piano/C5.mp3', 84: 'piano/C6.mp3' },
  'guitar-clean': { 48: 'guitar/clean/C3.mp3', 60: 'guitar/clean/C4.mp3', 72: 'guitar/clean/C5.mp3' },
  'guitar-nylon': { 48: 'guitar/nylon/C3.mp3', 60: 'guitar/nylon/C4.mp3', 72: 'guitar/nylon/C5.mp3' },
  'guitar-jazz': { 48: 'guitar/jazz/C3.mp3', 60: 'guitar/jazz/C4.mp3', 72: 'guitar/jazz/C5.mp3' },
  'guitar-overdrive': { 48: 'guitar/overdrive/C3.mp3', 60: 'guitar/overdrive/C4.mp3', 72: 'guitar/overdrive/C5.mp3' },
  'guitar-distortion': { 48: 'guitar/distortion/C3.mp3', 60: 'guitar/distortion/C4.mp3', 72: 'guitar/distortion/C5.mp3' },
  ukulele: { 60: 'ukulele/C4.flac', 64: 'ukulele/E4.flac', 67: 'ukulele/G4.flac', 69: 'ukulele/A4.flac', 84: 'ukulele/C6.flac' },
  bass: { 24: 'bass/C1.mp3', 36: 'bass/C2.mp3', 48: 'bass/C3.mp3' },
};

const DRUM_FILES: Record<DrumVoice | 'crash', string[]> = {
  kick: ['drums/kick.mp3'],
  snare: ['drums/snare.mp3', 'drums/snare2.mp3'],
  hat: ['drums/hatClosed.mp3', 'drums/hatClosed2.mp3'],
  open: ['drums/hatOpen.mp3'],
  ride: ['drums/ride.mp3'],
  tom: ['drums/tomHigh.mp3', 'drums/tomMid.mp3', 'drums/tomLow.mp3'],
  crash: ['drums/crash.mp3'],
};

export type CompStyle = 'sustain' | 'pulse' | 'strum' | 'arp' | 'offbeat';
export type BassStyle = 'off' | 'root' | 'eighths' | 'fifths' | 'walk';

export interface DrumPattern { [voice: string]: boolean[] }

export interface PlayEvent { chord: Chord; sectionIndex: number; chordIndex: number; startBeat: number }

export interface TransportOptions {
  bpm: number;
  instrument: Exclude<InstrumentId, 'bass'>;
  comp: CompStyle;
  bass: BassStyle;
  drums: DrumPattern | null;
  swing: number; // 0..1
  humanize: boolean;
  metronome: boolean;
  countIn: boolean;
  loop: boolean;
  mix: { chords: number; bass: number; drums: number; click: number };
}

export interface Position { sectionIndex: number; chordIndex: number; beat: number; step: number; countIn: boolean }

type Listener = (p: Position | null) => void;

class Engine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private buses!: Record<'chords' | 'bass' | 'drums' | 'click', GainNode>;
  private buffers = new Map<string, Promise<AudioBuffer>>();
  private decoded = new Map<string, AudioBuffer>();
  private timer: number | null = null;
  private raf = 0;
  private listeners = new Set<Listener>();
  private queue: { time: number; pos: Position }[] = [];
  private voices = new Set<AudioBufferSourceNode>();
  playing = false;

  ensure(): AudioContext {
    if (!this.ctx) {
      // iOS: play through the silent switch like a music app.
      const nav = navigator as Navigator & { audioSession?: { type: string } };
      if (nav.audioSession) try { nav.audioSession.type = 'playback'; } catch { /* unsupported */ }
      const ctx = new AudioContext({ latencyHint: 'interactive' });
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 3;
      this.master = ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(comp).connect(ctx.destination);
      const mk = () => { const g = ctx.createGain(); g.connect(this.master); return g; };
      this.buses = { chords: mk(), bass: mk(), drums: mk(), click: mk() };
      this.ctx = ctx;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private load(path: string): Promise<AudioBuffer> {
    let p = this.buffers.get(path);
    if (!p) {
      const ctx = this.ensure();
      p = fetch(BASE + path)
        .then((r) => { if (!r.ok) throw new Error(`Sample ${path} failed`); return r.arrayBuffer(); })
        .then((b) => ctx.decodeAudioData(b))
        .then((buf) => { this.decoded.set(path, buf); return buf; });
      p.catch(() => this.buffers.delete(path));
      this.buffers.set(path, p);
    }
    return p;
  }

  async preload(instrument: InstrumentId, drums = false) {
    const jobs = Object.values(SAMPLE_MAPS[instrument]).map((p) => this.load(p));
    if (drums) Object.values(DRUM_FILES).flat().forEach((p) => jobs.push(this.load(p)));
    jobs.push(...Object.values(SAMPLE_MAPS.bass).map((p) => this.load(p)));
    await Promise.allSettled(jobs);
  }

  setMix(mix: TransportOptions['mix']) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    (Object.keys(mix) as (keyof typeof mix)[]).forEach((k) => this.buses[k].gain.setTargetAtTime(mix[k], t, 0.03));
  }

  private nearest(instrument: InstrumentId, midi: number) {
    const map = SAMPLE_MAPS[instrument];
    let best = 0, bestD = Infinity;
    for (const k of Object.keys(map).map(Number)) {
      const d = Math.abs(k - midi);
      if (d < bestD) { best = k; bestD = d; }
    }
    return { sampleMidi: best, path: map[best] };
  }

  playNote(instrument: InstrumentId, midi: number, time: number, dur: number, vel = 0.8, bus: 'chords' | 'bass' = 'chords') {
    const ctx = this.ensure();
    const { sampleMidi, path } = this.nearest(instrument, midi);
    const buf = this.decoded.get(path);
    if (!buf) { void this.load(path); return; }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = Math.pow(2, (midi - sampleMidi) / 12);
    const g = ctx.createGain();
    const peak = vel * (instrument.includes('distortion') || instrument.includes('overdrive') ? 0.35 : 0.55);
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(peak, time + 0.006);
    const release = instrument === 'bass' ? 0.08 : 0.35;
    g.gain.setValueAtTime(peak, time + Math.max(0.02, dur));
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur + release);
    src.connect(g).connect(this.buses[bus]);
    src.start(time);
    src.stop(time + dur + release + 0.05);
    this.voices.add(src);
    src.onended = () => this.voices.delete(src);
  }

  playDrum(voice: DrumVoice | 'crash', time: number, vel = 0.9) {
    const ctx = this.ensure();
    const files = DRUM_FILES[voice];
    const path = files[Math.floor(Math.random() * files.length)];
    const buf = this.decoded.get(path);
    if (!buf) { void this.load(path); return; }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = vel * (voice === 'hat' ? 0.45 : voice === 'ride' || voice === 'crash' ? 0.4 : 0.85);
    src.connect(g).connect(this.buses.drums);
    src.start(time);
    this.voices.add(src);
    src.onended = () => this.voices.delete(src);
  }

  click(time: number, accent: boolean) {
    const ctx = this.ensure();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.value = accent ? 1760 : 1175;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.5, time + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
    osc.connect(g).connect(this.buses.click);
    osc.start(time);
    osc.stop(time + 0.08);
  }

  /** Audition a single chord immediately. */
  async audition(chord: Chord, instrument: Exclude<InstrumentId, 'bass'>) {
    const ctx = this.ensure();
    await this.preload(instrument);
    const t = ctx.currentTime + 0.03;
    const notes = this.voicingFor(chord, instrument);
    const strum = INSTRUMENTS[instrument].kind === 'keys' ? 0.004 : 0.022;
    notes.forEach((n, i) => this.playNote(instrument, n, t + i * strum, 1.6, 0.75));
    this.playNote('bass', bassNote(chord), t, 1.4, 0.6, 'bass');
  }

  private lastVoicing: number[] | undefined;
  voicingFor(chord: Chord, instrument: Exclude<InstrumentId, 'bass'>): number[] {
    const kind = INSTRUMENTS[instrument].kind;
    if (kind === 'keys') return (this.lastVoicing = pianoVoicing(chord, this.lastVoicing));
    const shape = findShapes(chord, kind === 'ukulele' ? 'ukulele' : 'guitar')[0];
    return shape ? shapeNotes(shape, kind === 'ukulele' ? 'ukulele' : 'guitar') : pianoVoicing(chord);
  }

  subscribe(l: Listener) { this.listeners.add(l); return () => { this.listeners.delete(l); }; }
  private emit(p: Position | null) { this.listeners.forEach((l) => l(p)); }

  stop(notify = true) {
    this.playing = false;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    cancelAnimationFrame(this.raf);
    this.queue = [];
    if (this.ctx) {
      const t = this.ctx.currentTime;
      this.voices.forEach((v) => { try { v.stop(t + 0.05); } catch { /* already stopped */ } });
    }
    this.voices.clear();
    if (notify) this.emit(null);
  }

  /** Live-updatable options during playback. */
  private opts!: TransportOptions;
  private events: PlayEvent[] = [];
  update(opts: Partial<TransportOptions>, events?: PlayEvent[]) {
    if (!this.opts) return;
    this.opts = { ...this.opts, ...opts };
    if (events) this.events = events;
    if (opts.mix) this.setMix(opts.mix);
  }

  async start(events: PlayEvent[], opts: TransportOptions) {
    this.stop(false);
    if (!events.length) return;
    const ctx = this.ensure();
    this.opts = opts;
    this.events = events;
    this.setMix(opts.mix);
    this.lastVoicing = undefined;
    await this.preload(opts.instrument, !!opts.drums);
    this.playing = true;

    const totalBeats = () => this.events.reduce((m, e) => Math.max(m, e.startBeat + e.chord.beats), 0);
    let step = opts.countIn ? -16 : 0; // 16th-note steps
    let nextTime = ctx.currentTime + 0.12;
    let arpIndex = 0;

    const scheduleStep = (s: number, time: number) => {
      const o = this.opts;
      const sixteenth = 60 / o.bpm / 4;
      const beatInBar = ((s % 16) + 16) % 16;
      if (s < 0) {
        if (beatInBar % 4 === 0) this.click(time, beatInBar === 0);
        this.queue.push({ time, pos: { sectionIndex: -1, chordIndex: -1, beat: Math.floor(beatInBar / 4), step: beatInBar, countIn: true } });
        return;
      }
      const beat = s / 4;
      const ev = this.events.find((e) => beat >= e.startBeat && beat < e.startBeat + e.chord.beats);
      if (!ev) return;
      const h = o.humanize ? () => (Math.random() - 0.5) * 0.014 : () => 0;
      const vh = o.humanize ? () => 0.85 + Math.random() * 0.15 : () => 1;
      const swung = beatInBar % 2 === 1 ? time + o.swing * sixteenth * 0.66 : time;
      const t = Math.max(ctx.currentTime, swung + h());
      const stepInChord = s - ev.startBeat * 4;
      const chordSteps = ev.chord.beats * 4;
      const isChordStart = stepInChord === 0;
      const isFirstOfSection = isChordStart && ev.chordIndex === 0;

      this.queue.push({ time, pos: { sectionIndex: ev.sectionIndex, chordIndex: ev.chordIndex, beat: Math.floor(beatInBar / 4), step: beatInBar, countIn: false } });

      if (o.metronome && beatInBar % 4 === 0) this.click(time, beatInBar === 0);

      // Chords
      const kind = INSTRUMENTS[o.instrument].kind;
      const voicing = isChordStart || !this.currentVoicing ? (this.currentVoicing = this.voicingFor(ev.chord, o.instrument)) : this.currentVoicing;
      const strumGap = kind === 'keys' ? 0.003 : 0.016;
      const playChord = (len: number, vel: number, up = false) => {
        const notes = up ? [...voicing].reverse() : voicing;
        notes.forEach((n, i) => this.playNote(o.instrument, n, t + i * strumGap, len, vel * vh()));
      };
      switch (o.comp) {
        case 'sustain':
          if (isChordStart) playChord(chordSteps * sixteenth * 0.98, 0.7);
          else if (beatInBar === 0 && stepInChord > 0) playChord(Math.min(16, chordSteps - stepInChord) * sixteenth, 0.6);
          break;
        case 'pulse':
          if (stepInChord % 4 === 0) playChord(sixteenth * 3, stepInChord % 8 === 0 ? 0.75 : 0.6);
          else if (stepInChord % 4 === 2 && kind === 'keys') playChord(sixteenth * 1.5, 0.45);
          break;
        case 'strum': {
          const pat: Record<number, [boolean, number]> = { 0: [false, 0.8], 4: [false, 0.6], 6: [true, 0.45], 10: [true, 0.5], 12: [false, 0.6], 14: [true, 0.45] };
          const hit = pat[stepInChord % 16];
          if (hit) playChord(sixteenth * 4, hit[1], hit[0]);
          break;
        }
        case 'arp':
          if (stepInChord % 2 === 0) {
            const seq = [...voicing, ...voicing.slice(1, -1).reverse()];
            const n = seq[arpIndex++ % seq.length];
            this.playNote(o.instrument, n + (kind === 'keys' ? 0 : 0), t, sixteenth * 3, 0.6 * vh());
          }
          break;
        case 'offbeat':
          if (stepInChord % 8 === 4) playChord(sixteenth * 1.6, 0.6);
          break;
      }

      // Bass
      const root = bassNote(ev.chord);
      const nextEv = this.events.find((e) => e.startBeat === ev.startBeat + ev.chord.beats) ?? this.events[0];
      switch (o.bass) {
        case 'root':
          if (isChordStart) this.playNote('bass', root, t, Math.min(8, chordSteps) * sixteenth * 0.9, 0.8 * vh(), 'bass');
          else if (stepInChord % 16 === 8 && chordSteps > 8) this.playNote('bass', root, t, sixteenth * 7, 0.65 * vh(), 'bass');
          break;
        case 'eighths':
          if (stepInChord % 2 === 0) this.playNote('bass', root, t, sixteenth * 1.7, (stepInChord % 4 === 0 ? 0.8 : 0.6) * vh(), 'bass');
          break;
        case 'fifths':
          if (stepInChord % 8 === 0) this.playNote('bass', root, t, sixteenth * 3.5, 0.8 * vh(), 'bass');
          else if (stepInChord % 8 === 4) this.playNote('bass', root + 7, t, sixteenth * 3.5, 0.65 * vh(), 'bass');
          break;
        case 'walk':
          if (stepInChord % 4 === 0) {
            const q = stepInChord / 4;
            const last = q === ev.chord.beats - 1;
            const third = ev.chord.quality.startsWith('m') && !ev.chord.quality.startsWith('maj') ? 3 : 4;
            const target = bassNote(nextEv.chord);
            const n = last ? target + (target > root ? -1 : 1) : [root, root + third, root + 7, root + 12][q % 4];
            this.playNote('bass', n, t, sixteenth * 3.6, 0.75 * vh(), 'bass');
          }
          break;
      }

      // Drums
      if (o.drums) {
        const isLastBarOfSection = (() => {
          const sectionEnd = this.events.filter((e) => e.sectionIndex === ev.sectionIndex).reduce((m, e) => Math.max(m, e.startBeat + e.chord.beats), 0);
          return beat >= sectionEnd - 4;
        })();
        if (isFirstOfSection && beatInBar === 0) this.playDrum('crash', t, 0.8);
        if (isLastBarOfSection && beatInBar >= 12) {
          // simple tom fill on the last beat of a section
          this.playDrum(beatInBar % 2 === 0 ? 'tom' : 'snare', t, 0.75 * vh());
        } else {
          for (const v of DRUM_VOICES) {
            if (o.drums[v]?.[beatInBar]) {
              if (isFirstOfSection && beatInBar === 0 && (v === 'hat' || v === 'ride')) continue;
              this.playDrum(v, t, (beatInBar % 4 === 0 ? 1 : 0.78) * vh());
            }
          }
        }
      }
    };

    const tick = () => {
      if (!this.playing) return;
      const o = this.opts;
      const sixteenth = 60 / o.bpm / 4;
      while (nextTime < ctx.currentTime + 0.12) {
        const total = totalBeats() * 4;
        if (step >= total) {
          if (o.loop) step = 0;
          else {
            const endAt = nextTime;
            window.setTimeout(() => { if (this.playing && ctx.currentTime >= endAt - 0.05) this.stop(); }, (endAt - ctx.currentTime) * 1000 + 600);
            this.playing = false;
            if (this.timer !== null) clearInterval(this.timer);
            this.timer = null;
            return;
          }
        }
        scheduleStep(step, nextTime);
        step++;
        nextTime += sixteenth;
      }
    };
    this.currentVoicing = undefined;
    this.timer = window.setInterval(tick, 25);
    tick();

    const frame = () => {
      const now = ctx.currentTime;
      let latest: Position | null = null;
      while (this.queue.length && this.queue[0].time <= now) latest = this.queue.shift()!.pos;
      if (latest) this.emit(latest);
      if (this.playing || this.queue.length) this.raf = requestAnimationFrame(frame);
      else if (!this.playing) this.emit(null);
    };
    this.raf = requestAnimationFrame(frame);
  }
  private currentVoicing: number[] | undefined;
}

export const engine = new Engine();

// ---------- Drum presets ----------
const grid = (s: string) => s.replace(/\s/g, '').split('').map((c) => c === 'x');

export const DRUM_PRESETS: Record<string, { label: string; pattern: DrumPattern }> = {
  pop: { label: 'Pop', pattern: { kick: grid('x... .... x.x. ....'), snare: grid('.... x... .... x...'), hat: grid('x.x. x.x. x.x. x.x.'), open: grid('.... .... .... ..x.'), ride: grid('................'), tom: grid('................') } },
  rock: { label: 'Rock', pattern: { kick: grid('x... ..x. x... ....'), snare: grid('.... x... .... x...'), hat: grid('x.x. x.x. x.x. x.x.'), open: grid('................'), ride: grid('................'), tom: grid('................') } },
  four: { label: 'Four on the floor', pattern: { kick: grid('x... x... x... x...'), snare: grid('.... x... .... x...'), hat: grid('..x. ..x. ..x. ..x.'), open: grid('..x. ..x. ..x. ..x.').map(() => false), ride: grid('................'), tom: grid('................') } },
  halftime: { label: 'Half-time', pattern: { kick: grid('x... .... ..x. ....'), snare: grid('.... .... x... ....'), hat: grid('x.x. x.x. x.x. x.x.'), open: grid('................'), ride: grid('................'), tom: grid('................') } },
  boombap: { label: 'Boom bap', pattern: { kick: grid('x... ...x ..x. ....'), snare: grid('.... x... .... x...'), hat: grid('x.x. x.x. x.x. x.xx'), open: grid('................'), ride: grid('................'), tom: grid('................') } },
  jazz: { label: 'Jazz ride', pattern: { kick: grid('x... .... .... ....'), snare: grid('.... .... .... ...x'), hat: grid('.... x... .... x...'), open: grid('................'), ride: grid('x... x..x x... x..x'), tom: grid('................') } },
  shuffle: { label: 'Shuffle', pattern: { kick: grid('x... .... x... ....'), snare: grid('.... x... .... x...'), hat: grid('x..x x..x x..x x..x'), open: grid('................'), ride: grid('................'), tom: grid('................') } },
  folk: { label: 'Folk train', pattern: { kick: grid('x... .... x... ....'), snare: grid('..x. x.x. ..x. x.x.'), hat: grid('................'), open: grid('................'), ride: grid('................'), tom: grid('................') } },
  reggae: { label: 'One drop', pattern: { kick: grid('.... .... x... ....'), snare: grid('.... .... x... ....'), hat: grid('x.x. x.x. x.x. x.x.'), open: grid('................'), ride: grid('................'), tom: grid('................') } },
};

export const GENRE_DEFAULTS: Record<string, { drums: string; comp: CompStyle; bass: BassStyle; instrument: Exclude<InstrumentId, 'bass'>; swing: number }> = {
  pop: { drums: 'pop', comp: 'pulse', bass: 'root', instrument: 'piano', swing: 0 },
  rock: { drums: 'rock', comp: 'strum', bass: 'eighths', instrument: 'guitar-overdrive', swing: 0 },
  indie: { drums: 'pop', comp: 'strum', bass: 'root', instrument: 'guitar-clean', swing: 0 },
  rnb: { drums: 'boombap', comp: 'sustain', bass: 'root', instrument: 'piano', swing: 0.35 },
  jazz: { drums: 'jazz', comp: 'pulse', bass: 'walk', instrument: 'guitar-jazz', swing: 0.6 },
  lofi: { drums: 'boombap', comp: 'sustain', bass: 'root', instrument: 'piano', swing: 0.45 },
  edm: { drums: 'four', comp: 'pulse', bass: 'eighths', instrument: 'piano', swing: 0 },
  folk: { drums: 'folk', comp: 'strum', bass: 'fifths', instrument: 'guitar-nylon', swing: 0 },
  blues: { drums: 'shuffle', comp: 'pulse', bass: 'walk', instrument: 'guitar-clean', swing: 0.6 },
  cinematic: { drums: 'halftime', comp: 'arp', bass: 'root', instrument: 'piano', swing: 0 },
};
if (import.meta.env.DEV) (window as unknown as { __engine: Engine }).__engine = engine;
