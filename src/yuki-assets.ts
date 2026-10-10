import {frameCounts,spriteFile} from './fighters';
import type {Action} from './combat';
export type EditorCharacter='moon'|'ember'|'yuki';
export const yukiActions:Action[]=['idle','run','jump','attack','kick','ground_slide','hurt','death','sword_attack'];
export function editorFrameCount(c:EditorCharacter,a:Action){return c==='yuki'?(a==='death'?10:a==='kick'?9:yukiActions.includes(a)?frameCounts[a]:2):frameCounts[a]}
export function editorSprite(c:EditorCharacter,a:Action){return c==='yuki'?(a==='kick'?'kick-user-9.png':yukiActions.includes(a)?`${a}.png`:'idle.png'):spriteFile(c,a)}
export function poseIndex(c:EditorCharacter,a:Action,i:number){return c==='yuki'&&a==='death'?0:c==='yuki'&&a==='kick'?Math.round(i*9/8):i}
