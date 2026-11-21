import { useRef, useState } from 'react';
import { buildTimeline, encodeShare, loadLibrary, newProject, saveLibrary, validProject, type Project, type ProjectApi } from '../state/project';
import { buildMidi, download } from '../audio/midi';
import { chordSymbol, MODES, noteName, romanNumeral, uid } from '../music/theory';
import { Seg } from '../components/ui';
import { IconCopy, IconDownload, IconFile, IconPlus, IconSave, IconShare, IconTrash, IconUpload } from '../components/Icons';

export type ThemePref = 'system' | 'dark' | 'light';
export type Spelling = 'auto' | 'sharps' | 'flats';

interface Props {
  api: ProjectApi;
  flats: boolean;
  theme: ThemePref;
  onTheme: (t: ThemePref) => void;
  spelling: Spelling;
  onSpelling: (s: Spelling) => void;
  toast: (msg: string, action?: { label: string; run: () => void }) => void;
  onOpened: () => void;
}

const slug = (s: string) => s.trim().replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'song';

export function chordChart(p: Project, flats: boolean): string {
  const lines = [p.name, `${noteName(p.tonic, flats)} ${MODES[p.mode].label} · ${p.bpm} BPM · 4/4`, ''];
  p.sections.forEach((s) => {
    lines.push(`[${s.name}]${s.repeat > 1 ? ` x${s.repeat}` : ''}`);
    const bars = s.chords.map((c) => `${chordSymbol(c, flats)}${c.beats !== 4 ? ` (${c.beats})` : ''}`);
    for (let i = 0; i < bars.length; i += 4) lines.push('| ' + bars.slice(i, i + 4).map((b) => b.padEnd(10)).join('| ') + '|');
    lines.push('  ' + s.chords.map((c) => romanNumeral(c, p.tonic, p.mode)).join('  '));
    lines.push('');
  });
  if (p.notes.trim()) lines.push('Notes', p.notes.trim(), '');
  lines.push('Made with StageWrite');
  return lines.join('\n');
}

