// Delade konstanter som importeras av alla andra moduler.

export const VIEW_W   = 640;
export const VIEW_H   = 400;
export const COL_W    = 2;              // pixelbredd per strålekolumn
export const NUM_RAYS = VIEW_W / COL_W; // antal strålar per frame
export const FOV      = Math.PI * 5/12; // 85° synfält
export const HALF_FOV = FOV / 2;