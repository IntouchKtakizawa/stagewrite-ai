# StageWrite AI

StageWrite AI is a browser-based songwriting and harmony workspace for musicians, producers, composers, and bands.

## Features

- Music-theory-aware progression generation by key, genre, mood, and complexity
- Progressions from 2 to 64 chords
- Intro, verse, pre-chorus, chorus, post-chorus, bridge, solo, breakdown, and outro sections
- Per-chord harmonic rhythm and synchronized metronome playback
- Progression shapes, cadence controls, chord density, and repetitions
- Chord locking, explained alternatives, transposition, and intelligent continuation
- Identity-preserving variations and adjustable Progression DNA
- MIDI, MusicXML, and chord-chart export
- Local project library with no account or server required

## Run locally

Open `index.html` through any static web server. The application has no build step and requires no API key.

Project data is stored in the browser's local storage.

## Design note

This version uses a transparent, local rule-based harmony engine. It does not claim to call a hosted generative-AI model.
