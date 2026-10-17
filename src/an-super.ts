import {superStrike} from './yuki-super';
import {superCapsuleEdits,superHurtboxes} from './super-hurtboxes';
import hits from './an-super-hitbox-overrides.json';
import hurts from './an-super-hurtbox-overrides.json';
import type {CapsuleEdit} from './capsule-model';
export function anFrameIndex(t:number){return Math.min(99,Math.floor(Math.max(0,t)*100/1.5))}
function sourceTime(t:number){const frame=anFrameIndex(t)+1;return ((frame>=68?frame-2:frame-1)+.5)*1.5/99}
export function anStrike(t:number){const strike=superStrike(sourceTime(t));if(!strike)return;return {...strike,box:(hits as Record<string,typeof strike.box>)[anFrameIndex(t)+1]??strike.box}}
export function anCapsuleEdits(t:number):CapsuleEdit[]{return (hurts as Record<string,CapsuleEdit[]>)[anFrameIndex(t)+1]??superCapsuleEdits(sourceTime(t))}
export function anHurtboxes(t:number,edits=anCapsuleEdits(t)){return superHurtboxes(sourceTime(t),edits)}
