import { chordPitchClasses, QUALITIES, type Chord } from './theory';

export type Fretted = 'guitar' | 'ukulele' | 'bass';

export const TUNINGS: Record<Fretted, { strings: number[]; names: string[] }> = {
  guitar: { strings: [40, 45, 50, 55, 59, 64], names: ['E', 'A', 'D', 'G', 'B', 'E'] },
  ukulele: { strings: [67, 60, 64, 69], names: ['G', 'C', 'E', 'A'] },
  bass: { strings: [28, 33, 38, 43], names: ['E', 'A', 'D', 'G'] },
};

/** A fret per string; -1 = muted. */
export interface Shape { frets: number[]; baseFret: number; score: number }

const cache = new Map<string, Shape[]>();

/**
 * Search fretboard windows for playable shapes that contain the chord tones.
 * Scores favour: root in the bass, all tones present, few fingers, low positions, open strings.
 */
export function findShapes(chord: Pick<Chord, 'root' | 'quality' | 'bass'>, instrument: Exclude<Fretted, 'bass'>): Shape[] {
  const key = `${instrument}:${chord.root}:${chord.quality}:${chord.bass ?? ''}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const { strings } = TUNINGS[instrument];
  const pcs = chordPitchClasses(chord);
  // The fifth is optional on 4+ note chords; on big chords the 9th can go too, and on 4 strings even the root.
  const ivs = QUALITIES[chord.quality].intervals;
  let keep = ivs.length > 3 ? ivs.filter((i) => i !== 7) : ivs;
  if (keep.length > strings.length) keep = keep.filter((i) => i !== 14);
  if (keep.length > strings.length) keep = keep.filter((i) => i !== 0);
  const essential = [...new Set(keep.map((i) => (chord.root + i) % 12))];
  const bassPc = chord.bass ?? chord.root;
  const results: Shape[] = [];
  let allowMute = instrument === 'guitar';
  let relaxed = false;

  // Second pass (rare chords like power chords on uke) relaxes the muting rules.
  for (let pass = 0; pass < 2 && !results.length; pass++) {
  if (pass) { allowMute = true; relaxed = true; }
  for (let start = 0; start <= 10; start++) {
    const options = strings.map((open) => {
      const opts: number[] = allowMute ? [-1] : [];
      if (pcs.includes(open % 12)) opts.push(0);
      for (let f = Math.max(1, start); f <= start + 3; f++) if (pcs.includes((open + f) % 12)) opts.push(f);
      return opts;
    });
    if (options.some((o) => o.length === 0)) continue;

    const frets: number[] = new Array(strings.length).fill(-1);
    const walk = (i: number) => {
      if (i === strings.length) {
        evaluate(frets.slice());
        return;
      }
      for (const f of options[i]) {
        frets[i] = f;
        walk(i + 1);
      }
    };
    const evaluate = (fr: number[]) => {
      const sounding = fr.map((f, i) => (f < 0 ? null : strings[i] + f));
      const played = sounding.filter((n): n is number => n !== null);
      if (played.length < (relaxed ? 2 : Math.min(3, strings.length))) return;
      // Mutes only allowed as a contiguous block on the low strings.
      const firstPlayed = fr.findIndex((f) => f >= 0);
      if (!relaxed && fr.slice(firstPlayed).some((f) => f < 0)) return;
      if (firstPlayed > 2) return;
      const present = new Set(played.map((n) => n % 12));
      if (!essential.every((p) => present.has(p))) return;
      const fretted = fr.filter((f) => f > 0);
      const span = fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0;
      if (span > 3) return;
      const minFret = fretted.length ? Math.min(...fretted) : 0;
      // Fingers needed (barre counts the lowest fret once if used on 2+ strings).
      const atMin = fretted.filter((f) => f === minFret).length;
      // A barre only works if nothing between its outer strings is open/muted.
      const barreStrings = fr.map((f, i) => (f === minFret ? i : -1)).filter((i) => i >= 0);
      const barreOk = atMin > 1 && fr.slice(barreStrings[0], barreStrings[barreStrings.length - 1] + 1).every((f) => f >= minFret);
      const fingers = fretted.length - (barreOk ? atMin - 1 : 0);
      if (fingers > 4) return;
      let score = 0;
      const lowest = Math.min(...played);
      if (instrument === 'guitar') score += lowest % 12 === bassPc ? 6 : -4;
      else score += 0; // ukulele re-entrant tuning: bass note matters little
      score += present.size * 0.6;
      score -= fingers * 0.5;
      score -= minFret * 0.35;
      score += fr.filter((f) => f === 0).length * 0.4;
      score -= firstPlayed * 0.3;
      score -= span * 0.2;
      results.push({ frets: fr, baseFret: minFret > 2 ? minFret : 1, score });
    };
    walk(0);
  }
  }

  const unique = new Map<string, Shape>();
  for (const s of results.sort((a, b) => b.score - a.score)) {
    const k = s.frets.join(',');
    if (!unique.has(k)) unique.set(k, s);
  }
  const shapes = [...unique.values()].slice(0, 6);
  cache.set(key, shapes);
  return shapes;
}

/** MIDI notes for a strummed shape (low to high). */
export function shapeNotes(shape: Shape, instrument: Exclude<Fretted, 'bass'>): number[] {
  const { strings } = TUNINGS[instrument];
  return shape.frets.map((f, i) => (f < 0 ? -1 : strings[i] + f)).filter((n) => n >= 0);
}

/** Close piano voicing near a target register, choosing the inversion that moves least from `prev`. */
export function pianoVoicing(chord: Pick<Chord, 'root' | 'quality'>, prev?: number[]): number[] {
  const intervals = QUALITIES[chord.quality].intervals;
  const base = 48 + chord.root; // C3 region for the root
  const tones = intervals.map((i) => base + i);
  const candidates: number[][] = [];
  for (let inv = 0; inv < tones.length; inv++) {
    const v = tones.map((n, i) => (i < inv ? n + 12 : n)).sort((a, b) => a - b);
    for (const shift of [-12, 0, 12]) {
      const s = v.map((n) => n + shift);
      if (s[0] >= 50 && s[s.length - 1] <= 79) candidates.push(s);
    }
  }
  if (!candidates.length) return tones;
  const center = prev?.length ? prev.reduce((a, b) => a + b, 0) / prev.length : 62;
  const cost = (v: number[]) => {
    if (prev?.length) {
      // total distance from each new note to the nearest previous note
      return v.reduce((sum, n) => sum + Math.min(...prev.map((p) => Math.abs(p - n))), 0);
    }
    return Math.abs(v.reduce((a, b) => a + b, 0) / v.length - center);
  };
  return candidates.sort((a, b) => cost(a) - cost(b))[0];
}

export const bassNote = (chord: Pick<Chord, 'root' | 'bass'>) => 28 + (((chord.bass ?? chord.root) - 4 + 12) % 12); // E1..D#2
