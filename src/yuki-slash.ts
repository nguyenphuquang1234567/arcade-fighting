import type {HitBox} from './hitbox-model';
import blades from './yuki-slash-blades.json';
export function yukiSlashFrame(t:number){return Math.min(61,Math.floor(Math.max(0,t)*62/.6))}
// One continuous rotated rectangle from the blade base to its tip.
export function yukiSlashHitboxes(t:number):HitBox[]{
 const frame=yukiSlashFrame(t)+1,row=blades.find(b=>b.frame===frame);if(!row)return [];
 const a=row.points[0],b=row.points[row.points.length-1],dx=b[0]-a[0],dy=b[1]-a[1],width=Math.hypot(dx,dy)+2;
 return [{x:(a[0]+b[0])/2-width/2,y:(a[1]+b[1])/2-10,width,height:20,angle:Math.atan2(dy,dx)*180/Math.PI}];
}
