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
    walls: { side0: 0x2e8b4a, side1: 0x3fae5e },   // grön
    fogDist: 10,
    swayFactor: 1.0,
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
    walls: { side0: 0x2f5fae, side1: 0x4179d6 },   // blå
    fogDist: 10,
    swayFactor: 1.0,
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


  // ------------------------------------------------------------ BANA 3 ---
  // Tema: spiral — koncentriska ringkorridorer med förskjutna öppningar.
  // Spelaren startar i ytterringen och arbetar sig inåt mot bossens
  // mittrum. Tätare dimma och snabbare fiender — finalen.
  {
    name: 'BANA 3',
    timeLimit: 70,       // spiralens gångavstånd kräver marginal
    walls: { side0: 0xc94f38, side1: 0xe06a4e },   // röd — nu är det allvar
    fogDist: 8,          // lätt dimökning — spiralen är huvudutmaningen
    swayFactor: 1.15,    // mild fartökning; den stora kommer senare
    playerStart: { x: 1.5, y: 1.5, dir: 0 },
    map: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,1,1,0,1,1,1,1,1,1,0,1],
      [1,0,1,0,0,0,0,0,0,0,0,0,1,1,0,1],
      [1,0,1,0,1,1,1,1,1,1,1,0,1,1,0,1],
      [1,0,1,0,1,0,0,0,0,0,1,0,1,1,0,1],
      [1,0,1,0,1,0,1,1,1,0,1,0,1,1,0,1],
      [1,0,1,0,1,0,1,0,0,0,1,0,1,1,0,1],
      [1,0,1,0,1,0,1,0,0,1,1,0,1,1,0,1],
      [1,0,1,0,1,0,1,1,1,1,1,0,1,1,0,1],
      [1,0,1,0,1,0,0,0,0,0,0,0,1,1,0,1],
      [1,0,1,0,1,1,1,1,1,1,1,1,1,1,0,1],
      [1,0,1,0,0,0,0,0,0,0,0,0,0,1,0,1],
      [1,0,1,1,1,1,1,1,1,1,1,1,0,1,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
    enemies: [
      { x: 12.5, y:  1.5, triggerDist: 6 },   // ytterringen, norr
      { x:  1.5, y: 12.5, triggerDist: 6 },   // ytterringen, väster
      { x: 10.5, y:  3.5, triggerDist: 6 },   // ring 2, norr
      { x:  3.5, y: 10.5, triggerDist: 6 },   // ring 2, väster
      { x:  9.5, y:  5.5, triggerDist: 5 },   // ring 3
      { x:  7.5, y:  7.5, triggerDist: 5, boss: true },   // mittrummet
    ],
  },

  // ------------------------------------------------------------ BANA 4 ---
  // SKISS — Tema: tvillingkamrarna. Kartan är spegelsymmetrisk med fyra
  // kvadranter kring ett öppet mittband. Twist: TVÅ bossar — en i nordvästra
  // och en i sydöstra djupet — som båda vaknar samtidigt när sista vanliga
  // fienden faller. Plötsligt två telegraferande hot från olika håll.
  {
    name: 'BANA 4',
    timeLimit: 60,
    walls: { side0: 0x6b3fa0, side1: 0x8a55c8 },   // lila
    fogDist: 8,
    swayFactor: 1.25,
    playerStart: { x: 7.5, y: 7.5, dir: 0 },        // mittbandet
    map: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1],
      [1,0,1,1,1,0,0,1,1,0,0,1,1,1,0,1],
      [1,0,1,0,0,0,0,1,1,0,0,0,0,1,0,1],
      [1,0,1,0,1,1,0,1,1,0,1,1,0,1,0,1],
      [1,0,0,0,1,0,0,1,1,0,0,1,0,0,0,1],
      [1,1,1,0,1,0,0,1,1,0,0,1,0,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,1,0,1,0,0,1,1,0,0,1,0,1,1,1],
      [1,0,0,0,1,0,0,1,1,0,0,1,0,0,0,1],
      [1,0,1,0,1,1,0,1,1,0,1,1,0,1,0,1],
      [1,0,1,0,0,0,0,1,1,0,0,0,0,1,0,1],
      [1,0,1,1,1,0,0,1,1,0,0,1,1,1,0,1],
      [1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
    enemies: [
      { x:  5.5, y:  1.5, triggerDist: 6 },
      { x: 10.5, y:  1.5, triggerDist: 6 },
      { x:  1.5, y: 10.5, triggerDist: 6 },
      { x: 14.5, y:  5.5, triggerDist: 6 },
      { x:  5.5, y: 14.5, triggerDist: 6 },
      { x:  3.5, y:  3.5, triggerDist: 6, boss: true },   // nordvästra djupet
      { x: 12.5, y: 12.5, triggerDist: 6, boss: true },   // sydöstra djupet
    ],
  },

  // ------------------------------------------------------------ BANA 5 ---
  // SKISS — Tema: katakomberna. Trånga, oregelbundna gångar med återvänds-
  // gränder, nästan monokrom palett och spelets tätaste dimma. Två bossar
  // med skärpta värden: snabbare sikte (0.55s), tätare eld (2.2s) och
  // 4 sekunders tidsstöld per träff. Tidsgräns 70 — fler fiender och
  // långsammare navigering i dimman; justeras efter speltest.
  {
    name: 'BANA 5',
    timeLimit: 70,
    walls: { side0: 0x6e6a64, side1: 0x8d8880 },   // monokrom — skelettet
    fogDist: 6.5,
    swayFactor: 1.4,
    playerStart: { x: 1.5, y: 1.5, dir: Math.PI / 2 },   // tittar söderut
    map: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,1,0,0,0,0,0,1,0,0,0,0,1],
      [1,1,1,0,1,0,1,1,1,0,1,0,1,1,0,1],
      [1,0,0,0,0,0,1,0,0,0,0,0,0,1,0,1],
      [1,0,1,1,1,1,1,0,1,1,1,1,0,1,0,1],
      [1,0,0,0,0,0,0,0,1,0,0,1,0,0,0,1],
      [1,1,1,1,0,1,1,0,1,0,1,1,1,1,0,1],
      [1,0,0,0,0,0,1,0,0,0,0,0,0,1,0,1],
      [1,0,1,1,1,0,1,1,1,1,1,1,0,1,0,1],
      [1,0,0,0,1,0,0,0,0,0,0,1,0,0,0,1],
      [1,1,1,0,1,1,1,1,1,1,0,1,1,1,0,1],
      [1,0,1,0,0,0,0,0,1,0,0,0,0,1,0,1],
      [1,0,1,1,1,1,1,0,1,0,1,1,0,1,0,1],
      [1,0,0,0,0,0,1,0,0,0,1,0,0,0,0,1],
      [1,1,1,1,1,0,0,0,1,0,1,0,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ],
    enemies: [
      { x:  8.5, y:  1.5, triggerDist: 5 },
      { x:  1.5, y:  5.5, triggerDist: 5 },
      { x: 14.5, y:  3.5, triggerDist: 5 },
      { x:  7.5, y:  7.5, triggerDist: 5 },
      { x: 14.5, y:  9.5, triggerDist: 5 },
      { x:  1.5, y: 11.5, triggerDist: 5 },
      { x:  9.5, y: 13.5, triggerDist: 5,
        boss: true, aimTime: 0.55, cooldownTime: 2.2, damage: 4 },
      { x:  5.5, y: 14.5, triggerDist: 5,
        boss: true, aimTime: 0.55, cooldownTime: 2.2, damage: 4 },
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
  loadEnemies(lv.enemies, lv.swayFactor ?? 1);
}

/** Finns det fler banor efter den aktuella? */
export function hasNextLevel() {
  return state.currentLevel + 1 < LEVELS.length;
}