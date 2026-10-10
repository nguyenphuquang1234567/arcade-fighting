import {frameCounts} from './fighters';
import {editorFrameCount,type EditorCharacter} from './yuki-assets';
export type CapsuleEdit={x:number,y:number,width:number,angle?:number,part?:'body'|'head'};
export type CapsuleEdits=Record<string,CapsuleEdit[]>;
export function validateCapsules(data:unknown):string|undefined{
 if(!data||typeof data!=='object'||Array.isArray(data))return 'Dữ liệu capsule không hợp lệ';
 for(const [key,v] of Object.entries(data)){
  const [who,action,index,...rest]=key.split('/');
  if(rest.length||!['moon','ember','yuki'].includes(who)||!Object.hasOwn(frameCounts,action)||!/^\d+$/.test(index)||Number(index)>=editorFrameCount(who as EditorCharacter,action as keyof typeof frameCounts))return `Frame không hợp lệ: ${key}`;
  const capsules=Array.isArray(v)?v:[v];
  if(capsules.length>32)return `Tối đa 32 capsule: ${key}`;
  for(const capsule of capsules)if(!capsule||typeof capsule!=='object'||!Number.isFinite(capsule.x)||!Number.isFinite(capsule.y)||Math.abs(capsule.x)>1024||Math.abs(capsule.y)>1024||!Number.isFinite(capsule.width)||capsule.width<50||capsule.width>240||(capsule.part!==undefined&&!['body','head'].includes(capsule.part))||(capsule.angle!==undefined&&(!Number.isFinite(capsule.angle)||Math.abs(capsule.angle)>180)))return `Capsule không hợp lệ: ${key}`;
 }
}
