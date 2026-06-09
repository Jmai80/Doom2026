// Tangentbordsinit. Exporterar live bindings (ES-moduler) som uppdateras
// när initInput() anropas i create() — player.js ser de uppdaterade värdena.

export let keys;
export let cursors;

/** Anropas en gång i Phaser create(). */
export function initInput(scene) {
  keys    = scene.input.keyboard.addKeys('W,A,S,D,Q,E');
  cursors = scene.input.keyboard.createCursorKeys();   // UP DOWN LEFT RIGHT
  // Ge canvas fokus direkt så tangenter fungerar utan att man klickar först.
  scene.game.canvas.setAttribute('tabindex', '0');
  scene.game.canvas.focus();
}