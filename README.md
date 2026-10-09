# StageWrite AI

StageWrite AI 1.4.2 is a browser-based songwriting, multi-instrument learning, and sample-based backing-track practice workspace for musicians, producers, composers, and bands.

## Features

- Music-theory-aware progression generation by key, genre, mood, and complexity
- Dynamic chord-symbol parsing with aliases, slash chords, alterations, extensions, added tones, and enharmonic spellings
- Live chord search with keyboard navigation, typo-tolerant matching, confidence states, and theory-aware suggestions
- Interactive 12-fret guitar builder with open/muted strings, live note calculation, chord detection, exact-voicing playback, and custom naming
- Manual note entry, multiple possible chord interpretations, and locally saved “My Chords” voicings
- First-class custom chords that can be added, replaced, duplicated, renamed, deleted, played, saved, and exported with progressions
- Progressions from 2 to 64 chords
- Intro, verse, pre-chorus, chorus, post-chorus, bridge, solo, breakdown, and outro sections
- Per-chord harmonic rhythm and synchronized metronome playback
- Visual six-string guitar chord diagrams with open, easy, barre, and higher voicings
- Beginner, intermediate, and advanced guitar modes connected to progression generation
- One-click sample-based reference audio for every chord and an all-chords practice view
- Audio-clock-driven chord highlighting, per-chord progress, Now Playing status, and standalone metronome mode
- Chromatic microphone tuner with Standard, Drop D, and Half-Step Down references
- Piano chord visualization, four-string ukulele diagrams, and bass note/TAB views
- Chord-aware generated basslines with six playing styles
- Genre-aware editable drum sequencer with seven kit presets, swing, humanisation, generated fills, undo, and redo
- Nine guitar sound presets spanning steel, nylon, clean, jazz, crunch, distortion, and high-gain tones
- Strumming, fingerpicking, arpeggio, sustained-chord, and muted-rhythm guitar performance modes
- Live guitar reverb, delay, chorus, drive, and compression controls
- Polyphonic acoustic piano, sampled guitar families, electric bass, dedicated ukulele, and multi-articulation drum samples
- Lazy sample loading with session caching, automatic retry, and graceful fallback playback
- Synchronized backing-track mixer with live volume, mute, solo, master level, count-in, looping, and transport
- Instrument previews, bar/beat and elapsed-time readouts, restart, pause, and immediate stop
- Optional humanisation and genre-aware guitar, bass, ukulele, and drum patterns
- Independent chord, bass, and drum regeneration with locks
- Progression shapes, cadence controls, chord density, and repetitions
- Chord locking, explained alternatives, transposition, and intelligent continuation
- Identity-preserving variations and adjustable Progression DNA
- MIDI, MusicXML, and chord-chart export
- Local project library with no account or server required
- Persistent Settings page with themes, custom colours, audio/playback defaults, accessibility controls, and keyboard shortcuts

## Run locally

Open `index.html` through any static web server. The application has no build step and requires no API key.

Project data is stored in the browser's local storage.

Bundled audio assets and their redistribution terms are documented in [`SAMPLE-LICENSES.md`](SAMPLE-LICENSES.md).

## Design note

This version uses a transparent, local rule-based harmony engine. It does not claim to call a hosted generative-AI model.
To run this by browser use the link "https://intouchktakizawa.github.io/stagewrite-ai/"

## Product explainer

The modern product overview and interactive “how it works” page is included at [`explainer/`](explainer/) and is published at:

https://intouchktakizawa.github.io/stagewrite-ai/explainer/
