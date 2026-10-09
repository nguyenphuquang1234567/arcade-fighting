import type {Point,PolygonFrame} from './polygon-model';
import {signedArea,pointInside,ringError} from './polygon-model';
function simplify(p:Point[],tolerance=2):Point[]{
 const rdp=(p:Point[]):Point[]=>{if(p.length<3)return p;const a=p[0],b=p[p.length-1],dx=b.x-a.x,dy=b.y-a.y;let distance=-1,index=0;for(let i=1;i<p.length-1;i++){const t=Math.max(0,Math.min(1,((p[i].x-a.x)*dx+(p[i].y-a.y)*dy)/(dx*dx+dy*dy||1)));const d=Math.hypot(p[i].x-a.x-t*dx,p[i].y-a.y-t*dy);if(d>distance){distance=d;index=i}}return distance>tolerance?[...rdp(p.slice(0,index+1)).slice(0,-1),...rdp(p.slice(index))]:[a,b];};
 let split=1;for(let i=2;i<p.length;i++)if(Math.hypot(p[i].x-p[0].x,p[i].y-p[0].y)>Math.hypot(p[split].x-p[0].x,p[split].y-p[0].y))split=i;
 const result=[...rdp(p.slice(0,split+1)).slice(0,-1),...rdp([...p.slice(split),p[0]]).slice(0,-1)];return !ringError(result)?result:tolerance>.1?simplify(p,tolerance/2):p;
}
export function maskToPolygons(runs:unknown):PolygonFrame{
 if(!Array.isArray(runs)||runs.length>262144||runs.some(r=>!Array.isArray(r)||r.length!==4||!r.every(Number.isInteger)||r[0]<0||r[0]>=512||r[1]<0||r[1]>=r[2]||r[2]>512||r[3]<1||r[3]>3))throw Error('Mask JSON không hợp lệ');
 const result:PolygonFrame=[];
 for(const [region,name] of [[1,'head'],[2,'body'],[3,'legs']] as const){
  const pixels=new Set<number>();for(const [y,x,end,r] of runs)if(r===region)for(let xx=x;xx<end;xx++)pixels.add(y*512+xx);
  const edges=new Map<number,number[]>(),vertex=(x:number,y:number)=>y*513+x;
  const add=(a:number,b:number)=>edges.set(a,[...(edges.get(a)??[]),b]);
  for(const pixel of pixels){const x=pixel%512,y=Math.floor(pixel/512);if(y===0||!pixels.has(pixel-512))add(vertex(x,y),vertex(x+1,y));if(x===511||!pixels.has(pixel+1))add(vertex(x+1,y),vertex(x+1,y+1));if(y===511||!pixels.has(pixel+512))add(vertex(x+1,y+1),vertex(x,y+1));if(x===0||!pixels.has(pixel-1))add(vertex(x,y+1),vertex(x,y));}
  const loops:Point[][]=[];
  while(edges.size){const start=edges.keys().next().value!;let current=start,previous=start-1;const points:Point[]=[{x:start%513,y:Math.floor(start/513)}];let safety=0;while(safety++<1100000){const choices=edges.get(current);if(!choices)break;const dx=current%513-previous%513,dy=Math.floor(current/513)-Math.floor(previous/513);const turn=(v:number)=>{const bx=v%513-current%513,by=Math.floor(v/513)-Math.floor(current/513);const cross=dx*by-dy*bx,dot=dx*bx+dy*by;return cross>0?0:dot>0?1:cross<0?2:3;};choices.sort((a,b)=>turn(a)-turn(b));const next=choices.shift()!;if(!choices.length)edges.delete(current);previous=current;current=next;if(current===start){if(Math.abs(signedArea(points))>=30)loops.push(points);break}points.push({x:current%513,y:Math.floor(current/513)});}}
  const outer=loops.filter(p=>signedArea(p)>0),holes=loops.filter(p=>signedArea(p)<0);for(const p of outer){const rawHoles=holes.filter(q=>pointInside(q[0],p));const h=rawHoles.map(q=>simplify(q,.1));result.push({region:name,points:simplify(p,h.length?.1:2),...(h.length?{holes:h}:{})});}
 }
 return result;
}
