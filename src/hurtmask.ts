import raw from './hurtmasks.json';
import type {Action,Fighter} from './combat';
export type MaskRun=readonly [y:number,x:number,end:number,region:number];
export type MaskFrame=readonly MaskRun[];
export type MaskData=Record<'moon'|'ember',Record<Action,MaskFrame[]>>;
export const masks=raw as unknown as MaskData;
export const regionNames=['','head','body','legs'] as const;
const overrides=new Map<string,MaskFrame>();
export const maskKey=(character:string,action:string,frame:number)=>`${character}/${character==='ember'&&action==='idle'?'idle-ronin':action}/${frame}`;
export function installMask(key:string,runs:MaskFrame){overrides.set(key,runs);}
export function maskFor(f:Fighter,frame:number):MaskFrame{
 return overrides.get(maskKey(f.character,f.action,frame))??masks[f.character][f.action][frame];
}
export function loadMaskOverrides(){
 if(typeof localStorage==='undefined')return;
 try{const saved=JSON.parse(localStorage.getItem('dojo-hurtmask-overrides')??'{}');overrides.clear();for(const [key,runs] of Object.entries(saved))if(Array.isArray(runs)&&runs.every(r=>Array.isArray(r)&&r.length===4&&r.every(Number.isInteger)&&r[0]>=0&&r[0]<512&&r[1]>=0&&r[2]<=512&&r[1]<r[2]&&r[3]>=1&&r[3]<=3))installMask(key,runs as unknown as MaskFrame);}catch{/* Ignore invalid local edits; use shipped masks. */}
}
loadMaskOverrides();
if(typeof window!=='undefined')window.addEventListener('storage',loadMaskOverrides);
