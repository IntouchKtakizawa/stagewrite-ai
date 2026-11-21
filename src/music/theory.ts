// Core music theory: notes, keys, chords, roman numerals and progression generation.
// Everything here is deterministic rules plus a little randomness — no network calls.

export const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export type ModeId = 'major' | 'minor' | 'dorian' | 'mixolydian' | 'lydian' | 'phrygian' | 'harmonic';

export const MODES: Record<ModeId, { label: string; steps: number[]; minorish: boolean }> = {
  major: { label: 'Major', steps: [0, 2, 4, 5, 7, 9, 11], minorish: false },
  minor: { label: 'Minor', steps: [0, 2, 3, 5, 7, 8, 10], minorish: true },
  dorian: { label: 'Dorian', steps: [0, 2, 3, 5, 7, 9, 10], minorish: true },
  mixolydian: { label: 'Mixolydian', steps: [0, 2, 4, 5, 7, 9, 10], minorish: false },
  lydian: { label: 'Lydian', steps: [0, 2, 4, 6, 7, 9, 11], minorish: false },
  phrygian: { label: 'Phrygian', steps: [0, 1, 3, 5, 7, 8, 10], minorish: true },
  harmonic: { label: 'Harmonic minor', steps: [0, 2, 3, 5, 7, 8, 11], minorish: true },
};

export type Quality =
  | '' | 'm' | 'dim' | 'aug' | '5' | 'sus2' | 'sus4'
  | '6' | 'm6' | '7' | 'maj7' | 'm7' | 'm7b5' | 'dim7' | 'mMaj7'
  | 'add9' | 'madd9' | '9' | 'maj9' | 'm9' | '7sus4' | '13' | '7b9';

export const QUALITIES: Record<Quality, { label: string; intervals: number[]; name: string }> = {
  '': { label: 'maj', intervals: [0, 4, 7], name: 'major' },
  m: { label: 'm', intervals: [0, 3, 7], name: 'minor' },
  dim: { label: 'dim', intervals: [0, 3, 6], name: 'diminished' },
  aug: { label: 'aug', intervals: [0, 4, 8], name: 'augmented' },
  '5': { label: '5', intervals: [0, 7], name: 'power chord' },
  sus2: { label: 'sus2', intervals: [0, 2, 7], name: 'suspended 2nd' },
  sus4: { label: 'sus4', intervals: [0, 5, 7], name: 'suspended 4th' },
  '6': { label: '6', intervals: [0, 4, 7, 9], name: 'major 6th' },
  m6: { label: 'm6', intervals: [0, 3, 7, 9], name: 'minor 6th' },
  '7': { label: '7', intervals: [0, 4, 7, 10], name: 'dominant 7th' },
  maj7: { label: 'maj7', intervals: [0, 4, 7, 11], name: 'major 7th' },
  m7: { label: 'm7', intervals: [0, 3, 7, 10], name: 'minor 7th' },
  m7b5: { label: 'm7♭5', intervals: [0, 3, 6, 10], name: 'half-diminished' },
  dim7: { label: 'dim7', intervals: [0, 3, 6, 9], name: 'diminished 7th' },
  mMaj7: { label: 'm(maj7)', intervals: [0, 3, 7, 11], name: 'minor-major 7th' },
  add9: { label: 'add9', intervals: [0, 4, 7, 14], name: 'added 9th' },
  madd9: { label: 'm(add9)', intervals: [0, 3, 7, 14], name: 'minor added 9th' },
  '9': { label: '9', intervals: [0, 4, 7, 10, 14], name: 'dominant 9th' },
  maj9: { label: 'maj9', intervals: [0, 4, 7, 11, 14], name: 'major 9th' },
  m9: { label: 'm9', intervals: [0, 3, 7, 10, 14], name: 'minor 9th' },
  '7sus4': { label: '7sus4', intervals: [0, 5, 7, 10], name: 'dominant 7th sus4' },
  '13': { label: '13', intervals: [0, 4, 7, 10, 14, 21], name: 'dominant 13th' },
  '7b9': { label: '7♭9', intervals: [0, 4, 7, 10, 13], name: 'dominant 7th flat 9' },
};

