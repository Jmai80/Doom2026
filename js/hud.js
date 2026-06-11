// HUD: bannamn, kills, timer, totaltid och överlayskärmar.
// Skapar Phaser Text-objekt (skalas med canvas) i stället för DOM-element.

import { state }          from './state.js';
import { LEVELS }         from './levels.js';
import { VIEW_W, VIEW_H } from './constants.js';
import { isTouchDevice }  from './input.js';

const FONT   = '"Courier New", monospace';
const INK    = '#c9c4b8';
const ACCENT = '#d6452f';
const DIM    = '#908c86';

let levelText, killsText, timerText, idleText, idleTouchHint, overlayGfx;
let bossText;
let lostTitle, lostSub, lostHint;
let wonTitle, wonTime, wonSub, wonHint;
let clearTitle, clearTime, clearTotal, clearHint;

export function initHud(scene) {
  // --- Live-HUD uppe till vänster ---
  levelText = scene.add.text(12, 12, '', {
    fontFamily: FONT, fontSize: '14px', color: ACCENT,
  });
  killsText = scene.add.text(12, 30, '', {
    fontFamily: FONT, fontSize: '14px', color: INK,
  });
  timerText = scene.add.text(12, 48, '', {
    fontFamily: FONT, fontSize: '14px', color: INK,
  });

  // --- Idle-prompt ---
  idleText = scene.add.text(VIEW_W / 2, VIEW_H / 2, '[ TRYCK VALFRI KNAPP ]', {
    fontFamily: FONT, fontSize: '18px', color: '#f2ede6',
    stroke: '#000000', strokeThickness: 4,
    backgroundColor: '#000000aa',
    padding: { x: 14, y: 8 },
  }).setOrigin(0.5);

  // Engångsinstruktion för pekstyrning — visas bara på touch-enheter
  idleTouchHint = scene.add.text(
    VIEW_W / 2, VIEW_H / 2 + 46,
    'STYR MED PLATTAN · DRA PÅ SKÄRMEN FÖR ATT SIKTA',
    {
      fontFamily: FONT, fontSize: '12px', color: DIM,
      stroke: '#000000', strokeThickness: 3,
    }
  ).setOrigin(0.5).setVisible(false);

  // "BOSSEN ÄR HÄR" — blinkar fram när bossen spawnar
  bossText = scene.add.text(VIEW_W / 2, VIEW_H * 0.30, 'BOSSEN ÄR HÄR', {
    fontFamily: FONT, fontSize: '34px', color: ACCENT,
    stroke: '#000000', strokeThickness: 5,
  }).setOrigin(0.5).setVisible(false);

  overlayGfx = scene.add.graphics();

  // --- GAME OVER ---
  lostTitle = scene.add.text(VIEW_W / 2, VIEW_H / 2 - 55, 'GAME OVER', {
    fontFamily: FONT, fontSize: '52px', color: ACCENT,
    stroke: '#6a1508', strokeThickness: 2,
  }).setOrigin(0.5).setVisible(false);

  lostSub = scene.add.text(VIEW_W / 2, VIEW_H / 2 + 18, '', {
    fontFamily: FONT, fontSize: '16px', color: INK,
  }).setOrigin(0.5).setVisible(false);

  lostHint = scene.add.text(VIEW_W / 2, VIEW_H / 2 + 52, 'MELLANSLAG / FIRE = STARTA OM', {
    fontFamily: FONT, fontSize: '15px', color: '#f2ede6',
    stroke: '#000000', strokeThickness: 4,
  }).setOrigin(0.5).setVisible(false);

  // --- BANA KLAR (mellanskärm) ---
  clearTitle = scene.add.text(VIEW_W / 2, VIEW_H / 2 - 60, '', {
    fontFamily: FONT, fontSize: '38px', color: INK,
    stroke: '#000000', strokeThickness: 3,
  }).setOrigin(0.5).setVisible(false);

  clearTime = scene.add.text(VIEW_W / 2, VIEW_H / 2 - 8, '', {
    fontFamily: FONT, fontSize: '17px', color: INK,
  }).setOrigin(0.5).setVisible(false);

  clearTotal = scene.add.text(VIEW_W / 2, VIEW_H / 2 + 20, '', {
    fontFamily: FONT, fontSize: '14px', color: DIM,
    stroke: '#000000', strokeThickness: 3,
  }).setOrigin(0.5).setVisible(false);

  clearHint = scene.add.text(VIEW_W / 2, VIEW_H / 2 + 58, 'MELLANSLAG / FIRE = NÄSTA BANA', {
    fontFamily: FONT, fontSize: '15px', color: '#f2ede6',
    stroke: '#000000', strokeThickness: 4,
  }).setOrigin(0.5).setVisible(false);

  // --- ALLA BANOR KLARA (vinstskärm) ---
  wonTitle = scene.add.text(VIEW_W / 2, VIEW_H / 2 - 60, 'ALLA BANOR KLARA!', {
    fontFamily: FONT, fontSize: '36px', color: INK,
    stroke: '#000000', strokeThickness: 3,
  }).setOrigin(0.5).setVisible(false);

  wonTime = scene.add.text(VIEW_W / 2, VIEW_H / 2 - 6, '', {
    fontFamily: FONT, fontSize: '20px', color: ACCENT,
    stroke: '#000000', strokeThickness: 3,
  }).setOrigin(0.5).setVisible(false);

  wonSub = scene.add.text(VIEW_W / 2, VIEW_H / 2 + 24, '', {
    fontFamily: FONT, fontSize: '13px', color: INK,
    stroke: '#000000', strokeThickness: 3,
  }).setOrigin(0.5).setVisible(false);

  wonHint = scene.add.text(VIEW_W / 2, VIEW_H / 2 + 60, 'MELLANSLAG / FIRE = SPELA IGEN', {
    fontFamily: FONT, fontSize: '15px', color: '#f2ede6',
    stroke: '#000000', strokeThickness: 4,
  }).setOrigin(0.5).setVisible(false);
}

