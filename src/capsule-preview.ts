import {editorFrameCount,editorSprite,editorActions,poseIndex,poseCharacter,type EditorCharacter} from './yuki-assets';
import type {Action} from './combat';
import sourceEdits from './capsule-overrides.json';
import {validateCapsules,type CapsuleEdits} from './capsule-model';
import {hurtboxPoses} from './hurtbox-poses';
const who=document.querySelector<HTMLSelectElement>('#who')!,action=document.querySelector<HTMLSelectElement>('#action')!,frame=document.querySelector<HTMLInputElement>('#frame')!,width=document.querySelector<HTMLInputElement>('#width')!,canvas=document.querySelector<HTMLCanvasElement>('#canvas')!,ctx=canvas.getContext('2d')!;
const requestedCharacter=new URLSearchParams(location.search).get('character');
if(requestedCharacter&&Array.from(who.options).some(o=>o.value===requestedCharacter))who.value=requestedCharacter;
function refreshActions(){const current=action.value;action.replaceChildren(...editorActions(who.value as EditorCharacter).map(a=>new Option(a,a)));if(Array.from(action.options).some(o=>o.value===current))action.value=current}
refreshActions();
let sequence=0;
const storageKey='dojo-capsule-draft-v1';
const head=()=>({x:0,y:0,width:70,angle:0,part:'head' as const});
const upgrade=(list:any[])=>list.length&&list.every(v=>v.part===undefined)?[...list.map(v=>({...v,part:'body'})),head()]:list;
const normalize=(data:Record<string,unknown>):CapsuleEdits=>Object.fromEntries(Object.entries(data).map(([k,v])=>[k,upgrade(Array.isArray(v)?v:[v])])) as CapsuleEdits;
let edits:CapsuleEdits=normalize(structuredClone(sourceEdits));
try{const draft=JSON.parse(localStorage.getItem(storageKey)??'{}');if(!validateCapsules(draft))edits={...edits,...normalize(draft)}}catch{}
// Preserve existing browser edits while migrating run to ten independent frames.
const runMigrationKey=storageKey+'-run-ten-independent-v1';
if(!localStorage.getItem(runMigrationKey)){
 const previous=structuredClone(edits);
 localStorage.setItem(runMigrationKey+'-backup',JSON.stringify(previous));
 for(const character of ['moon','ember'])for(let i=0;i<10;i++){
  const value=previous[`${character}/run/${Math.floor(i*8/10)}`];
  if(value)edits[`${character}/run/${i}`]=structuredClone(value);
 }
 draftRun();localStorage.setItem(runMigrationKey,'done');
}
function draftRun(){localStorage.setItem(storageKey,JSON.stringify(edits))}
// Replace stale Ember drafts once when importing the Ronin arrangement.
const emberImportKey=storageKey+'-ember-from-ronin-v1';
if(!localStorage.getItem(emberImportKey)){
 localStorage.setItem(emberImportKey+'-backup',localStorage.getItem(storageKey)??'{}');
 for(const [key,value] of Object.entries(normalize(sourceEdits)))if(key.startsWith('ember/'))edits[key]=value;
 localStorage.setItem(storageKey,JSON.stringify(edits));localStorage.setItem(emberImportKey,'done');
}
// Import matching jump capsules once so stale drafts cannot overwrite the source update.
const jumpMatchKey=storageKey+'-an-yuki-jump-match-v1';
if(!localStorage.getItem(jumpMatchKey)){
 localStorage.setItem(jumpMatchKey+'-backup',localStorage.getItem(storageKey)??'{}');
 for(const character of ['an','yuki'])for(let i=0;i<2;i++){
  const key=`${character}/jump/${i}`;
  edits[key]=structuredClone((sourceEdits as CapsuleEdits)[key]);
 }
 draftRun();localStorage.setItem(jumpMatchKey,'done');
}
// Update only the shifted Yuki jump frame; preserve other editor drafts.
const jumpAlignKey=storageKey+'-yuki-jump-aligned-v1';
if(!localStorage.getItem(jumpAlignKey)){
 localStorage.setItem(jumpAlignKey+'-backup',localStorage.getItem(storageKey)??'{}');
 edits['yuki/jump/1']=structuredClone((sourceEdits as CapsuleEdits)['yuki/jump/1']);
 draftRun();localStorage.setItem(jumpAlignKey,'done');
}
const anJumpAlignKey=storageKey+'-an-jump-aligned-v1';
if(!localStorage.getItem(anJumpAlignKey)){
 localStorage.setItem(anJumpAlignKey+'-backup',localStorage.getItem(storageKey)??'{}');
 edits['an/jump/1']=structuredClone((sourceEdits as CapsuleEdits)['an/jump/1']);
 draftRun();localStorage.setItem(anJumpAlignKey,'done');
}
const fightersJumpAlignKey=storageKey+'-ronin-ember-jump-aligned-v1';
if(!localStorage.getItem(fightersJumpAlignKey)){
 localStorage.setItem(fightersJumpAlignKey+'-backup',localStorage.getItem(storageKey)??'{}');
 for(const who of ['moon','ember'])edits[`${who}/jump/1`]=structuredClone((sourceEdits as CapsuleEdits)[`${who}/jump/1`]);
 draftRun();localStorage.setItem(fightersJumpAlignKey,'done');
}
const anIdleAlignKey=storageKey+'-an-idle-aligned-v1';
if(!localStorage.getItem(anIdleAlignKey)){
 localStorage.setItem(anIdleAlignKey+'-backup',localStorage.getItem(storageKey)??'{}');
 edits['an/idle/1']=structuredClone((sourceEdits as CapsuleEdits)['an/idle/1']);
 draftRun();localStorage.setItem(anIdleAlignKey,'done');
}
const authoredFrame=()=>Number(frame.value)-1;
const selectedKey=()=>`${who.value}/${action.value}/${authoredFrame()}`;
let selected=0;
const capsules=()=>edits[selectedKey()]??[{x:0,y:0,width:130,part:'body'},head()];
const angle=document.querySelector<HTMLInputElement>('#angle')!;
const picker=document.querySelector<HTMLSelectElement>('#capsule')!;
const controls=()=>{const list=capsules();selected=Math.max(0,Math.min(selected,list.length-1));picker.replaceChildren(...list.map((v,i)=>new Option(`${v.part==='head'?'Đầu':'Thân'} · Capsule ${i+1}`,String(i))));picker.value=String(selected);width.disabled=!list.length;angle.disabled=!list.length;if(list[selected]){width.value=String(list[selected].width);angle.value=String(list[selected].angle??0)}document.querySelector('#angle-value')!.textContent=angle.value+'°';document.querySelector<HTMLButtonElement>('#delete-capsule')!.disabled=!list.length};
picker.onchange=()=>{selected=Number(picker.value);void draw()};
document.querySelector<HTMLButtonElement>('#add-capsule')!.onclick=()=>{const list=structuredClone(capsules());if(list.length>=32)return;list.push({x:20,y:0,width:100,part:'body'});edits[selectedKey()]=list;selected=list.length-1;draft();void draw()};
document.querySelector<HTMLButtonElement>('#delete-capsule')!.onclick=()=>{const list=structuredClone(capsules());list.splice(selected,1);edits[selectedKey()]=list;draft();void draw()};
const draft=()=>localStorage.setItem(storageKey,JSON.stringify(edits));
const save=document.querySelector<HTMLButtonElement>('#save-source')!;
save.disabled=!import.meta.env.DEV;
save.onclick=async()=>{
 const error=validateCapsules(edits);if(error){document.querySelector('#save-status')!.textContent=error;return}
 draft();save.disabled=true;
 try{const response=await fetch('/__dojo/capsules',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({overrides:edits})});const result=await response.json();if(!response.ok)throw Error(result.error);document.querySelector('#save-status')!.textContent=`Đã lưu ${result.frames} frame vào src/capsule-overrides.json.`;}catch(e){document.querySelector('#save-status')!.textContent=String(e)}finally{save.disabled=false}
};
let visible:{key:string,x1:number,y1:number,x2:number,y2:number,r:number,index:number}[]=[];
let dragging:{id:number,index:number,key:string,startX:number,startY:number,x:number,y:number}|undefined;
const position=(e:PointerEvent)=>{const rect=canvas.getBoundingClientRect();return{x:(e.clientX-rect.left)*512/rect.width,y:(e.clientY-rect.top)*512/rect.height}};
canvas.style.touchAction='none';
canvas.onpointerdown=e=>{
 const q=position(e);
 const v=[...visible].reverse().find(v=>{const dx=v.x2-v.x1,dy=v.y2-v.y1,len=dx*dx+dy*dy;const t=len?Math.max(0,Math.min(1,((q.x-v.x1)*dx+(q.y-v.y1)*dy)/len)):0;return Math.hypot(q.x-v.x1-t*dx,q.y-v.y1-t*dy)<=v.r});
 if(!v)return;selected=v.index;controls();
 const offset=capsules()[v.index];
 dragging={id:e.pointerId,index:v.index,key:v.key,startX:q.x,startY:q.y,...offset};canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';
};
canvas.onpointermove=e=>{
 if(!dragging)return;
 const q=position(e),d=dragging;
 const list=structuredClone(edits[d.key]??capsules());list[d.index]={...list[d.index],x:d.x+q.x-d.startX,y:d.y+q.y-d.startY};edits[d.key]=list;draft();void draw();
};
const finish=(e:PointerEvent)=>{if(dragging?.id!==e.pointerId)return;dragging=undefined;canvas.style.cursor='grab';if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId)};
canvas.onpointerup=finish;canvas.onpointercancel=finish;canvas.style.cursor='grab';

