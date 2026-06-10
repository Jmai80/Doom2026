// Tangentbord + pekkontroller. Enda modulen som vet något om inputkällor.
// Pekstyrningen: virtuell joystick (analog rörelse/vridning), drag-sikte
// på spelvyn, och FIRE-knapp.

export let keys;
export let cursors;

// Touch-enhet? Avgör aim assist (weapon.js) och instruktionstext (hud.js).
export const isTouchDevice =
  typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

// Pekkontrollernas tillstånd. Läses av player.js precis som tangenterna.
export const touchState = {
  joyX:     0,       // styrplattans utslag i sidled, -1..1 (vridning)
  joyY:     0,       // styrplattans utslag i höjdled, -1..1 (fram/back; upp = -1)
  anyTouch: false,   // sätts vid varje tryck — används för spelstart
  dragDX:   0,       // ackumulerade drag-pixlar sedan förra framen (sikte)
};

// Edge-flagga för FIRE: sätts en gång per nedtryckning, konsumeras av main.js.
let firePressed = false;

/** Anropas en gång i Phaser create(). */
export function initInput(scene) {
  keys    = scene.input.keyboard.addKeys('W,A,S,D,Q,E');
  cursors = scene.input.keyboard.createCursorKeys();   // UP DOWN LEFT RIGHT SPACE
  scene.game.canvas.setAttribute('tabindex', '0');
  scene.game.canvas.focus();

  initJoystick();
  initFireButton();
  initDragAim();
}

/** Returnerar true exakt en gång per FIRE-tryck (edge detection). */
export function consumeFireTap() {
  const v = firePressed;
  firePressed = false;
  return v;
}

// ---------------------------------------------------------------------------
//  Virtuell joystick — analog: utslagets riktning OCH storlek används
// ---------------------------------------------------------------------------
function initJoystick() {
  const base = document.getElementById('joystick');
  const knob = document.getElementById('joy-knob');
  if (!base || !knob) return;

  let activeId = null;

  const updateFromPointer = e => {
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    const maxR = rect.width / 2 - 14;   // knoppen stannar innanför kanten

    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const len = Math.hypot(dx, dy);
    if (len > maxR) { dx = (dx / len) * maxR; dy = (dy / len) * maxR; }

    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    touchState.joyX = dx / maxR;   // -1..1
    touchState.joyY = dy / maxR;   // -1..1 (upp = negativ)
  };

  const releaseStick = () => {
    activeId = null;
    base.classList.remove('active');
    knob.style.transform = 'translate(0, 0)';   // återfjädrar (CSS-transition)
    touchState.joyX = 0;
    touchState.joyY = 0;
  };

  base.addEventListener('pointerdown', e => {
    e.preventDefault();
    activeId = e.pointerId;
    base.classList.add('active');
    base.setPointerCapture?.(e.pointerId);
    touchState.anyTouch = true;
    updateFromPointer(e);
  });
  base.addEventListener('pointermove', e => {
    if (e.pointerId !== activeId) return;
    e.preventDefault();
    updateFromPointer(e);
  });
  base.addEventListener('pointerup',     e => { if (e.pointerId === activeId) releaseStick(); });
  base.addEventListener('pointercancel', e => { if (e.pointerId === activeId) releaseStick(); });
  base.addEventListener('contextmenu', e => e.preventDefault());
}

// ---------------------------------------------------------------------------
//  FIRE-knapp
// ---------------------------------------------------------------------------
function initFireButton() {
  const fire = document.getElementById('btn-fire');
  if (!fire) return;
  fire.addEventListener('pointerdown', e => {
    e.preventDefault();
    firePressed = true;
    touchState.anyTouch = true;
  });
  fire.addEventListener('contextmenu', e => e.preventDefault());
}

// ---------------------------------------------------------------------------
//  Drag-sikte: dra med fingret på spelvyn för att vrida blicken.
//  Endast touch-pekare; mus på desktop påverkas inte.
// ---------------------------------------------------------------------------
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
    touchState.anyTouch = true;
    surface.setPointerCapture?.(e.pointerId);
  });
  surface.addEventListener('pointermove', e => {
    if (!dragging || e.pointerType !== 'touch') return;
    e.preventDefault();
    touchState.dragDX += e.clientX - lastX;
    lastX = e.clientX;
  });
  const stop = e => { if (e.pointerType === 'touch') dragging = false; };
  surface.addEventListener('pointerup',     stop);
  surface.addEventListener('pointercancel', stop);
}