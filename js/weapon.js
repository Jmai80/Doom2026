// Vapenlogik: avfyrning, mynningsflash, tracer och träffdetektering.
// Hitscan-mekanik (som Wolfenstein): skottet träffar omedelbart.

import { player }       from './player.js';
import { peekers, killPeeker } from './peekers.js';
import { registerKill }  from './state.js';
import { isTouchDevice } from './input.js';
import { NUM_RAYS, FOV } from './constants.js';

const FLASH_TIME  = 0.07;   // sekunder mynningsflash syns
const TRACER_TIME = 0.05;   // sekunder tracerlinjen syns
const FIRE_COOLDOWN = 0.25; // minsta tid mellan skott
const MAX_RANGE   = 20;     // skottets räckvidd i kartrutor

// Vapnets tillstånd — läses av renderer.js för flash/tracer-rendering
export const weapon = {
  flashTimer:  0,
  tracerTimer: 0,
  cooldown:    0,
};

/** Räknar ned timers. Anropas varje frame. */
export function updateWeapon(dt) {
  weapon.flashTimer  = Math.max(0, weapon.flashTimer  - dt);
  weapon.tracerTimer = Math.max(0, weapon.tracerTimer - dt);
  weapon.cooldown    = Math.max(0, weapon.cooldown    - dt);
}

/**
 * Avfyrar vapnet: ljud, flash, tracer och hitscan-träffkontroll.
 * @param {Phaser.Scene} scene  - för ljuduppspelning
 * @param {number[]} zBuffer    - väggavstånd per kolumn (för skymningskoll)
 * @returns {boolean} true om skottet avlossades (inte på cooldown)
 */
export function tryShoot(scene, zBuffer) {
  if (weapon.cooldown > 0) return false;

  weapon.cooldown    = FIRE_COOLDOWN;
  weapon.flashTimer  = FLASH_TIME;
  weapon.tracerTimer = TRACER_TIME;
  scene.sound.play('shoot', { volume: 0.5 });

  hitScan(zBuffer, scene);
  return true;
}

/**
 * Letar efter en träffad fiende rakt fram i siktet.
 * Närmaste träffbara fiende vinner (du kan inte skjuta genom en fiende).
 */
function hitScan(zBuffer, scene) {
  let best = null;
  let bestDist = MAX_RANGE;

  peekers.forEach(p => {
    if (p.state !== 'active') return;

    const dx = p.x - player.x;
    const dy = p.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist > bestDist) return;   // utom räckhåll eller längre bort än träffad

    // Vinkel mellan siktet (player.dir) och fienden
    let angleDiff = Math.atan2(dy, dx) - player.dir;
    while (angleDiff >  Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    // Träffzon: huvudbredd på desktop (0.12), breddad till 0.20 på touch —
    // klassisk aim assist som kompenserar pekskärmens lägre siktprecision.
    const hitRadius = isTouchDevice ? 0.28 : 0.12;
    const halfWidth = Math.atan(hitRadius / dist);
    if (Math.abs(angleDiff) > halfWidth) return;   // missade i sidled

    // Skyms fienden av en vägg? Kolla zBuffer i fiendens skärmkolumn.
    const col = Math.round((angleDiff / FOV + 0.5) * NUM_RAYS);
    if (col < 0 || col >= NUM_RAYS) return;
    const perpDist = dist * Math.cos(angleDiff);
    if (zBuffer[col] < perpDist) return;           // vägg i vägen

    best = p;
    bestDist = dist;
  });

  if (best) {
    killPeeker(best);                              // startar fallanimationen
    scene?.sound.play('ouch', { volume: 0.6 });    // träffåterkoppling
    registerKill();
  }
}