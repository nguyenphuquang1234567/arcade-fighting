import {frameCounts} from './fighters';
import {editorFrameCount,type EditorCharacter} from './yuki-assets';
export type HitBox={x:number,y:number,width:number,height:number,angle?:number};
export function hitboxCorners(b:HitBox){
 const r=(b.angle??0)*Math.PI/180,c=Math.cos(r),s=Math.sin(r),cx=b.x+b.width/2,cy=b.y+b.height/2;
 return [[-b.width/2,-b.height/2],[b.width/2,-b.height/2],[b.width/2,b.height/2],[-b.width/2,b.height/2]].map(([x,y])=>({x:cx+x*c-y*s,y:cy+x*s+y*c}));
}
export type HitEdits=Record<string,HitBox[]>;
export const strikes=['attack','kick','sword_attack','ground_slide'] as const;
export function defaultHitboxes(action:string,frame:number):HitBox[]{
 const profiles:Record<string,HitBox>={attack:{x:355,y:frame===5?205:195,width:110,height:55},kick:{x:350,y:195,width:120,height:70},sword_attack:{x:285,y:frame===3?275:295,width:205,height:90},ground_slide:{x:frame===0?380:325,y:425,width:frame===0?100:95,height:65}};
 return profiles[action]?[{...profiles[action]}]:[];
}
export function validateHitboxes(data:unknown):string|undefined{
 if(!data||typeof data!=='object'||Array.isArray(data))return 'Dữ liệu không hợp lệ';
 for(const [key,boxes] of Object.entries(data)){
 const [who,a,f,...rest]=key.split('/');if(rest.length||!['moon','ember','yuki','an'].includes(who)||!strikes.includes(a as typeof strikes[number])||!/^\d+$/.test(f)||Number(f)>=((who==='an'||who==='yuki')&&a==='sword_attack'?62:editorFrameCount(who as EditorCharacter,a as keyof typeof frameCounts)))return `Frame không hợp lệ: ${key}`;
 if(!Array.isArray(boxes)||boxes.length>16)return `Tối đa 16 hitbox: ${key}`;
 for(const b of boxes)if(!b||![b.x,b.y,b.width,b.height].every(Number.isFinite)||b.width<=0||b.height<=0||(b.angle!==undefined&&(!Number.isFinite(b.angle)||Math.abs(b.angle)>180))||hitboxCorners(b).some(p=>p.x<((who==='an'||who==='yuki')&&a==='sword_attack'?-128.000001:-.000001)||p.y<-.000001||p.x>((who==='an'||who==='yuki')&&a==='sword_attack'?640.000001:512.000001)||p.y>512.000001))return `Hitbox phải nằm trong frame: ${key}`;
 }
}
