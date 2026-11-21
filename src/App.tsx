import { useCallback, useEffect, useMemo, useState } from 'react';
import { useProject, buildTimeline, updateSection } from './state/project';
import { engine, type Position, type TransportOptions } from './audio/engine';
import { chordSymbol, prefersFlats, uid, type Chord } from './music/theory';
import { WriteView } from './views/WriteView';
import { PlayView } from './views/PlayView';
import { LearnView } from './views/LearnView';
import { TuneView } from './views/TuneView';
import { LibraryView, type Spelling, type ThemePref } from './views/LibraryView';
import { ChordEditor, type DiagramKind } from './components/ChordEditor';
import { ChordName, Sheet } from './components/ui';
import {
  IconLearn, IconLibrary, IconLogo, IconMinus, IconMixer, IconMoon, IconPlay, IconPlus, IconRedo, IconRepeat, IconStop, IconSun, IconTuner, IconUndo, IconWrite,
} from './components/Icons';

type Tab = 'write' | 'play' | 'learn' | 'tune' | 'library';
const TABS: { id: Tab; label: string; Icon: typeof IconWrite }[] = [
  { id: 'write', label: 'Write', Icon: IconWrite },
  { id: 'play', label: 'Band', Icon: IconMixer },
  { id: 'learn', label: 'Learn', Icon: IconLearn },
  { id: 'tune', label: 'Tune', Icon: IconTuner },
  { id: 'library', label: 'Songs', Icon: IconLibrary },
];

const pref = <T extends string>(k: string, d: T): T => { try { return (localStorage.getItem(k) as T) ?? d; } catch { return d; } };
const setPref = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

interface Toast { id: string; msg: string; action?: { label: string; run: () => void } }