export const QUALITY_ORDER: Quality[] = [
  '', 'm', '7', 'maj7', 'm7', 'sus2', 'sus4', 'add9', 'madd9', '6', 'm6',
  '9', 'maj9', 'm9', 'dim', 'm7b5', 'dim7', 'aug', '7sus4', '7b9', '13', 'mMaj7', '5',
];

export type ChordFunction = 'tonic' | 'subdominant' | 'dominant' | 'borrowed' | 'secondary' | 'chromatic';

export interface Chord {
  id: string;
  root: number; // pitch class 0-11
  quality: Quality;
  bass?: number; // slash-chord bass pitch class
  beats: number;
  locked?: boolean;
}

export const uid = () => Math.random().toString(36).slice(2, 10);

const FLAT_KEYS_MAJOR = new Set([5, 10, 3, 8, 1, 6]); // F Bb Eb Ab Db Gb

/** Whether to spell notes in this key with flats. */
export function prefersFlats(tonic: number, mode: ModeId): boolean {
  // Map the key to its relative major to decide spelling.
  const relMajorOffset: Record<ModeId, number> = {
    major: 0, lydian: 7, mixolydian: 5, minor: 3, dorian: 10, phrygian: 8, harmonic: 3,
  };
  const rel = (tonic + relMajorOffset[mode]) % 12;
  return FLAT_KEYS_MAJOR.has(rel);
}

export const noteName = (pc: number, flats = false) => (flats ? FLAT_NAMES : SHARP_NAMES)[((pc % 12) + 12) % 12];

export function chordSymbol(c: Pick<Chord, 'root' | 'quality' | 'bass'>, flats = false): string {
  const q = c.quality === '' ? '' : QUALITIES[c.quality].label;
  const base = noteName(c.root, flats) + q;
  return c.bass !== undefined && c.bass !== c.root ? `${base}/${noteName(c.bass, flats)}` : base;
}

export function chordPitchClasses(c: Pick<Chord, 'root' | 'quality'>): number[] {
  return [...new Set(QUALITIES[c.quality].intervals.map((i) => (c.root + i) % 12))];
}

export const isMinorQuality = (q: Quality) => ['m', 'm7', 'm6', 'm9', 'madd9', 'mMaj7'].includes(q);
export const isDimQuality = (q: Quality) => ['dim', 'm7b5', 'dim7'].includes(q);

// ---------- Roman numerals ----------

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const MAJOR_STEPS = MODES.major.steps;

/** Roman numeral for a chord relative to a key (uses the major scale as reference, with ♭/♯). */
export function romanNumeral(c: Pick<Chord, 'root' | 'quality'>, tonic: number, mode: ModeId): string {
  const interval = (c.root - tonic + 12) % 12;
  const modeSteps = MODES[mode].steps;
  let degree = modeSteps.indexOf(interval);
  let accidental = '';
  if (degree === -1) {
    degree = MAJOR_STEPS.indexOf(interval);
    if (degree === -1) {
      degree = MAJOR_STEPS.indexOf((interval + 1) % 12);
      accidental = '♭';
    }
  } else {
    // Express relative to major-scale degrees so ♭III etc. read conventionally.
    const majorPc = MAJOR_STEPS[degree];
    if (majorPc - interval === 1) accidental = '♭';
    else if (interval - majorPc === 1) accidental = '♯';
  }
  let numeral = NUMERALS[degree];
  const q = c.quality;
  if (isMinorQuality(q) || isDimQuality(q)) numeral = numeral.toLowerCase();
  let suffix = '';
  if (q === 'dim') suffix = '°';
  else if (q === 'dim7') suffix = '°7';
  else if (q === 'm7b5') suffix = 'ø7';
  else if (q === 'aug') suffix = '+';
  else if (q === 'm') suffix = '';
  else if (q === '') suffix = '';
  else suffix = QUALITIES[q].label.replace(/^m(?!aj)/, '');
  return accidental + numeral + suffix;
}

