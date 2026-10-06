# Exercise App with Stiko — Concept

Oct 5, 2026 · @Edin Hodzic · updated Oct 6, 2026

## Vision

An offline-capable phone app that builds balanced home workouts from a classified exercise library, demonstrated by an animated stick-figure character called Stiko, with Claude supplying the fitness expertise behind the content.

Inspired by Hinge Health's guided routines, but positioned as general fitness, not physical therapy. The library's classification borrows the vocabulary of exercise science and kinesiology, so it makes sense to trainers and physical therapists, but the app gives no clinical advice. First user is Dino; then friends and others who want to exercise on their own.

## MVP scope

The MVP is an offline session runner: build named sessions from the library, edit them, and play them. No AI at run time, no API key, no backend.

| Screen | Purpose |
| --- | --- |
| Sessions (home) | List of named sessions (e.g. "Morning mobility") with estimated time; start, create, edit, duplicate, delete; export a backup, import |
| Session editor | Name; warm-up, main and cool-down blocks; add exercises from the library, reorder them, set sets, reps or hold, and rest per item; time estimate per block; main-block pattern coverage; share |
| Library | Browse and filter exercises by the taxonomy; each shows Stiko demonstrating it. When adding to a session block, it starts filtered to exercises suited to that block |
| Player | Runs a session or a single exercise: Stiko demo, timer or rep counter, cues, rest, next-up; pause, skip and previous; instructions and a Kinesiology panel |

Sessions are stored on the device and can be exported or imported as JSON, which also covers backup and sharing with others. A starter session is added on first run.

## Exercise library

Exercises are classified on several dimensions taken from exercise science and kinesiology. Movement pattern comes first, because patterns are what make a routine balanced. The other dimensions support browsing, routine building and an accurate description of each exercise. The full definitions and authoring rules are in the repo at `docs/taxonomy.md`.

| Dimension | Values | Basis |
| --- | --- | --- |
| Movement pattern | Families: squat, hinge, lunge, push, pull, core, carry, locomotion. Sub-patterns: horizontal and vertical push and pull; core anti-extension, anti-rotation, anti-lateral flexion, rotation, trunk flexion; gait and jump | Functional movement patterns (NSCA) |
| Fitness component | strength, stability, mobility, flexibility, balance, cardio | ACSM components of fitness, with neuromotor fitness split into stability and balance |
| Target muscles | Main (prime movers) and supporting muscles, from 19 muscle groups | Anatomy |
| Body area | lower, upper, core, full body | Worked out from the main muscles |
| Joint actions | Joint → actions, e.g. hip: extension; joints held still during isometric work | Kinesiology |
| Plane of motion | sagittal, frontal, transverse | Anatomical planes |
| Position | standing, seated, kneeling, half-kneeling, hands and knees, on back, face down, on side | |
| Sides | both together, one side at a time, alternating | |
| Kinetic chain | closed, open | |
| Routine fit | warm-up, main, cool-down | Routine structure below |
| Dosing mode | reps × sets, timed hold, interval (work/rest; later) | |
| Equipment | none, band, dumbbell, mat, chair, wall | |
| Level | 1–3, with links to an easier and a harder variant | Progressions and regressions |

How hard an exercise is comes from its dose, not from the exercise itself, so strength and endurance aren't separate categories. Isolated mobility and stretching work may have no movement pattern; it's described by its joint actions instead.

Target size for v1: 60–80 exercises. Each record also carries bilingual instructions (see Prototype decisions) and Stiko animation keyframes.

```json
{ "id": "glute-bridge",
  "name": { "en": "Glute bridge", "bs": "Glutealni most" },
  "pattern": "hinge", "component": "strength", "planes": ["sagittal"],
  "position": "supine", "laterality": "bilateral", "chain": "closed", "blocks": ["warmup", "main"],
  "muscles": { "primary": ["glutes"], "secondary": ["hamstrings", "back-extensors"] },
  "joints": { "hip": ["extension"] },
  "dose": { "mode": "reps", "sets": 3, "reps": 12, "rest": 30 },
  "equipment": ["mat"], "level": 1,
  "easier": null, "harder": "single-leg-bridge",
  "howto": {
    "setup":    { "en": "Lie on your back, knees bent...", "bs": "Lezi na leđa, koljena savijena..." },
    "steps":    [ { "en": "Press through your heels...", "bs": "Pritisni petama..." } ],
    "breathe":  { "en": "...", "bs": "..." },
    "mistakes": [ { "en": "...", "bs": "..." } ],
    "easier":   { "en": "...", "bs": "..." },
    "harder":   { "en": "...", "bs": "..." } },
  "anim": { "cycle": 3.4, "spec": { "pin": {}, "ik": {} },
    "frames": [ { "t": 0, "label": { "en": "Press your hips up", "bs": "Podigni kukove" },
                 "face": "smile", "pose": {} } ] } }
```

## Routine structure

Every routine uses a fixed three-part shape in the MVP.

1. Warm-up, 3–5 min: mobility and light cardio.
2. Main block, 15–30 min: strength and stability, covering 4–6 movement-pattern families out of squat, hinge, lunge, push, pull and core. The editor shows which are covered and which are missing.
3. Cool-down, 3–5 min: static stretches, 30–60 s holds.

