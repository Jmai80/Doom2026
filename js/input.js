// Tangentbord + pekkontroller. Enda modulen som vet något om inputkällor.
// keys/cursors exporteras som live bindings; touchState är ett muterbart
// objekt vars flaggor sätts av pointer-events på DOM-knapparna.

export let keys;
export let cursors;

// Pekkontrollernas tillstånd. Läses av player.js precis som tangenterna.
export const touchState = {
  forward:   false,
  back:      false,
  turnLeft:  false,
  turnRight: false,
  anyTouch:  false,   // sätts vid varje knappnedtryck — används för spelstart
};

// Edge-flagga för FIRE: sätts en gång per nedtryckning, konsumeras av main.js.
let firePressed = false;

/** Anropas en gång i Phaser create(). */
export function initInput(scene) {
  keys    = scene.input.keyboard.addKeys('W,A,S,D,Q,E');
  cursors = scene.input.keyboard.createCursorKeys();   // UP DOWN LEFT RIGHT SPACE
  // Ge canvas fokus direkt så tangenter fungerar utan att man klickar först.
  scene.game.canvas.setAttribute('tabindex', '0');
  scene.game.canvas.focus();

  initTouch();
}

/** Returnerar true exakt en gång per FIRE-tryck (edge detection). */
export function consumeFireTap() {
  const v = firePressed;
  firePressed = false;
  return v;
}

// ---------------------------------------------------------------------------
//  Pekknappar — kopplas mot DOM-elementen i index.html
// ---------------------------------------------------------------------------
function initTouch() {
  // Håll-knappar: flaggan är sann så länge fingret ligger på knappen
  bindHold('btn-up',    'forward');
  bindHold('btn-down',  'back');
  bindHold('btn-left',  'turnLeft');
  bindHold('btn-right', 'turnRight');

  // FIRE: edge-detekterad — ett skott per tryck
  const fire = document.getElementById('btn-fire');
  if (fire) {
    fire.addEventListener('pointerdown', e => {
      e.preventDefault();
      firePressed = true;
      touchState.anyTouch = true;
    });
  }
}

function bindHold(id, prop) {
  const el = document.getElementById(id);
  if (!el) return;   // knapparna finns men är dolda på desktop — null-säkra ändå

  const press = e => {
    e.preventDefault();
    el.setPointerCapture?.(e.pointerId);   // behåll eventet om fingret glider
    touchState[prop]    = true;
    touchState.anyTouch = true;
  };
  const release = e => {
    e.preventDefault();
    touchState[prop] = false;
  };

  el.addEventListener('pointerdown',   press);
  el.addEventListener('pointerup',     release);
  el.addEventListener('pointercancel', release);
  // contextmenu vid långtryck på iOS/Android skulle annars frysa knappen
  el.addEventListener('contextmenu', e => e.preventDefault());
}