// Parse a roman-numeral token (relative to tonic) into a chord. Uppercase = major, lowercase = minor.
const ROMAN_RE = /^(b|#)?(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(o7|o|ø7|\+|maj9|maj7|m7b5|7sus4|sus2|sus4|add9|7b9|13|9|7|6|5)?(?:\/(.+))?$/;

export function parseRoman(token: string, tonic: number, steps: number[] = MAJOR_STEPS): Chord {
  const m = ROMAN_RE.exec(token);
  if (!m) throw new Error(`Bad numeral ${token}`);
  const [, acc, num, ext, applied] = m;
  // Secondary dominants: "V7/vi" → dominant of the vi chord.
  let center = tonic;
  if (applied) center = parseRoman(applied, tonic, steps).root;
  const deg = NUMERALS.indexOf(num.toUpperCase());
  let root = (center + (applied ? MAJOR_STEPS : steps)[deg] + (acc === 'b' ? -1 : acc === '#' ? 1 : 0) + 12) % 12;
  const lower = num === num.toLowerCase();
  let quality: Quality = lower ? 'm' : '';
  switch (ext) {
    case 'o': quality = 'dim'; break;
    case 'o7': quality = 'dim7'; break;
    case 'ø7': case 'm7b5': quality = 'm7b5'; break;
    case '+': quality = 'aug'; break;
    case '7': quality = lower ? 'm7' : '7'; break;
    case 'maj7': quality = lower ? 'mMaj7' : 'maj7'; break;
    case '9': quality = lower ? 'm9' : '9'; break;
    case 'maj9': quality = 'maj9'; break;
    case 'add9': quality = lower ? 'madd9' : 'add9'; break;
    case '6': quality = lower ? 'm6' : '6'; break;
    case 'sus2': quality = 'sus2'; break;
    case 'sus4': quality = 'sus4'; break;
    case '7sus4': quality = '7sus4'; break;
    case '7b9': quality = '7b9'; break;
    case '13': quality = '13'; break;
    case '5': quality = '5'; break;
  }
  root = ((root % 12) + 12) % 12;
  return { id: uid(), root, quality, beats: 4 };
}

// ---------- Diatonic harmony ----------

export function scalePitchClasses(tonic: number, mode: ModeId): number[] {
  return MODES[mode].steps.map((s) => (tonic + s) % 12);
}

function triadQuality(third: number, fifth: number): Quality {
  if (third === 4 && fifth === 7) return '';
  if (third === 3 && fifth === 7) return 'm';
  if (third === 3 && fifth === 6) return 'dim';
  if (third === 4 && fifth === 8) return 'aug';
  return '';
}

function seventhQuality(base: Quality, seventh: number): Quality {
  if (base === '') return seventh === 11 ? 'maj7' : '7';
  if (base === 'm') return seventh === 11 ? 'mMaj7' : 'm7';
  if (base === 'dim') return seventh === 9 ? 'dim7' : 'm7b5';
  return base;
}

export function diatonicChords(tonic: number, mode: ModeId, sevenths = false): Chord[] {
  const steps = MODES[mode].steps;
  return steps.map((s, i) => {
    const at = (k: number) => (steps[(i + k) % 7] - s + 12) % 12;
    let q = triadQuality(at(2), at(4));
    if (sevenths) q = seventhQuality(q, at(6));
    return { id: uid(), root: (tonic + s) % 12, quality: q, beats: 4 };
  });
}

/** Harmonic function of a chord within a key. */
export function chordFunction(c: Chord, tonic: number, mode: ModeId): ChordFunction {
  const interval = (c.root - tonic + 12) % 12;
  const scale = scalePitchClasses(tonic, mode);
  const tones = chordPitchClasses(c);
  const diatonic = tones.every((t) => scale.includes(t)) || (['5', 'sus2', 'sus4'].includes(c.quality) && scale.includes(c.root));
  const degree = MODES[mode].steps.indexOf(interval);
  if (diatonic && degree !== -1) {
    if ([0, 2, 5].includes(degree)) return 'tonic';
    if ([1, 3].includes(degree)) return 'subdominant';
    return 'dominant';
  }
  // Major/dominant chord a fifth above a diatonic chord's root → secondary dominant.
  const isDom = ['', '7', '9', '7b9', '13'].includes(c.quality);
  const target = (c.root + 5) % 12;
  if (isDom && scale.includes(target) && target !== tonic) return 'secondary';
  if (isDom && target === tonic) return 'dominant';
  // Borrowed from the parallel major/minor.
  const parallel = MODES[mode].minorish ? 'major' : 'minor';
  const pScale = scalePitchClasses(tonic, parallel);
  if (tones.every((t) => pScale.includes(t))) return 'borrowed';
  return 'chromatic';
}

export const FUNCTION_INFO: Record<ChordFunction, { label: string; blurb: string }> = {
  tonic: { label: 'Home', blurb: 'Stable — feels like home base or a place to rest.' },
  subdominant: { label: 'Away', blurb: 'Moves away from home and builds gentle motion.' },
  dominant: { label: 'Tension', blurb: 'Strong pull back toward the home chord.' },
  borrowed: { label: 'Borrowed', blurb: 'Taken from the parallel major/minor for extra color.' },
  secondary: { label: 'Applied', blurb: 'A temporary dominant that points to another chord.' },
  chromatic: { label: 'Color', blurb: 'Outside the key — a deliberate splash of color.' },
};

/** 0–1 tension estimate used for the tension curve. */
export function chordTension(c: Chord, tonic: number, mode: ModeId): number {
  const fn = chordFunction(c, tonic, mode);
  let t = { tonic: 0.15, subdominant: 0.45, dominant: 0.8, borrowed: 0.55, secondary: 0.75, chromatic: 0.65 }[fn];
  const interval = (c.root - tonic + 12) % 12;
  if (fn === 'tonic' && interval !== 0) t = 0.3;
  if (QUALITIES[c.quality].intervals.length > 3) t += 0.07;
  if (isDimQuality(c.quality) || c.quality === 'aug' || c.quality === '7b9') t += 0.12;
  if (c.quality.includes('sus')) t += 0.08;
  return Math.min(1, t);
}

// ---------- Progression generation ----------

export const GENRES = {
  pop: {
    label: 'Pop', emoji: '✦', bpm: 104,
    major: ['I V vi IV', 'vi IV I V', 'I vi IV V', 'I IV vi V', 'IV I V vi', 'I V IV V', 'I iii vi IV', 'IV V iii vi'],
    minor: ['i VI III VII', 'i VII VI VII', 'VI VII i i', 'i iv VI V', 'i III VII VI'],
  },
  rock: {
    label: 'Rock', emoji: '⚡', bpm: 120,
    major: ['I bVII IV I', 'I IV V IV', 'I V IV IV', 'I bIII IV I', 'I IV bVII IV', 'vi IV I V', 'I bVI bVII I'],
    minor: ['i VII VI VII', 'i VI VII i', 'i iv VII III', 'i III VII IV', 'i VI III VII'],
  },
  indie: {
    label: 'Indie', emoji: '◐', bpm: 112,
    major: ['I iii IV iv', 'I IV vi V', 'IV I iii vi', 'I II IV I', 'vi IV I iii', 'I V/vi vi IV'],
    minor: ['i v VI IV', 'i VII v VI', 'i III iv VI', 'i IV i VII'],
  },
  rnb: {
    label: 'R&B / Neo-soul', emoji: '◆', bpm: 78,
    major: ['IVmaj7 iii7 vi7 V7/ii', 'Imaj7 vi7 ii7 V7', 'ii7 V7 Imaj7 vi7', 'IVmaj7 V7 iii7 vi7', 'Imaj7 iii7 IVmaj7 V7sus4'],
    minor: ['i7 iv7 VIImaj7 IIImaj7', 'i9 iv7 VImaj7 V7b9', 'VImaj7 v7 i7 iv7'],
  },
  jazz: {
    label: 'Jazz', emoji: '♪', bpm: 132,
    major: ['ii7 V7 Imaj7 Imaj7', 'Imaj7 vi7 ii7 V7', 'iii7 VI7 ii7 V7', 'Imaj7 V7/ii ii7 V7', 'ii7 bII7 Imaj7 vi7'],
    minor: ['iiø7 V7b9 i7 i7', 'i7 iv7 iiø7 V7b9', 'i7 VI7 iiø7 V7'],
  },
  lofi: {
    label: 'Lo-fi', emoji: '☾', bpm: 82,
    major: ['IVmaj7 iii7 ii7 Imaj7', 'Imaj9 vi7 ii9 V7sus4', 'ii9 V13 Imaj9 vi9', 'IVmaj9 V7/vi vi9 Imaj7'],
    minor: ['i9 VImaj7 iv9 V7b9', 'i7 iv9 VIImaj7 IIImaj7', 'iv9 VII13 IIImaj7 VImaj7'],
  },
  edm: {
    label: 'EDM', emoji: '▲', bpm: 126,
    major: ['vi IV I V', 'IV V vi vi', 'I V vi iii'],
    minor: ['i VI III VII', 'i VI VII v', 'VI VII i i', 'i iv VI VII', 'i III VII VI'],
  },
  folk: {
    label: 'Folk', emoji: '❀', bpm: 96,
    major: ['I IV I V', 'I V IV I', 'I vi IV V', 'IV I V I', 'I IV vi V', 'I iii IV I'],
    minor: ['i VII i VII', 'i VI VII i', 'i iv i v'],
  },
  blues: {
    label: 'Blues', emoji: '♠', bpm: 92,
    major: ['I7 IV7 I7 V7', 'I7 I7 IV7 IV7', 'I7 IV7 V7 IV7'],
    minor: ['i7 iv7 i7 V7', 'i7 VI7 V7 i7'],
  },
  cinematic: {
    label: 'Cinematic', emoji: '◎', bpm: 84,
    major: ['I bVI bVII I', 'I III IV iv', 'vi IV I V', 'I V/vi vi bVI'],
    minor: ['i VI III VII', 'i iv VI V', 'i bII i V', 'VI III VII i', 'i VI iv V'],
  },
} as const;

export type GenreId = keyof typeof GENRES;

export const MOODS = {
  happy: { label: 'Happy', mode: 'major' as ModeId },
  uplifting: { label: 'Uplifting', mode: 'major' as ModeId },
  dreamy: { label: 'Dreamy', mode: 'lydian' as ModeId },
  chill: { label: 'Chill', mode: 'major' as ModeId },
  bittersweet: { label: 'Bittersweet', mode: 'dorian' as ModeId },
  sad: { label: 'Sad', mode: 'minor' as ModeId },
  dark: { label: 'Dark', mode: 'phrygian' as ModeId },
  tense: { label: 'Tense', mode: 'harmonic' as ModeId },
  gritty: { label: 'Gritty', mode: 'mixolydian' as ModeId },
} as const;

export type MoodId = keyof typeof MOODS;

export type Complexity = 'simple' | 'standard' | 'rich';

function simplify(c: Chord): Chord {
  const map: Partial<Record<Quality, Quality>> = {
    '7': '7', maj7: '', m7: 'm', m9: 'm', '9': '7', maj9: '', add9: '', madd9: 'm', '6': '', m6: 'm',
    '13': '7', '7b9': '7', '7sus4': 'sus4', m7b5: 'dim', mMaj7: 'm', dim7: 'dim',
  };
  return { ...c, quality: map[c.quality] ?? c.quality };
}

function enrich(c: Chord, tonic: number, mode: ModeId, rand: () => number): Chord {
  const interval = (c.root - tonic + 12) % 12;
  if (c.quality === '') {
    if (interval === 7) return { ...c, quality: rand() < 0.6 ? '7' : '9' };
    const r = rand();
    return { ...c, quality: r < 0.5 ? 'maj7' : r < 0.75 ? 'add9' : 'maj9' };
  }
  if (c.quality === 'm') return { ...c, quality: rand() < 0.65 ? 'm7' : 'm9' };
  if (c.quality === 'dim') return { ...c, quality: 'm7b5' };
  void mode;
  return c;
}

function adaptToMode(c: Chord, tonic: number, mode: ModeId): Chord {
  // Nudge templates toward a mode's signature color.
  const interval = (c.root - tonic + 12) % 12;
  if (mode === 'lydian' && interval === 2 && c.quality === 'm') return { ...c, quality: '' };
  if (mode === 'dorian' && interval === 5 && c.quality === 'm') return { ...c, quality: '' };
  if (mode === 'phrygian' && interval === 2) return { ...c, root: (tonic + 1) % 12, quality: '' };
  if (mode === 'harmonic' && interval === 7 && ['m', 'm7'].includes(c.quality)) return { ...c, quality: c.quality === 'm7' ? '7b9' : '7' };
  if (mode === 'harmonic' && interval === 10 && c.quality === '') return { ...c, root: (tonic + 11) % 12, quality: 'dim' };
  if (mode === 'mixolydian' && interval === 7 && c.quality === '') return { ...c, quality: 'm' };
  if (mode === 'mixolydian' && interval === 11) return { ...c, root: (tonic + 10) % 12, quality: '' };
  return c;
}

export interface GenerateOptions {
  tonic: number;
  mode: ModeId;
  genre: GenreId;
  complexity: Complexity;
  length: 4 | 8;
  existing?: Chord[]; // locked chords are preserved by index
}

export function generateProgression(o: GenerateOptions): Chord[] {
  const rand = Math.random;
  const g = GENRES[o.genre];
  const pool: readonly string[] = MODES[o.mode].minorish ? g.minor : g.major;
  const pick = () => pool[Math.floor(rand() * pool.length)];
  let tokens = pick().split(' ');
  if (o.length === 8) {
    let second = pick().split(' ');
    // Make the 8-bar phrase end with a cadence-ish move when possible.
    if (rand() < 0.5) second = [...tokens.slice(0, 2), ...second.slice(2)];
    tokens = [...tokens, ...second];
  }
  const steps = MODES[o.mode].minorish ? MODES.minor.steps : MAJOR_STEPS;
  let chords = tokens.map((t) => parseRoman(t, o.tonic, steps)).map((c) => adaptToMode(c, o.tonic, o.mode));
  if (o.complexity === 'simple') chords = chords.map(simplify);
  if (o.complexity === 'rich') chords = chords.map((c) => (QUALITIES[c.quality].intervals.length <= 3 ? enrich(c, o.tonic, o.mode, rand) : c));
  if (o.complexity === 'standard' && o.genre !== 'jazz' && o.genre !== 'rnb' && o.genre !== 'lofi' && o.genre !== 'blues') {
    // Occasionally add one tasteful color chord.
    if (rand() < 0.5) {
      const i = Math.floor(rand() * chords.length);
      const c = chords[i];
      if (c.quality === '') chords[i] = { ...c, quality: rand() < 0.5 ? 'sus2' : 'add9' };
      else if (c.quality === 'm') chords[i] = { ...c, quality: 'm7' };
    }
  }
  if (o.existing) {
    chords = chords.map((c, i) => (o.existing![i]?.locked ? o.existing![i] : c));
    // Preserve locked chords beyond the generated length too.
    o.existing.forEach((c, i) => { if (i >= chords.length && c.locked) chords.push(c); });
  }
  return chords.map((c) => ({ ...c, id: c.locked ? c.id : uid() }));
}

// ---------- Suggestions ----------

export interface Suggestion { chord: Chord; reason: string; fn: ChordFunction; score: number }

function commonTones(a: Chord, b: Chord) {
  const pa = chordPitchClasses(a);
  return chordPitchClasses(b).filter((p) => pa.includes(p)).length;
}

export function suggestReplacements(prog: Chord[], index: number, tonic: number, mode: ModeId): Suggestion[] {
  const current = prog[index];
  const prev = prog[index - 1];
  const next = prog[index + 1] ?? prog[0];
  const candidates: { chord: Chord; reason: string }[] = [];
  const rich = QUALITIES[current.quality].intervals.length > 3;
  diatonicChords(tonic, mode, rich).forEach((c) => candidates.push({ chord: c, reason: 'In key' }));
  if (rich) diatonicChords(tonic, mode, false).forEach((c) => candidates.push({ chord: c, reason: 'In key (triad)' }));
  // Borrowed chords
  const parallel: ModeId = MODES[mode].minorish ? 'major' : 'minor';
  diatonicChords(tonic, parallel, false).forEach((c) => candidates.push({ chord: c, reason: `Borrowed from ${MODES[parallel].label.toLowerCase()}` }));
  // Secondary dominant leading into the next chord
  if (next) {
    candidates.push({ chord: { id: uid(), root: (next.root + 7) % 12, quality: '7', beats: 4 }, reason: `Dominant of ${chordSymbol(next, prefersFlats(tonic, mode))} — pulls into it` });
    candidates.push({ chord: { id: uid(), root: (next.root + 1) % 12, quality: '7', beats: 4 }, reason: `Tritone sub — slides down a half step into ${chordSymbol(next, prefersFlats(tonic, mode))}` });
    candidates.push({ chord: { id: uid(), root: (next.root + 11) % 12, quality: 'dim7', beats: 4 }, reason: 'Passing diminished — chromatic lead-in' });
  }
  // Color variants of the same root
  (['sus2', 'sus4', 'add9', isMinorQuality(current.quality) ? 'm7' : 'maj7'] as Quality[]).forEach((q) => {
    if (q !== current.quality) candidates.push({ chord: { id: uid(), root: current.root, quality: q, beats: 4 }, reason: 'Same root, new color' });
  });

  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const { chord, reason } of candidates) {
    const key = `${chord.root}-${chord.quality}`;
    if (seen.has(key) || (chord.root === current.root && chord.quality === current.quality)) continue;
    seen.add(key);
    let score = 0;
    if (prev) score += commonTones(prev, chord) * 0.6;
    if (next) score += commonTones(chord, next) * 0.6;
    if ((next && (chord.root + 5) % 12 === next.root)) score += 1.2; // falls a fifth into next
    if (reason.startsWith('In key')) score += 0.8;
    if (reason.startsWith('Same root')) score += 0.5;
    score += Math.random() * 0.3;
    out.push({ chord: { ...chord, beats: current.beats }, reason, fn: chordFunction(chord, tonic, mode), score });
  }
  // Diversify so one kind of idea doesn't crowd out the rest.
  const caps: Record<string, number> = { 'In key': 3, Same: 2, Borrowed: 2 };
  const used: Record<string, number> = {};
  const sorted = out.sort((a, b) => b.score - a.score);
  const picked: Suggestion[] = [];
  for (const sug of sorted) {
    const cat = sug.reason.startsWith('In key') ? 'In key' : sug.reason.split(' ')[0];
    if ((used[cat] ?? 0) >= (caps[cat] ?? 1)) continue;
    used[cat] = (used[cat] ?? 0) + 1;
    picked.push(sug);
  }
  return [...picked, ...sorted.filter((x) => !picked.includes(x))].slice(0, 12);
}

