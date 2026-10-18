import {ultiEdits as anUltiEdits,ultiHurtPoints as anUltiHurtPoints} from './an-ulti-boxes';
import {anUltiBeamHitbox} from './an-ulti';
import {ultiBeamHitbox} from './yuki-ulti';
import {ultiEdits,ultiHurtPoints} from './ulti-boxes';
import {yukiSlashHitboxes} from './yuki-slash';
import {anSlashHitboxes} from './an-slash';
import {anStrike,anHurtboxes} from './an-super';
import {superHurtboxes} from './super-hurtboxes';
import {superStrike} from './yuki-super';
import type { Action, Fighter } from './combat';
import { attackFrame, frameCounts, frameCount } from './fighters';
import hitEdits from './hitbox-overrides.json';
import {defaultHitboxes,hitboxCorners,type HitEdits} from './hitbox-model';
import capsuleEdits from './capsule-overrides.json';
import { capsulePolygon } from './hurtcapsule';
import type {CapsuleEdit} from './capsule-model';
import { capsulesFor } from './hurtcapsule';
import type {Point,BodyRegion,HurtPolygon} from './collision-types';
export type {Point,BodyRegion,HurtPolygon} from './collision-types';

export type Box = { x: number; y: number; width: number; height: number; angle?:number };
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
    ...(b.angle?{angle:b.angle*f.face}:{}),
  };
}
export function overlap(a: Box, b: Box): Box | undefined {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
  const width = Math.min(a.x + a.width, b.x + b.width) - x;
  const height = Math.min(a.y + a.height, b.y + b.height) - y;
  return width > 0 && height > 0 ? { x, y, width, height } : undefined;
}
export type Contact = Box & { region: BodyRegion };
export const POSE_FPS: Partial<Record<Action, number>> = {idle:3,run:20,walk:5};
export function attackTiming<T extends Timing>(f:Fighter,timing:T,action:Action=f.action):T{
 if(f.collisionSkin==='yuki'&&action==='sword_attack')return {...timing,duration:.6,active:26*.6/62,activeEnd:46*.6/62};
 if(f.collisionSkin==='an'&&action==='sword_attack')return {...timing,duration:.6,active:25*.6/62,activeEnd:50*.6/62};
 if(f.collisionSkin&&action==='attack'&&timing.duration!==.28){
  const ratio=.28/timing.duration;
  return {...timing,duration:.28,active:timing.active*ratio,activeEnd:timing.activeEnd*ratio};
 }
 return timing;
}
export function poseFrame(f: Fighter, timing?: Timing): number {
  if(timing)timing=attackTiming(f,timing);
  if (timing) {
    if (f.action === 'ground_slide') return f.time < timing.activeEnd ? 0 : 1;
    return attackFrame(f.time, timing.active, timing.duration, frameCounts[f.action]);
  }
  const count=frameCount(f.character,f.action);
  const frame=Math.floor(Math.max(0,f.time)*(POSE_FPS[f.action]??6));
  return ['idle','walk','run'].includes(f.action)?frame%count:Math.min(count-1,frame);
}
export function worldPoint(f: Fighter, p: Point): Point {
  return {x:f.x+f.face*(p.x-256)*SPRITE_SCALE,y:SPRITE_BASELINE+f.y+(p.y-512)*SPRITE_SCALE};
}
export function getHurtboxes(f:Fighter,timing?:Timing):HurtPolygon[]{
 if(f.hp<=0||f.action==='death')return [];
 if(f.collisionSkin==='an'&&f.ultiTime!==undefined){const edits=anUltiEdits(f.ultiTime)?.hurt;if(edits)return edits.map((b,i)=>({region:i===1?'head' as const:'body' as const,points:anUltiHurtPoints(b,i).map(p=>({x:f.x+f.face*(p.x-640),y:p.y+f.y}))}));return capsulesFor('an','idle',0).map(p=>({...p,points:p.points.map(pt=>worldPoint(f,pt))}));}
 if(f.collisionSkin==='yuki'&&f.ultiTime!==undefined){const edits=ultiEdits(f.ultiTime)?.hurt;if(edits)return edits.map((b,i)=>({region:i===1?'head' as const:'body' as const,points:ultiHurtPoints(b,i).map(p=>({x:f.x+f.face*(p.x-640),y:p.y+f.y}))}));}
 if(f.collisionSkin==='yuki'&&f.action==='sword_attack'&&f.superTime===undefined)return ((capsuleEdits as Record<string,CapsuleEdit[]>)[`yuki/sword_attack/${Math.min(61,Math.floor(f.time*62/.6))}`]?.map(e=>capsulePolygon('yuki','idle',0,e))??capsulesFor('yuki','idle',0)).map(p=>({...p,points:p.points.map(pt=>worldPoint(f,pt)),holes:p.holes?.map(h=>h.map(pt=>worldPoint(f,pt)))}));
 if(f.collisionSkin==='an'&&f.action==='sword_attack'&&f.superTime===undefined)return ((capsuleEdits as Record<string,CapsuleEdit[]>)[`an/sword_attack/${Math.min(61,Math.floor(f.time*62/.6))}`]?.map(e=>capsulePolygon('an','idle',0,e))??capsulesFor('an','idle',0)).map(p=>({...p,points:p.points.map(pt=>worldPoint(f,pt)),holes:p.holes?.map(h=>h.map(pt=>worldPoint(f,pt)))}));
 if(f.collisionSkin&&f.superTime!==undefined)return (f.collisionSkin==='an'?anHurtboxes(f.superTime):superHurtboxes(f.superTime)).map(p=>({...p,points:p.points.map(pt=>worldPoint(f,pt))}));
 return capsulesFor(f.collisionSkin??f.character,f.action,f.collisionSkin&&f.action==='kick'&&timing?attackFrame(f.time,timing.active,timing.duration,9):poseFrame(f,timing)).map(p=>({...p,points:p.points.map(pt=>worldPoint(f,pt)),holes:p.holes?.map(h=>h.map(pt=>worldPoint(f,pt)))}));
}
export function polygonCollision(hitboxes:Box[],f:Fighter,timing?:Timing):Contact|undefined{
 return collision(hitboxes,getHurtboxes(f,timing));
}
export function polygonBounds(points:Point[]):Box{
  const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));
  return{x,y,width:Math.max(...points.map(p=>p.x))-x,height:Math.max(...points.map(p=>p.y))-y};
}
// Clip the actual polygon against the attack rectangle. An overlapping AABB
// alone is insufficient: empty corners and stance gaps must not take damage.
function clipContact(hit:Box,poly:HurtPolygon):{box:Box;area:number}|undefined{
  if(hit.angle){
    const r=-hit.angle*Math.PI/180,c=Math.cos(r),s=Math.sin(r),cx=hit.x+hit.width/2,cy=hit.y+hit.height/2;
    const rotate=(p:Point)=>({x:cx+(p.x-cx)*c-(p.y-cy)*s,y:cy+(p.x-cx)*s+(p.y-cy)*c});
    const contact=clipContact({...hit,angle:0},{...poly,points:poly.points.map(rotate)});
    if(!contact)return;
    const inverse=(p:Point)=>({x:cx+(p.x-cx)*c+(p.y-cy)*s,y:cy-(p.x-cx)*s+(p.y-cy)*c});
    return {area:contact.area,box:polygonBounds(hitboxCorners(contact.box).map(inverse))};
  }
  if(!overlap(hit,polygonBounds(poly.points)))return;
  let points=poly.points;
  for(const [axis,value,greater] of [
    ['x',hit.x,true],['x',hit.x+hit.width,false],
    ['y',hit.y,true],['y',hit.y+hit.height,false],
  ] as const){
    const out:Point[]=[];
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length];
      const insideA=greater?a[axis]>=value:a[axis]<=value;
      const insideB=greater?b[axis]>=value:b[axis]<=value;
      if(insideA)out.push(a);
      if(insideA!==insideB){
        const t=(value-a[axis])/(b[axis]-a[axis]);
        out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
      }
    }
    points=out;if(points.length<3)return;
  }
  const area=Math.abs(points.reduce((sum,a,i)=>{const b=points[(i+1)%points.length];return sum+a.x*b.y-b.x*a.y;},0))/2;
  if(area<1e-6)return;
  return {box:polygonBounds(points),area};
}
export function polygonContact(hit:Box,poly:HurtPolygon):Contact|undefined{
 const outer=clipContact(hit,poly);if(!outer)return;
 const holes=(poly.holes??[]).reduce((sum,h)=>sum+(clipContact(hit,{region:poly.region,points:h})?.area??0),0);
 return outer.area-holes>1e-6?{...outer.box,region:poly.region}:undefined;
}
export function getHitboxes(f: Fighter, timing?: Timing): Box[] {
  if(f.hp<=0)return [];
  if(f.collisionSkin==='an'&&f.ultiTime!==undefined){if(f.ultiTime<13/25||f.ultiTime>=4)return [];const edits=anUltiEdits(f.ultiTime)?.hit;if(edits)return edits.map(b=>({...b,x:f.face>0?f.x+b.x-640:f.x-(b.x-640)-b.width,y:b.y+f.y,angle:(b.angle??0)*f.face}));const box=anUltiBeamHitbox(f.ultiTime,f.x,f.y,f.face);return box?[box]:[];}
  if(f.collisionSkin==='yuki'&&f.ultiTime!==undefined){if(f.ultiTime>=4)return [];const edits=ultiEdits(f.ultiTime)?.hit;if(edits)return edits.map(b=>({...b,x:f.face>0?f.x+b.x-640:f.x-(b.x-640)-b.width,y:b.y+f.y,angle:(b.angle??0)*f.face}));const box=ultiBeamHitbox(f.ultiTime,f.x,f.y,f.face);return box?[box]:[];}
  if(f.collisionSkin&&f.superTime!==undefined){const strike=f.collisionSkin==='an'?anStrike(f.superTime):superStrike(f.superTime);return strike?[worldBox(f,strike.box)]:[];}
  if(f.collisionSkin==='yuki'&&f.action==='sword_attack')return ((hitEdits as HitEdits)[`yuki/sword_attack/${Math.min(61,Math.floor(f.time*62/.6))}`]??yukiSlashHitboxes(f.time)).map(b=>worldBox(f,b));
  if(f.collisionSkin==='an'&&f.action==='sword_attack')return ((hitEdits as HitEdits)[`an/sword_attack/${Math.min(61,Math.floor(f.time*62/.6))}`]??anSlashHitboxes(f.time)).map(b=>worldBox(f,b));
  if (!timing) return [];
  timing=attackTiming(f,timing);
  // Nine-frame anime kicks: frame4 starts at .12, frame7 ends at .304.
  // Keep animation timing independent from the edited contact window.
  const animeKick=!!f.collisionSkin&&f.action==='kick';
  const animePunch=!!f.collisionSkin&&f.action==='attack';
  const frameDuration=(timing.duration-timing.active)/6;
  const active=animePunch?timing.active+2*frameDuration:f.action==='kick'?.12:timing.active;
  const activeEnd=animePunch?timing.active+5*frameDuration:animeKick?.304:timing.activeEnd;
  if(f.time<active||f.time>=activeEnd)return [];
  const frame = f.collisionSkin&&f.action==='kick'?attackFrame(f.time,timing.active,timing.duration,9):poseFrame(f,timing);
  const boxes=(hitEdits as HitEdits)[`${f.collisionSkin??f.character}/${f.action}/${frame}`]??defaultHitboxes(f.action,frame);
  return boxes.map(b=>worldBox(f,b));
}
export function collision(hitboxes: Box[], hurtboxes: HurtPolygon[]): Contact | undefined {
  for (const hit of hitboxes) for (const hurt of hurtboxes) {
    const contact = polygonContact(hit, hurt);
    if (contact) return contact;
  }
}
