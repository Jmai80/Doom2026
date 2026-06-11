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
const BOSS_AIM   = 0.7;    // s: bossens telegrafering innan skottet
const BOSS_COOLDOWN = 2.6; // s: mellan bosskott
const BOSS_DAMAGE   = 3;   // sekunder som stjäls per träff

export let peekers = [];

/** Skapar färska fiendeobjekt från banans definitioner. Anropas av loadLevel(). */
export function loadEnemies(defs, swayFactor = 1) {
  peekers = defs.map((d, i) => ({
    x: d.x, y: d.y,
    anchorX: d.x, anchorY: d.y,        // mittpunkt för sidledsglidet
    triggerDist: d.triggerDist,
    boss: !!d.boss,
    // Valfria per-boss-värden från bandatan (faller tillbaka på konstanterna)
    aimTime:      d.aimTime,
    cooldownTime: d.cooldownTime,
    damage:       d.damage,
    state: 'waiting',
    fadeTimer: 0,
    deathTimer: 0,
    // Sidledsrörelse: fas och hastighet varieras per fiende så de inte
    // rör sig i takt. Axeln (x eller y) avgörs vid spawn utifrån fritt utrymme.
    swayT: i * 1.7,
    swaySpeed: (1.2 + (i % 3) * 0.35) * swayFactor,
    swayAxis: null,
    swayAmp: 0,        // sätts av pickSwayAxis vid aktivering
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
      if (p.boss) {
        // Bossen spawnar OMEDELBART när sista vanliga fienden skjutits —
        // inget närhetskrav, så spelaren slipper leta för att trigga den.
        // Minimappens stora markör visar var den väntar.
        const othersDown = peekers.every(
          q => q.boss || q.state === 'dying' || q.state === 'gone'
        );
        if (othersDown) {
          p.state     = 'active';
          p.fadeTimer = 0;
          p.swayAxis  = pickSwayAxis(p);
        }
      } else if (dist < p.triggerDist) {
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

// Adaptiv glidamplitud: prova fallande amplituder och returnera den största
// som får plats längs axeln (0 = inget utrymme alls).
function axisAmp(p, axis) {
  const m = 0.15;   // marginal utöver amplituden
  for (const a of [0.5, 0.4, 0.3, 0.2]) {
    const r = a + m;
    const free = axis === 'x'
      ? !isWall(p.anchorX - r, p.anchorY) && !isWall(p.anchorX + r, p.anchorY)
      : !isWall(p.anchorX, p.anchorY - r) && !isWall(p.anchorX, p.anchorY + r);
    if (free) return a;
  }
  return 0;
}

// Välj den axel som ger störst glidutrymme. Sätter även p.swayAmp.
// Bara fiender helt inklämda åt alla håll blir stillastående.
function pickSwayAxis(p) {
  const ax = axisAmp(p, 'x');
  const ay = axisAmp(p, 'y');
  if (ax === 0 && ay === 0) { p.swayAmp = 0; return null; }
  if (ax >= ay) { p.swayAmp = ax; return 'x'; }
  p.swayAmp = ay;
  return 'y';
}

function updateSway(p, dt) {
  if (!p.swayAxis) return;
  // Bossen står stilla medan den siktar — tydlig telegraf
  if (p.boss && p.aimTimer > 0) return;

  p.swayT += dt * p.swaySpeed;
  const offset = Math.sin(p.swayT) * p.swayAmp;
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
      p.fireCooldown = p.cooldownTime ?? BOSS_COOLDOWN;
      // Träff bara om spelaren fortfarande är i fri siktlinje —
      // att bryta siktlinjen bakom en vägg är spelarens försvar.
      if (hasLineOfSight(p)) {
        stealTime(p.damage ?? BOSS_DAMAGE);
        scene?.sound.play('shoot', { volume: 0.45, rate: 0.55 });   // mörkare ton
      }
    }
  } else if (p.fireCooldown === 0 && dist < p.triggerDist + 2 && hasLineOfSight(p)) {
    p.aimTimer = p.aimTime ?? BOSS_AIM;   // börja sikta — glöden pulserar rött (se render)
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
  gfx.save();
  gfx.translateCanvas(cx, footY);
  gfx.rotateCanvas(fallT * Math.PI / 2);
  gfx.translateCanvas(-cx, -footY);

  const headR  = h * 0.12;
  const headY  = cy - h * 0.22;
  const neckY  = headY + headR;
  const waistY = cy + h * 0.10;
  let   lw     = Math.max(1.5, h * 0.045);

  const bodyColor = p.boss ? 0xd6452f : 0xf2ede6;
  if (p.boss) lw *= 1.6;

  // --- Gånganimation -------------------------------------------------------
  // Benen/armarna svänger i takt med sidledsglidet. speedFactor följer
  // glidets faktiska hastighet (derivatan av sin är cos) så stegen
  // saktar in naturligt i vändlägena där dockan momentant står stilla.
  const aiming = p.boss && p.aimTimer > 0;
  const moving = p.swayAxis !== null && !aiming && p.state === 'active';
  const speedFactor = moving ? Math.abs(Math.cos(p.swayT)) : 0;
  const walkPhase   = p.swayT * 3;                     // stegtakt > glidtakt
  const swing       = Math.sin(walkPhase) * 0.55 * speedFactor;

  const legLen = footY - waistY;
  const armLen = h * 0.26;
  const shoulderY = neckY + (waistY - neckY) * 0.15;

  // Vinklar från lodrätt: vilospridning ± gångsvängning
  const leg1 =  0.22 + swing;
  const leg2 = -0.22 - swing;
  // Armar i motfas mot benen (naturlig gång). Boss som siktar: armarna upp.
  let arm1 =  0.15 - swing * 0.8;
  let arm2 = -0.15 + swing * 0.8;
  if (aiming) { arm1 = 1.9; arm2 = -1.9; }             // höjda armar = telegraf

  // --- Glöd ----------------------------------------------------------------
  let glowColor = 0xff8844, glowAlpha = alpha * 0.22, glowExtra = 3;
  if (p.boss) {
    glowColor = 0xff2020;
    glowAlpha = alpha * 0.35;
    if (aiming) {
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 60);
      glowAlpha = alpha * (0.4 + 0.5 * pulse);
      glowExtra = 5 + 3 * pulse;
    }
  }
  gfx.lineStyle(lw + glowExtra, glowColor, glowAlpha);
  gfx.strokeCircle(cx, headY, headR + glowExtra);

  // --- Huvud ---------------------------------------------------------------
  gfx.fillStyle(bodyColor, alpha);
  gfx.fillCircle(cx, headY, headR);

  // --- Surt ansikte: ögon, arga ögonbryn, nedåtböjd mun --------------------
  // Mörkt mot ljus kropp, ljust mot bossens röda
  const faceColor = p.boss ? 0x1a0a08 : 0x14110e;
  const eyeR  = Math.max(0.8, headR * 0.14);
  const eyeDX = headR * 0.38;
  const eyeY  = headY - headR * 0.12;
  gfx.fillStyle(faceColor, alpha);
  gfx.fillCircle(cx - eyeDX, eyeY, eyeR);
  gfx.fillCircle(cx + eyeDX, eyeY, eyeR);

  const faceLw = Math.max(1, headR * 0.13);
  gfx.lineStyle(faceLw, faceColor, alpha);

  // Ögonbryn: \ / — vinklade inåt-nedåt för surhet
  gfx.beginPath();
  gfx.moveTo(cx - eyeDX - headR * 0.25, eyeY - headR * 0.42);
  gfx.lineTo(cx - eyeDX + headR * 0.18, eyeY - headR * 0.20);
  gfx.moveTo(cx + eyeDX + headR * 0.25, eyeY - headR * 0.42);
  gfx.lineTo(cx + eyeDX - headR * 0.18, eyeY - headR * 0.20);
  gfx.strokePath();

  // Mun: båge som buktar uppåt (∩) = klassisk sur min
  const mouthR = headR * 0.42;
  gfx.beginPath();
  gfx.arc(cx, headY + headR * 0.78, mouthR, Math.PI * 1.22, Math.PI * 1.78);
  gfx.strokePath();

  // --- Kropp och lemmar ----------------------------------------------------
  gfx.lineStyle(lw, bodyColor, alpha);

  // Horn (endast boss)
  if (p.boss) {
    gfx.beginPath();
    gfx.moveTo(cx - headR * 0.6, headY - headR * 0.7);
    gfx.lineTo(cx - headR * 1.2, headY - headR * 1.8);
    gfx.moveTo(cx + headR * 0.6, headY - headR * 0.7);
    gfx.lineTo(cx + headR * 1.2, headY - headR * 1.8);
    gfx.strokePath();
  }

  // Kropp
  gfx.beginPath();
  gfx.moveTo(cx, neckY);
  gfx.lineTo(cx, waistY);
  gfx.strokePath();

  // Armar — svänger i motfas mot benen (vinkel 0 = rakt ned)
  gfx.beginPath();
  gfx.moveTo(cx, shoulderY);
  gfx.lineTo(cx + Math.sin(arm1) * armLen, shoulderY + Math.cos(arm1) * armLen);
  gfx.moveTo(cx, shoulderY);
  gfx.lineTo(cx + Math.sin(arm2) * armLen, shoulderY + Math.cos(arm2) * armLen);
  gfx.strokePath();

  // Ben
  gfx.beginPath();
  gfx.moveTo(cx, waistY);
  gfx.lineTo(cx + Math.sin(leg1) * legLen, waistY + Math.cos(leg1) * legLen);
  gfx.moveTo(cx, waistY);
  gfx.lineTo(cx + Math.sin(leg2) * legLen, waistY + Math.cos(leg2) * legLen);
  gfx.strokePath();

  gfx.restore();
}