async function draw(){
 const token=++sequence,a=action.value as Action,c=who.value as EditorCharacter;frame.max=String(editorFrameCount(c,a));frame.value=String(Math.max(1,Math.min(editorFrameCount(c,a),Number(frame.value))));const i=Number(frame.value)-1;controls();
 const image=new Image();image.src=`/characters/${c}/${editorSprite(c,a,i)}`;await image.decode();if(token!==sequence)return;
 const wideDeath=who.value==='yuki'&&action.value==='death';const columns=wideDeath?4:image.width/512;const cellWidth=wideDeath?896:512;ctx.clearRect(0,0,512,512);ctx.drawImage(image,((c==='an'&&a==='death'?i%8:i)%columns)*cellWidth+(who.value==='yuki'&&wideDeath?192:0),Math.floor((c==='an'&&a==='death'?i%8:i)/columns)*512,512,512,0,0,512,512);
 const p=hurtboxPoses[poseCharacter(c)][a][poseIndex(c,a,authoredFrame())].map(v=>v*3.2);visible=[];
 for(const [index,offset] of capsules().entries()){const r=offset.width/2;
 // One rounded capsule remains near the torso, rather than following an extended kicking foot.
 let x1=p[2],y1=p[1]+65,x2=p[2],y2=Math.max(p[7],p[11])-r;
 if(a==='ground_slide'&&i===0){x1=p[0]+40;y1=p[3];x2=Math.max(p[6],p[10])-r;y2=p[3];}
 if(y2<y1&&a!=='ground_slide')y2=y1;
 if(offset.part==='head'){x1=x2=p[0];y1=p[1]-8;y2=p[1]+8;}
 const key=selectedKey();
 x1+=offset.x;x2+=offset.x;y1+=offset.y;y2+=offset.y;
 const radians=(offset.angle??0)*Math.PI/180,cx=(x1+x2)/2,cy=(y1+y2)/2;
 const rotate=(x:number,y:number)=>({x:cx+(x-cx)*Math.cos(radians)-(y-cy)*Math.sin(radians),y:cy+(x-cx)*Math.sin(radians)+(y-cy)*Math.cos(radians)});
 const start=rotate(x1,y1),end=rotate(x2,y2);x1=start.x;y1=start.y;x2=end.x;y2=end.y;
 visible.push({key,x1,y1,x2,y2,r,index});
 ctx.lineCap='round';ctx.strokeStyle=offset.part==='head'?'#ffdb5b55':'#53e5ae55';ctx.lineWidth=r*2;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
 // Outline the exact same capsule using parallel sides and semicircular caps.
 const theta=Math.atan2(y2-y1,x2-x1),nx=Math.cos(theta+Math.PI/2)*r,ny=Math.sin(theta+Math.PI/2)*r;
 ctx.lineWidth=index===selected?3:1;ctx.strokeStyle=index===selected?'#ffffff':offset.part==='head'?'#ffdb5b':'#63efbb';ctx.beginPath();ctx.moveTo(x1+nx,y1+ny);ctx.lineTo(x2+nx,y2+ny);ctx.arc(x2,y2,r,theta+Math.PI/2,theta-Math.PI/2,true);ctx.lineTo(x1-nx,y1-ny);ctx.arc(x1,y1,r,theta-Math.PI/2,theta+Math.PI/2,true);ctx.closePath();ctx.stroke();
 }

 document.querySelector('#info')!.textContent=`${c} / ${a} / frame ${i+1} · ${capsules().length} capsule. Game dùng capsule đã lưu mã nguồn.`;
}
angle.oninput=()=>{const key=selectedKey(),list=structuredClone(capsules());if(!list[selected])return;list[selected].angle=Number(angle.value);edits[key]=list;draft();void draw()};
who.onchange=()=>{refreshActions();void draw()};action.onchange=()=>{frame.value='1';void draw()};frame.oninput=()=>void draw();width.oninput=()=>{const key=selectedKey(),list=structuredClone(capsules());if(!list[selected])return;list[selected].width=Number(width.value);edits[key]=list;draft();void draw()};void draw();
