import { useMemo, useState } from 'react';
import {
  chordFunction, chordSymbol, FUNCTION_INFO, noteName, QUALITIES, QUALITY_ORDER, romanNumeral, scalePitchClasses, suggestReplacements,
  chordPitchClasses, type Chord, type ModeId,
} from '../music/theory';
import { findShapes } from '../music/voicings';
import { ChordDiagram } from './Diagrams';
import { ChordName, Seg } from './ui';
import { IconArrowLeft, IconChevron, IconCopy, IconDice, IconLock, IconPlay, IconTrash, IconUnlock, IconX } from './Icons';

export type DiagramKind = 'guitar' | 'ukulele' | 'piano';

interface Props {
  chords: Chord[];
  index: number;
  tonic: number;
  mode: ModeId;
  flats: boolean;
  diagram: DiagramKind;
  onDiagram: (k: DiagramKind) => void;
  onChange: (c: Chord) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onNavigate: (i: number) => void;
  onAudition: (c: Chord) => void;
  onClose: () => void;
}

export function ChordEditor({ chords, index, tonic, mode, flats, diagram, onDiagram, onChange, onDelete, onDuplicate, onNavigate, onAudition, onClose }: Props) {
  const chord = chords[index];
  const [variant, setVariant] = useState(0);
  const [seed, setSeed] = useState(0);
  const suggestions = useMemo(() => (chords[index] ? suggestReplacements(chords, index, tonic, mode) : []), [chords, index, tonic, mode, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const scale = scalePitchClasses(tonic, mode);
  if (!chord) return null;
  const fn = chordFunction(chord, tonic, mode);
  const sym = chordSymbol(chord, flats);
  const shapes = diagram === 'piano' ? [] : findShapes(chord, diagram);
  const set = (patch: Partial<Chord>) => { const c = { ...chord, ...patch }; onChange(c); onAudition(c); setVariant(0); };

  return (
    <>
      <div className="sheet-head">
        <button className="icon-btn" aria-label="Previous chord" disabled={index === 0} onClick={() => { onNavigate(index - 1); setVariant(0); }}><IconArrowLeft /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2><ChordName symbol={sym} /></h2>
          <div className="roman">{romanNumeral(chord, tonic, mode)} · {QUALITIES[chord.quality].name} · <span style={{ color: `var(--fn-${fn})` }}>{FUNCTION_INFO[fn].label}</span></div>
        </div>
        <button className="icon-btn" aria-label="Next chord" disabled={index >= chords.length - 1} onClick={() => { onNavigate(index + 1); setVariant(0); }}><IconChevron /></button>
        <button className="icon-btn" aria-label="Close editor" onClick={onClose}><IconX /></button>
      </div>

      <div className="editor-actions">
        <button className="btn primary sm" onClick={() => onAudition(chord)}><IconPlay size={16} /> Hear it</button>
        <button className={`btn sm ${chord.locked ? 'primary' : ''}`} style={chord.locked ? { background: 'var(--accent-soft)', color: 'var(--accent)', boxShadow: 'none' } : undefined} onClick={() => onChange({ ...chord, locked: !chord.locked })}>
          {chord.locked ? <IconLock size={16} /> : <IconUnlock size={16} />} {chord.locked ? 'Locked' : 'Lock'}
        </button>
        <button className="btn sm" onClick={onDuplicate}><IconCopy size={16} /> Duplicate</button>
        <button className="btn sm danger" onClick={onDelete} disabled={chords.length <= 1}><IconTrash size={16} /> Remove</button>
      </div>

      <section>
        <Seg value={diagram} onChange={onDiagram} label="Diagram instrument" options={[{ value: 'guitar', label: 'Guitar' }, { value: 'ukulele', label: 'Ukulele' }, { value: 'piano', label: 'Piano' }]} />
        <div className="diagram-wrap" style={{ marginTop: 8, flexDirection: 'column' }}>
          <ChordDiagram chord={chord} kind={diagram} variant={variant} />
          {shapes.length > 1 && (
            <button className="btn ghost sm" onClick={() => setVariant((v) => v + 1)}>Shape {(variant % shapes.length) + 1} of {shapes.length} — next</button>
          )}
          <div className="mono muted" style={{ fontSize: 12 }}>{chordPitchClasses(chord).map((p) => noteName(p, flats)).join(' · ')}</div>
        </div>
      </section>

      <section>
        <h3>Length</h3>
        <Seg value={chord.beats} onChange={(b) => onChange({ ...chord, beats: b })} label="Beats" options={[1, 2, 4, 8].map((b) => ({ value: b, label: b === 4 ? '1 bar' : b === 8 ? '2 bars' : `${b} beat${b > 1 ? 's' : ''}` }))} />
      </section>

      <section>
        <div className="row" style={{ marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>Try instead</h3>
          <span className="spacer" />
          <button className="btn ghost sm" onClick={() => setSeed((s) => s + 1)}><IconDice size={16} /> Shuffle</button>
        </div>
        <div className="suggestions">
          {suggestions.slice(0, 6).map((s) => (
            <button key={`${s.chord.root}-${s.chord.quality}`} className="suggestion" style={{ ['--fn' as string]: `var(--fn-${s.fn})` }} onClick={() => set({ root: s.chord.root, quality: s.chord.quality, bass: undefined })}>
              <span className="sym"><ChordName symbol={chordSymbol(s.chord, flats)} /></span>
              <span className="why">{s.reason}</span>
              <span className="fn-pill">{FUNCTION_INFO[s.fn].label}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3>Root</h3>
        <div className="note-grid">
          {Array.from({ length: 12 }, (_, pc) => (
            <button key={pc} aria-pressed={chord.root === pc} className={scale.includes(pc) ? 'in-key' : ''} onClick={() => set({ root: pc, bass: undefined })}>{noteName(pc, flats)}</button>
          ))}
        </div>
      </section>

      <section>
        <h3>Quality</h3>
        <div className="q-grid">
          {QUALITY_ORDER.map((q) => (
            <button key={q || 'maj'} aria-pressed={chord.quality === q} onClick={() => set({ quality: q })}>{QUALITIES[q].label}</button>
          ))}
        </div>
      </section>

      <section>
        <h3>Bass note (slash chord)</h3>
        <select className="select" value={chord.bass ?? -1} onChange={(e) => { const v = Number(e.target.value); set({ bass: v < 0 ? undefined : v }); }}>
          <option value={-1}>Root ({noteName(chord.root, flats)})</option>
          {chordPitchClasses(chord).filter((p) => p !== chord.root).map((p) => <option key={p} value={p}>/{noteName(p, flats)} — inversion</option>)}
          {Array.from({ length: 12 }, (_, p) => p).filter((p) => !chordPitchClasses(chord).includes(p)).map((p) => <option key={`o${p}`} value={p}>/{noteName(p, flats)}</option>)}
        </select>
      </section>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 16 }}>{FUNCTION_INFO[fn].blurb}</p>
    </>
  );
}
