// Phaser-setup och spelloop.

import { VIEW_W, VIEW_H }                    from './constants.js';
import { keys, cursors, initInput,
         touchState, consumeFireTap }        from './input.js';
import { handleInput }                       from './player.js';
import { updatePeekers, resetPeekers }       from './peekers.js';
import { initRenderer, render, zBuffer }     from './renderer.js';
import { updateWeapon, tryShoot }            from './weapon.js';
import { state, startGame, updateState,
         resetState }                        from './state.js';
import { initHud, updateHud }               from './hud.js';
import Boot                                  from './Boot.js';
import Preloader                             from './Preloader.js';

let gameMusic = null;   // skapas i create(), spelas vid första knapptryckning

// ---------------------------------------------------------------------------
//  Phaser scene-funktioner
// ---------------------------------------------------------------------------

function create() {
  initInput(this);
  initRenderer(this.add.graphics());
  initHud(this);
  // Skapa ljudobjektet men starta inte — väntar på första knapptryckning.
  gameMusic = this.sound.add('music', { loop: true, volume: 0.4 });
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
      // Konsumera start-trycket — annars avlossas ett skott i samma frame
      // som spelet startar (gäller både mellanslag och FIRE-knappen).
      Phaser.Input.Keyboard.JustDown(cursors.space);
      consumeFireTap();
      touchState.anyTouch = false;
    }
  }

  // Mellanslag eller FIRE på slutskärm → omstart. Edge-detektering krävs —
  // annars triggar ett nedhållet skjut-tryck omstarten när sista fienden dör.
  if ((state.phase === 'won' || state.phase === 'lost') &&
      (Phaser.Input.Keyboard.JustDown(cursors.space) || consumeFireTap())) {
    resetState();
    resetPeekers();
    this.scene.restart();   // kör create() igen; Phaser rensar alla scenresurser
    return;
  }

  // Normal spellogik — körs bara under 'playing'
  if (state.phase === 'playing') {
    handleInput(dt);
    updatePeekers(dt);
    updateWeapon(dt);
    // Mellanslag eller FIRE-knapp = skjut. Båda är edge-detekterade.
    if (Phaser.Input.Keyboard.JustDown(cursors.space) || consumeFireTap()) {
      tryShoot(this, zBuffer);
    }
    updateState(dt);
  }

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

// #game-containerns höjd ändras vid orienteringsbyte (porträtt 56vh,
// landskap 100vh) — be Phaser mäta om och skala om canvasen.
window.addEventListener('resize', () => {
  // Liten fördröjning: iOS rapporterar ibland gamla mått direkt efter rotation
  setTimeout(() => window.dispatchEvent(new Event('orientationdone')), 120);
});
window.addEventListener('orientationdone', () => {
  const game = Phaser.GAMES?.[0];
  game?.scale.refresh();
});