// Minimal Standard MIDI File (format 1) writer.
import { pianoVoicing, bassNote } from '../music/voicings';
import type { PlayEvent, DrumPattern } from './engine';

const PPQ = 480;
const DRUM_NOTES: Record<string, number> = { kick: 36, snare: 38, hat: 42, open: 46, ride: 51, tom: 45 };

function vlq(n: number): number[] {
  const bytes = [n & 0x7f];
  while ((n >>= 7)) bytes.unshift((n & 0x7f) | 0x80);
  return bytes;
}

function track(events: { tick: number; data: number[] }[], name: string): number[] {
  const sorted = events.sort((a, b) => a.tick - b.tick || (a.data[0] & 0xf0) - (b.data[0] & 0xf0));
  const nameBytes = [...new TextEncoder().encode(name)];
  const out: number[] = [0x00, 0xff, 0x03, ...vlq(nameBytes.length), ...nameBytes];
  let last = 0;
  for (const e of sorted) {
    out.push(...vlq(e.tick - last), ...e.data);
    last = e.tick;
  }
  out.push(0x00, 0xff, 0x2f, 0x00);
  const len = out.length;
  return [0x4d, 0x54, 0x72, 0x6b, (len >>> 24) & 255, (len >>> 16) & 255, (len >>> 8) & 255, len & 255, ...out];
}

export function buildMidi(events: PlayEvent[], bpm: number, drums: DrumPattern | null): Uint8Array {
  const tempo = Math.round(60_000_000 / bpm);
  const meta = track([
    { tick: 0, data: [0xff, 0x51, 0x03, (tempo >> 16) & 255, (tempo >> 8) & 255, tempo & 255] },
    { tick: 0, data: [0xff, 0x58, 0x04, 4, 2, 24, 8] },
  ], 'StageWrite');

  const chordEv: { tick: number; data: number[] }[] = [];
  const bassEv: { tick: number; data: number[] }[] = [];
  const drumEv: { tick: number; data: number[] }[] = [];
  let prev: number[] | undefined;
  let total = 0;
  for (const e of events) {
    const start = e.startBeat * PPQ;
    const end = (e.startBeat + e.chord.beats) * PPQ - 10;
    total = Math.max(total, end + 10);
    const v = (prev = pianoVoicing(e.chord, prev));
    v.forEach((n) => { chordEv.push({ tick: start, data: [0x90, n, 84] }); chordEv.push({ tick: end, data: [0x80, n, 0] }); });
    const b = bassNote(e.chord) + 12;
    bassEv.push({ tick: start, data: [0x91, b, 96] }, { tick: end, data: [0x81, b, 0] });
  }
  if (drums) {
    for (let bar = 0; bar * 4 * PPQ < total; bar++) {
      for (let s = 0; s < 16; s++) {
        for (const [voice, note] of Object.entries(DRUM_NOTES)) {
          if (drums[voice]?.[s]) {
            const tick = bar * 4 * PPQ + s * (PPQ / 4);
            drumEv.push({ tick, data: [0x99, note, s % 4 === 0 ? 110 : 90] }, { tick: tick + 60, data: [0x89, note, 0] });
          }
        }
      }
    }
  }
  const header = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, drums ? 4 : 3, (PPQ >> 8) & 255, PPQ & 255];
  const program = (ch: number, p: number) => ({ tick: 0, data: [0xc0 | ch, p] });
  const tracks = [meta, track([program(0, 0), ...chordEv], 'Chords'), track([program(1, 33), ...bassEv], 'Bass')];
  if (drums) tracks.push(track(drumEv, 'Drums'));
  return new Uint8Array([...header, ...tracks.flat()]);
}

export function download(data: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
