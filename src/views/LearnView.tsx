import { useEffect, useMemo, useRef, useState } from 'react';
import {
  chordFunction, chordSymbol, chordTension, detectCadence, detectKey, FUNCTION_INFO, MODES, noteName, QUALITIES, romanNumeral,
  type Chord, type ChordFunction,
} from '../music/theory';
import type { Project } from '../state/project';
import { ChordDiagram } from '../components/Diagrams';
import type { DiagramKind } from '../components/ChordEditor';
import { ChordName, Seg } from '../components/ui';

function explain(c: Chord, next: Chord | undefined, p: Project, flats: boolean): string {
  const fn = chordFunction(c, p.tonic, p.mode);
  const interval = (c.root - p.tonic + 12) % 12;
  const name = chordSymbol(c, flats);
  if (fn === 'secondary' && next) return `${name} borrows the dominant sound of ${noteName((c.root + 5) % 12, flats)} — it leans into what comes next.`;
  if (fn === 'borrowed') return `${name} is borrowed from ${noteName(p.tonic, flats)} ${MODES[p.mode].minorish ? 'major' : 'minor'} — a bittersweet twist.`;
  if (fn === 'chromatic') return `${name} sits outside the key — a bold color change.`;
  if (interval === 0) return `${name} is home. Starting or ending here feels settled.`;
  if (fn === 'dominant') return `${name} creates tension that wants to resolve${next ? ` — here it moves to ${chordSymbol(next, flats)}` : ''}.`;
  if (fn === 'subdominant') return `${name} steps away from home and sets up motion.`;
  return `${name} shares notes with the home chord, so it feels like a softer version of home.`;
}

