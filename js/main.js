// Phaser-setup och spelloop.

import { VIEW_W, VIEW_H }                    from './constants.js';
import { keys, cursors, initInput,
         touchState, consumeFireTap }        from './input.js';
import { handleInput }                       from './player.js';
import { updatePeekers, peekers }            from './peekers.js';
import { initRenderer, render, zBuffer }     from './renderer.js';
import { updateWeapon, tryShoot }            from './weapon.js';
import { state, startGame, updateState,
         resetState }                        from './state.js';
import { initHud, updateHud }                from './hud.js';
import { loadLevel, hasNextLevel }           from './levels.js';
import Boot                                  from './Boot.js';
import Preloader                             from './Preloader.js';

let gameMusic = null;
let heartbeat = null;   // loopas över nedpitchad musik under bossfasen
let prevBossAlive = false;   // för att detektera bossens spawnögonblick
let prevPhase = 'idle';      // för att detektera vinstögonblicket

// ---------------------------------------------------------------------------
//  Phaser scene-funktioner
// ---------------------------------------------------------------------------

function create() {
  initInput(this);
  initRenderer(this.add.graphics());
  initHud(this);
  loadLevel(state.currentLevel);   // 0 vid nystart (resetState körs före restart)
  // Phasers ljudhanterare lever på spelnivå och överlever scene.restart() —
  // återanvänd befintlig instans, annars skapas en dubblett som spelar ovanpå.
  gameMusic = this.sound.get('music') || this.sound.add('music', { loop: true, volume: 0.4 });
  heartbeat = this.sound.get('heartbeat') || this.sound.add('heartbeat', { loop: true, volume: 1.0 });

  // Hämta nuvarande rekord till startskärmen — får tyst misslyckas offline
  fetchTop(1)
    .then(rows => setIdleRecord(rows[0] ?? null))
    .catch(() => setIdleRecord(null));
}

function update(_time, deltaMs) {
  const dt = deltaMs / 1000;

  // Valfri knapp/pektryck under idle → starta timer + musik
  if (state.phase === 'idle') {
    const anyKey =
      Object.values(keys).some(k => k.isDown) ||
      cursors.up.isDown || cursors.down.isDown ||
      cursors.left.isDown || cursors.right.isDown ||
      cursors.space.isDown ||
      touchState.anyTouch;
    if (anyKey) {
      startGame();
      if (gameMusic && !gameMusic.isPlaying) gameMusic.play();
      // Konsumera start-trycket — annars avlossas ett skott i samma frame.
      Phaser.Input.Keyboard.JustDown(cursors.space);
      consumeFireTap();
      touchState.anyTouch = false;
    }
  }

  // Skärmlås: räkna ned, och sluka tryck som görs medan låset är aktivt —
  // annars ligger de kvar i JustDown/fire-flaggorna och triggar direkt
  // när låset släpper.
  if (state.uiLockout > 0) {
    state.uiLockout = Math.max(0, state.uiLockout - dt);
    Phaser.Input.Keyboard.JustDown(cursors.space);
    consumeFireTap();
  }

  // Banan klar → mellanslag/FIRE laddar nästa bana (när låset släppt)
  if (state.phase === 'levelclear' && state.uiLockout === 0 &&
      (Phaser.Input.Keyboard.JustDown(cursors.space) || consumeFireTap())) {
    loadLevel(state.currentLevel + 1);
    state.phase = 'playing';
  }

  // Slutskärm (vinst/förlust) → mellanslag/FIRE startar om (när låset släppt)
  if ((state.phase === 'won' || state.phase === 'lost') && state.uiLockout === 0 &&
      !isNameEntryOpen() &&
      (Phaser.Input.Keyboard.JustDown(cursors.space) || consumeFireTap())) {
    hideWinPanel();
    resetState();
    this.scene.restart();   // create() körs igen och laddar bana 0
    return;
  }

  // Normal spellogik
  if (state.phase === 'playing') {
    handleInput(dt);
    updatePeekers(dt, this);
    updateWeapon(dt);
    if (Phaser.Input.Keyboard.JustDown(cursors.space) || consumeFireTap()) {
      tryShoot(this, zBuffer);
    }
    updateState(dt);

    // Banklarering: alla fiender nere → lägg banans tid till totalen,
    // gå till mellanskärm eller (sista banan) vinstskärm. Skärmen låses
    // en stund så ett dubbeltryck på sista skottet inte hoppar förbi den.
    if (state.kills >= state.totalEnemies) {
      state.totalTime += state.levelTimeLimit - state.timeLeft;
      if (hasNextLevel()) {
        state.phase     = 'levelclear';
        state.uiLockout = 1.2;
      } else {
        state.phase     = 'won';
        state.uiLockout = 2.0;
      }
    }
  }

  // Bossfas-ljud: nedpitchad & dämpad musik + hjärtslag medan bossen lever.
  // Ligger utanför playing-blocket så allt återställs även vid game over
  // med bossen vid liv, eller vid banbyte.
  const bossAlive = state.phase === 'playing' &&
                    peekers.some(p => p.boss && p.state === 'active');
  if (bossAlive && !prevBossAlive) {
    state.bossAnnounce = 1.6;
  }
  prevBossAlive = bossAlive;
  if (gameMusic) {
    const targetRate = bossAlive ? 0.78 : 1;
    const targetVol  = bossAlive ? 0.08 : 0.4;   // duckas hårt under hjärtslagen
    if (gameMusic.rate   !== targetRate) gameMusic.setRate(targetRate);
    if (gameMusic.volume !== targetVol)  gameMusic.setVolume(targetVol);
  }
  if (heartbeat) {
    if (bossAlive  && !heartbeat.isPlaying) heartbeat.play();
    if (!bossAlive &&  heartbeat.isPlaying) heartbeat.stop();
  }

  // Vinstögonblicket: öppna topplistepanelen exakt en gång
  if (state.phase === 'won' && prevPhase !== 'won') {
    showWinPanel(this, state.totalTime);
  }
  prevPhase = state.phase;

  render();
  updateHud();
}

// ---------------------------------------------------------------------------
//  Starta spelet
// ---------------------------------------------------------------------------

new Phaser.Game({
  type: Phaser.AUTO,
  width: VIEW_W,
  height: VIEW_H,
  parent: 'game',
  backgroundColor: '#000000',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [Boot, Preloader, { key: 'Game', create, update }],
});

// #game-containerns höjd ändras vid orienteringsbyte — be Phaser mäta om.
window.addEventListener('resize', () => {
  setTimeout(() => window.dispatchEvent(new Event('orientationdone')), 120);
});
window.addEventListener('orientationdone', () => {
  const game = Phaser.GAMES?.[0];
  game?.scale.refresh();
});