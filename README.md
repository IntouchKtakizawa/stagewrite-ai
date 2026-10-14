# StageWrite AI

## 1. Product overview

StageWrite AI V1.6 (Refined) is a local-first browser songwriting workspace. Its focused workflow is: choose a musical direction, generate a progression, listen, lock or edit the chords, then save or export. The interface is organised into Compose, Play, Arrange and Learn workspaces so advanced tools stay available without crowding the first screen.

The current product uses transparent, deterministic music-theory rules and Web Audio. It does not use a hosted generative-AI model, require an account, or upload projects.

## 2. Current capabilities

- Context-aware chord progressions by key, genre, mood, complexity, shape and cadence
- Verse and Chorus as the default structure, with seven optional song sections
- Chord locking, replacement, custom voicings, transposition, continuation and focused transformations
- Guitar, bass, piano and ukulele views with practical voicings and reference playback
- Metronome, master transport, instrument previews, editable drum sequencer and mixer
- Sample-based backing tracks with mute, solo, volume, count-in, looping and humanisation
- Fully chromatic tuner with grouped guitar, bass and ukulele reference presets
- Local project library with open, duplicate, export and delete actions
- MIDI, MusicXML and chord-chart export
- Studio, Midnight, Graphite, Ivory and Stage themes
- Reduced motion, high contrast, larger text, keyboard focus and shortcuts

## 3. V1.6 (Refined) changes

- Reorganised the main workspace into Compose, Play, Arrange and Learn
- Reduced the default song structure to Verse and Chorus, with an Add section control
- Consolidated transformation actions into one Transform menu
- Clarified global, section, arrangement, chord and instrument playback actions
- Replaced unexplained percentages in Progression DNA with a qualitative Harmony Profile
- Made the inactive tuner smaller and clarified its permission flow
- Expanded Library project metadata and backup guidance
- Moved specialist colour controls under Advanced appearance
- Unified product identity around “Ideas, tuned into music.” and V1.6 (Refined)

## 4. Technical and privacy notes

Open `index.html` through any static web server. There is no build step and no API key. Settings, assistant preferences, custom chords and projects use browser local storage. Export important projects for backup because clearing browser data can remove them.

The optional **StageWrite Theory Assistant** is an experimental local music-theory assistant powered by StageWrite’s transparent theory engine. It is Beta, disabled by default, locally processed and potentially incomplete. Its visible controls are limited to enabled/disabled, explanation level and behaviour. It is not a cloud model or unrestricted conversational AI.

Microphone permission is requested only after the user presses **Start tuner**. Pitch detection is processed locally. Bundled audio assets and redistribution terms are documented in [`SAMPLE-LICENSES.md`](SAMPLE-LICENSES.md).

## 5. StageWrite AI Version History

- **V1.6 (Refined):** focused workspace navigation, clearer playback, qualitative Harmony Profile, compact tuner, improved Library, simplified assistant and documentation
- **V1.6:** optional local Theory Assistant and contextual theory analysis
- **V1.5.2:** professional tuner and interface refinement
- **V1.5:** StageWrite Studio themes, sample playback and expanded settings
- **V1.4:** chord studio, custom voicings and instrument workflow improvements
- **V1.3:** multi-instrument views, drum sequencing, backing track and transport
- **V1.2:** guitar diagrams, tuner, metronome, project storage and export foundations

### Interface Rework Patches

Minor interface patches preserve the current music engine and saved-data structure unless a migration is explicitly documented.

## 6. Future roadmap

Planned ideas are not current features. Possible future work includes deeper arrangement editing, more notation tools, additional instrument libraries and improved local theory explanations. Accounts, subscriptions, cloud processing and unrestricted AI chat are not part of the current product.

Live app: https://intouchktakizawa.github.io/stagewrite-ai/

Product explainer: https://intouchktakizawa.github.io/stagewrite-ai/explainer/
