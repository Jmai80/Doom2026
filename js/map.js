// Aktiv karta. Ägs inte längre här — sätts av levels.js via setMap().
// MAP/MAP_W/MAP_H är live bindings: importörer (renderer m.fl.) ser
// automatiskt den nya kartan när en bana laddas.

export let MAP   = [[1]];
export let MAP_W = 1;
export let MAP_H = 1;

/** Byter aktiv karta. Anropas av loadLevel(). */
export function setMap(m) {
  MAP   = m;
  MAP_H = m.length;
  MAP_W = m[0].length;
}

/** Returnerar true om (x, y) i kartkoordinater är en vägg eller utanför kartan. */
export function isWall(x, y) {
  const mx = Math.floor(x);
  const my = Math.floor(y);
  if (mx < 0 || my < 0 || mx >= MAP_W || my >= MAP_H) return true;
  return MAP[my][mx] > 0;
}