import { useEffect, useRef, useState } from 'react';
import { Tuner, TUNING_PRESETS, type PitchReading } from '../audio/tuner';
import { engine } from '../audio/engine';
import { noteName } from '../music/theory';
import { IconMic, IconStop } from '../components/Icons';

export function TuneView({ flats }: { flats: boolean }) {
  const tuner = useRef<Tuner | null>(null);
  const [on, setOn] = useState(false);
  const [error, setError] = useState('');
  const [reading, setReading] = useState<PitchReading | null>(null);
  const [level, setLevel] = useState(0);
  const [preset, setPreset] = useState('guitar');
  const [done, setDone] = useState<Set<number>>(new Set());
  const holdRef = useRef<{ midi: number; since: number } | null>(null);

  useEffect(() => () => tuner.current?.stop(), []);

  const start = async () => {
    setError('');
    try {
      engine.stop();
      const t = new Tuner();
      tuner.current = t;
      await t.start((r, l) => {
        setLevel(l);
        if (r) {
          setReading(r);
          if (Math.abs(r.cents) < 5) {
            const h = holdRef.current;
            if (h && h.midi === r.midi) {
              if (performance.now() - h.since > 600) setDone((d) => (d.has(r.midi) ? d : new Set(d).add(r.midi)));
            } else holdRef.current = { midi: r.midi, since: performance.now() };
          } else holdRef.current = null;
        }
      });
      setOn(true);
    } catch {
      setError('Microphone access was blocked. Allow it in your browser settings to use the tuner.');
    }
  };
  const stop = () => { tuner.current?.stop(); tuner.current = null; setOn(false); setReading(null); setLevel(0); };

  const notes = TUNING_PRESETS[preset].notes;
  const target = reading && notes.length ? notes.reduce((best, n) => (Math.abs(n - (reading.midi + reading.cents / 100)) < Math.abs(best - (reading.midi + reading.cents / 100)) ? n : best), notes[0]) : null;
  const cents = reading ? (target !== null ? (reading.midi + reading.cents / 100 - target) * 100 : reading.cents) : 0;
  const clamped = Math.max(-50, Math.min(50, cents));
  const inTune = reading && Math.abs(cents) < 5;
  const shown = target ?? reading?.midi;

  return (
    <div className="view">
      <header className="hero">
        <div className="eyebrow">Tune · microphone stays on your device</div>
        <h1>Get in <em>tune</em>.</h1>
      </header>

      <section className="card">
        <select className="select" value={preset} onChange={(e) => { setPreset(e.target.value); setDone(new Set()); }} aria-label="Tuning">
          {Object.entries(TUNING_PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div className="tuner-stage">
          <div className={`tuner-note ${inTune ? 'in' : ''}`} aria-live="polite">
            {shown !== undefined && shown !== null ? <>{noteName(shown, flats).replace('#', '♯').replace('b', '♭')}<sub>{Math.floor(shown / 12) - 1}</sub></> : <span style={{ color: 'var(--faint)', fontSize: '0.6em' }}>♪</span>}
          </div>
          <div className="tuner-meter" aria-hidden>
            <div className="scale">{Array.from({ length: 11 }, (_, i) => <i key={i} />)}</div>
            <div className={`needle ${inTune ? 'in' : ''}`} style={{ left: `${50 + clamped}%`, opacity: reading ? 1 : 0.25 }} />
          </div>
          <div className="tuner-cents">
            {reading ? (inTune ? 'In tune ✓' : `${cents > 0 ? '+' : ''}${cents.toFixed(0)} cents · ${cents > 0 ? 'tune down' : 'tune up'}`) : on ? 'Play a single string…' : 'Tap start and play a note'}
            {reading && <> · {reading.freq.toFixed(1)} Hz</>}
          </div>
          {notes.length > 0 && (
            <div className="string-row">
              {notes.map((n, i) => (
                <button key={i} className={`string-pill ${target === n && reading ? 'target' : ''} ${done.has(n) ? 'done' : ''}`} onClick={() => {
                  const inst = preset === 'ukulele' ? 'ukulele' : 'guitar-clean';
                  engine.ensure();
                  void engine.preload(inst).then(() => engine.playNote(preset === 'bass' ? 'bass' : inst, n, engine.ctx!.currentTime + 0.02, 2.2, 0.8, preset === 'bass' ? 'bass' : 'chords'));
                }} aria-label={`Play reference ${noteName(n, flats)}`}>
                  {noteName(n, flats)}
                </button>
              ))}
            </div>
          )}
          <div className="level"><i style={{ width: `${Math.min(100, level * 600)}%` }} /></div>
          <div style={{ marginTop: 20 }}>
            {on ? <button className="btn big" onClick={stop}><IconStop /> Stop tuner</button> : <button className="btn primary big" onClick={start}><IconMic /> Start tuner</button>}
          </div>
          {error && <p style={{ color: 'var(--bad)', marginTop: 12, fontSize: 14 }}>{error}</p>}
          <p className="muted" style={{ fontSize: 12.5, marginTop: 14 }}>Tap a string to hear its reference pitch. Strings turn green once they hold in tune.</p>
        </div>
      </section>
    </div>
  );
}
