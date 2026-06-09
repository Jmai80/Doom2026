// Huvud-renderloop: tak/golv, väggar (DDA-raycasting), sprites, minimap.

import { VIEW_W, VIEW_H, COL_W, NUM_RAYS, FOV, HALF_FOV } from './constants.js';
import { MAP, MAP_W, MAP_H }   from './map.js';
import { player }              from './player.js';
import { peekers, renderPeekers } from './peekers.js';
import { weapon }              from './weapon.js';

let gfx;
// Djupbuffert: ett vinkelrätt väggavstånd per strålekolumn.
// Används av renderPeekers() för ocklusion och av weapon.js för träffkoll.
export const zBuffer    = new Array(NUM_RAYS).fill(Infinity);
const BRICK_COURSE = 0.25;   // 4 tegelvarvshöjder per väggunit

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

    // Murbrukslinjer — horisontella i världsrymden, korrekt perspektiv.
    // courseH är hur många pixlar ett tegelvarvs höjd upptar på skärmen.
    // Under 4 px är linjerna osynliga och hoppas över (långt bort).
    const courseH = lineH * BRICK_COURSE;
    if (courseH >= 4) {
      gfx.fillStyle(0x0c0806, 1);
      for (let f = BRICK_COURSE; f < 1.0; f += BRICK_COURSE) {
        gfx.fillRect(i * COL_W, Math.round(y0 + (1 - f) * lineH), COL_W + 1, 1);
      }
    }
  }   // ← stänger for (let i = 0; i < NUM_RAYS; i++)

  renderPeekers(gfx, zBuffer);
  renderMinimap();
  drawWeapon();
  drawCrosshair();
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

// ---------------------------------------------------------------------------
//  Gevärspipa — primitiv 2D-overlay centrerad i underkant av skärmen.
//  Ritas efter allt annat så att den alltid ligger i förgrunden.
//  Ersätts med riktig sprite när vapensystemet implementeras.
// ---------------------------------------------------------------------------
function drawWeapon() {
  const cx  = VIEW_W / 2;
  const top = VIEW_H - 75;    // mynningens synliga överkant

  // Tracer — snabb ljusgul linje från mynningen mot siktet
  if (weapon.tracerTimer > 0) {
    gfx.lineStyle(2, 0xffe9a0, 0.9);
    gfx.beginPath();
    gfx.moveTo(cx, top - 4);
    gfx.lineTo(cx, VIEW_H / 2 + 6);
    gfx.strokePath();
  }

  // Yttre pipa
  gfx.fillStyle(0x1c1a18, 1);
  gfx.fillRect(cx - 10, top, 20, VIEW_H - top);

  // Löp — mörkt hål i mitten av pipan
  gfx.fillStyle(0x060504, 1);
  gfx.fillRect(cx - 4, top + 3, 8, VIEW_H - top);

  // Metallhighlight längs sidorna ger en lätt rundad känsla
  gfx.fillStyle(0x2e2a26, 1);
  gfx.fillRect(cx - 10, top, 2, VIEW_H - top);   // vänster kant
  gfx.fillRect(cx + 8,  top, 2, VIEW_H - top);   // höger kant

  // Framkorn (sigtbricka vid mynningen)
  gfx.fillStyle(0x1c1a18, 1);
  gfx.fillRect(cx - 2, top - 5, 4, 5);

  // Mynningsflash — ritas sist så den ligger ovanpå pipan
  if (weapon.flashTimer > 0) {
    gfx.fillStyle(0xffd060, 0.95);
    gfx.fillCircle(cx, top - 6, 9);
    gfx.fillStyle(0xfff4c0, 0.95);
    gfx.fillCircle(cx, top - 6, 5);
  }
}

// Sikte — klassiskt kors i skärmens mitt med litet gap kring centrum
function drawCrosshair() {
  const cx = VIEW_W / 2;
  const cy = VIEW_H / 2;
  const GAP = 4, LEN = 7;

  gfx.lineStyle(2, 0xf2ede6, 0.85);
  gfx.beginPath();
  gfx.moveTo(cx - GAP - LEN, cy); gfx.lineTo(cx - GAP, cy);   // vänster
  gfx.moveTo(cx + GAP, cy);       gfx.lineTo(cx + GAP + LEN, cy); // höger
  gfx.moveTo(cx, cy - GAP - LEN); gfx.lineTo(cx, cy - GAP);   // upp
  gfx.moveTo(cx, cy + GAP);       gfx.lineTo(cx, cy + GAP + LEN); // ner
  gfx.strokePath();
}