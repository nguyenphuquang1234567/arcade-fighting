import type { Action, Fighter } from './combat';
import { attackFrame, frameCounts } from './fighters';

export type Box = { x: number; y: number; width: number; height: number };
export type Strike = 'attack' | 'kick' | 'sword_attack' | 'ground_slide';
export type Timing = { active: number; activeEnd: number; duration: number };
// Coordinates are authored in the actual 512px sprite cells, then transformed
// with exactly the same origin/scale/flip as the renderer.
export const SPRITE_SCALE = .6;
export const SPRITE_BASELINE = 665;
const box = (x: number, y: number, width: number, height: number): Box => ({ x, y, width, height });
export function worldBox(f: Fighter, b: Box): Box {
  return {
    x: f.x + (f.face > 0 ? b.x - 256 : 256 - b.x - b.width) * SPRITE_SCALE,
    y: SPRITE_BASELINE + f.y + (b.y - 512) * SPRITE_SCALE,
    width: b.width * SPRITE_SCALE, height: b.height * SPRITE_SCALE,
  };
}
export function overlap(a: Box, b: Box): Box | undefined {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
  const width = Math.min(a.x + a.width, b.x + b.width) - x;
  const height = Math.min(a.y + a.height, b.y + b.height) - y;
  return width > 0 && height > 0 ? { x, y, width, height } : undefined;
}
export function poseFrame(f: Fighter, timing?: Timing): number {
  if (!timing) return 0;
  if (f.action === 'ground_slide') return f.time < timing.activeEnd ? 0 : 1;
  return attackFrame(f.time, timing.active, timing.duration, frameCounts[f.action]);
}
export function getHurtboxes(f: Fighter, timing?: Timing): Box[] {
  if (f.hp <= 0 || f.action === 'death') return [];
  const frame = poseFrame(f, timing);
  let torso: Box, lower: Box;
  switch (f.action) {
    case 'attack': {
      const x = [235, 225, 220, 200, 180, 180, 215, 230, 235, 235][frame];
      torso = box(x, 145, 125, 235); lower = box(x - 65, 380, 240, 110); break;
    }
    case 'kick': {
      const x = [205, 190, 175, 135, 130, 130, 165, 195, 205, 205][frame];
      torso = box(x, 130, 105, 235); lower = box(x - 5, 365, 95, 125); break;
    }
    case 'sword_attack': {
      const low = frame === 2 || frame === 3;
      torso = low ? box(120, 250, 155, 165) : box(190, 175, 110, 220);
      lower = low ? box(110, 415, 150, 75) : box(165, 395, 160, 95); break;
    }
    case 'ground_slide':
      torso = box(frame === 0 ? 100 : 135, 310, 160, 130);
      lower = box(160, 440, 135, 50); break;
    case 'run': case 'walk': case 'jump':
      torso = box(200, 185, 125, 185); lower = box(175, 370, 165, 120); break;
    case 'hurt':
      torso = box(205, 145, 110, 245); lower = box(180, 390, 140, 100); break;
    default:
      torso = box(200, 125, 115, 275); lower = box(175, 400, 155, 90);
  }
  return [torso, lower].map(b => worldBox(f, b));
}
export function getHitboxes(f: Fighter, timing?: Timing): Box[] {
  if (!timing || f.hp <= 0 || f.time < timing.active || f.time >= timing.activeEnd) return [];
  const frame = poseFrame(f, timing);
  const profile: Partial<Record<Action, Box>> = {
    attack: box(355, frame === 5 ? 205 : 195, 110, 55),
    kick: box(350, 195, 120, 70),
    sword_attack: box(285, frame === 3 ? 275 : 295, 205, 90),
    ground_slide: box(frame === 0 ? 380 : 325, 425, frame === 0 ? 100 : 95, 65),
  };
  const b = profile[f.action];
  return b ? [worldBox(f, b)] : [];
}
export function collision(hitboxes: Box[], hurtboxes: Box[]): Box | undefined {
  for (const hit of hitboxes) for (const hurt of hurtboxes) {
    const contact = overlap(hit, hurt);
    if (contact) return contact;
  }
}