// ---------- Analysis ----------

export interface Cadence { name: string; description: string }

export function detectCadence(prog: Chord[], tonic: number): Cadence | null {
  if (prog.length < 2) return null;
  const a = prog[prog.length - 2];
  const b = prog[prog.length - 1];
  const ia = (a.root - tonic + 12) % 12;
  const ib = (b.root - tonic + 12) % 12;
  if (ia === 7 && ib === 0) return { name: 'Authentic cadence', description: 'V → I: the strongest "we\'re home" ending.' };
  if (ia === 5 && ib === 0) return { name: 'Plagal cadence', description: 'IV → I: the soft "amen" ending.' };
  if (ib === 7) return { name: 'Half cadence', description: 'Ends on V — leaves the phrase hanging, wanting more.' };
  if (ia === 7 && ib === 9) return { name: 'Deceptive cadence', description: 'V → vi: sets up home, then swerves.' };
  if (ia === 10 && ib === 0) return { name: 'Backdoor cadence', description: '♭VII → I: a relaxed, rock-flavored arrival.' };
  if (ia === 8 && ib === 0) return { name: 'Aeolian cadence', description: '♭VI → I: epic, cinematic resolution.' };
  if (ib === 0) return { name: 'Resolves home', description: 'The phrase lands back on the tonic.' };
  return { name: 'Open ending', description: 'Doesn\'t land on home — great for loops that keep moving.' };
}

