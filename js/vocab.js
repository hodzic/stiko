// Exercise taxonomy. See docs/taxonomy.md for definitions, sources and authoring conventions.
// Order here is display order.

// Movement patterns, grouped into families (the family is what routine balance is judged on).
export const PATTERNS = {
  squat:      ['squat'],
  hinge:      ['hinge'],
  lunge:      ['lunge'],
  push:       ['push-horizontal','push-vertical'],
  pull:       ['pull-horizontal','pull-vertical'],
  core:       ['anti-extension','anti-rotation','anti-lateral-flexion','rotation','trunk-flexion'],
  carry:      ['carry'],
  locomotion: ['gait','jump'],
};
export const familyOf = p => Object.keys(PATTERNS).find(f => PATTERNS[f].includes(p)) ?? null;
// Families a balanced main block should cover (concept: 4–6 patterns).
export const MAIN_FAMILIES = ['squat','hinge','lunge','push','pull','core'];

// Muscle groups and the body area each belongs to.
export const MUSCLES = {
  glutes:'lower', quadriceps:'lower', hamstrings:'lower', adductors:'lower', 'hip-abductors':'lower', 'hip-flexors':'lower', calves:'lower',
  abdominals:'core', obliques:'core', 'back-extensors':'core',
  lats:'upper', 'upper-back':'upper', chest:'upper', shoulders:'upper', 'rotator-cuff':'upper', biceps:'upper', triceps:'upper', forearms:'upper', neck:'upper',
};
// Body area is derived from the primary muscles: one area, or "full" when they span several.
export function regionOf(ex){
  const areas = new Set(ex.muscles.primary.map(m => MUSCLES[m]));
  return areas.size === 1 ? [...areas][0] : 'full';
}

export const JOINTS = ['neck','thoracic-spine','lumbar-spine','scapula','shoulder','elbow','wrist','hip','knee','ankle'];
export const ACTIONS = ['flexion','extension','abduction','adduction','horizontal-abduction','horizontal-adduction',
  'internal-rotation','external-rotation','rotation','lateral-flexion','dorsiflexion','plantarflexion',
  'protraction','retraction','elevation','depression','upward-rotation','downward-rotation'];

export const VOCAB = {
  family:     Object.keys(PATTERNS),
  pattern:    Object.values(PATTERNS).flat(),
  component:  ['strength','stability','mobility','flexibility','balance','cardio'],
  region:     ['lower','upper','core','full'],
  muscle:     Object.keys(MUSCLES),
  position:   ['standing','seated','kneeling','half-kneeling','quadruped','supine','prone','side-lying'],
  equipment:  ['none','band','dumbbell','mat','chair','wall'],
  plane:      ['sagittal','frontal','transverse'],
  laterality: ['bilateral','unilateral','alternating'],
  chain:      ['closed','open'],
  block:      ['warmup','main','cooldown'],
  level:      [1,2,3],
};
export const DOSE_MODES = ['reps','hold'];
export const FACES = ['smile','effort','puff'];
// An empty equipment list means no equipment.
export const equipmentOf = ex => ex.equipment.length ? ex.equipment : ['none'];

// Tag values of an exercise for a filter/display group.
export function tagsOf(ex, g){
  switch(g){
    case 'family':    return ex.pattern ? [familyOf(ex.pattern)] : [];
    case 'region':    return [regionOf(ex)];
    case 'muscle':    return ex.muscles.primary;
    case 'equipment': return equipmentOf(ex);
    case 'plane':     return ex.planes;
    case 'block':     return ex.blocks;
    default:          return ex[g] == null ? [] : [ex[g]];
  }
}