export default function App() {
  const api = useProject();
  const { project: p, update, undo, redo, canUndo, canRedo } = api;
  const [tab, setTab] = useState<Tab>(() => (pref('sw2:tab', 'write') as Tab));
  const [theme, setTheme] = useState<ThemePref>(() => pref('sw2:theme', 'system'));
  const [spelling, setSpelling] = useState<Spelling>(() => pref('sw2:spelling', 'auto'));
  const [diagram, setDiagram] = useState<DiagramKind>(() => pref('sw2:diagram', 'guitar'));
  const [editing, setEditing] = useState<number | null>(null);
  const [pos, setPos] = useState<Position | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playScope, setPlayScope] = useState<'song' | 'section'>('section');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const flats = spelling === 'auto' ? prefersFlats(p.tonic, p.mode) : spelling === 'flats';
  const section = p.sections[p.activeSection] ?? p.sections[0];

  const toast = useCallback((msg: string, action?: Toast['action']) => {
    const id = uid();
    setToasts((t) => [...t.slice(-2), { id, msg, action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 5000 : 2600);
  }, []);

  // Theme
  useEffect(() => {
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b0b0f' : '#f5f3ee');
    };
    apply();
    setPref('sw2:theme', theme);
    const mq = matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
  useEffect(() => setPref('sw2:tab', tab), [tab]);
  useEffect(() => { if (tab === 'tune' && engine.playing) { engine.stop(); setPlaying(false); } }, [tab]);
  useEffect(() => setPref('sw2:spelling', spelling), [spelling]);
  useEffect(() => setPref('sw2:diagram', diagram), [diagram]);

  useEffect(() => engine.subscribe((ps) => {
    setPos(ps);
    if (!ps && !engine.playing) setPlaying(false);
  }), []);

  const transportOpts = useCallback((): TransportOptions => ({
    bpm: p.bpm,
    instrument: p.playback.instrument,
    comp: p.playback.comp,
    bass: p.playback.bass,
    drums: p.playback.drumsOn ? p.playback.drums : null,
    swing: p.playback.swing,
    humanize: p.playback.humanize,
    metronome: p.playback.metronome,
    countIn: p.playback.countIn,
    loop: p.playback.loop,
    mix: p.playback.mix,
  }), [p.bpm, p.playback]);

  const timeline = useMemo(() => buildTimeline(p, playScope === 'section' ? p.activeSection : undefined), [p, playScope]);

  // Push live changes into the running engine.
  useEffect(() => { if (playing) engine.update(transportOpts(), timeline); }, [playing, transportOpts, timeline]);

  const togglePlay = useCallback(async () => {
    if (playing) { engine.stop(); setPlaying(false); return; }
    setLoading(true);
    setPlaying(true);
    try { await engine.start(timeline, transportOpts()); }
    catch { toast('Audio could not start on this device'); setPlaying(false); }
    finally { setLoading(false); }
  }, [playing, timeline, transportOpts, toast]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select')) return;
      if (e.code === 'Space') { e.preventDefault(); void togglePlay(); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, undo, redo]);

  useEffect(() => () => engine.stop(), []);

  const audition = useCallback((c: Chord) => { void engine.audition(c, p.playback.instrument); }, [p.playback.instrument]);

  const nowChord = pos && !pos.countIn ? p.sections[pos.sectionIndex]?.chords[pos.chordIndex] : null;
  const displayChord = nowChord ?? section.chords[0];

  const editorChange = (c: Chord) => update((prev) => updateSection(prev, prev.activeSection, (s) => ({ ...s, chords: s.chords.map((x, i) => (i === editing ? c : x)) })));

  return (
    <div className="app">
      <nav className="rail" aria-label="Main">
        <div className="logo"><IconLogo size={40} /></div>
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} className="tab" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}><Icon size={22} />{label}</button>
        ))}
        <button className="icon-btn bottom" aria-label="Toggle theme" onClick={() => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'light' ? <IconMoon /> : <IconSun />}
        </button>
      </nav>

      <main className="main">
        <div className="topbar">
          <div className="logo"><IconLogo size={32} /></div>
          <input className="title-input" value={p.name} onChange={(e) => update((prev) => ({ ...prev, name: e.target.value.slice(0, 80) }), false)} aria-label="Song name" onFocus={(e) => e.target.select()} />
          <div className="topbar-actions">
            <button className="icon-btn" aria-label="Undo" disabled={!canUndo} onClick={undo}><IconUndo /></button>
            <button className="icon-btn" aria-label="Redo" disabled={!canRedo} onClick={redo}><IconRedo /></button>
          </div>
        </div>

        {tab === 'write' && <WriteView api={api} flats={flats} pos={pos} onEdit={setEditing} toast={toast} />}
        {tab === 'play' && <PlayView api={api} pos={pos} />}
        {tab === 'learn' && <LearnView project={p} flats={flats} diagram={diagram} onDiagram={setDiagram} />}
        {tab === 'tune' && <TuneView flats={flats} />}
        {tab === 'library' && <LibraryView api={api} flats={flats} theme={theme} onTheme={setTheme} spelling={spelling} onSpelling={setSpelling} toast={toast} onOpened={() => setTab('write')} />}
      </main>

      {tab !== 'tune' && (
        <div className="transport" role="region" aria-label="Transport">
          <button className={`play-btn ${loading ? 'loading' : ''}`} aria-label={playing ? 'Stop' : 'Play'} onClick={togglePlay}>
            {playing ? <IconStop size={24} /> : <IconPlay size={24} />}
          </button>
          <div className="transport-info">
            <div className="transport-now">
              <span className="transport-chord">{pos?.countIn ? `${pos.beat + 1}…` : displayChord ? <ChordName symbol={chordSymbol(displayChord, flats)} /> : '—'}</span>
              <span className="transport-meta">{loading ? 'Loading sounds…' : playing ? (playScope === 'song' ? p.sections[pos?.sectionIndex ?? 0]?.name ?? '' : section.name) : playScope === 'song' ? 'Whole song' : section.name}</span>
            </div>
            <div className="beats" aria-hidden>
              {[0, 1, 2, 3].map((b) => <i key={b} className={pos && pos.beat === b ? (pos.countIn ? 'count' : 'on') : ''} />)}
            </div>
          </div>
          <div className="transport-tools">
            <button className={`icon-btn ${playScope === 'song' ? 'active' : ''}`} aria-label={playScope === 'song' ? 'Playing whole song — switch to section' : 'Playing section — switch to whole song'} title="Section / whole song" onClick={() => setPlayScope((s) => (s === 'song' ? 'section' : 'song'))}><IconRepeat size={19} /></button>
            <div className="bpm-box">
              <button aria-label="Slower" onClick={() => update((prev) => ({ ...prev, bpm: Math.max(40, prev.bpm - 2) }), false)}><IconMinus size={14} /></button>
              <span aria-label="Tempo">{p.bpm}</span>
              <button aria-label="Faster" onClick={() => update((prev) => ({ ...prev, bpm: Math.min(240, prev.bpm + 2) }), false)}><IconPlus size={14} /></button>
            </div>
          </div>
        </div>
      )}

      <nav className="tabbar" aria-label="Main">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} className="tab" aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}><Icon size={22} />{label}</button>
        ))}
      </nav>

      <Sheet open={editing !== null && !!section.chords[editing]} onClose={() => setEditing(null)} label="Edit chord">
        {editing !== null && (
          <ChordEditor
            chords={section.chords}
            index={editing}
            tonic={p.tonic}
            mode={p.mode}
            flats={flats}
            diagram={diagram}
            onDiagram={setDiagram}
            onChange={editorChange}
            onAudition={audition}
            onNavigate={(i) => { setEditing(i); audition(section.chords[i]); }}
            onDuplicate={() => {
              const i = editing;
              update((prev) => updateSection(prev, prev.activeSection, (s) => ({ ...s, chords: [...s.chords.slice(0, i + 1), { ...s.chords[i], id: uid(), locked: false }, ...s.chords.slice(i + 1)] })));
              setEditing(i + 1);
            }}
            onDelete={() => {
              const i = editing;
              update((prev) => updateSection(prev, prev.activeSection, (s) => ({ ...s, chords: s.chords.filter((_, j) => j !== i) })));
              setEditing(null);
              toast('Chord removed', { label: 'Undo', run: undo });
            }}
            onClose={() => setEditing(null)}
          />
        )}
      </Sheet>

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">{t.msg}{t.action && <button onClick={() => { t.action!.run(); setToasts((x) => x.filter((y) => y.id !== t.id)); }}>{t.action.label}</button>}</div>
        ))}
      </div>
    </div>
  );
}
