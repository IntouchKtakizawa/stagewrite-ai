// Local microphone pitch detection (YIN-style). Audio never leaves the device.

export interface PitchReading { freq: number; midi: number; cents: number; clarity: number }

export class Tuner {
  private ctx?: AudioContext;
  private stream?: MediaStream;
  private analyser?: AnalyserNode;
  private buf = new Float32Array(4096);
  private raf = 0;

  async start(onReading: (r: PitchReading | null, level: number) => void) {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    this.ctx = new AudioContext();
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 4096;
    src.connect(this.analyser);
    let smooth: number | null = null;
    let frame = 0;
    const loop = () => {
      if (frame++ % 2) { this.raf = requestAnimationFrame(loop); return; }
      this.analyser!.getFloatTimeDomainData(this.buf);
      let rms = 0;
      for (let i = 0; i < this.buf.length; i++) rms += this.buf[i] * this.buf[i];
      rms = Math.sqrt(rms / this.buf.length);
      const r = rms > 0.01 ? yin(this.buf, this.ctx!.sampleRate) : null;
      if (r && r.clarity > 0.85 && r.freq > 25 && r.freq < 1500) {
        smooth = smooth === null || Math.abs(Math.log2(r.freq / smooth)) > 0.04 ? r.freq : smooth * 0.75 + r.freq * 0.25;
        const midiFloat = 69 + 12 * Math.log2(smooth / 440);
        const midi = Math.round(midiFloat);
        onReading({ freq: smooth, midi, cents: (midiFloat - midi) * 100, clarity: r.clarity }, rms);
      } else {
        onReading(null, rms);
      }
      this.raf = requestAnimationFrame(loop);
    };
    loop();
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close();
    this.ctx = undefined;
  }
}

function yin(buf: Float32Array, sampleRate: number): { freq: number; clarity: number } | null {
  const W = 1024; // integration window
  const maxTau = Math.min(buf.length - W - 1, Math.floor(sampleRate / 38));
  const d = new Float32Array(maxTau + 1);
  for (let tau = 1; tau <= maxTau; tau++) {
    let sum = 0;
    for (let i = 0; i < W; i++) {
      const delta = buf[i] - buf[i + tau];
      sum += delta * delta;
    }
    d[tau] = sum;
  }
  d[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= maxTau; tau++) {
    running += d[tau];
    d[tau] = (d[tau] * tau) / (running || 1);
  }
  const threshold = 0.12;
  let tau = Math.floor(sampleRate / 1500);
  for (; tau <= maxTau; tau++) {
    if (d[tau] < threshold) {
      while (tau + 1 <= maxTau && d[tau + 1] < d[tau]) tau++;
      break;
    }
  }
  if (tau > maxTau) return null;
  const x0 = d[tau - 1];
  const x2 = tau + 1 <= maxTau ? d[tau + 1] : d[tau];
  const denom = 2 * (2 * d[tau] - x2 - x0);
  const better = denom ? tau + (x2 - x0) / denom : tau;
  return { freq: sampleRate / better, clarity: 1 - d[tau] };
}

export const TUNING_PRESETS: Record<string, { label: string; notes: number[] }> = {
  guitar: { label: 'Guitar · Standard', notes: [40, 45, 50, 55, 59, 64] },
  dropd: { label: 'Guitar · Drop D', notes: [38, 45, 50, 55, 59, 64] },
  dadgad: { label: 'Guitar · DADGAD', notes: [38, 45, 50, 55, 57, 62] },
  halfdown: { label: 'Guitar · Half-step down', notes: [39, 44, 49, 54, 58, 63] },
  bass: { label: 'Bass · Standard', notes: [28, 33, 38, 43] },
  ukulele: { label: 'Ukulele · GCEA', notes: [67, 60, 64, 69] },
  chromatic: { label: 'Chromatic', notes: [] },
};
