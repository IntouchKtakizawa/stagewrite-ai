# StageWrite 2

A mobile-first songwriting studio. Generate chord progressions, tap any chord to hear it, swap it or lock it, then build a backing band around it — all in the browser, on your phone or desktop.

**[Open the app →](https://intouchktakizawa.github.io/stagewrite-ai/)**

Installable as an app: on iPhone use *Share → Add to Home Screen*, on Android/Chrome use *Install app*. After the first visit it works offline.

## What's new in version 2

StageWrite 2 is a ground-up rewrite of V1.6 in React + TypeScript.

- **Built for phones first.** Bottom tab bar, a floating transport that's always in reach, bottom-sheet chord editor and big touch targets. A side rail on desktop.
- **Write.** Pick a genre (10) and a mood (9), then generate 4 or 8 chords at three complexity levels. Locked chords survive regenerating. Songs can have multiple sections (Verse, Chorus, Bridge…) with repeats. You can type chords directly (`F#m7b5`, `G/B`), drag to reorder, transpose, and undo/redo every change.
- **Chord editor.** Hear the chord, see guitar/ukulele/piano diagrams (shapes are computed for any chord, with alternate fingerings), and get ranked "try instead" ideas: diatonic swaps, borrowed chords, secondary dominants, tritone subs and passing diminished chords.
- **Band.** Sampled piano, five guitar tones, ukulele, bass and drums. You can choose the chord rhythm (pads, pulse, strum, arpeggio, skank) and the bass style (roots, drive, fifths, walking). There's a 16-step drum sequencer with presets, plus swing, humanise, count-in, metronome and a 4-channel mixer.
- **Learn.** Shows the harmonic function of every chord and a tension curve across the whole song. It also detects the key and the cadence, and gives plain-language tips.
- **Tune.** Microphone tuner for guitar (standard, drop D, DADGAD, half-step down), bass, ukulele or chromatic, with reference tones.
- **Songs.** Save to a local library. You can share a song as a link, export MIDI (chords, bass and drums), copy or download a chord chart, and back up or import JSON. Light and dark themes are included.

Progression ideas come from deterministic music-theory rules running on your device. No accounts, servers or AI APIs are involved, and microphone audio never leaves your device.

The previous version is kept on the [`v1` branch](https://github.com/IntouchKtakizawa/stagewrite-ai/tree/v1) and the [`v1.6` tag](https://github.com/IntouchKtakizawa/stagewrite-ai/releases/tag/v1.6).

## Develop

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

Pushing to `main` builds and deploys to GitHub Pages via `.github/workflows/deploy.yml`.

## Code guide

| Path | What it does |
| --- | --- |
| `src/music/theory.ts` | Notes, chords, roman numerals, modes, progression generation, suggestions, cadence and key detection |
| `src/music/voicings.ts` | Guitar/ukulele shape finder and voice-led piano voicings |
| `src/audio/engine.ts` | Web Audio sampler, drum kit and lookahead scheduler |
| `src/audio/midi.ts` | Standard MIDI file export |
| `src/audio/tuner.ts` | YIN pitch detection for the tuner |
| `src/state/project.ts` | Song model, undo/redo, local storage and share links |
| `src/views/*` | The five screens: Write, Band, Learn, Tune, Songs |
| `public/sw.js` | Offline cache |

## License and audio credits

Code: [MIT](LICENSE). Bundled instrument samples have their own terms; see [SAMPLE-LICENSES.md](SAMPLE-LICENSES.md).
