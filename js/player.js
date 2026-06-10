// Spelartillstånd och rörelselogik.

import { keys, cursors, touchState } from './input.js';
import { isWall }                    from './map.js';

export const player = {
  x: 1.5, y: 1.5,   // startposition — MAP[1][1] är en verifierad öppen cell
  dir: 0,            // blickriktning i radianer
  moveSpeed: 3.2,    // rutor per sekund
  turnSpeed: 2.8,    // radianer per sekund
  radius: 0.18,      // krockbuffert mot väggar
};

/** Läser av tangenter + pekkontroller och uppdaterar spelarens position. */
export function handleInput(dt) {
  if (keys.A.isDown || cursors.left.isDown  || touchState.turnLeft)
    player.dir -= player.turnSpeed * dt;
  if (keys.D.isDown || cursors.right.isDown || touchState.turnRight)
    player.dir += player.turnSpeed * dt;

  const cos = Math.cos(player.dir);
  const sin = Math.sin(player.dir);
  let dx = 0, dy = 0;

  if (keys.W.isDown || cursors.up.isDown   || touchState.forward) { dx += cos; dy += sin; }
  if (keys.S.isDown || cursors.down.isDown || touchState.back)    { dx -= cos; dy -= sin; }
  if (keys.Q.isDown) { dx += sin; dy -= cos; }   // strafe vänster (endast tangentbord)
  if (keys.E.isDown) { dx -= sin; dy += cos; }    // strafe höger

  // Normalisera så diagonal rörelse inte är snabbare
  const len = Math.hypot(dx, dy);
  if (len > 0) {
    dx = (dx / len) * player.moveSpeed * dt;
    dy = (dy / len) * player.moveSpeed * dt;
    tryMove(dx, dy);
  }
}

/** Försöker flytta spelaren; kollar X och Y separat för glidning längs väggar. */
function tryMove(dx, dy) {
  const r = player.radius;
  if (!isWall(player.x + dx + Math.sign(dx) * r, player.y)) player.x += dx;
  if (!isWall(player.x, player.y + dy + Math.sign(dy) * r)) player.y += dy;
}