export function updateHud() {
  const { phase, kills, totalEnemies, timeLeft,
          levelTimeLimit, totalTime, currentLevel, uiLockout } = state;
  const unlocked = uiLockout === 0;
  const levelName = LEVELS[currentLevel]?.name ?? '';

  // --- Live-HUD ---
  levelText.setText(levelName);
  killsText.setText(`KILLS  ${kills} / ${totalEnemies}`);
  const secs = Math.ceil(timeLeft);
  timerText.setText(`TID    ${secs}S`);
  timerText.setColor(phase === 'playing' && secs <= 10 ? '#ff2020' : INK);

  const inGame = (phase === 'idle' || phase === 'playing');
  levelText.setVisible(inGame);
  killsText.setVisible(inGame);
  timerText.setVisible(inGame);
  idleText.setVisible(phase === 'idle');
  idleTouchHint.setVisible(phase === 'idle' && isTouchDevice);

  // Bossutrop: synlig medan timern lever, tonar ut sista halvsekunden
  if (state.bossAnnounce > 0 && phase === 'playing') {
    bossText.setVisible(true);
    bossText.setAlpha(Math.min(1, state.bossAnnounce / 0.5));
  } else {
    bossText.setVisible(false);
  }

  // --- Overlay-bakgrund ---
  overlayGfx.clear();
  if (phase === 'won' || phase === 'lost' || phase === 'levelclear') {
    overlayGfx.fillStyle(0x000000, 0.74);
    overlayGfx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  // --- GAME OVER ---
  const isLost = phase === 'lost';
  lostTitle.setVisible(isLost);
  lostHint.setVisible(isLost && unlocked);
  lostSub.setVisible(isLost);
  if (isLost) {
    lostSub.setText(`${levelName}: ${kills} AV ${totalEnemies} FIENDER NEDSKJUTNA`);
  }

  // --- BANA KLAR ---
  const isClear = phase === 'levelclear';
  clearTitle.setVisible(isClear);
  clearTime.setVisible(isClear);
  clearTotal.setVisible(isClear);
  clearHint.setVisible(isClear && unlocked);
  if (isClear) {
    const levelElapsed = (levelTimeLimit - timeLeft).toFixed(1);
    clearTitle.setText(`${levelName} KLAR!`);
    clearTime.setText(`BANTID: ${levelElapsed} S`);
    clearTotal.setText(`TOTALTID: ${totalTime.toFixed(1)} S`);
  }

  // --- ALLA BANOR KLARA ---
  const isWon = phase === 'won';
  wonTitle.setVisible(isWon);
  wonTime.setVisible(isWon);
  wonSub.setVisible(isWon);
  wonHint.setVisible(isWon && unlocked);
  if (isWon) {
    wonTime.setText(`TOTALTID: ${totalTime.toFixed(1)} S`);
    wonSub.setText(`${LEVELS.length} BANOR — LÄGST TID VINNER`);
  }
}