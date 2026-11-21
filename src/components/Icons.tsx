import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = ({ size = 20, ...rest }: P) => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true, ...rest,
});

export const IconPlay = (p: P) => <svg {...base(p)}><path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none" /></svg>;
export const IconStop = (p: P) => <svg {...base(p)}><rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" stroke="none" /></svg>;
export const IconSpark = (p: P) => <svg {...base(p)}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></svg>;
export const IconLock = (p: P) => <svg {...base(p)}><rect x="5" y="11" width="14" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
export const IconUnlock = (p: P) => <svg {...base(p)}><rect x="5" y="11" width="14" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 7.6-1.7" /></svg>;
export const IconPlus = (p: P) => <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>;
export const IconMinus = (p: P) => <svg {...base(p)}><path d="M5 12h14" /></svg>;
export const IconUndo = (p: P) => <svg {...base(p)}><path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></svg>;
export const IconRedo = (p: P) => <svg {...base(p)}><path d="M15 14l5-5-5-5" /><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" /></svg>;
export const IconWrite = (p: P) => <svg {...base(p)}><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></svg>;
export const IconMixer = (p: P) => <svg {...base(p)}><path d="M5 4v16M12 4v16M19 4v16" /><rect x="3" y="13" width="4" height="3" rx="1" fill="currentColor" /><rect x="10" y="7" width="4" height="3" rx="1" fill="currentColor" /><rect x="17" y="15" width="4" height="3" rx="1" fill="currentColor" /></svg>;
export const IconLearn = (p: P) => <svg {...base(p)}><path d="M3 12c3-6 6-6 9 0s6 6 9 0" /><path d="M3 19h18M3 5h18" opacity=".45" /></svg>;
export const IconTuner = (p: P) => <svg {...base(p)}><path d="M4 18a8 8 0 1 1 16 0" /><path d="M12 18l4-6" /><circle cx="12" cy="18" r="1.4" fill="currentColor" /></svg>;
export const IconLibrary = (p: P) => <svg {...base(p)}><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M3 9h18M8 4v5" /></svg>;
export const IconShare = (p: P) => <svg {...base(p)}><path d="M12 3v12M7 8l5-5 5 5" /><path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></svg>;
export const IconDownload = (p: P) => <svg {...base(p)}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>;
export const IconTrash = (p: P) => <svg {...base(p)}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>;
export const IconCopy = (p: P) => <svg {...base(p)}><rect x="8" y="8" width="12" height="12" rx="2.5" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>;
export const IconX = (p: P) => <svg {...base(p)}><path d="M6 6l12 12M18 6L6 18" /></svg>;
export const IconDice = (p: P) => <svg {...base(p)}><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="9" cy="9" r="1.2" fill="currentColor" /><circle cx="15" cy="15" r="1.2" fill="currentColor" /><circle cx="15" cy="9" r="1.2" fill="currentColor" /><circle cx="9" cy="15" r="1.2" fill="currentColor" /></svg>;
export const IconRepeat = (p: P) => <svg {...base(p)}><path d="M17 2l3 3-3 3" /><path d="M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3" /><path d="M20 13v2a4 4 0 0 1-4 4H4" /></svg>;
export const IconMetronome = (p: P) => <svg {...base(p)}><path d="M9 3h6l4 18H5z" /><path d="M12 15l5-8" /></svg>;
export const IconSun = (p: P) => <svg {...base(p)}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
export const IconMoon = (p: P) => <svg {...base(p)}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></svg>;
export const IconChevron = (p: P) => <svg {...base(p)}><path d="M9 6l6 6-6 6" /></svg>;
export const IconVolume = (p: P) => <svg {...base(p)}><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16.5 8.5a5 5 0 0 1 0 7" /></svg>;
export const IconFile = (p: P) => <svg {...base(p)}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>;
export const IconUpload = (p: P) => <svg {...base(p)}><path d="M12 20V9M7 14l5-5 5 5M5 4h14" /></svg>;
export const IconSave = (p: P) => <svg {...base(p)}><path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" /><path d="M8 3v5h7V3M8 21v-7h8v7" /></svg>;
export const IconGrip = (p: P) => <svg {...base(p)}><circle cx="9" cy="6" r="1" fill="currentColor" /><circle cx="15" cy="6" r="1" fill="currentColor" /><circle cx="9" cy="12" r="1" fill="currentColor" /><circle cx="15" cy="12" r="1" fill="currentColor" /><circle cx="9" cy="18" r="1" fill="currentColor" /><circle cx="15" cy="18" r="1" fill="currentColor" /></svg>;
export const IconArrowLeft = (p: P) => <svg {...base(p)}><path d="M15 6l-6 6 6 6" /></svg>;
export const IconMic = (p: P) => <svg {...base(p)}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>;
export const IconLogo = (p: P) => (
  <svg {...base(p)} viewBox="0 0 32 32" stroke="none">
    <rect width="32" height="32" rx="9" fill="var(--accent)" />
    <path d="M9 21.5c2.5 0 3.6-1.6 3.6-3.4 0-3.8-5.3-2.5-5.3-6.1 0-1.7 1.3-3 3.6-3 1.4 0 2.5.4 3.3 1.1" stroke="var(--accent-ink)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <path d="M16.5 9.5l2 12 2.6-8 2.6 8 2-12" stroke="var(--accent-ink)" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
