import {frameCounts} from './fighters';
export type Point={x:number;y:number};
export type BodyRegion='head'|'body'|'legs';
export type HurtPolygon={region:BodyRegion;points:Point[];holes?:Point[][]};
export type PolygonFrame=HurtPolygon[];
export type PolygonOverrides=Record<string,PolygonFrame>;
export const POLYGON_STORAGE_KEY='dojo-polygon-overrides-v1';
export const polygonKey=(who:string,action:string,frame:number)=>`${who}/${who==='ember'&&action==='idle'?'idle-ronin':action}/${frame}`;
export const signedArea=(p:Point[])=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a.x*b.y-b.x*a.y},0)/2;
export function pointInside(p:Point,ring:Point[]){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside}return inside;}
export function pointOnRing(p:Point,ring:Point[]){return ring.some((a,i)=>{const b=ring[(i+1)%ring.length],dx=b.x-a.x,dy=b.y-a.y;return Math.abs(dx*(p.y-a.y)-dy*(p.x-a.x))<1e-6&&p.x>=Math.min(a.x,b.x)&&p.x<=Math.max(a.x,b.x)&&p.y>=Math.min(a.y,b.y)&&p.y<=Math.max(a.y,b.y)});}
export function ringError(points:Point[]):string|undefined{
 if(!Array.isArray(points)||points.length<3||points.length>512)return 'Mỗi đường bao cần 3–512 đỉnh';
 if(points.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>512||p.y<0||p.y>512))return 'Đỉnh phải nằm trong frame 512×512';
 if(Math.abs(signedArea(points))<.1)return 'Đa giác không có diện tích';
 const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];if(Math.hypot(a.x-b.x,a.y-b.y)<.01)return 'Hai đỉnh trùng nhau';
  for(let j=i+2;j<points.length;j++){if(i===0&&j===points.length-1)continue;const c=points[j],d=points[(j+1)%points.length];const ab1=cross(a,b,c),ab2=cross(a,b,d),cd1=cross(c,d,a),cd2=cross(c,d,b);if(ab1*ab2<0&&cd1*cd2<0)return 'Các cạnh đang cắt nhau';}
 }
}
export function validateFrame(frame:unknown):string|undefined{
 if(!Array.isArray(frame)||frame.length>128)return 'Frame phải là danh sách tối đa 128 đa giác';
 for(const p of frame){if(!p||!['head','body','legs'].includes(p.region))return 'Vùng phải là đầu, thân hoặc chân';const e=ringError(p.points);if(e)return e;if(p.holes!==undefined){if(!Array.isArray(p.holes)||p.holes.length>32)return 'Danh sách lỗ không hợp lệ';for(const hole of p.holes){const e=ringError(hole);if(e)return e;if(hole.some((v:Point)=>!pointInside(v,p.points)&&!pointOnRing(v,p.points)))return 'Lỗ phải nằm trong đường bao';}}}
}
export function validateOverrides(data:unknown):string|undefined{
 if(!data||typeof data!=='object'||Array.isArray(data))return 'JSON phải là dữ liệu polygon theo frame';
 for(const [key,frame] of Object.entries(data)){const [who,stored,f,...extra]=key.split('/');const action=who==='ember'&&stored==='idle-ronin'?'idle':stored;if(extra.length||!['moon','ember'].includes(who)||!(action in frameCounts)||!/^\d+$/.test(f)||Number(f)>=frameCounts[action as keyof typeof frameCounts])return `Frame không hợp lệ: ${key}`;const e=validateFrame(frame);if(e)return `${key}: ${e}`;}
}