/** Key detection: score every key/mode by how many chord tones fit, preferring a tonic at the start/end. */
export function detectKey(prog: Chord[]): { tonic: number; mode: ModeId; confidence: number } {
  let best = { tonic: 0, mode: 'major' as ModeId, score: -Infinity };
  for (let t = 0; t < 12; t++) {
    for (const mode of ['major', 'minor'] as ModeId[]) {
      const scale = scalePitchClasses(t, mode);
      let score = 0;
      prog.forEach((c, i) => {
        const tones = chordPitchClasses(c);
        score += tones.filter((p) => scale.includes(p)).length / tones.length;
        if (c.root === t && (i === 0 || i === prog.length - 1)) score += 0.6;
        if (c.root === t) score += 0.25;
        if (mode === 'minor' && c.root === t && isMinorQuality(c.quality)) score += 0.3;
        if (mode === 'major' && c.root === t && !isMinorQuality(c.quality)) score += 0.3;
      });
      if (score > best.score) best = { tonic: t, mode, score };
    }
  }
  return { tonic: best.tonic, mode: best.mode, confidence: Math.min(1, best.score / (prog.length * 1.6 || 1)) };
}

export function transposeChord(c: Chord, semis: number): Chord {
  return { ...c, root: (c.root + semis + 120) % 12, bass: c.bass !== undefined ? (c.bass + semis + 120) % 12 : undefined };
}

