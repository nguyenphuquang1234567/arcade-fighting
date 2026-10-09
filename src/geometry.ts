import type { Action, Fighter } from './combat';
import { attackFrame, frameCounts } from './fighters';
import { capsulesFor } from './hurtcapsule';
import type {Point,BodyRegion,HurtPolygon} from './polygon-model';
export type {Point,BodyRegion,HurtPolygon} from './polygon-model';

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
export type Contact = Box & { region: BodyRegion };
export const POSE_FPS: Partial<Record<Action, number>> = {idle:3,run:10,walk:5};
export function poseFrame(f: Fighter, timing?: Timing): number {
  if (timing) {
    if (f.action === 'ground_slide') return f.time < timing.activeEnd ? 0 : 1;
    return attackFrame(f.time, timing.active, timing.duration, frameCounts[f.action]);
  }
  const count=frameCounts[f.action];
  const frame=Math.floor(Math.max(0,f.time)*(POSE_FPS[f.action]??6));
  return ['idle','walk','run'].includes(f.action)?frame%count:Math.min(count-1,frame);
}
export function worldPoint(f: Fighter, p: Point): Point {
  return {x:f.x+f.face*(p.x-256)*SPRITE_SCALE,y:SPRITE_BASELINE+f.y+(p.y-512)*SPRITE_SCALE};
}
export function getHurtboxes(f:Fighter,timing?:Timing):HurtPolygon[]{
 if(f.hp<=0||f.action==='death')return [];
 return capsulesFor(f.character,f.action,poseFrame(f,timing)).map(p=>({...p,points:p.points.map(pt=>worldPoint(f,pt)),holes:p.holes?.map(h=>h.map(pt=>worldPoint(f,pt)))}));
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
export function collision(hitboxes: Box[], hurtboxes: HurtPolygon[]): Contact | undefined {
  for (const hit of hitboxes) for (const hurt of hurtboxes) {
    const contact = polygonContact(hit, hurt);
    if (contact) return contact;
  }
}
