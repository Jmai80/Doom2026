// Globalt speltillstånd. Importeras av hud.js, main.js och levels.js.
// Faser: 'idle' → 'playing' → ('levelclear' → 'playing' → ...) → 'won'/'lost'

export const state = {
  phase:          'idle',
  currentLevel:   0,
  kills:          0,
  totalEnemies:   0,
  timeLeft:       0,      // sekunder kvar på aktuell bana
  levelTimeLimit: 0,      // banans tidsgräns (sätts av loadLevel)
  totalTime:      0,      // ackumulerad speltid över klarade banor = score
  uiLockout:      0,      // sekunder kvar innan slut-/mellanskärm tar emot input
  hitFlash:       0,      // sekunder kvar av röd skadeblixt (sätts av stealTime)
};

/** Kallas vid första knapptryckning — startar timern. */
export function startGame() {
  if (state.phase !== 'idle') return;
  state.phase = 'playing';
}

/** Kallas när en fiende skjuts ned. Banklarering avgörs i main.js. */
export function registerKill() {
  if (state.phase !== 'playing') return;
  state.kills += 1;
}

/** Bossträff: stjäl sekunder från timern och trigga röd skärmblixt. */
export function stealTime(seconds) {
  if (state.phase !== 'playing') return;
  state.timeLeft = Math.max(0, state.timeLeft - seconds);
  state.hitFlash = 0.35;
  // timeLeft kan nå 0 här — updateState() hanterar förlustövergången
}

/** Uppdaterar timern. Anropas varje frame under 'playing'. */
export function updateState(dt) {
  state.hitFlash = Math.max(0, state.hitFlash - dt);
  if (state.phase !== 'playing') return;
  state.timeLeft = Math.max(0, state.timeLeft - dt);
  if (state.timeLeft === 0) {
    state.phase     = 'lost';
    state.uiLockout = 2.0;   // game over-skärmen låst i 2 s
  }
}

/** Återställer allt inför ett helt nytt spel (från bana 1). */
export function resetState() {
  state.phase        = 'idle';
  state.currentLevel = 0;
  state.kills        = 0;
  state.totalTime    = 0;
  state.uiLockout    = 0;
  state.hitFlash     = 0;
  // timeLeft/totalEnemies/levelTimeLimit sätts av loadLevel()
}