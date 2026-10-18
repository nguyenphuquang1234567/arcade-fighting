import {capsulesFor} from './hurtcapsule';
import saved from './ulti-box-overrides.json';
export type UltiBox={x:number,y:number,width:number,height:number,angle?:number};
export type UltiFrameBoxes={hit?:UltiBox[],hurt?:UltiBox[]};
export const ultiBoxEdits=saved as Record<string,UltiFrameBoxes>;
export function ultiEdits(t:number){return ultiBoxEdits[Math.min(99,Math.floor(Math.max(0,t)*25))]}
export function validateUltiBoxes(data:unknown){
 if(!data||typeof data!=='object'||Array.isArray(data))return 'Dữ liệu không hợp lệ';
 for(const [frame,value] of Object.entries(data)){if(!/^\d+$/.test(frame)||+frame>99||!value||typeof value!=='object')return 'Frame không hợp lệ';for(const [kind,boxes] of Object.entries(value)){if(!['hit','hurt'].includes(kind)||!Array.isArray(boxes)||boxes.length>16)return 'Khung không hợp lệ';for(const b of boxes)if(!b||![b.x,b.y,b.width,b.height].every(Number.isFinite)||Math.abs(b.x)>2560||Math.abs(b.y)>1440||b.width<=0||b.width>2560||b.height<=0||b.height>1440||(b.angle!==undefined&&(!Number.isFinite(b.angle)||Math.abs(b.angle)>180)))return 'Kích thước khung không hợp lệ';}}
}

export function ultiHurtPoints(b:UltiBox,index:number){
 const base=capsulesFor('yuki','idle',0)[index];if(!base)return [];
 const points=base.points.map(p=>({x:640+(p.x-256)*.6,y:665+(p.y-512)*.6}));
 const xs=points.map(p=>p.x),ys=points.map(p=>p.y),left=Math.min(...xs),top=Math.min(...ys),w=Math.max(...xs)-left,h=Math.max(...ys)-top;
 const angle=(b.angle??0)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),cx=b.x+b.width/2,cy=b.y+b.height/2;
 return points.map(p=>{const x=(p.x-left)/w*b.width-b.width/2,y=(p.y-top)/h*b.height-b.height/2;return {x:cx+x*c-y*s,y:cy+x*s+y*c}});
}
