import { useState } from 'react';
import {
  chordFunction, chordSymbol, FUNCTION_INFO, generateProgression, GENRES, MODES, MOODS, noteName, romanNumeral, transposeChord, uid,
  parseChordSymbol, type Chord, type GenreId, type ModeId, type MoodId,
} from '../music/theory';
import { playbackForGenre, updateSection, type Project, type ProjectApi } from '../state/project';
import type { Position } from '../audio/engine';
import { ChordName, Seg } from '../components/ui';
import { IconDice, IconLock, IconMinus, IconPlus, IconSpark, IconTrash, IconUnlock } from '../components/Icons';

interface Props {
  api: ProjectApi;
  flats: boolean;
  pos: Position | null;
  onEdit: (i: number) => void;
  toast: (msg: string, action?: { label: string; run: () => void }) => void;
}

export function WriteView({ api, flats, pos, onEdit, toast }: Props) {
  const { project: p, update } = api;
  const section = p.sections[p.activeSection] ?? p.sections[0];
  const [showMore, setShowMore] = useState(false);
  const [typed, setTyped] = useState('');
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const generate = (opts: Partial<Project> = {}) => {
    update((prev) => {
      const next = { ...prev, ...opts };
      const chords = generateProgression({ tonic: next.tonic, mode: next.mode, genre: next.genre, complexity: next.complexity, length: next.length, existing: next.sections[next.activeSection].chords });
      return updateSection(next, next.activeSection, (s) => ({ ...s, chords }));
    });
  };

  const setGenre = (g: GenreId) => {
    generate({ genre: g, bpm: GENRES[g].bpm, playback: playbackForGenre(g, p.playback) });
  };
  const setMood = (m: MoodId) => {
    generate({ mood: m, mode: MOODS[m].mode });
  };

  const transpose = (semis: number) => update((prev) => ({
    ...prev,
    tonic: (prev.tonic + semis + 12) % 12,
    sections: prev.sections.map((s) => ({ ...s, chords: s.chords.map((c) => transposeChord(c, semis)) })),
  }));

  const toggleLock = (i: number) => update((prev) => updateSection(prev, prev.activeSection, (s) => ({ ...s, chords: s.chords.map((c, j) => (j === i ? { ...c, locked: !c.locked } : c)) })));

  const addChord = () => {
    const parsed = typed ? parseChordSymbol(typed) : null;
    if (typed && !parsed) { toast(`Couldn't read "${typed}" — try C, Am7, F#m7b5 or G/B`); return; }
    const last = section.chords[section.chords.length - 1];
    const chord: Chord = parsed ? { id: uid(), ...parsed, beats: 4 } : { id: uid(), root: p.tonic, quality: MODES[p.mode].minorish ? 'm' : '', beats: last?.beats ?? 4 };
    update((prev) => updateSection(prev, prev.activeSection, (s) => ({ ...s, chords: [...s.chords, chord] })));
    setTyped('');
  };

  const move = (from: number, to: number) => {
    if (from === to) return;
    update((prev) => updateSection(prev, prev.activeSection, (s) => {
      const chords = [...s.chords];
      const [c] = chords.splice(from, 1);
      chords.splice(to, 0, c);
      return { ...s, chords };
    }));
  };

  const addSection = () => {
    const names = ['Verse', 'Pre-chorus', 'Chorus', 'Bridge', 'Outro', 'Intro'];
    const used = new Set(p.sections.map((s) => s.name));
    const name = names.find((n) => !used.has(n)) ?? `Part ${p.sections.length + 1}`;
    const chords = generateProgression({ tonic: p.tonic, mode: p.mode, genre: p.genre, complexity: p.complexity, length: p.length });
    update((prev) => ({ ...prev, sections: [...prev.sections, { id: uid(), name, chords, repeat: 1 }], activeSection: prev.sections.length }));
  };

  const removeSection = () => {
    if (p.sections.length <= 1) return;
    const removed = p.sections[p.activeSection];
    update((prev) => ({ ...prev, sections: prev.sections.filter((_, i) => i !== prev.activeSection), activeSection: Math.max(0, prev.activeSection - 1) }));
    toast(`Removed ${removed.name}`, { label: 'Undo', run: api.undo });
  };

  const lockedCount = section.chords.filter((c) => c.locked).length;
  const playingHere = pos && !pos.countIn && pos.sectionIndex === p.activeSection;

  return (
    <div className="view">
      <header className="hero">
        <div className="eyebrow">Write · {noteName(p.tonic, flats)} {MODES[p.mode].label} · {GENRES[p.genre].label}</div>
        <h1>Find the <em>chords</em> your song wants.</h1>
        <p>Pick a vibe, generate, then tap any chord to hear it, swap it or lock it. Everything runs on music-theory rules, right on your device.</p>
      </header>


      <section className="card">
        <div className="sections" role="group" aria-label="Song sections">
          {p.sections.map((s, i) => (
            <button key={s.id} className={`section-tab ${pos && pos.sectionIndex === i ? 'playing' : ''}`} aria-pressed={i === p.activeSection} onClick={() => update((prev) => ({ ...prev, activeSection: i }), false)}>
              {s.name}{s.repeat > 1 && <span className="rep">×{s.repeat}</span>}
            </button>
          ))}
          <button className="section-tab add" onClick={addSection}><IconPlus size={16} /> Section</button>
        </div>

        <div className="chord-grid">
          {section.chords.map((c, i) => {
            const fn = chordFunction(c, p.tonic, p.mode);
            const now = playingHere && pos!.chordIndex === i;
            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                className={`chord-card ${now ? 'now' : ''} ${dragFrom === i ? 'dragging' : ''} ${dragOver === i && dragFrom !== i ? 'drop-target' : ''}`}
                style={{ ['--fn' as string]: `var(--fn-${fn})` }}
                onClick={() => onEdit(i)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(i); } }}
                draggable
                onDragStart={() => setDragFrom(i)}
                onDragOver={(e) => { e.preventDefault(); setDragOver(i); }}
                onDragEnd={() => { setDragFrom(null); setDragOver(null); }}
                onDrop={(e) => { e.preventDefault(); if (dragFrom !== null) move(dragFrom, i); setDragFrom(null); setDragOver(null); }}
                aria-label={`${chordSymbol(c, flats)}, ${romanNumeral(c, p.tonic, p.mode)}, ${c.beats} beats${c.locked ? ', locked' : ''}. Edit`}
              >
                <div className="chord-top">
                  <div>
                    <div className="chord-name"><ChordName symbol={chordSymbol(c, flats)} /></div>
                    <div className="chord-roman">{romanNumeral(c, p.tonic, p.mode)}</div>
                  </div>
                  <button className={`lock-btn ${c.locked ? 'on' : ''}`} aria-label={c.locked ? 'Unlock chord' : 'Lock chord'} aria-pressed={!!c.locked} onClick={(e) => { e.stopPropagation(); toggleLock(i); }}>
                    {c.locked ? <IconLock size={17} /> : <IconUnlock size={17} />}
                  </button>
                </div>
                <div className="chord-foot">
                  <span className="fn-pill">{FUNCTION_INFO[fn].label}</span>
                  <span className="beat-dots" aria-hidden>
                    {Array.from({ length: Math.min(8, c.beats) }, (_, b) => <i key={b} className={now && pos!.beat === b % 4 ? 'on' : ''} />)}
                  </span>
                </div>
              </div>
            );
          })}
          <button className="chord-add" onClick={addChord}><IconPlus /> <span>{typed ? `Add ${typed}` : 'Add chord'}</span></button>
        </div>

        <div className="generate-bar">
          <button className="btn primary big" onClick={() => generate()}><IconSpark /> Generate{lockedCount ? ` (keeps ${lockedCount} locked)` : ''}</button>
          <button className="btn big" aria-label="Surprise me" title="Surprise me" onClick={() => {
            const gs = Object.keys(GENRES) as GenreId[];
            const ms = Object.keys(MOODS) as MoodId[];
            const g = gs[Math.floor(Math.random() * gs.length)];
            const m = ms[Math.floor(Math.random() * ms.length)];
            const tonic = Math.floor(Math.random() * 12);
            generate({ genre: g, mood: m, mode: MOODS[m].mode, bpm: GENRES[g].bpm, tonic, playback: playbackForGenre(g, p.playback) });
            toast(`Surprise: ${MOODS[m].label} ${GENRES[g].label}`);
          }}><IconDice /></button>
        </div>
        <div className="toolbar">
          <div className="group">
            <span className="lbl">Transpose</span>
            <button className="icon-btn" aria-label="Transpose down" onClick={() => transpose(-1)}><IconMinus size={18} /></button>
            <button className="icon-btn" aria-label="Transpose up" onClick={() => transpose(1)}><IconPlus size={18} /></button>
          </div>
          <div className="group">
            <span className="lbl">Repeat</span>
            <button className="icon-btn" aria-label="Fewer repeats" onClick={() => update((prev) => updateSection(prev, prev.activeSection, (s) => ({ ...s, repeat: Math.max(1, s.repeat - 1) })))}><IconMinus size={18} /></button>
            <span className="mono" style={{ minWidth: 22, textAlign: 'center' }}>×{section.repeat}</span>
            <button className="icon-btn" aria-label="More repeats" onClick={() => update((prev) => updateSection(prev, prev.activeSection, (s) => ({ ...s, repeat: Math.min(8, s.repeat + 1) })))}><IconPlus size={18} /></button>
          </div>
          <input className="input" style={{ width: 150, height: 44 }} placeholder="Type a chord…" value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addChord(); }} aria-label="Type a chord to add" />
          <span className="spacer" />
          <input className="input" style={{ width: 130, height: 44 }} value={section.name} onChange={(e) => update((prev) => updateSection(prev, prev.activeSection, (s) => ({ ...s, name: e.target.value.slice(0, 24) })), false)} aria-label="Section name" />
          {p.sections.length > 1 && <button className="icon-btn" aria-label="Delete section" onClick={removeSection}><IconTrash size={18} /></button>}
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <div><h2>Vibe</h2><div className="sub">Genre sets the feel, mood picks the scale.</div></div>
        </div>
        <span className="label">Genre</span>
        <div className="chips" role="group" aria-label="Genre">
          {(Object.keys(GENRES) as GenreId[]).map((g) => (
            <button key={g} className="chip" aria-pressed={p.genre === g} onClick={() => setGenre(g)}><span className="em">{GENRES[g].emoji}</span>{GENRES[g].label}</button>
          ))}
        </div>
        <span className="label" style={{ marginTop: 14 }}>Mood</span>
        <div className="chips" role="group" aria-label="Mood">
          {(Object.keys(MOODS) as MoodId[]).map((m) => (
            <button key={m} className="chip" aria-pressed={p.mood === m} onClick={() => setMood(m)}>{MOODS[m].label}</button>
          ))}
        </div>

        <div className="grid-2" style={{ marginTop: 14 }}>
          <div>
            <span className="label">Complexity</span>
            <Seg value={p.complexity} onChange={(c) => generate({ complexity: c })} label="Complexity"
              options={[{ value: 'simple', label: 'Simple' }, { value: 'standard', label: 'Standard' }, { value: 'rich', label: 'Rich' }]} />
          </div>
          <div>
            <span className="label">Length</span>
            <Seg value={p.length} onChange={(l) => generate({ length: l })} label="Length"
              options={[{ value: 4, label: '4 chords' }, { value: 8, label: '8 chords' }]} />
          </div>
        </div>

        {showMore && (
          <div className="stack" style={{ marginTop: 14 }}>
            <div>
              <span className="label">Key</span>
              <div className="keys12">
                {Array.from({ length: 12 }, (_, pc) => (
                  <button key={pc} aria-pressed={p.tonic === pc} onClick={() => transpose((pc - p.tonic + 12) % 12)}>{noteName(pc, flats)}</button>
                ))}
              </div>
            </div>
            <div>
              <span className="label">Scale / mode</span>
              <select className="select" value={p.mode} onChange={(e) => generate({ mode: e.target.value as ModeId })}>
                {(Object.keys(MODES) as ModeId[]).map((m) => <option key={m} value={m}>{MODES[m].label}</option>)}
              </select>
            </div>
          </div>
        )}
        <button className="btn ghost sm" style={{ marginTop: 10, marginLeft: -8 }} onClick={() => setShowMore((s) => !s)}>
          {showMore ? 'Hide key & scale' : `Key & scale · ${noteName(p.tonic, flats)} ${MODES[p.mode].label}`}
        </button>

      </section>

      <section className="card">
        <div className="card-head"><div><h2>Lyrics & notes</h2><div className="sub">Jot down lines, ideas or a hook. Saved with the song.</div></div></div>
        <textarea className="input" rows={4} placeholder="Verse 1 — …" value={p.notes} onChange={(e) => update((prev) => ({ ...prev, notes: e.target.value }), false)} />
      </section>
    </div>
  );
}
