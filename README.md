# StageWrite Studio

A browser songwriting workspace for exploring chord progressions, hearing arrangements, and exporting musical ideas. The repository and live app also use the name **StageWrite AI**.

[Open the app](https://intouchktakizawa.github.io/stagewrite-ai/) · [Product explainer](https://intouchktakizawa.github.io/stagewrite-ai/explainer/)

![StageWrite interface preview](https://raw.githubusercontent.com/IntouchKtakizawa/personal-website/main/images/stagewrite-ai.png)

## Features

- Generate progressions by key, genre, mood, complexity, shape, and cadence.
- Lock, replace, transpose, and edit chords and custom voicings across song sections.
- Explore guitar, bass, piano, and ukulele views and reference playback.
- Arrange sample-based backing tracks with a drum sequencer, mixer, metronome, count-in, looping, and humanisation.
- Tune instruments with local microphone pitch detection.
- Save projects locally and export MIDI, MusicXML, and chord charts.
- Choose themes, reduced motion, high contrast, larger text, and keyboard shortcuts.

## Stack and design

Plain HTML, CSS, and JavaScript, browser Web Audio, bundled instrument samples, and browser local storage. There is no dependency install, build step, account, or API key.

Progressions and the optional **Theory Assistant** use deterministic music-theory rules. They do not call a hosted generative-AI model. The assistant is experimental, disabled by default, and may give incomplete explanations.

## Run locally

Requires Python 3 for this example, or any other static web server:

```sh
git clone https://github.com/IntouchKtakizawa/stagewrite-ai.git
cd stagewrite-ai
python3 -m http.server 8000
```

Open **http://localhost:8000**. Start playback with an explicit click to enable browser audio. Microphone permission is requested only when you press **Start tuner**; pitch detection stays local.

Settings, custom chords, assistant preferences, and projects use this browser's local storage. Export important projects as backups; clearing browser data can remove them.

## Code guide

- `index.html`: application interface and script loading
- `stagewrite-v16-refined.js`: workspace and interaction refinements
- `chord-studio.js`: chord-editing interface
- `audio-engine.js`: playback and audio handling
- `theory-engine.js`: local music-theory analysis and explanations
- `assistant.js`: optional Theory Assistant
- `assets/samples/`: instrument audio

## Status

Personal project, **V1.6 (Refined)**. The current interface groups tools into Compose, Play, Arrange, and Learn. Accounts, cloud processing, unrestricted AI chat, and deeper arrangement editing are not current features.

The repository has no automated test suite. For a manual review, generate a progression, edit a chord, play an arrangement, save and reopen a project, and try an export. Tuner testing requires a microphone.

## License and audio credits

Code: [MIT](LICENSE). Bundled audio sources and redistribution terms: [SAMPLE-LICENSES.md](SAMPLE-LICENSES.md). These audio terms are separate from the code license.
