// Tag vocabulary for the exercise library. Order here is display order.
export const VOCAB = {
  pattern:   ['squat','hinge','lunge','push','pull','core-stability','rotation','carry','balance'],
  region:    ['lower','upper','core','full'],
  type:      ['strength','mobility','stretch','balance','cardio'],
  equipment: ['none','band','dumbbell','mat','chair','wall'],
};
export const DOSE_MODES = ['reps','hold'];
export const FACES = ['smile','effort','puff'];
// An empty equipment list means no equipment.
export const equipmentOf = ex => ex.equipment.length ? ex.equipment : ['none'];
