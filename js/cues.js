// Countdown cue for one second boundary of a countdown (get ready, rest, switch, holds, timed rounds).
// Multiples of ten are spoken, the last three seconds beep, every other second gets a subtle tick.
// Returns 'say' (speak the number), 'beep' or 'tick'; null when nothing should play.
export function countdownCue(sec){
  if(sec<1) return null;
  if(sec<=3) return 'beep';
  if(sec%10===0) return 'say';
  return 'tick';
}