export function LearnView({ project: p, flats, diagram, onDiagram }: { project: Project; flats: boolean; diagram: DiagramKind; onDiagram: (k: DiagramKind) => void }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartW, setChartW] = useState(640);
  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setChartW(Math.max(260, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const all = useMemo(() => p.sections.flatMap((s) => s.chords.map((c) => ({ c, s: s.name }))), [p.sections]);
  const section = p.sections[p.activeSection];
  const detected = useMemo(() => detectKey(all.map((x) => x.c)), [all]);
  const cadence = detectCadence(section.chords, p.tonic);
  const fnCounts = all.reduce<Record<string, number>>((m, { c }) => { const f = chordFunction(c, p.tonic, p.mode); m[f] = (m[f] ?? 0) + 1; return m; }, {});
  const unique = useMemo(() => {
    const seen = new Map<string, Chord>();
    all.forEach(({ c }) => { const k = chordSymbol(c, flats); if (!seen.has(k)) seen.set(k, c); });
    return [...seen.entries()];
  }, [all, flats]);
  const colorful = (fnCounts.borrowed ?? 0) + (fnCounts.secondary ?? 0) + (fnCounts.chromatic ?? 0);
  const extended = all.filter(({ c }) => QUALITIES[c.quality].intervals.length > 3).length;

  // Tension curve, sized to its container so labels stay readable on phones.
  const W = chartW, H = Math.round(Math.min(220, Math.max(150, chartW * 0.32))), pad = 18;
  const pts = all.map(({ c }, i) => ({ x: pad + (all.length <= 1 ? 0.5 : i / (all.length - 1)) * (W - pad * 2), y: H - pad - chordTension(c, p.tonic, p.mode) * (H - pad * 2.4), fn: chordFunction(c, p.tonic, p.mode), c }));
  const path = pts.map((pt, i) => {
    if (i === 0) return `M${pt.x},${pt.y}`;
    const prev = pts[i - 1];
    const cx = (prev.x + pt.x) / 2;
    return `C${cx},${prev.y} ${cx},${pt.y} ${pt.x},${pt.y}`;
  }).join(' ');

  const tips: string[] = [];
  if (!colorful) tips.push('Everything is in key. Try swapping one chord for a borrowed one (like ♭VI or iv) for an emotional lift.');
  if (cadence?.name === 'Open ending') tips.push('This section ends away from home — perfect for a verse that leads into a chorus.');
  if (cadence?.name === 'Authentic cadence') tips.push('Strong V → I ending. For a surprise, try the vi chord instead of I (a deceptive cadence).');
  if (!extended) tips.push('Switch complexity to "Rich" to add 7ths and 9ths for a jazzier, smoother color.');
  if (p.sections.length < 2) tips.push('Add a Chorus section with a different progression — contrast makes songs feel like a journey.');
  if (detected.tonic !== p.tonic && detected.confidence > 0.7) tips.push(`Your chords also sound a lot like ${noteName(detected.tonic, flats)} ${detected.mode}. That ambiguity can be a feature!`);

  return (
    <div className="view">
      <header className="hero">
        <div className="eyebrow">Learn · harmony breakdown</div>
        <h1>Why it <em>works</em>.</h1>
        <p>A plain-language look at the theory behind your progression — functions, tension and cadences.</p>
      </header>

      <div className="stat-row">
        <div className="stat"><div className="k">Key</div><div className="v">{noteName(p.tonic, flats)} {MODES[p.mode].label}</div><div className="s">Sounds like {noteName(detected.tonic, flats)} {detected.mode}</div></div>
        <div className="stat"><div className="k">Ending</div><div className="v" style={{ fontSize: 18 }}>{cadence?.name ?? '—'}</div><div className="s">{section.name}</div></div>
        <div className="stat"><div className="k">Chords</div><div className="v">{all.length}</div><div className="s">{unique.length} unique</div></div>
        <div className="stat"><div className="k">Color</div><div className="v">{colorful + extended}</div><div className="s">{colorful} outside key · {extended} extended</div></div>
      </div>

      <section className="card tension" style={{ marginTop: 14 }}>
        <div className="card-head"><div><h2>Tension curve</h2><div className="sub">How much each chord pulls against home, across the whole song</div></div></div>
        <div ref={chartRef}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Tension over time">
          <defs>
            <linearGradient id="tg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity="0.35" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={pad} x2={W - pad} y1={H - pad - g * (H - pad * 2.4)} y2={H - pad - g * (H - pad * 2.4)} stroke="var(--line)" />)}
          {pts.length > 1 && <path d={`${path} L${pts[pts.length - 1].x},${H - pad} L${pts[0].x},${H - pad} Z`} fill="url(#tg)" />}
          <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2.5} />
          {pts.map((pt, i) => (
            <g key={i}>
              <circle cx={pt.x} cy={pt.y} r={6} fill={`var(--fn-${pt.fn})`} stroke="var(--surface)" strokeWidth={2.5} />
              {all.length <= Math.floor(W / 42) && <text x={pt.x} y={pt.y - 12} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--text)" fontFamily="var(--font-display)">{chordSymbol(pt.c, flats)}</text>}
            </g>
          ))}
        </svg>
        </div>
        <div className="legend">
          {(Object.keys(FUNCTION_INFO) as ChordFunction[]).filter((f) => fnCounts[f]).map((f) => (
            <span key={f} style={{ ['--fn' as string]: `var(--fn-${f})` }}><i />{FUNCTION_INFO[f].label} · {fnCounts[f]}</span>
          ))}
        </div>
      </section>

      <div className="grid-2" style={{ marginTop: 14 }}>
        <section className="card">
          <div className="card-head"><div><h2>{section.name}, chord by chord</h2></div></div>
          <div className="breakdown">
            {section.chords.map((c, i) => {
              const fn = chordFunction(c, p.tonic, p.mode);
              return (
                <div key={c.id} className="breakdown-item" style={{ ['--fn' as string]: `var(--fn-${fn})` }}>
                  <div><div className="sym"><ChordName symbol={chordSymbol(c, flats)} /></div><div className="r">{romanNumeral(c, p.tonic, p.mode)}</div></div>
                  <div className="d"><b>{FUNCTION_INFO[fn].label}.</b> {explain(c, section.chords[i + 1], p, flats)}</div>
                </div>
              );
            })}
          </div>
          {cadence && <p className="muted" style={{ fontSize: 13, marginTop: 12 }}><b style={{ color: 'var(--text)' }}>{cadence.name}:</b> {cadence.description}</p>}
        </section>

        <section className="card">
          <div className="card-head"><div><h2>Ideas to try</h2></div></div>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 10, color: 'var(--muted)', fontSize: 14 }}>
            {tips.slice(0, 4).map((t) => <li key={t}>{t}</li>)}
          </ul>
        </section>
      </div>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="card-head">
          <div><h2>Chord sheet</h2><div className="sub">Every chord in the song</div></div>
        </div>
        <Seg value={diagram} onChange={onDiagram} label="Diagram instrument" options={[{ value: 'guitar', label: 'Guitar' }, { value: 'ukulele', label: 'Ukulele' }, { value: 'piano', label: 'Piano' }]} />
        <div className="sheet-diagrams" style={{ marginTop: 12 }}>
          {unique.map(([sym, c]) => (
            <div className="cell" key={sym}>
              <b><ChordName symbol={sym} /></b>
              <div style={{ display: 'grid', placeItems: 'center', marginTop: 4, minHeight: 90 }}><ChordDiagram chord={c} kind={diagram} compact /></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
