// Spelartillstånd och rörelselogik.

import { keys, cursors, touchState } from './input.js';
import { isWall }                    from './map.js';

export const player = {
  x: 1.5, y: 1.5,    // sätts om av resetPlayer() vid banladdning
  dir: 0,
  moveSpeed: 3.2,    // rutor per sekund (max)
  turnSpeed: 2.8,    // radianer per sekund (max)
  radius: 0.18,      // krockbuffert mot väggar
};

/** Flyttar spelaren till banans startposition. Anropas av loadLevel(). */
export function resetPlayer({ x, y, dir }) {
  player.x   = x;
  player.y   = y;
  player.dir = dir;
}

/**
 * Läser av tangenter + pekkontroller och uppdaterar spelarens position.
 * aimSlow < 1 = sticky aim: all vridning dämpas (sätts av main.js på touch
 * när siktet är nära en fiende).
 */
export function handleInput(dt, aimSlow = 1) {
  // --- Vridning: tangenter är binära (-1/0/1), joystickens x är analog ---
  let turn = 0;
  if (keys.A.isDown || cursors.left.isDown)  turn -= 1;
  if (keys.D.isDown || cursors.right.isDown) turn += 1;
  turn += touchState.joyX;
  turn = Math.max(-1, Math.min(1, turn));
  player.dir += turn * player.turnSpeed * dt * aimSlow;

  // Drag-sikte (touch): positionsbaserat, appliceras rått utan dt.
  if (touchState.dragDX !== 0) {
    player.dir += touchState.dragDX * 0.005 * aimSlow;
    touchState.dragDX = 0;
  }

  // --- Rörelse: framåt/bakåt analogt, strafe endast tangentbord ---
  let fwd = 0;
  if (keys.W.isDown || cursors.up.isDown)   fwd += 1;
  if (keys.S.isDown || cursors.down.isDown) fwd -= 1;
  fwd += -touchState.joyY;                  // upp på plattan = framåt
  fwd = Math.max(-1, Math.min(1, fwd));

  let strafe = 0;
  if (keys.Q.isDown) strafe -= 1;
  if (keys.E.isDown) strafe += 1;

  const cos = Math.cos(player.dir);
  const sin = Math.sin(player.dir);
  // Strafe åt höger (E, strafe=+1) = +90° från blickriktningen
  const dx = fwd * cos + strafe * -sin;
  const dy = fwd * sin + strafe *  cos;

  // Begränsa till max moveSpeed men bevara analog finkänslighet:
  // |input| <= 1 ger proportionell fart, diagonaler klipps till 1.
  const len = Math.hypot(dx, dy);
  if (len > 0.001) {
    const speed = Math.min(len, 1) * player.moveSpeed * dt;
    tryMove((dx / len) * speed, (dy / len) * speed);
  }
}

function tryMove(dx, dy) {
  const r = player.radius;
  if (!isWall(player.x + dx + Math.sign(dx) * r, player.y)) player.x += dx;
  if (!isWall(player.x, player.y + dy + Math.sign(dy) * r)) player.y += dy;
}