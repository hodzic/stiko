# Exercise taxonomy

Every exercise in `data/library.json` is classified on the dimensions below. Vocabularies live in
`js/vocab.js`, labels (in every language) in `js/i18n.js`, and `npm test` rejects any value not listed here.

The scheme borrows standard frameworks from exercise science and kinesiology so it stays meaningful to
trainers and physical therapists, while the app itself stays a general-fitness tool, not rehab.

| Dimension | Field | Values | Basis |
| --- | --- | --- | --- |
| Movement pattern | `pattern` | see below; families group them | Functional movement patterns used in strength and conditioning (NSCA) |
| Fitness component | `component` | strength, stability, mobility, flexibility, balance, cardio | ACSM components of health-related fitness, with neuromotor fitness split into stability and balance |
| Target muscles | `muscles.primary`, `muscles.secondary` | 20 muscle groups | Prime movers vs. synergists and stabilizers |
| Body area | derived | lower, upper, core, full | Area of the primary muscles; "full" when they span several |
| Joint actions | `joints` | joint → list of actions | Anatomical joint actions |
| Plane of motion | `planes` | sagittal, frontal, transverse | Cardinal anatomical planes |
| Position | `position` | standing, seated, kneeling, half-kneeling, quadruped, supine, prone, side-lying, hanging | Starting body position |
| Laterality | `laterality` | bilateral, unilateral, alternating | Unilateral: all reps on one side, then the other. Alternating: sides swap every rep, counted per side |
| Kinetic chain | `chain` | closed, open | Closed: the hands or feet are fixed against the floor or wall. Open: the moving limb is free |
| Routine fit | `blocks` | warmup, main, cooldown | Which part of the three-part routine it suits |
| Equipment | `equipment` | band, dumbbell, mat, chair, wall, step, bar (doorway pull-up bar; empty = none) | |
| Discipline | `discipline` (optional) | yoga, tai-chi (tai chi and qigong) | Style the exercise belongs to; shown as a filter |
| Level | `level`, `easier`, `harder` | 1–3, with links to a regression and a progression | Progression/regression chains |

## Movement patterns

Patterns are what make a routine balanced, so they're two levels deep. The **family** is used for
filtering and for the editor's coverage check. The **pattern** is stored on the exercise.

| Family | Patterns | Examples |
| --- | --- | --- |
| Squat | squat | bodyweight squat, goblet squat, sit-to-stand |
| Hinge | hinge | glute bridge, hip hinge, Romanian deadlift, good morning |
| Lunge | lunge (split stance or single leg) | reverse lunge, split squat, step-up |
| Push | push-horizontal, push-vertical | wall/incline push-up; overhead press |
| Pull | pull-horizontal, pull-vertical | band row; band pulldown, negative pull-up, pull-up |
| Core | anti-extension, anti-rotation, anti-lateral-flexion, rotation, trunk-flexion, trunk-extension | plank, dead bug; bird dog, shoulder taps; side plank; thread the needle; crunch; superman |
| Carry | carry | farmer's or suitcase carry |
| Locomotion | gait, jump | marching, step jacks; squat jump |

A balanced main block covers the six families **squat, hinge, lunge, push, pull, core**, which matches the
concept's 4–6 patterns. The session editor lists which families the main block covers and which are missing.

`pattern` is `null` for isolation exercises that work one joint (calf raise, biceps curl, lateral raise,
side-lying leg raise) and for most stretches and balance drills. Those exercises are described by their joint
actions instead.

## Fitness components

| Component | Meaning | Typical dose | Typical block |
| --- | --- | --- | --- |
| strength | Muscles working against load through a range of motion, or holding against it (wall sit) | reps or hold | main |
| stability | Holding a position against a force that would move it (motor control, isometric core work) | hold or slow reps | main |
| mobility | Moving a joint actively through its range of motion | reps | warm-up |
| flexibility | Static stretching at end range | hold 30–60 s | cool-down |
| balance | Controlling the body over a small or shifting base | hold or reps | warm-up or main |
| cardio | Sustained rhythmic work that raises heart rate | time | warm-up or main |

How hard an exercise is depends on the dose (sets, reps, load), not the exercise itself. So strength and
muscular endurance aren't separate components.

## Muscles

**Primary** lists the prime movers, or for isometric work the main stabilizers. **Secondary** lists
synergists and stabilizers that work noticeably. A muscle appears in one list, not both.

| Area | Muscle groups |
| --- | --- |
| Lower | glutes, quadriceps, hamstrings, adductors, hip abductors, hip flexors, calves, shins (tibialis anterior) |
| Core | abdominals, obliques, back extensors |
| Upper | lats, upper back (rhomboids, middle and lower trapezius), chest, shoulders (deltoids), rotator cuff, biceps, triceps, forearms, neck |

## Joint actions

`joints` maps each involved joint to its actions:

- **Dynamic exercises:** list the concentric (lifting) actions only. The squat is hip extension, knee
  extension and ankle plantarflexion; the lowering phase is implied.
- **Isometric exercises:** list the stabilized joints with an empty list, shown as "held steady". The core
  pattern (anti-extension and so on) already names what is being resisted.

Joints: neck, thoracic spine, lumbar spine, scapula, shoulder, elbow, wrist, hip, knee, ankle.

Actions: flexion, extension, abduction, adduction, horizontal abduction and adduction, internal and
external rotation, rotation, lateral flexion, dorsiflexion, plantarflexion, and the scapular protraction,
retraction, elevation, depression, and upward and downward rotation.

## Example

```json
"pattern": "hinge", "component": "strength", "planes": ["sagittal"],
"position": "supine", "laterality": "bilateral", "chain": "closed", "blocks": ["warmup", "main"],
"muscles": {"primary": ["glutes"], "secondary": ["hamstrings", "back-extensors"]},
"joints": {"hip": ["extension"]},
"equipment": ["mat"], "level": 1, "easier": null, "harder": "single-leg-bridge"
```

## Where it shows up in the app

- **Library filters:**
  - Main filters: movement pattern (family), fitness component and body area.
  - Under "More filters": target muscles, position, equipment, plane, sides and level.
  - When adding exercises to a session block, the list starts filtered to exercises suited to that block.
- **Player:** a collapsible "Kinesiology" panel shows the full classification.
- **Session editor:** shows which movement-pattern families the main block covers.

## Sports

Exercises aren't tagged by sport: a squat isn't a skiing exercise, but a session can be built for skiing. Sessions
carry an optional `sport` (`SPORTS` in `js/vocab.js`): alpine skiing, hiking, road cycling, mountain biking, swimming
and kayaking. Each has a starter session that picks exercises for the sport's demands, for example eccentric quad
strength and lateral power for skiing, step-downs and carries for hiking, and shoulder and lat work for swimming.

## Possible extensions

- **Joint-load flags** (for example `loads: ["knee", "wrist"]`) so people can filter out exercises that load
  a sensitive joint. This edges toward clinical advice, so it needs careful wording.
- **Impact level** (none, low, high) once jumping and cardio moves are added.
- **Plane and push/pull balance** in the editor, next to the pattern coverage.
