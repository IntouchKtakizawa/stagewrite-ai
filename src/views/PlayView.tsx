import { DRUM_PRESETS, DRUM_VOICES, INSTRUMENTS, type BassStyle, type CompStyle, type InstrumentId, type Position } from '../audio/engine';
import type { PlaybackSettings, ProjectApi } from '../state/project';
import { Seg, Switch } from '../components/ui';

const COMP: { value: CompStyle; label: string }[] = [
  { value: 'sustain', label: 'Pads' }, { value: 'pulse', label: 'Pulse' }, { value: 'strum', label: 'Strum' }, { value: 'arp', label: 'Arp' }, { value: 'offbeat', label: 'Skank' },
];
const BASS: { value: BassStyle; label: string }[] = [
  { value: 'off', label: 'Off' }, { value: 'root', label: 'Roots' }, { value: 'eighths', label: 'Drive' }, { value: 'fifths', label: '5ths' }, { value: 'walk', label: 'Walk' },
];

export function PlayView({ api, pos }: { api: ProjectApi; pos: Position | null }) {
  const { project: p, update } = api;
  const pb = p.playback;
  const set = (patch: Partial<PlaybackSettings>, record = true) => update((prev) => ({ ...prev, playback: { ...prev.playback, ...patch } }), record);
  const toggleStep = (voice: string, step: number) => {
    const drums = { ...pb.drums, [voice]: pb.drums[voice].map((v, i) => (i === step ? !v : v)) };
    set({ drums, drumPreset: 'custom' });
  };

  return (
    <div className="view">
      <header className="hero">
        <div className="eyebrow">Play · {p.bpm} BPM · 4/4</div>
        <h1>Build the <em>band</em> around it.</h1>
        <p>Real sampled piano, guitars, bass and drums. Shape the groove, then press play below.</p>
      </header>

      <div className="grid-2">
        <section className="card">
          <div className="card-head"><div><h2>Instrument</h2><div className="sub">Who plays the chords</div></div></div>
          <div className="chips wrap">
            {(Object.keys(INSTRUMENTS) as Exclude<InstrumentId, 'bass'>[]).map((id) => (
              <button key={id} className="chip" aria-pressed={pb.instrument === id} onClick={() => set({ instrument: id })}>{INSTRUMENTS[id].label}</button>
            ))}
          </div>
          <span className="label" style={{ marginTop: 16 }}>Rhythm</span>
          <Seg value={pb.comp} onChange={(v) => set({ comp: v })} options={COMP} label="Chord rhythm" />
          <span className="label" style={{ marginTop: 14 }}>Bass line</span>
          <Seg value={pb.bass} onChange={(v) => set({ bass: v })} options={BASS} label="Bass style" />
        </section>

        <section className="card">
          <div className="card-head"><div><h2>Tempo & feel</h2><div className="sub">Swing pushes the off-beats late</div></div></div>
          <span className="label">Tempo · <span className="mono">{p.bpm} BPM</span></span>
          <input type="range" min={50} max={200} value={p.bpm} onChange={(e) => update((prev) => ({ ...prev, bpm: Number(e.target.value) }), false)} aria-label="Tempo" />
          <span className="label" style={{ marginTop: 8 }}>Swing · <span className="mono">{Math.round(pb.swing * 100)}%</span></span>
          <input type="range" min={0} max={100} value={Math.round(pb.swing * 100)} onChange={(e) => set({ swing: Number(e.target.value) / 100 }, false)} aria-label="Swing" />
          <div style={{ marginTop: 6 }}>
            <Switch label="Humanize" desc="Tiny timing & velocity variations" checked={pb.humanize} onChange={(v) => set({ humanize: v })} />
            <Switch label="Count-in" desc="One bar of clicks before playback" checked={pb.countIn} onChange={(v) => set({ countIn: v })} />
            <Switch label="Metronome" checked={pb.metronome} onChange={(v) => set({ metronome: v })} />
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: 14 }}>
        <div className="card-head">
          <div><h2>Drums</h2><div className="sub">Tap steps to make your own beat</div></div>
          <button role="switch" aria-checked={pb.drumsOn} aria-label="Drums on" className="switch" onClick={() => set({ drumsOn: !pb.drumsOn })} />
        </div>
        <div className="chips" role="group" aria-label="Drum presets">
          {Object.entries(DRUM_PRESETS).map(([id, d]) => (
            <button key={id} className="chip" aria-pressed={pb.drumPreset === id} onClick={() => set({ drumPreset: id, drumsOn: true, drums: Object.fromEntries(Object.entries(d.pattern).map(([k, v]) => [k, [...v]])) })}>{d.label}</button>
          ))}
          {pb.drumPreset === 'custom' && <button className="chip" aria-pressed>Custom</button>}
        </div>
        <div className="drum-grid" style={{ marginTop: 14, opacity: pb.drumsOn ? 1 : 0.4 }}>
          {DRUM_VOICES.map((v) => (
            <div className="drum-row" key={v}>
              <span className="name">{v === 'open' ? 'Open' : v}</span>
              <div className="steps">
                {Array.from({ length: 16 }, (_, s) => (
                  <button key={s} aria-pressed={!!pb.drums[v]?.[s]} aria-label={`${v} step ${s + 1}`} className={pos && !pos.countIn && pos.step === s ? 'cursor' : ''} onClick={() => toggleStep(v, s)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card-head"><div><h2>Mixer</h2></div></div>
        <div className="mixer">
          {(['chords', 'bass', 'drums', 'click'] as const).map((k) => (
            <label className="fader" key={k}>
              <input type="range" min={0} max={100} value={Math.round(pb.mix[k] * 100)} onChange={(e) => set({ mix: { ...pb.mix, [k]: Number(e.target.value) / 100 } }, false)} aria-label={`${k} volume`} />
              <b>{Math.round(pb.mix[k] * 100)}</b>
              <span style={{ textTransform: 'capitalize' }}>{k}</span>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
