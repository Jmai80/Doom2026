// Fiender: spawnar nära spelaren, glider i sidled som skjutbanedockor,
// och elimineras med skott. Banans boss (boss: true) kan skjuta tillbaka —
// en träff stjäl tid från spelaren.
//
// State-maskin per fiende: 'waiting' → 'active' → 'dying' → 'gone'

import { player }                       from './player.js';
import { isWall }                       from './map.js';
import { state, stealTime }             from './state.js';
import { VIEW_W, VIEW_H, COL_W,
         NUM_RAYS, FOV, HALF_FOV }      from './constants.js';

const FADE_IN    = 0.4;    // s: fade-in vid spawn
const DEATH_TIME = 0.5;    // s: fallanimation innan 'gone'
const SWAY_AMP   = 0.5;    // kartunits: hur långt dockorna glider åt varje håll
const BOSS_AIM   = 0.7;    // s: bossens telegrafering innan skottet
const BOSS_COOLDOWN = 2.6; // s: mellan bosskott
const BOSS_DAMAGE   = 3;   // sekunder som stjäls per träff

export let peekers = [];

/** Skapar färska fiendeobjekt från banans definitioner. Anropas av loadLevel(). */
export function loadEnemies(defs) {
  peekers = defs.map((d, i) => ({
    x: d.x, y: d.y,
    anchorX: d.x, anchorY: d.y,        // mittpunkt för sidledsglidet
    triggerDist: d.triggerDist,
    boss: !!d.boss,
    state: 'waiting',
    fadeTimer: 0,
    deathTimer: 0,
    // Sidledsrörelse: fas och hastighet varieras per fiende så de inte
    // rör sig i takt. Axeln (x eller y) avgörs vid spawn utifrån fritt utrymme.
    swayT: i * 1.7,
    swaySpeed: 1.2 + (i % 3) * 0.35,
    swayAxis: null,
    // Boss-fält
    aimTimer: 0,
    fireCooldown: 1.5,                 // liten frist innan första skottet
  }));
}

/** Uppdaterar alla fiender. scene behövs för bossens skottljud. */
export function updatePeekers(dt, scene) {
  peekers.forEach(p => {
    if (p.state === 'gone') return;

    const dist = Math.hypot(p.x - player.x, p.y - player.y);

    if (p.state === 'waiting') {
      // Bossen är banans final: den vaknar först när alla vanliga
      // fiender är nedskjutna (dying räknas som nedskjuten).
      const bossBlocked = p.boss && !peekers.every(
        q => q.boss || q.state === 'dying' || q.state === 'gone'
      );
      if (!bossBlocked && dist < p.triggerDist) {
        p.state     = 'active';
        p.fadeTimer = 0;
        p.swayAxis  = pickSwayAxis(p);
      }

    } else if (p.state === 'active') {
      p.fadeTimer = Math.min(p.fadeTimer + dt, FADE_IN);
      updateSway(p, dt);
      if (p.boss) updateBoss(p, dt, dist, scene);

    } else if (p.state === 'dying') {
      p.deathTimer -= dt;
      if (p.deathTimer <= 0) p.state = 'gone';
    }
  });
}

/** Skjuten fiende: starta dödsanimationen. Anropas av weapon.js. */
export function killPeeker(p) {
  p.state      = 'dying';
  p.deathTimer = DEATH_TIME;
}

// ---------------------------------------------------------------------------
//  Sidledsrörelse — skjutbanedockor
// ---------------------------------------------------------------------------

// Välj glidaxel: x om utrymmet åt båda håll är fritt, annars y, annars stilla.
function pickSwayAxis(p) {
  const m = 0.25;   // marginal utöver amplituden
  if (!isWall(p.anchorX - SWAY_AMP - m, p.anchorY) &&
      !isWall(p.anchorX + SWAY_AMP + m, p.anchorY)) return 'x';
  if (!isWall(p.anchorX, p.anchorY - SWAY_AMP - m) &&
      !isWall(p.anchorX, p.anchorY + SWAY_AMP + m)) return 'y';
  return null;
}

function updateSway(p, dt) {
  if (!p.swayAxis) return;
  // Bossen står stilla medan den siktar — tydlig telegraf
  if (p.boss && p.aimTimer > 0) return;

  p.swayT += dt * p.swaySpeed;
  const offset = Math.sin(p.swayT) * SWAY_AMP;
  const nx = p.swayAxis === 'x' ? p.anchorX + offset : p.anchorX;
  const ny = p.swayAxis === 'y' ? p.anchorY + offset : p.anchorY;
  // Säkerhetskoll — rör dig bara om målcellen är öppen
  if (!isWall(nx, ny)) { p.x = nx; p.y = ny; }
}

// ---------------------------------------------------------------------------
//  Boss — siktar (telegraferar) och skjuter om fri siktlinje finns
// ---------------------------------------------------------------------------

function updateBoss(p, dt, dist, scene) {
  p.fireCooldown = Math.max(0, p.fireCooldown - dt);

  if (p.aimTimer > 0) {
    // Telegrafering pågår — avfyra när den löper ut
    p.aimTimer -= dt;
    if (p.aimTimer <= 0) {
      p.fireCooldown = BOSS_COOLDOWN;
      // Träff bara om spelaren fortfarande är i fri siktlinje —
      // att bryta siktlinjen bakom en vägg är spelarens försvar.
      if (hasLineOfSight(p)) {
        stealTime(BOSS_DAMAGE);
        scene?.sound.play('shoot', { volume: 0.45, rate: 0.55 });   // mörkare ton
      }
    }
  } else if (p.fireCooldown === 0 && dist < p.triggerDist + 2 && hasLineOfSight(p)) {
    p.aimTimer = BOSS_AIM;   // börja sikta — glöden pulserar rött (se render)
  }
}

