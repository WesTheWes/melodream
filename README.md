# Melodream

A tiny pixel-art ear-training game that trains audiation: hear a lick, imagine it, play it back, get feedback in terms of scale degrees.

Design canvas: https://claude.ai/artifact/Unpv4krD3RBLwmD35qe5Hv

## Run it

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # production bundle in dist/
npm run typecheck
```

Live at https://westhewes.github.io/melodream/. Every push to `main` builds and deploys through GitHub Actions (`.github/workflows/deploy.yml`).

No backend. Progress lives in `localStorage` under `melodream.progress.v1`.

## The loop

1. **Home** – a cadence (I–IV–V–I or i–iv–V–i) or a bass note establishes the tonic.
2. **Hear** – the lick plays; notes are masked as `?` blocks whose width is their duration.
3. **Start** – tap the degree it started on. Immediate feedback with a one-line hint about how that degree behaves.
4. **Imagine** – the keyboard is hidden. A quiet bar passes before the keys return.
5. **Play** – tap the degrees on the in-app keyboard or play them on your instrument (experimental mic pitch tracking).
6. **Feedback** – expected vs. played note by note, a "Work on" insight, and a slow replay to say the degrees out loud.

You must play every pitch right to move on. A clean take is a perfect **first** take. **8 clean out of your last 10** counted takes opens the next territory (`GATE` and `WINDOW` in `stages.ts`); a miss costs one spot instead of wiping the run. Retries and color-hint takes never count.

After 4 misses in your last 5 takes (never before 5), the feedback screen shows a gentle warm-up card: go back one territory (progress here is kept), slow down, try it in C, or keep going, which hides the card for 10 takes.

## Code map

| Path | What |
| --- | --- |
| `src/music/theory.ts` | degrees, labels, colors, hints, scale sets, keyboard layouts |
| `src/music/stages.ts` | the ten territories and what they allow |
| `src/music/licks.ts` | the lick library, in semitones from the tonic |
| `src/audio/engine.ts` | Web Audio chiptune synth: tones, cadence, phrase playback |
| `src/audio/pitch.ts` | autocorrelation pitch tracker for instrument input |
| `src/state/store.tsx` | progress, streaks, tonal-map stats, persistence |
| `src/state/adapt.ts` | adaptive lick selection weighted by confusions |
| `src/art/worlds.ts` | pixel-art scene for every world (40 × 24 blocks), drawn by `components/WorldScene.tsx` |
| `src/screens/*` | Home, Play, Territory, TonalMap, Saved |

## Adding a lick

Append to `LICKS` in `src/music/licks.ts`:

```ts
L('s2-m', 2, 'major', [7, 9, 12, 9, 7], [0.5, 0.5, 1, 0.5, 2], 'optional tag')
```

Notes are semitones above the tonic (0 = 1, 4 = 3, 7 = 5, 12 = 1 an octave up). Durations are beats.

## Progression Paths (harmony licks)

Ten territories (H1–H10) where licks ride on chord changes: I–IV, I–V–vi–IV, blues, ii–V–I, turnarounds, borrowed chords, the minor ii–V, modal vamps, bebop vocabulary and funk vamps. Jazz and blues paths swing their eighth notes (`SWING_STAGES` and swing tags in `licks.ts`). Each opens when its main-road territory is cleared (`after` in `stages.ts`).

The home rule: notes are always graded as degrees of the home key. Borrowed chords just bring altered degrees (♭3, ♭6, ♭7), and a brief secondary dominant brings ♯4. Feedback adds the chord lens (each note's job over its chord), and from H4 on, **Land the Target** asks which degree each new chord lands on. A missed target spoils the clean run. Home never moves in these paths; real modulation is future work.

Add one with `H()` in `licks.ts`, bar by bar. Each bar's notes must fill the chord's beats (4 by default):

```ts
H('h4-x', 14, 'major', [['ii7', [[2, 1], [5, 1], [9, 1], [12, 1]]], ['V7', [[11, 2], [7, 2]]], ['Imaj7', [[4, 4]]]])
```

Chords live in `CH` in the same file. Clearing any territory shows a level-up prompt that sends you on to the next one.

## Keyboard layouts

The Play screen toggles between **PIANO** (real key positions, one octave from home, degrees shown as colored dots) and **SAME SHAPE · IN C** (movable-do: always drawn in C, so each degree sits on the same key whatever key the lick sounds in). The choice is saved with progress. A separate **ALWAYS IN C** setting plays every lick in C instead of a new key each round.

## Saved licks

On the feedback screen, **☆ Save lick** keeps the lick (in the key you heard it) in the **SAVED** tab, where you can replay it, slowly or with its changes, and remove it. Saving only appears after a take, so the tab never gives an answer away early.

## Dev mode

Dev tools are hidden unless the URL has `?dev=me`, e.g. `https://westhewes.github.io/melodream/?dev=me`. Then Territory → **DEV: FREE ROAM** unlocks every stage, and the Play screen adds **REVEAL LICK** and **SKIP LICK**.
