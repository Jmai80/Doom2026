// Fiender som spawnar när spelaren kommer nära och stannar kvar på kartan
// tills spelaren når fram till dem. Senare: kan skjutas ned.
//
// State-maskin: 'waiting' → 'active' → 'gone'
//   waiting  : osynlig, väntar på att spelaren ska komma inom triggerDist
//   active   : synlig och stationär tills spelaren når collectDist
//   gone     : borttagen (framtida: ersätts av "dead"-state med skottlogik)

import { player }                          from './player.js';
import { VIEW_W, VIEW_H, COL_W, NUM_RAYS,
         FOV, HALF_FOV }                   from './constants.js';

const FADE_IN = 0.4;   // sekunder för fade-in vid spawn

export const peekers = [
  { x: 7.5, y: 2.5, state: 'waiting', fadeTimer: 0, triggerDist: 7, collectDist: 1.0 },
  { x: 5.5, y: 5.5, state: 'waiting', fadeTimer: 0, triggerDist: 6, collectDist: 1.0 },
  { x: 3.5, y: 9.5, state: 'waiting', fadeTimer: 0, triggerDist: 6, collectDist: 1.0 },
];

/** Uppdaterar tillstånd för alla peekers. Anropas varje frame. */
export function updatePeekers(dt) {
  peekers.forEach(p => {
    if (p.state === 'gone') return;

    const dist = Math.hypot(p.x - player.x, p.y - player.y);

    if (p.state === 'waiting') {
      // Spawna när spelaren kommer tillräckligt nära
      if (dist < p.triggerDist) {
        p.state = 'active';
        p.fadeTimer = 0;
      }
    } else if (p.state === 'active') {
      // Räkna upp fade-in (clampad så att den inte växer i oändlighet)
      p.fadeTimer = Math.min(p.fadeTimer + dt, FADE_IN);
      // Försvinner när spelaren når fram — här läggs skottlogiken till senare
      if (dist < p.collectDist) {
        p.state = 'gone';
      }
    }
  });
}

/**
 * Ritar alla aktiva peekers i 3d-vyn.
 * @param {Phaser.GameObjects.Graphics} gfx
 * @param {number[]} zBuffer - vinkelrätt väggavstånd per strålekolumn
 */
export function renderPeekers(gfx, zBuffer) {
  peekers.forEach(p => {
    if (p.state !== 'active') return;

    const dx = p.x - player.x;
    const dy = p.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.1) return;

    // Vinkel till fienden relativt blickriktningen
    let angleDiff = Math.atan2(dy, dx) - player.dir;
    while (angleDiff >  Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    if (Math.abs(angleDiff) > HALF_FOV + 0.2) return;

    // Vinkelrätt avstånd (fisheye-korrigerat)
    const perpDist = dist * Math.cos(angleDiff);
    if (perpDist <= 0) return;

    // Skärmposition X
    const screenX = Math.round((angleDiff / FOV + 0.5) * VIEW_W);

    // Höjd på skärmen
    const spriteH = Math.min(VIEW_H / perpDist, VIEW_H * 3);

    // Z-buffer: rendera om minst en kolumn i spritens bredd är framför väggen
    const halfW = spriteH * 0.28;
    const c0 = Math.max(0, Math.round((screenX - halfW) / COL_W));
    const c1 = Math.min(NUM_RAYS - 1, Math.round((screenX + halfW) / COL_W));
    let visible = false;
    for (let c = c0; c <= c1; c++) {
      if (zBuffer[c] >= perpDist) { visible = true; break; }
    }
    if (!visible) return;

    // Fade in vid spawn, sedan full alpha
    const alpha = p.fadeTimer / FADE_IN;

    drawStickFigure(gfx, screenX, VIEW_H / 2, spriteH, alpha);
  });
}

// ---------------------------------------------------------------------------
//  Privat ritfunktion
// ---------------------------------------------------------------------------
function drawStickFigure(gfx, cx, cy, h, alpha) {
  const headR  = h * 0.12;
  const headY  = cy - h * 0.22;
  const neckY  = headY + headR;
  const waistY = cy + h * 0.10;
  const armY   = neckY + (waistY - neckY) * 0.4;
  const armX   = h * 0.20;
  const legX   = h * 0.13;
  const footY  = cy + h * 0.42;
  const lw     = Math.max(1.5, h * 0.045);

  // Subtil glöd bakom huvudet
  gfx.lineStyle(lw + 3, 0xff8844, alpha * 0.22);
  gfx.strokeCircle(cx, headY, headR + 3);

  // Huvud
  gfx.fillStyle(0xf2ede6, alpha);
  gfx.fillCircle(cx, headY, headR);

  // Kropp, armar, ben
  gfx.lineStyle(lw, 0xf2ede6, alpha);

  gfx.beginPath();
  gfx.moveTo(cx, neckY);    gfx.lineTo(cx, waistY);
  gfx.strokePath();

  gfx.beginPath();
  gfx.moveTo(cx - armX, armY); gfx.lineTo(cx + armX, armY);
  gfx.strokePath();

  gfx.beginPath();
  gfx.moveTo(cx, waistY); gfx.lineTo(cx - legX, footY);
  gfx.strokePath();

  gfx.beginPath();
  gfx.moveTo(cx, waistY); gfx.lineTo(cx + legX, footY);
  gfx.strokePath();
}