/** Parse a typed chord symbol like "F#m7", "Bbmaj7", "C/G". */
export function parseChordSymbol(input: string): Omit<Chord, 'id' | 'beats'> | null {
  const s = input.trim().replace('♭', 'b').replace('♯', '#');
  const m = /^([A-Ga-g])([#b]?)(.*?)(?:\/([A-Ga-g][#b]?))?$/.exec(s);
  if (!m) return null;
  const pc = (letter: string, acc: string) => {
    const base = SHARP_NAMES.indexOf(letter.toUpperCase());
    return (base + (acc === '#' ? 1 : acc === 'b' ? -1 : 0) + 12) % 12;
  };
  const root = pc(m[1], m[2]);
  const rest = m[3].replace('min', 'm').replace('M7', 'maj7').replace('Δ', 'maj7').replace('ø', 'm7b5').replace('°7', 'dim7').replace('°', 'dim').replace('-', 'm');
  const aliases: Record<string, Quality> = { '': '', maj: '', m: 'm', mmaj7: 'mMaj7', 'm(maj7)': 'mMaj7', 'm(add9)': 'madd9', '+': 'aug' };
  let quality: Quality | undefined = aliases[rest] ?? (rest in QUALITIES ? (rest as Quality) : undefined);
  if (quality === undefined) quality = (Object.keys(QUALITIES) as Quality[]).find((q) => QUALITIES[q].label === rest);
  if (quality === undefined) return null;
  const bass = m[4] ? pc(m[4][0], m[4].slice(1)) : undefined;
  return { root, quality, bass };
}
