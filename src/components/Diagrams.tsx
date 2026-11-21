import type { ReactElement } from 'react';
import { chordPitchClasses, type Chord } from '../music/theory';
import { findShapes, pianoVoicing, TUNINGS, type Shape } from '../music/voicings';

export function FretDiagram({ shape, instrument, size = 1 }: { shape: Shape | undefined; instrument: 'guitar' | 'ukulele'; size?: number }) {
  const strings = TUNINGS[instrument].strings.length;
  const W = (strings - 1) * 18 + 36;
  const H = 5 * 22 + 40;
  if (!shape) return <svg width={W * size} height={H * size} viewBox={`0 0 ${W} ${H}`}><text x={W / 2} y={H / 2} textAnchor="middle" fill="var(--muted)" fontSize="11">No shape</text></svg>;
  const x = (i: number) => 18 + i * 18;
  const y = (f: number) => 26 + f * 22;
  const fretOf = (f: number) => (f <= 0 ? f : f - shape.baseFret + 1);
  // Barre: lowest fret appearing on 2+ strings with no lower note between them.
  const fretted = shape.frets.filter((f) => f > 0);
  const minF = fretted.length ? Math.min(...fretted) : 0;
  const barreIdx = shape.frets.map((f, i) => (f === minF ? i : -1)).filter((i) => i >= 0);
  const showBarre = barreIdx.length >= 2 && barreIdx[barreIdx.length - 1] === strings - 1 && shape.frets.slice(barreIdx[0], barreIdx[barreIdx.length - 1] + 1).every((f) => f >= minF);
  return (
    <svg width={W * size} height={H * size} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Frets ${shape.frets.map((f) => (f < 0 ? 'x' : f)).join(' ')}`}>
      {shape.baseFret === 1 ? <rect x={x(0) - 1} y={y(0) - 3} width={x(strings - 1) - x(0) + 2} height={4} rx={1.5} fill="var(--text)" /> : <text x={x(0) - 8} y={y(0) + 15} textAnchor="end" fontSize="10" fill="var(--muted)" fontFamily="var(--font-mono)">{shape.baseFret}</text>}
      {[0, 1, 2, 3, 4, 5].map((f) => <line key={f} x1={x(0)} x2={x(strings - 1)} y1={y(f)} y2={y(f)} stroke="var(--faint)" strokeOpacity={0.5} strokeWidth={1} />)}
      {Array.from({ length: strings }, (_, i) => <line key={i} x1={x(i)} x2={x(i)} y1={y(0)} y2={y(5)} stroke="var(--faint)" strokeOpacity={0.8} strokeWidth={1 + (instrument === 'guitar' ? (strings - i) * 0.12 : 0)} />)}
      {showBarre && <rect x={x(barreIdx[0]) - 7} y={y(fretOf(minF)) - 18} width={x(barreIdx[barreIdx.length - 1]) - x(barreIdx[0]) + 14} height={14} rx={7} fill="var(--accent)" />}
      {shape.frets.map((f, i) => {
        if (f < 0) return <text key={i} x={x(i)} y={16} textAnchor="middle" fontSize="11" fill="var(--muted)">✕</text>;
        if (f === 0) return <circle key={i} cx={x(i)} cy={12} r={4.5} fill="none" stroke="var(--muted)" strokeWidth={1.5} />;
        if (showBarre && f === minF && barreIdx.includes(i)) return null;
        return <circle key={i} cx={x(i)} cy={y(fretOf(f)) - 11} r={7} fill="var(--accent)" />;
      })}
    </svg>
  );
}

const WHITE = [0, 2, 4, 5, 7, 9, 11];
const BLACK_POS: Record<number, number> = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 };

export function PianoDiagram({ notes, from = 48, octaves = 2, width = 280 }: { notes: number[]; from?: number; octaves?: number; width?: number }) {
  const whiteCount = octaves * 7;
  const ww = width / whiteCount;
  const H = ww * 4.2;
  const lit = new Set(notes);
  const whites: ReactElement[] = [];
  const blacks: ReactElement[] = [];
  for (let o = 0; o < octaves; o++) {
    WHITE.forEach((pc, i) => {
      const midi = from + o * 12 + pc;
      const on = lit.has(midi);
      whites.push(<rect key={`w${midi}`} x={(o * 7 + i) * ww + 0.5} y={0.5} width={ww - 1} height={H - 1} rx={3} fill={on ? 'var(--accent)' : 'var(--text)'} fillOpacity={on ? 1 : 0.92} />);
    });
    Object.entries(BLACK_POS).forEach(([pcS, pos]) => {
      const midi = from + o * 12 + Number(pcS);
      const on = lit.has(midi);
      blacks.push(<rect key={`b${midi}`} x={(o * 7 + pos + 1) * ww - ww * 0.32} y={0} width={ww * 0.64} height={H * 0.6} rx={2.5} fill={on ? 'var(--accent-2)' : 'var(--surface-3)'} stroke="var(--bg)" strokeWidth={1} />);
    });
  }
  return <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label="Piano voicing">{whites}{blacks}</svg>;
}

export function ChordDiagram({ chord, kind, variant = 0, compact = false }: { chord: Chord; kind: 'guitar' | 'ukulele' | 'piano'; variant?: number; compact?: boolean }) {
  if (kind === 'piano') {
    const v = pianoVoicing(chord);
    const from = Math.floor(Math.min(...v) / 12) * 12;
    return <PianoDiagram notes={v} from={from} octaves={2} width={compact ? 96 : 260} />;
  }
  const shapes = findShapes(chord, kind);
  return <FretDiagram shape={shapes[variant % Math.max(1, shapes.length)]} instrument={kind} size={compact ? 0.78 : 1.25} />;
}

export const chordTonesLabel = (c: Chord, names: (pc: number) => string) => chordPitchClasses(c).map(names).join(' · ');