## Stiko

Stiko is a rigged SVG character, not a set of drawings: one renderer animates every exercise from a few keyframes of joint angles stored in the library.

- **Skeleton:** hip root; torso, neck, head; per side upper arm, forearm, thigh, shin, foot. Each joint is an angle relative to its parent.
- **Animation:** 2–4 keyframes per exercise (e.g. top and bottom of a squat), tweened with easing; tempo comes from the dose (reps, holds, intervals).
- **Look:** big round head (about 1/3 of height), dot eyes, sweatband, expression per phase (effort, smile, puffed cheeks on holds), idle sway and blink; far-side limbs drawn lighter.
- **Views:** side by default, front for lateral moves.
- **Floor work:** root rotation plus hand/foot pinning so contacts don't slide or sink.
- **Props:** dumbbell, band, mat, chair as attachable SVG parts.
- **Quality control:** a pose-editor debug view so a wrong joint angle can be fixed in seconds; every animation gets a visual review, since a bad pose teaches bad form.

## Role of Claude

In the MVP Claude is a build-time tool only; the app itself never calls Claude.

- **Build time (MVP):** writes the library (selection, classification, dosing, cues, progressions), authors Stiko keyframes, and writes a few starter sessions shipped with the app.
- **Later, optional:** a run-time coach that generates and adjusts sessions from goals and feedback. This needs a small API proxy, since a static page can't hold an API key.

## Tech stack

Same pattern as Dino's other apps: a static PWA in a GitHub repo, served from GitHub Pages, installable and offline.

- **Frontend:** plain HTML/JS with ES modules and no build step, SVG renderer for Stiko, library as JSON, service worker for offline use.
- **Storage:** sessions kept in browser storage on the device; JSON export and import, and sharing a single session through the phone's share sheet.
- **Quality:** Node unit tests check the rig, the session model, and the library against the taxonomy, including English and Bosnian labels for every value.
- **Later:** Claude API via a Cloudflare Worker proxy for the coach; MediaPipe Pose in the browser for rep counting and form checks.
- **Workflow:** prototype Stiko in chat, then build the real app in Claude Code.

## Prototype decisions

The [Stiko prototype](https://claude.ai/artifact/Ne2xNtAUdnKwNEcynjomXz) settled these player and content details and is the reference implementation.

- **Instructions:** each exercise has setup, movement steps (one per keyframe), breathing, common mistakes, and easier/harder options. The current step highlights in sync with the animation.
- **Languages:** English and Bosnian at launch. Every text field is `{en, bs}` and UI strings live in one dictionary, so a new language is a new key. Bosnian uses the informal "ti" form. Language defaults from the phone and is remembered.
- **Layout:** portrait stacks Stiko above the instructions; landscape or wide screens show them side by side.
- **Player controls:** tap Stiko to pause or resume; speed 0.5×, 1×, 2×; scrub through one rep; a 5-second "Get ready" countdown before each exercise. In a session, an exercise's rest becomes the countdown to the next one, and the screen stays awake while playing.
- **Read aloud:** reads setup, steps and breathing with the phone's text-to-speech, highlighting each step and showing its pose.
- **Voice cues:** step names on the first rep, then rep numbers, "Last one", set and rest announcements, "10 seconds left" on holds, "Next" between exercises, "Great work" at the end.
- **Sounds:** generated with Web Audio, no audio files: rep tick, 3-2-1 countdown beeps, start tone, set-complete chime. Sound and voice toggle separately.
- **Pose check:** a debug toggle showing joints and angles, the seed of the pose editor.
- **Constraints found:** audio and speech need a first tap to unlock; speech is missing in the Claude app's embedded view but works in Chrome and in an installed PWA; Bosnian speech needs a Bosnian or Croatian voice on the phone.

## Risks and roadmap

The biggest risks are liability and scope creep; the roadmap proves the hardest piece (Stiko) first.

- **Liability:** frame as fitness, not rehab; a disclaimer is shown in the library; the app advises seeing a professional for pain or injury. The kinesiology classification is descriptive, not a prescription. Joint-load flags (e.g. "avoid knee load") would be useful but edge toward clinical advice, so they wait for a deliberate decision.
- **Animation accuracy:** wrong poses teach bad form; mitigated by the pose editor and review.
- **Classification accuracy:** muscles and joint actions should be checked by a trainer or physiotherapist, including the Bosnian anatomical terms.
- **Scope creep:** nothing beyond the four MVP screens until they're used.

1. Stiko prototype: squat, glute bridge, plank, with instructions, EN/BS, voice and sounds (done).
2. Repo in Claude Code: rig renderer, library JSON, Library and Player screens (done).
3. Sessions list and session editor, on-device storage, JSON export and import (done).
4. Kinesiology-based exercise taxonomy, with filters, a Kinesiology panel and pattern coverage (done).
5. Full library of 60–80 exercises with animations and classification, plus starter sessions.
6. Later: workout log, Claude coach via proxy, camera-based form checks, joint-load flags.
