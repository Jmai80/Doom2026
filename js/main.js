// Phaser-setup och spelloop.
// Phaser finns som en global variabel (laddad via <script> i index.html
// innan den här modulen körs, tack vare att modules är deferred).

import { VIEW_W, VIEW_H }   from './constants.js';
import { initInput }        from './input.js';
import { handleInput }      from './player.js';
import { updatePeekers }    from './peekers.js';
import { initRenderer, render } from './renderer.js';

// ---------------------------------------------------------------------------
//  Phaser scene-funktioner
// ---------------------------------------------------------------------------

function create() {
  initInput(this);
  initRenderer(this.add.graphics());
}

function update(time, deltaMs) {
  const dt = deltaMs / 1000;
  handleInput(dt);
  updatePeekers(dt);
  render();
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
  scene: { create, update },
});