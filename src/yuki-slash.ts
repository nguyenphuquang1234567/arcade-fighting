import type {HitBox} from './hitbox-model';
export function yukiSlashFrame(t:number){return Math.min(61,Math.floor(Math.max(0,t)*62/.6))}
import blades from './yuki-slash-blades.json';
// Two short rotated boxes trace the actual blade curve; luminous trail is excluded.
export function yukiSlashHitboxes(t:number):HitBox[]{
 const frame=yukiSlashFrame(t)+1,row=blades.find(b=>b.frame===frame);if(!row)return [];
 return row.points.slice(0,-1).map((a,i)=>{const source=row.points[i+1],dx=source[0]-a[0],dy=source[1]-a[1],length=Math.hypot(dx,dy);const extension=i===row.points.length-2?20:0;const b=[source[0]+dx/length*extension,source[1]+dy/length*extension],width=Math.hypot(b[0]-a[0],b[1]-a[1])+2;return {x:(a[0]+b[0])/2-width/2,y:(a[1]+b[1])/2-10,width,height:20,angle:Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI}});
}
