// Huvud-renderloop: tak/golv, väggar (DDA-raycasting), sprites, minimap.

import { VIEW_W, VIEW_H, COL_W, NUM_RAYS, FOV, HALF_FOV } from './constants.js';
import { MAP, MAP_W, MAP_H }   from './map.js';
import { player }              from './player.js';
import { peekers, renderPeekers } from './peekers.js';

let gfx;
// Djupbuffert: ett vinkelrätt väggavstånd per strålekolumn.
// Används av renderPeekers() för korrekt ocklusion.
const zBuffer = new Array(NUM_RAYS).fill(Infinity);

/** Anropas en gång i Phaser create() med det Graphics-objekt Phaser skapade. */
export function initRenderer(graphics) {
  gfx = graphics;
}

/** Ritar ett komplett frame. Anropas varje tick från main.js. */
export function render() {
  gfx.clear();

  // Tak (övre halvan) och golv (nedre halvan) — platta toner
  gfx.fillStyle(0x14161c, 1);
  gfx.fillRect(0, 0, VIEW_W, VIEW_H / 2);
  gfx.fillStyle(0x26221c, 1);
  gfx.fillRect(0, VIEW_H / 2, VIEW_W, VIEW_H / 2);

  // Väggar + fyll zBuffer
  for (let i = 0; i < NUM_RAYS; i++) {
    const rayAngle = player.dir - HALF_FOV + (i / NUM_RAYS) * FOV;
    const hit  = castRay(rayAngle);

    // Korrigera "fisheye": projicera avståndet vinkelrätt mot blickriktningen
    const perp = hit.dist * Math.cos(rayAngle - player.dir);
    zBuffer[i] = perp;

    let lineH = VIEW_H / perp;
    if (lineH > VIEW_H * 8) lineH = VIEW_H * 8;   // skydd vid nollnära avstånd
    const y0 = (VIEW_H - lineH) / 2;

    gfx.fillStyle(shade(hit.side, perp), 1);
    gfx.fillRect(i * COL_W, y0, COL_W + 1, lineH);
  }

  renderPeekers(gfx, zBuffer);
  renderMinimap();
}

// ---------------------------------------------------------------------------
//  DDA-raycasting
// ---------------------------------------------------------------------------

/**
 * Kastar en stråle i given vinkel och returnerar {dist, side}.
 * side 0 = träffade en x-vägg (nord/syd), side 1 = y-vägg (öst/väst).
 */
function castRay(angle) {
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);

  let mapX = Math.floor(player.x);
  let mapY = Math.floor(player.y);

  // Avstånd strålen färdas per hel rutkant i x- resp y-led
  const deltaX = Math.abs(1 / dirX);
  const deltaY = Math.abs(1 / dirY);

  let stepX, stepY, sideDistX, sideDistY;

  if (dirX < 0) { stepX = -1; sideDistX = (player.x - mapX)     * deltaX; }
  else          { stepX =  1; sideDistX = (mapX + 1 - player.x) * deltaX; }
  if (dirY < 0) { stepY = -1; sideDistY = (player.y - mapY)     * deltaY; }
  else          { stepY =  1; sideDistY = (mapY + 1 - player.y) * deltaY; }

  let side = 0;
  for (let guard = 0; guard < 64; guard++) {
    if (sideDistX < sideDistY) { sideDistX += deltaX; mapX += stepX; side = 0; }
    else                       { sideDistY += deltaY; mapY += stepY; side = 1; }
    if (mapX < 0 || mapY < 0 || mapX >= MAP_W || mapY >= MAP_H) break;
    if (MAP[mapY][mapX] > 0) break;
  }

  const dist = side === 0 ? sideDistX - deltaX : sideDistY - deltaY;
  return { dist: Math.max(dist, 0.0001), side };
}

/** Beräknar väggfärgen baserat på sida och avstånd (dimma). */
function shade(side, dist) {
  const base = side === 0 ? 0xc94f38 : 0xe06a4e;
  const fog  = Math.max(0, 1 - dist / 10);
  const r = Math.round(((base >> 16) & 0xff) * fog);
  const g = Math.round(((base >> 8)  & 0xff) * fog);
  const b = Math.round(( base        & 0xff) * fog);
  return (r << 16) | (g << 8) | b;
}

// ---------------------------------------------------------------------------
//  Minimap
// ---------------------------------------------------------------------------

function renderMinimap() {
  const CELL   = 6;
  const MARGIN = 8;
  const W = MAP_W * CELL;
  const H = MAP_H * CELL;
  const ox = VIEW_W - W - MARGIN;   // övre högra hörnet
  const oy = MARGIN;

  // Bakgrundspanel
  gfx.fillStyle(0x000000, 0.65);
  gfx.fillRect(ox - 2, oy - 2, W + 4, H + 4);

  // Rutor
  for (let row = 0; row < MAP_H; row++) {
    for (let col = 0; col < MAP_W; col++) {
      gfx.fillStyle(MAP[row][col] === 1 ? 0x3d3028 : 0x161210, 1);
      gfx.fillRect(ox + col * CELL, oy + row * CELL, CELL - 1, CELL - 1);
    }
  }

  // Ram
  gfx.lineStyle(1, 0x6b4030, 0.9);
  gfx.strokeRect(ox - 2, oy - 2, W + 4, H + 4);

  // Aktiva fiender — pulserande röd prick
  peekers.forEach(p => {
    if (p.state !== 'active') return;
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 120);
    gfx.fillStyle(0xff2020, pulse);
    gfx.fillCircle(ox + p.x * CELL, oy + p.y * CELL, 2.5);
  });

  // Spelaren — prick + riktningslinje
  const px = ox + player.x * CELL;
  const py = oy + player.y * CELL;
  gfx.lineStyle(1.5, 0xd6452f, 1);
  gfx.beginPath();
  gfx.moveTo(px, py);
  gfx.lineTo(
    px + Math.cos(player.dir) * CELL * 1.8,
    py + Math.sin(player.dir) * CELL * 1.8
  );
  gfx.strokePath();
  gfx.fillStyle(0xd6452f, 1);
  gfx.fillCircle(px, py, 3);
}