export function LibraryView({ api, flats, theme, onTheme, spelling, onSpelling, toast, onOpened }: Props) {
  const { project: p, replace } = api;
  const [library, setLibrary] = useState<Project[]>(() => loadLibrary());
  const fileRef = useRef<HTMLInputElement>(null);
  const persist = (list: Project[]) => { setLibrary(list); if (!saveLibrary(list)) toast('Storage is full or blocked — export a backup instead.'); };

  const save = () => {
    const exists = library.some((x) => x.id === p.id);
    persist(exists ? library.map((x) => (x.id === p.id ? p : x)) : [p, ...library]);
    toast(exists ? 'Saved changes' : `Saved "${p.name}" to your library`);
  };

  const share = async () => {
    const url = `${location.origin}${location.pathname}#s=${encodeShare(p)}`;
    try {
      if (navigator.share) await navigator.share({ title: p.name, text: `Check out my chord progression "${p.name}"`, url });
      else { await navigator.clipboard.writeText(url); toast('Share link copied'); }
    } catch (e) {
      if ((e as Error)?.name !== 'AbortError') {
        try { await navigator.clipboard.writeText(url); toast('Share link copied'); } catch { toast('Could not share from this browser'); }
      }
    }
  };

  const exportMidi = () => {
    download(buildMidi(buildTimeline(p), p.bpm, p.playback.drumsOn ? p.playback.drums : null) as BlobPart, `${slug(p.name)}.mid`, 'audio/midi');
    toast('MIDI exported — drop it into any DAW');
  };
  const exportChart = () => { download(chordChart(p, flats), `${slug(p.name)}-chords.txt`, 'text/plain'); toast('Chord chart exported'); };
  const copyChart = async () => { try { await navigator.clipboard.writeText(chordChart(p, flats)); toast('Chord chart copied'); } catch { toast('Clipboard unavailable'); } };
  const exportBackup = () => { download(JSON.stringify({ app: 'stagewrite', version: 2, projects: library.some((x) => x.id === p.id) ? library : [p, ...library] }, null, 2), 'stagewrite-backup.json', 'application/json'); toast('Backup downloaded'); };

  const importFile = async (f: File) => {
    try {
      const data = JSON.parse(await f.text());
      const items: unknown[] = Array.isArray(data?.projects) ? data.projects : [data];
      const valid = items.filter(validProject).map((x) => ({ ...x, id: library.some((l) => l.id === x.id) ? uid() : x.id }));
      if (!valid.length) throw new Error('none');
      persist([...valid, ...library]);
      toast(`Imported ${valid.length} song${valid.length > 1 ? 's' : ''}`);
    } catch { toast('That file is not a StageWrite backup'); }
  };

  const open = (x: Project) => { replace(x); toast(`Opened "${x.name}"`); onOpened(); };
  const remove = (x: Project) => {
    const before = library;
    persist(library.filter((y) => y.id !== x.id));
    toast(`Deleted "${x.name}"`, { label: 'Undo', run: () => persist(before) });
  };

  const fmt = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="view">
      <header className="hero">
        <div className="eyebrow">Library · saved on this device</div>
        <h1>Your <em>songs</em>.</h1>
      </header>

      <section className="card">
        <div className="card-head"><div><h2>This song</h2><div className="sub">{p.name} · {p.sections.length} section{p.sections.length > 1 ? 's' : ''}</div></div></div>
        <div className="action-grid">
          <button className="action-tile" onClick={save}><IconSave />Save<span>Keep it in your library</span></button>
          <button className="action-tile" onClick={share}><IconShare />Share link<span>Anyone can open it</span></button>
          <button className="action-tile" onClick={exportMidi}><IconDownload />MIDI<span>Chords, bass & drums</span></button>
          <button className="action-tile" onClick={copyChart}><IconCopy />Copy chart<span>Plain text chords</span></button>
          <button className="action-tile" onClick={exportChart}><IconFile />Chart file<span>.txt download</span></button>
          <button className="action-tile" onClick={() => { replace(newProject()); toast('New song started'); onOpened(); }}><IconPlus />New song<span>Start fresh</span></button>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <div><h2>Saved songs</h2><div className="sub">{library.length} saved</div></div>
        </div>
        {library.length === 0 ? (
          <div className="empty"><div className="big">♫</div><p>No saved songs yet. Tap <b>Save</b> above to keep this one.</p></div>
        ) : (
          <div className="project-list">
            {library.map((x) => (
              <div key={x.id} className={`project-item ${x.id === p.id ? 'current' : ''}`}>
                <div className="badge">{noteName(x.tonic, flats)}{MODES[x.mode].minorish ? 'm' : ''}</div>
                <button className="info" style={{ textAlign: 'left' }} onClick={() => open(x)}>
                  <b>{x.name}</b>
                  <span>{x.sections[0]?.chords.slice(0, 4).map((c) => chordSymbol(c, flats)).join(' – ')} · {fmt(x.updatedAt)}</span>
                </button>
                <button className="icon-btn" aria-label={`Duplicate ${x.name}`} onClick={() => persist([{ ...x, id: uid(), name: `${x.name} (copy)`, updatedAt: Date.now() }, ...library])}><IconCopy size={18} /></button>
                <button className="icon-btn" aria-label={`Delete ${x.name}`} onClick={() => remove(x)}><IconTrash size={18} /></button>
              </div>
            ))}
          </div>
        )}
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn sm" onClick={exportBackup}><IconDownload size={16} /> Backup all</button>
          <button className="btn sm" onClick={() => fileRef.current?.click()}><IconUpload size={16} /> Import</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFile(f); e.target.value = ''; }} />
        </div>
      </section>

      <section className="card">
        <div className="card-head"><div><h2>Settings</h2></div></div>
        <span className="label">Theme</span>
        <Seg value={theme} onChange={onTheme} label="Theme" options={[{ value: 'system', label: 'Auto' }, { value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]} />
        <span className="label" style={{ marginTop: 14 }}>Note names</span>
        <Seg value={spelling} onChange={onSpelling} label="Note spelling" options={[{ value: 'auto', label: 'By key' }, { value: 'sharps', label: 'Sharps ♯' }, { value: 'flats', label: 'Flats ♭' }]} />
        <p className="muted" style={{ fontSize: 12.5, marginTop: 16 }}>
          StageWrite 2 · Chord ideas come from built-in music-theory rules — no accounts, no servers, nothing leaves your device.
          Sampled instruments from FluidR3 GM (CC BY 3.0), FreePats ukulele (CC0) and teropa/drumkit (CC BY / CC0).
        </p>
      </section>
    </div>
  );
}
