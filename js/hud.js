// HUD: kills-räknare, nedräkningstimer och överlayskärmar.
// Skapar Phaser Text-objekt (skalas med canvas) i stället för DOM-element.

import { state, TOTAL_TIME } from './state.js';
import { VIEW_W, VIEW_H }    from './constants.js';

const FONT   = '"Courier New", monospace';
const INK    = '#c9c4b8';
const ACCENT = '#d6452f';
const DIM    = '#908c86';

// Phaser-objekt — skapas i initHud(), uppdateras i updateHud() varje frame.
let killsText, timerText, idleText, overlayGfx;
let lostTitle, lostSub, lostHint;
let wonTitle, wonTime, wonSub, wonHint;

export function initHud(scene) {
  // --- Live-HUD uppe till vänster ---
  killsText = scene.add.text(12, 12, '', {
    fontFamily: FONT, fontSize: '14px', color: INK,
  });
  timerText = scene.add.text(12, 30, '', {
    fontFamily: FONT, fontSize: '14px', color: INK,
  });

  // --- Idle-prompt i mitten — vit text med svart kontur + bakgrundsplatta ---
  idleText = scene.add.text(VIEW_W / 2, VIEW_H / 2, '[ TRYCK VALFRI KNAPP ]', {
    fontFamily: FONT, fontSize: '18px', color: '#f2ede6',
    stroke: '#000000', strokeThickness: 4,
    backgroundColor: '#000000aa',
    padding: { x: 14, y: 8 },
  }).setOrigin(0.5);

  // --- Halvtransparent överlayyta (fylls i updateHud) ---
  overlayGfx = scene.add.graphics();

  // --- GAME OVER ---
  lostTitle = scene.add.text(VIEW_W / 2, VIEW_H / 2 - 55, 'GAME OVER', {
    fontFamily: FONT, fontSize: '52px', color: ACCENT,
    stroke: '#6a1508', strokeThickness: 2,
  }).setOrigin(0.5).setVisible(false);

  lostSub = scene.add.text(VIEW_W / 2, VIEW_H / 2 + 18, '', {
    fontFamily: FONT, fontSize: '16px', color: INK,
  }).setOrigin(0.5).setVisible(false);

  lostHint = scene.add.text(VIEW_W / 2, VIEW_H / 2 + 52, 'MELLANSLAG = STARTA OM', {
    fontFamily: FONT, fontSize: '15px', color: '#f2ede6',
    stroke: '#000000', strokeThickness: 4,
  }).setOrigin(0.5).setVisible(false);

  // --- BANAN KLAR ---
  wonTitle = scene.add.text(VIEW_W / 2, VIEW_H / 2 - 55, 'BANAN KLAR!', {
    fontFamily: FONT, fontSize: '44px', color: INK,
  }).setOrigin(0.5).setVisible(false);

  wonTime = scene.add.text(VIEW_W / 2, VIEW_H / 2 + 14, '', {
    fontFamily: FONT, fontSize: '18px', color: INK,
  }).setOrigin(0.5).setVisible(false);

  wonSub = scene.add.text(VIEW_W / 2, VIEW_H / 2 + 38, '', {
    fontFamily: FONT, fontSize: '13px', color: INK,
    stroke: '#000000', strokeThickness: 3,
  }).setOrigin(0.5).setVisible(false);

  wonHint = scene.add.text(VIEW_W / 2, VIEW_H / 2 + 64, 'MELLANSLAG = STARTA OM', {
    fontFamily: FONT, fontSize: '15px', color: '#f2ede6',
    stroke: '#000000', strokeThickness: 4,
  }).setOrigin(0.5).setVisible(false);
}

export function updateHud() {
  const { phase, kills, totalEnemies, timeLeft } = state;

  // --- Live kills + timer ---
  killsText.setText(`KILLS  ${kills} / ${totalEnemies}`);
  const secs = Math.ceil(timeLeft);
  timerText.setText(`TID    ${secs}S`);
  // Timer blir röd de sista 10 sekunderna
  timerText.setColor(phase === 'playing' && secs <= 10 ? '#ff2020' : INK);

  const inGame = (phase === 'idle' || phase === 'playing');
  killsText.setVisible(inGame);
  timerText.setVisible(inGame);
  idleText.setVisible(phase === 'idle');

  // --- Overlay ---
  overlayGfx.clear();
  const showOverlay = (phase === 'won' || phase === 'lost');
  if (showOverlay) {
    overlayGfx.fillStyle(0x000000, 0.74);
    overlayGfx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  // GAME OVER
  const isLost = phase === 'lost';
  lostTitle.setVisible(isLost);
  lostHint.setVisible(isLost);
  if (isLost) {
    lostSub.setText(`${kills} AV ${totalEnemies} FIENDER NEDSKJUTNA`).setVisible(true);
  } else {
    lostSub.setVisible(false);
  }

  // BANAN KLAR
  const isWon = phase === 'won';
  wonTitle.setVisible(isWon);
  wonHint.setVisible(isWon);
  if (isWon) {
    const elapsed = (TOTAL_TIME - timeLeft).toFixed(1);
    wonTime.setText(`TID: ${elapsed} S`).setVisible(true);
    wonSub.setText(`ALLA ${totalEnemies} FIENDER NEDSKJUTNA`).setVisible(true);
  } else {
    wonTime.setVisible(false);
    wonSub.setVisible(false);
  }
}