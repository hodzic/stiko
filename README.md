# Stiko

An offline-capable PWA for balanced home workouts, demonstrated by Stiko, a rigged SVG stick figure.
Plain HTML/JS with ES modules, no build step, served from GitHub Pages.

## Run locally

```sh
npm run serve      # python3 -m http.server 8000, then open http://localhost:8000
npm test           # rig and library checks (Node 20+)
```

The app fetches `data/library.json`, so open it over HTTP, not `file://`.

## Layout

| Path | What |
| --- | --- |
| `index.html`, `css/app.css` | App shell and styles (light/dark tokens) |
| `js/app.js` | Loads the library, hash router (`#/library`, `#/play/<id>`), language switch, service worker |
| `js/library.js` | Library screen: cards and tag filters |
| `js/player.js` | Player: ready → sets of work/rest → done, cues, scrub, read aloud, pose check |
| `js/rig.js` | Stiko rig: FK, pinning, rotation leveling, leg IK, SVG rendering (pure, unit-tested) |
| `js/audio.js` | Web Audio tones and speech synthesis |
| `js/i18n.js`, `js/vocab.js`, `js/store.js` | UI strings (EN/BS), tag vocabulary, device preferences |
| `data/library.json` | Exercise library |
| `sw.js`, `manifest.webmanifest`, `icons/` | PWA. Bump `VERSION` in `sw.js` when the asset list changes |

## Adding an exercise

Add a record to `data/library.json` and run `npm test`. Each record has bilingual (`{en, bs}`) text, tags from
`js/vocab.js`, a dose (`reps` or `hold`), instructions with one movement step per keyframe, and `anim`:

- `spec.pin`: the joint pinned to the floor, `at: [x, y]` where y is relative to the floor line (negative = above).
- `spec.level` (optional): solve whole-body rotation so a second joint sits at a given height (plank elbows).
- `spec.ik` (optional): plant both ankles at a point and solve the knees (bridge).
- `frames`: 1–4 keyframes of joint angles at phase `t` in [0, 1); the last eases back to the first.
- `restPose` (optional): pose shown during rest and countdown.

Use the player's Pose check toggle to read joint angles while tuning.
