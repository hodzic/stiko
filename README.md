# Stiko

An offline-capable PWA for balanced home workouts, demonstrated by Stiko, a rigged SVG stick figure.
Plain HTML/JS with ES modules, no build step, served from GitHub Pages.

## Run locally

```sh
npm run serve      # python3 -m http.server 8000, then open http://localhost:8000
npm test           # rig, library and session checks (Node 20+)
npm run sheet      # pose review contact sheet (see below)
```

The app fetches `data/library.json`, so open it over HTTP, not `file://`.

## Layout

| Path | What |
| --- | --- |
| `index.html`, `css/app.css` | App shell and styles (light/dark tokens) |
| `js/app.js` | Loads the library, hash router (routes listed at the top of `mount()`), language switch, first-run seeding, service worker |
| `js/sessions-list.js` | Sessions screen (home): start, edit, duplicate, delete, export backup, import |
| `js/editor.js` | Session editor: name, warm-up / main / cool-down blocks, sets/reps/hold/rest, reorder, share |
| `js/sessions.js` | Session model, validation, time estimates, import/export format, on-device storage (pure, unit-tested) |
| `js/library.js` | Library screen: cards and tag filters; pick mode adds exercises to a session block |
| `js/player.js` | Player for a queue of exercises: get ready → sets of work/rest → next → done; skip, cues, scrub, read aloud, pose check, screen wake lock |
| `js/ui.js` | Toasts and saving/sharing JSON files |
| `js/rig.js` | Stiko rig: FK, pinning, rotation leveling, leg IK, SVG rendering (pure, unit-tested) |
| `js/audio.js` | Web Audio tones and speech synthesis |
| `js/vocab.js` | Exercise taxonomy vocabularies (see `docs/taxonomy.md`) |
| `js/i18n.js`, `js/store.js` | UI strings and taxonomy labels (EN/BS/FR/DE), voice settings per language, device preferences |
| `data/library.json` | Exercise library |
| `data/starters.json` | Starter sessions, offered once per device (same format as an export) |
| `tools/` | `sheet.mjs` pose review sheets, `format-library.mjs` library formatter |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA. Bump `VERSION` in `sw.js` when the asset list changes |

## Adding an exercise

Add a record to `data/library.json`, run `npm run fmt:library` to normalise the layout, then `npm test`. Each record
has text in every language (`{en, bs, fr, de}`), a classification following [docs/taxonomy.md](docs/taxonomy.md), a dose, instructions,
and `anim`. The tests check the vocabulary, the text in both languages, the instruction steps against the keyframes,
that IK targets are reachable and that no pose sinks through the floor.

### Dose

`{"mode": "reps", "sets": 3, "reps": 10, "rest": 30}`, `"hold"` (seconds held still) or `"time"` (seconds of a looping
movement, for cardio and mobility). For `unilateral` exercises the player runs each set on one side, announces
"Switch sides", then runs the other side with Stiko mirrored. For `alternating` exercises one animation cycle covers
both sides and the dose counts per side.

### Animation (`anim`)

| Field | Meaning |
| --- | --- |
| `cycle` | Seconds per rep (or per loop for `time` doses). Not needed for single-pose holds |
| `spec.view` | `"side"` (default) or `"front"` for frontal-plane moves |
| `spec.pin` | `{point, at:[x, y]}`: the joint held in place; y is relative to the floor line (negative = above) |
| `spec.level` | Solve the body's rotation so a second joint sits at a given height (e.g. plank elbows on the floor) |
| `spec.ik` | Two-bone IK targets: `an`/`hd` for both ankles/hands, or per side `an_n`, `hd_f`, `an_l`, … Knees bend forward, elbows back (outward in front view) |
| `spec.footAbs` | Default absolute foot angle (0 = flat, pointing forward) |
| `frames` | Keyframes `{t, label, face, pose, step?}`; `t` in [0, 1); every frame sets the same pose keys; `step` maps several keyframes to one instruction step |
| `loopAdd` | Added to the first frame when the cycle wraps, e.g. `{"shoulder": 360}` for continuous circles |
| `restPose` | `{spec, pose}` shown while getting ready and resting |
| `props` | `chair {x, back}`, `wall {x, side}`, `step {x, w, h}`, `dumbbell {hands}`, `band {from, to}` |
| `floorWork`, `farShift` | Draw the mat; offset of the far-side limbs in side view |

Pose keys are joint angles in degrees. Side view: `rot` (whole body), `torso` (lower trunk tilt), `spine` (upper-trunk
bend, + = flexion), `neck`, `shoulder`, `elbow`, `hip`, `knee`, `ankle`, or absolute segment angles `uaAbs`, `faAbs`,
`footAbs`; `lift` raises the whole figure (jumps). Add `_n`/`_f` (side view) or `_l`/`_r` (front view) to set one side;
in front view `shoulder` and `hip` are abduction and `torso`/`spine` are side bends.

### Reviewing poses

`npm run sheet -- <id-or-prefix ...>` writes `pose-sheets/sheet.html` with every keyframe, the midpoints between
keyframes and the rest pose, with joints marked. Add `--png` to also render PNGs (needs Playwright). Every new or
changed animation should be checked on a sheet before it ships: a wrong pose teaches bad form. In the app, the player's
Pose check toggle shows the live joint angles.

## Sessions file format

Exports, shared sessions and `data/starters.json` share one format; import also accepts a bare session or array.

```json
{ "kind": "stiko-sessions", "version": 1,
  "sessions": [
    { "id": "s-abc123", "name": "Morning mobility",
      "items": [ { "ex": "squat", "block": "main", "sets": 3, "reps": 10, "rest": 30 },
                 { "ex": "forearm-plank", "block": "main", "sets": 3, "hold": 30, "rest": 20 } ] } ] }
```

`block` is `warmup`, `main` or `cooldown`. Reps-based exercises take `reps`, hold-based ones `hold` (seconds).
On import, values are clamped to valid ranges, unknown exercises are dropped, an identical session already on
the device is skipped, and a different session with the same id is added under a new id.

## Languages

English, Bosnian, French and German. The non-English languages use the informal form (ti / tu / du). To add one:

1. Add a dictionary to `UI` in `js/i18n.js` (copy `UI.en`, including the taxonomy label tables) and its `Object.assign` block of session strings.
2. Add its voice settings to `VOICE` in `js/i18n.js`, and phone-language detection in `fromNav`.
3. Add the language key to every text field in `data/library.json` (names, instructions, keyframe labels) and to the starter names in `data/starters.json`.

`npm test` fails until every UI string, taxonomy label and exercise text has the new language.