// Enkel siktlinjekoll: stega längs linjen fiende→spelare i små steg.
function hasLineOfSight(p) {
  const dx = player.x - p.x;
  const dy = player.y - p.y;
  const dist = Math.hypot(dx, dy);
  const steps = Math.ceil(dist / 0.1);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isWall(p.x + dx * t, p.y + dy * t)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
//  Rendering
// ---------------------------------------------------------------------------

export function renderPeekers(gfx, zBuffer) {
  peekers.forEach(p => {
    if (p.state !== 'active' && p.state !== 'dying') return;

    const dx = p.x - player.x;
    const dy = p.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.1) return;

    let angleDiff = Math.atan2(dy, dx) - player.dir;
    while (angleDiff >  Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    if (Math.abs(angleDiff) > HALF_FOV + 0.2) return;

    const perpDist = dist * Math.cos(angleDiff);
    if (perpDist <= 0) return;

    const screenX = Math.round((angleDiff / FOV + 0.5) * VIEW_W);
    let spriteH = Math.min(VIEW_H / perpDist, VIEW_H * 3);
    if (p.boss) spriteH *= 1.35;   // bossen är klart större

    const halfW = spriteH * 0.28;
    const c0 = Math.max(0, Math.round((screenX - halfW) / COL_W));
    const c1 = Math.min(NUM_RAYS - 1, Math.round((screenX + halfW) / COL_W));
    let visible = false;
    for (let c = c0; c <= c1; c++) {
      if (zBuffer[c] >= perpDist) { visible = true; break; }
    }
    if (!visible) return;

    let alpha = p.fadeTimer / FADE_IN;
    let fallT = 0;   // 0 = stående, 1 = omkullfallen
    if (p.state === 'dying') {
      fallT = 1 - p.deathTimer / DEATH_TIME;
      alpha = 1 - fallT * 0.6;   // tonar samtidigt bort något
    }

    drawStickFigure(gfx, screenX, VIEW_H / 2, spriteH, alpha, p, fallT);
  });
}

function drawStickFigure(gfx, cx, cy, h, alpha, p, fallT) {
  const footY = cy + h * 0.42;

  // Dödsanimation: rotera hela figuren kring fotpunkten, 0 → 90°.
  // Phaser Graphics stödjer canvas-transformer (save/translate/rotate/restore).
  gfx.save();
  gfx.translateCanvas(cx, footY);
  gfx.rotateCanvas(fallT * Math.PI / 2);
  gfx.translateCanvas(-cx, -footY);

  const headR  = h * 0.12;
  const headY  = cy - h * 0.22;
  const neckY  = headY + headR;
  const waistY = cy + h * 0.10;
  const armY   = neckY + (waistY - neckY) * 0.4;
  const armX   = h * 0.20;
  const legX   = h * 0.13;
  let   lw     = Math.max(1.5, h * 0.045);

  // Bossen är omisskännlig: röd kropp, grövre linjer, horn på huvudet.
  const bodyColor = p.boss ? 0xd6452f : 0xf2ede6;
  if (p.boss) lw *= 1.6;

  // Glöd bakom huvudet: orange för vanliga, röd för boss —
  // och under telegrafering pulserar bossens glöd kraftigt.
  let glowColor = 0xff8844, glowAlpha = alpha * 0.22, glowExtra = 3;
  if (p.boss) {
    glowColor = 0xff2020;
    glowAlpha = alpha * 0.35;
    if (p.aimTimer > 0) {
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 60);
      glowAlpha = alpha * (0.4 + 0.5 * pulse);
      glowExtra = 5 + 3 * pulse;
    }
  }
  gfx.lineStyle(lw + glowExtra, glowColor, glowAlpha);
  gfx.strokeCircle(cx, headY, headR + glowExtra);

  gfx.fillStyle(bodyColor, alpha);
  gfx.fillCircle(cx, headY, headR);

  gfx.lineStyle(lw, bodyColor, alpha);

  // Horn — två korta streck snett uppåt från huvudet (endast boss)
  if (p.boss) {
    gfx.beginPath();
    gfx.moveTo(cx - headR * 0.6, headY - headR * 0.7);
    gfx.lineTo(cx - headR * 1.2, headY - headR * 1.8);
    gfx.moveTo(cx + headR * 0.6, headY - headR * 0.7);
    gfx.lineTo(cx + headR * 1.2, headY - headR * 1.8);
    gfx.strokePath();
  }

  gfx.beginPath();
  gfx.moveTo(cx, neckY);      gfx.lineTo(cx, waistY);
  gfx.strokePath();

  gfx.beginPath();
  gfx.moveTo(cx - armX, armY); gfx.lineTo(cx + armX, armY);
  gfx.strokePath();

  gfx.beginPath();
  gfx.moveTo(cx, waistY);     gfx.lineTo(cx - legX, footY);
  gfx.strokePath();

  gfx.beginPath();
  gfx.moveTo(cx, waistY);     gfx.lineTo(cx + legX, footY);
  gfx.strokePath();

  gfx.restore();
}