import { useEffect, type ReactNode } from 'react';

export function Seg<T extends string | number>({ value, options, onChange, label }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <div className="switch-row">
      <div><div className="t">{label}</div>{desc && <div className="d">{desc}</div>}</div>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={() => onChange(!checked)} />
    </div>
  );
}

export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label}>
        <div className="sheet-grip" />
        {children}
      </div>
    </>
  );
}

/** Render "Cmaj7" as C + superscript quality for nicer typography. */
export function ChordName({ symbol }: { symbol: string }) {
  const m = /^([A-G][#b]?)(.*?)(\/.+)?$/.exec(symbol);
  if (!m) return <>{symbol}</>;
  const [, root, q, slash] = m;
  const prettyRoot = root.replace('#', '♯').replace('b', '♭');
  const minor = q.startsWith('m') && !q.startsWith('maj');
  const rest = (minor ? q.slice(1) : q).replace('b5', '♭5').replace('b9', '♭9');
  return (
    <>
      {prettyRoot}
      {minor && <span>m</span>}
      {rest && <sup>{rest}</sup>}
      {slash && <span style={{ fontSize: '0.6em', opacity: 0.75 }}>{slash.replace('#', '♯').replace(/([A-G])b/, '$1♭')}</span>}
    </>
  );
}

export const prettySymbol = (s: string) => s.replace(/([A-G])#/g, '$1♯').replace(/([A-G])b/g, '$1♭');
