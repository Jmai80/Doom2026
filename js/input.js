// Tangentbord + pekkontroller. Enda modulen som vet något om inputkällor.
// keys/cursors exporteras som live bindings; touchState är ett muterbart
// objekt vars flaggor sätts av pointer-events på DOM-knapparna.

export let keys;
export let cursors;

// Touch-enhet? Avgör bl.a. aim assist i weapon.js. Evalueras en gång.
export const isTouchDevice =
  typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

// Pekkontrollernas tillstånd. Läses av player.js precis som tangenterna.
export const touchState = {
  forward:   false,
  back:      false,
  turnLeft:  false,
  turnRight: false,
  anyTouch:  false,   // sätts vid varje tryck — används för spelstart
  dragDX:    0,       // ackumulerade drag-pixlar sedan förra framen (sikte)
};

// Edge-flagga för FIRE: sätts en gång per nedtryckning, konsumeras av main.js.
let firePressed = false;

/** Anropas en gång i Phaser create(). */
export function initInput(scene) {
  keys    = scene.input.keyboard.addKeys('W,A,S,D,Q,E');
  cursors = scene.input.keyboard.createCursorKeys();   // UP DOWN LEFT RIGHT SPACE
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
//  Pekknappar + drag-sikte
// ---------------------------------------------------------------------------
function initTouch() {
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

  initDragAim();
}

// Drag-för-att-sikta: dra med fingret på spelvyn för att vrida blicken.
// Analogt och positionsbaserat — liten tumrörelse ger liten vridning.
// Endast touch-pekare; mus på desktop påverkas inte.
function initDragAim() {
  const surface = document.getElementById('game');
  if (!surface) return;

  let dragging = false;
  let lastX = 0;

  surface.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;
    e.preventDefault();
    dragging = true;
    lastX = e.clientX;
    touchState.anyTouch = true;          // tryck på vyn kan starta spelet
    surface.setPointerCapture?.(e.pointerId);
  });

  surface.addEventListener('pointermove', e => {
    if (!dragging || e.pointerType !== 'touch') return;
    e.preventDefault();
    touchState.dragDX += e.clientX - lastX;   // ackumuleras; konsumeras per frame
    lastX = e.clientX;
  });

  const stop = e => {
    if (e.pointerType !== 'touch') return;
    dragging = false;
  };
  surface.addEventListener('pointerup',     stop);
  surface.addEventListener('pointercancel', stop);
}

function bindHold(id, prop) {
  const el = document.getElementById(id);
  if (!el) return;

  const press = e => {
    e.preventDefault();
    el.setPointerCapture?.(e.pointerId);
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
  el.addEventListener('contextmenu', e => e.preventDefault());
}