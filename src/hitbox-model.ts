import {frameCounts} from './fighters';
export type HitBox={x:number,y:number,width:number,height:number};
export type HitEdits=Record<string,HitBox[]>;
export const strikes=['attack','kick','sword_attack','ground_slide'] as const;
export function defaultHitboxes(action:string,frame:number):HitBox[]{
 const profiles:Record<string,HitBox>={attack:{x:355,y:frame===5?205:195,width:110,height:55},kick:{x:350,y:195,width:120,height:70},sword_attack:{x:285,y:frame===3?275:295,width:205,height:90},ground_slide:{x:frame===0?380:325,y:425,width:frame===0?100:95,height:65}};
 return profiles[action]?[{...profiles[action]}]:[];
}
export function validateHitboxes(data:unknown):string|undefined{
 if(!data||typeof data!=='object'||Array.isArray(data))return 'Dữ liệu không hợp lệ';
 for(const [key,boxes] of Object.entries(data)){
 const [who,a,f,...rest]=key.split('/');if(rest.length||!['moon','ember'].includes(who)||!strikes.includes(a as typeof strikes[number])||!/^\d+$/.test(f)||Number(f)>=frameCounts[a as keyof typeof frameCounts])return `Frame không hợp lệ: ${key}`;
 if(!Array.isArray(boxes)||boxes.length>16)return `Tối đa 16 hitbox: ${key}`;
 for(const b of boxes)if(!b||![b.x,b.y,b.width,b.height].every(Number.isFinite)||b.x<0||b.y<0||b.width<=0||b.height<=0||b.x+b.width>512||b.y+b.height>512)return `Hitbox phải nằm trong frame: ${key}`;
 }
}
