import { useCallback, useEffect, useRef, useState } from 'react';
import { generateProgression, uid, type Chord, type Complexity, type GenreId, type ModeId, type MoodId } from '../music/theory';
import { DRUM_PRESETS, GENRE_DEFAULTS, type BassStyle, type CompStyle, type DrumPattern, type InstrumentId, type PlayEvent } from '../audio/engine';

export interface Section { id: string; name: string; chords: Chord[]; repeat: number }

export interface PlaybackSettings {
  instrument: Exclude<InstrumentId, 'bass'>;
  comp: CompStyle;
  bass: BassStyle;
  drumsOn: boolean;
  drumPreset: string;
  drums: DrumPattern;
  swing: number;
  humanize: boolean;
  metronome: boolean;
  countIn: boolean;
  loop: boolean;
  mix: { chords: number; bass: number; drums: number; click: number };
}

export interface Project {
  id: string;
  name: string;
  tonic: number;
  mode: ModeId;
  genre: GenreId;
  mood: MoodId;
  complexity: Complexity;
  length: 4 | 8;
  bpm: number;
  sections: Section[];
  activeSection: number;
  notes: string;
  playback: PlaybackSettings;
  createdAt: number;
  updatedAt: number;
}

const cloneDrums = (p: DrumPattern): DrumPattern => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, [...v]]));

export function playbackForGenre(genre: GenreId, base?: PlaybackSettings): PlaybackSettings {
  const d = GENRE_DEFAULTS[genre];
  return {
    instrument: d.instrument,
    comp: d.comp,
    bass: d.bass,
    drumsOn: base?.drumsOn ?? true,
    drumPreset: d.drums,
    drums: cloneDrums(DRUM_PRESETS[d.drums].pattern),
    swing: d.swing,
    humanize: base?.humanize ?? true,
    metronome: base?.metronome ?? false,
    countIn: base?.countIn ?? false,
    loop: base?.loop ?? true,
    mix: base?.mix ?? { chords: 0.8, bass: 0.75, drums: 0.7, click: 0.5 },
  };
}

export function newProject(): Project {
  const genre: GenreId = 'pop';
  const tonic = 0;
  const mode: ModeId = 'major';
  const chords = generateProgression({ tonic, mode, genre, complexity: 'standard', length: 4 });
  const now = Date.now();
  return {
    id: uid(),
    name: 'Untitled song',
    tonic, mode, genre, mood: 'happy', complexity: 'standard', length: 4, bpm: 104,
    sections: [{ id: uid(), name: 'Verse', chords, repeat: 1 }],
    activeSection: 0,
    notes: '',
    playback: playbackForGenre(genre),
    createdAt: now,
    updatedAt: now,
  };
}

/** Flatten sections (with repeats) into a timeline. */
export function buildTimeline(p: Project, only?: number): PlayEvent[] {
  const events: PlayEvent[] = [];
  let beat = 0;
  p.sections.forEach((s, si) => {
    if (only !== undefined && si !== only) return;
    for (let r = 0; r < Math.max(1, s.repeat); r++) {
      s.chords.forEach((c, ci) => {
        events.push({ chord: c, sectionIndex: si, chordIndex: ci, startBeat: beat });
        beat += c.beats;
      });
    }
  });
  return events;
}

// ---------- persistence ----------
const DRAFT_KEY = 'stagewrite2:draft';
const LIB_KEY = 'stagewrite2:library';

const safeGet = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const safeSet = (k: string, v: string) => { try { localStorage.setItem(k, v); return true; } catch { return false; } };

export function validProject(x: unknown): x is Project {
  const p = x as Project;
  return !!p && typeof p === 'object' && Array.isArray(p.sections) && typeof p.tonic === 'number' && p.sections.every((s) => Array.isArray(s.chords));
}

function hydrate(p: Project): Project {
  const base = newProject();
  return { ...base, ...p, playback: { ...base.playback, ...p.playback, mix: { ...base.playback.mix, ...p.playback?.mix } } };
}

export function loadLibrary(): Project[] {
  try {
    const arr = JSON.parse(safeGet(LIB_KEY) ?? '[]');
    return Array.isArray(arr) ? arr.filter(validProject).map(hydrate) : [];
  } catch { return []; }
}
export function saveLibrary(list: Project[]) { return safeSet(LIB_KEY, JSON.stringify(list)); }

// ---------- share links ----------
export function encodeShare(p: Project): string {
  const compact = {
    n: p.name, t: p.tonic, m: p.mode, g: p.genre, b: p.bpm,
    s: p.sections.map((s) => [s.name, s.repeat, s.chords.map((c) => [c.root, c.quality, c.beats, c.bass ?? -1])]),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(compact));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeShare(code: string): Project | null {
  try {
    const bin = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
    const json = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    const c = JSON.parse(json);
    const base = newProject();
    const p: Project = {
      ...base,
      name: String(c.n ?? 'Shared song').slice(0, 80),
      tonic: Number(c.t) % 12 || 0,
      mode: c.m ?? 'major',
      genre: c.g ?? 'pop',
      bpm: Math.min(240, Math.max(40, Number(c.b) || 100)),
      sections: (c.s as [string, number, [number, string, number, number][]][]).map(([name, repeat, chords]) => ({
        id: uid(), name: String(name).slice(0, 30), repeat: Math.min(8, Math.max(1, Number(repeat) || 1)),
        chords: chords.map(([root, quality, beats, bass]) => ({ id: uid(), root: Number(root) % 12, quality: quality as Chord['quality'], beats: Number(beats) || 4, bass: bass >= 0 ? bass : undefined })),
      })),
    };
    p.playback = playbackForGenre(p.genre);
    return validProject(p) ? p : null;
  } catch { return null; }
}

// ---------- hook with undo/redo ----------
export function useProject() {
  const [project, setProjectState] = useState<Project>(() => {
    const hash = location.hash.match(/#s=([\w-]+)/);
    if (hash) {
      const shared = decodeShare(hash[1]);
      if (shared) { history.replaceState(null, '', location.pathname); return shared; }
    }
    try {
      const raw = safeGet(DRAFT_KEY);
      if (raw) { const p = JSON.parse(raw); if (validProject(p)) return hydrate(p); }
    } catch { /* ignore */ }
    return newProject();
  });
  const past = useRef<Project[]>([]);
  const future = useRef<Project[]>([]);
  const current = useRef(project);
  const [, force] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => safeSet(DRAFT_KEY, JSON.stringify(project)), 250);
    return () => clearTimeout(t);
  }, [project]);

  const commit = useCallback((next: Project) => {
    current.current = next;
    setProjectState(next);
    force((n) => n + 1);
  }, []);

  const update = useCallback((fn: (p: Project) => Project, record = true) => {
    const prev = current.current;
    const next = { ...fn(prev), updatedAt: Date.now() };
    if (record) {
      past.current = [...past.current.slice(-60), prev];
      future.current = [];
    }
    commit(next);
  }, [commit]);

  const replace = useCallback((p: Project) => {
    past.current = [];
    future.current = [];
    commit(p);
  }, [commit]);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(current.current);
    commit(prev);
  }, [commit]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(current.current);
    commit(next);
  }, [commit]);

  return { project, update, replace, undo, redo, canUndo: past.current.length > 0, canRedo: future.current.length > 0 };
}

export type ProjectApi = ReturnType<typeof useProject>;

export const updateSection = (p: Project, idx: number, fn: (s: Section) => Section): Project => ({
  ...p,
  sections: p.sections.map((s, i) => (i === idx ? fn(s) : s)),
});
