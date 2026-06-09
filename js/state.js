// Globalt speltillstånd. Importeras av hud.js, peekers.js och main.js.
// Inga egna beroenden — övriga moduler importerar härifrån, aldrig tvärtom.

export const TOTAL_TIME = 45;   // sekunder per bana

export const state = {
  phase:        'idle',      // 'idle' | 'playing' | 'won' | 'lost'
  kills:        0,
  totalEnemies: 5,
  timeLeft:     TOTAL_TIME,
};

/** Kallas vid första knapptryckning — startar timern. */
export function startGame() {
  if (state.phase !== 'idle') return;
  state.phase = 'playing';
}

/** Kallas när en fiende nås eller skjuts ned. */
export function registerKill() {
  if (state.phase !== 'playing') return;
  state.kills += 1;
  if (state.kills >= state.totalEnemies) {
    state.phase = 'won';
  }
}

/** Uppdaterar timern. Anropas varje frame under 'playing'. */
export function updateState(dt) {
  if (state.phase !== 'playing') return;
  state.timeLeft = Math.max(0, state.timeLeft - dt);
  if (state.timeLeft === 0) {
    state.phase = 'lost';
  }
}

/** Återställer till startvärden inför ny omgång. */
export function resetState() {
  state.phase    = 'idle';
  state.kills    = 0;
  state.timeLeft = TOTAL_TIME;
}