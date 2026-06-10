// All bandata + banladdning. En ny bana = ett nytt objekt i LEVELS-arrayen.
// Varje bana definierar: namn, tidsgräns, spelarens start, karta och fiender.

import { setMap }      from './map.js';
import { loadEnemies } from './peekers.js';
import { resetPlayer } from './player.js';
import { state }       from './state.js';

export const LEVELS = [

  // ------------------------------------------------------------ BANA 1 ---
  {
    name: 'BANA 1',
    timeLimit: 60,
    playerStart: { x: 1.5, y: 1.5, dir: 0 },
    map: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
      [1,0,1,1,0,1,1,0,0,1,0,1,1,1,0,1],
      [1,0,1,0,0,0,1,0,0,0,0,0,0,1,0,1],
      [1,0,1,0,1,0,1,1,1,1,1,1,0,1,0,1],
      [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,1,0,1,1,1,1,0,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,1,0,1,1,1,1,1,1,1,0,1],
      [1,0,1,0,0,0,0,0,0,0,0,0,0,1,0,1],
      [1,0,1,0,1,1,1,1,1,1,1,1,0,1,0,1],
      [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,0,1,1,1,1,1,1,1,1,0,1],
      [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,0,0,0,1,1,1,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
    enemies: [
      { x:  7.5, y:  2.5, triggerDist: 7 },
      { x:  5.5, y:  5.5, triggerDist: 6 },
      { x:  3.5, y:  9.5, triggerDist: 6 },
      { x: 11.5, y:  7.5, triggerDist: 7 },
      { x:  9.5, y: 13.5, triggerDist: 6, boss: true },
    ],
  },

  // ------------------------------------------------------------ BANA 2 ---
  // Tema: ett centralt "nav" med fyra rum i hörnen — mer rumskänsla,
  // längre siktlinjer och fiender som vaktar varsitt område.
  {
    name: 'BANA 2',
    timeLimit: 60,
    playerStart: { x: 8.0, y: 8.0, dir: -Math.PI / 2 },   // mitten, tittar norrut
    map: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,1,0,0,1,0,0,0,0,0,1],
      [1,0,1,1,1,0,1,0,0,1,0,1,1,1,0,1],
      [1,0,1,0,0,0,0,0,0,0,0,0,0,1,0,1],
      [1,0,1,0,1,1,1,0,0,1,1,1,0,1,0,1],
      [1,0,0,0,1,0,0,0,0,0,0,1,0,0,0,1],
      [1,1,1,0,1,0,0,0,0,0,0,1,0,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,1,0,1,0,0,0,0,0,0,1,0,1,1,1],
      [1,0,0,0,1,0,0,0,0,0,0,1,0,0,0,1],
      [1,0,1,0,1,1,1,0,0,1,1,1,0,1,0,1],
      [1,0,1,0,0,0,0,0,0,0,0,0,0,1,0,1],
      [1,0,1,1,1,0,1,0,0,1,0,1,1,1,0,1],
      [1,0,0,0,0,0,1,0,0,1,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
    enemies: [
      { x:  1.5, y:  1.5, triggerDist: 8 },   // nordvästra rummet
      { x: 14.5, y:  1.5, triggerDist: 8 },   // nordöstra rummet
      { x:  1.5, y: 14.5, triggerDist: 8 },   // sydvästra rummet
      { x: 14.5, y: 14.5, triggerDist: 8 },   // sydöstra rummet
      { x:  8.5, y:  3.5, triggerDist: 6, boss: true },   // norra korridoren
    ],
  },

];

/** Laddar bana med index i: karta, spelare, fiender och timer. */
export function loadLevel(i) {
  const lv = LEVELS[i];
  state.currentLevel   = i;
  state.kills          = 0;
  state.totalEnemies   = lv.enemies.length;
  state.timeLeft       = lv.timeLimit;
  state.levelTimeLimit = lv.timeLimit;
  setMap(lv.map);
  resetPlayer(lv.playerStart);
  loadEnemies(lv.enemies);
}

/** Finns det fler banor efter den aktuella? */
export function hasNextLevel() {
  return state.currentLevel + 1 < LEVELS.length;
}