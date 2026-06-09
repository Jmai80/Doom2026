// Phaser-setup och spelloop.

import { VIEW_W, VIEW_H }                    from './constants.js';
import { keys, cursors, initInput }          from './input.js';
import { handleInput }                       from './player.js';
import { updatePeekers, resetPeekers }       from './peekers.js';
import { initRenderer, render }              from './renderer.js';
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

  // Valfri knapp under idle → starta timer + musik
  if (state.phase === 'idle') {
    const anyKey =
      Object.values(keys).some(k => k.isDown) ||
      cursors.up.isDown || cursors.down.isDown ||
      cursors.left.isDown || cursors.right.isDown ||
      cursors.space.isDown;
    if (anyKey) {
      startGame();
      if (gameMusic && !gameMusic.isPlaying) gameMusic.play();
    }
  }

  // Mellanslag på slutskärm → omstart
  if ((state.phase === 'won' || state.phase === 'lost') && cursors.space.isDown) {
    resetState();
    resetPeekers();
    this.scene.restart();   // kör create() igen; Phaser rensar alla scenresurser
    return;
  }

  // Normal spellogik — körs bara under 'playing'
  if (state.phase === 'playing') {
    handleInput(dt);
    updatePeekers(dt);
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