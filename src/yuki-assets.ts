import {frameCounts,spriteFile} from './fighters';
import type {Action} from './combat';
export type EditorCharacter='moon'|'ember'|'yuki'|'an';
export const yukiActions:Action[]=['idle','run','jump','attack','kick','ground_slide','hurt','death','sword_attack'];
export const anActions:Action[]=['idle','run','jump','attack','kick','ground_slide','hurt','death','sword_attack'];
export function editorActions(c:EditorCharacter):Action[]{return c==='an'?anActions:Object.keys(frameCounts) as Action[]}
export function editorFrameCount(c:EditorCharacter,a:Action){
 if(c==='an')return a==='death'?85:a==='kick'?9:anActions.includes(a)?frameCounts[a]:2;
 return c==='yuki'?(a==='death'?105:a==='kick'?9:yukiActions.includes(a)?frameCounts[a]:2):frameCounts[a];
}
export function editorSprite(c:EditorCharacter,a:Action,frame=0){
 if(c==='yuki'&&a==='death')return `death-pages-105/${Math.floor(frame/8)}.png`;
 if(c==='an'&&a==='death')return `death-pages/${Math.floor(frame/8)}.png`;
 if(c==='an')return anActions.includes(a)?`${a}.png`:'idle.png';
 return c==='yuki'?(a==='kick'?'kick-user-9.png':yukiActions.includes(a)?`${a}.png`:'idle.png'):spriteFile(c,a);
}
export function poseCharacter(c:EditorCharacter){return c==='yuki'||c==='an'?'moon':c}
export function poseIndex(c:EditorCharacter,a:Action,i:number){
 if((c==='yuki'||c==='an')&&a==='death')return 0;
 return (c==='yuki'||c==='an')&&a==='kick'?Math.round(i*9/8):i;
}
