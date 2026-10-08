# StageWrite AI

StageWrite AI 1.2 is a browser-based songwriting, guitar-learning, and practice workspace for musicians, producers, composers, and bands.

## Features

- Music-theory-aware progression generation by key, genre, mood, and complexity
- Progressions from 2 to 64 chords
- Intro, verse, pre-chorus, chorus, post-chorus, bridge, solo, breakdown, and outro sections
- Per-chord harmonic rhythm and synchronized metronome playback
- Visual six-string guitar chord diagrams with open, easy, barre, and higher voicings
- Beginner, intermediate, and advanced guitar modes connected to progression generation
- One-click reference audio for every chord and an all-chords practice view
- Integrated chord-change highlighting and standalone metronome mode
- Chromatic microphone tuner with Standard, Drop D, and Half-Step Down references
- Instrument-ready architecture for future piano, bass, and ukulele visualizations
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
To run this by browser use the link "https://intouchktakizawa.github.io/stagewrite-ai/"

## Product explainer

The modern product overview and interactive “how it works” page is included at [`explainer/`](explainer/) and is published at:

https://intouchktakizawa.github.io/stagewrite-ai/explainer/

