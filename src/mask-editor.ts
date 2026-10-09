import {masks,maskKey,type MaskRun} from './hurtmask';
import {frameCounts,spriteFile} from './fighters';
import type {Action} from './combat';
const el=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const character=el<HTMLSelectElement>('character'),action=el<HTMLSelectElement>('action'),frame=el<HTMLInputElement>('frame');
const canvas=el<HTMLCanvasElement>('canvas'),ctx=canvas.getContext('2d')!,overlay=el<HTMLInputElement>('overlay');
let labels=new Uint8Array(512*512),alpha=new Uint8Array(512*512),sprite=new ImageData(512,512),label=2,drawing=false,history:Uint8Array[]=[];
let loadedKey='',sequence=0;
const colors=[[0,0,0],[255,209,102],[86,229,198],[119,170,255]];
let saved:Record<string,MaskRun[]>={};try{saved=JSON.parse(localStorage.getItem('dojo-hurtmask-overrides')??'{}')}catch{}
for(const a of Object.keys(frameCounts))action.add(new Option(a,a));
const selection=()=>({who:character.value as 'moon'|'ember',act:action.value as Action,index:Number(frame.value)-1});
function render(){ctx.putImageData(sprite,0,0);if(!overlay.checked)return;const img=new ImageData(512,512);for(let i=0;i<labels.length;i++){const region=labels[i];if(!region)continue;const c=colors[region];img.data.set([...c,Math.min(alpha[i],150)],i*4);}const layer=document.createElement('canvas');layer.width=layer.height=512;layer.getContext('2d')!.putImageData(img,0,0);ctx.drawImage(layer,0,0);}
function runs(){const out:MaskRun[]=[];for(let y=0;y<512;y++){let x=0;while(x<512){const r=labels[y*512+x];if(!r){x++;continue}const start=x++;while(x<512&&labels[y*512+x]===r)x++;out.push([y,start,x,r]);}}return out;}
function checkpoint(){history.push(labels.slice());if(history.length>30)history.shift();}
function retain(){if(loadedKey)saved[loadedKey]=runs();}
async function load(){retain();const token=++sequence;const {who,act,index}=selection();const total=frameCounts[act];frame.value=String(Math.max(1,Math.min(total,index+1)));frame.max=String(total);el('total').textContent=`/ ${total}`;const f=Number(frame.value)-1;const name=spriteFile(who,act);const im=new Image();im.src=`/characters/${who}/${name}`;await im.decode();if(token!==sequence)return;ctx.clearRect(0,0,512,512);ctx.drawImage(im,f*512,0,512,512,0,0,512,512);sprite=ctx.getImageData(0,0,512,512);alpha=Uint8Array.from({length:512*512},(_,i)=>sprite.data[i*4+3]);labels=new Uint8Array(512*512);loadedKey=maskKey(who,act,f);for(const [y,x,end,r] of saved[loadedKey]??masks[who][act][f])labels.fill(r,y*512+x,y*512+end);for(let i=0;i<labels.length;i++)if(!alpha[i])labels[i]=0;history=[];render();el('status').textContent=loadedKey;}
function paint(e:PointerEvent){const b=canvas.getBoundingClientRect(),x=(e.clientX-b.left)*512/b.width,y=(e.clientY-b.top)*512/b.height,r=Math.max(1,Math.min(100,Number(el<HTMLInputElement>('brush').value)||1));for(let yy=Math.max(0,Math.floor(y-r));yy<Math.min(512,y+r);yy++)for(let xx=Math.max(0,Math.floor(x-r));xx<Math.min(512,x+r);xx++)if((xx-x)**2+(yy-y)**2<=r*r&&alpha[yy*512+xx])labels[yy*512+xx]=label;render();}
canvas.onpointerdown=e=>{checkpoint();drawing=true;canvas.setPointerCapture(e.pointerId);paint(e)};canvas.onpointermove=e=>{if(drawing)paint(e)};canvas.onpointerup=()=>drawing=false;canvas.onpointercancel=()=>drawing=false;
for(const button of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-label]')))button.onclick=()=>{label=Number(button.dataset.label);document.querySelectorAll('[data-label]').forEach(b=>b.classList.toggle('selected',b===button));};
character.onchange=()=>void load();action.onchange=()=>{frame.value='1';void load()};frame.onchange=()=>void load();
el('previous').onclick=()=>{frame.value=String(Math.max(1,Number(frame.value)-1));void load()};el('next').onclick=()=>{frame.value=String(Math.min(frameCounts[selection().act],Number(frame.value)+1));void load()};overlay.onchange=render;
el('undo').onclick=()=>{const old=history.pop();if(old){labels=old.slice() as Uint8Array<ArrayBuffer>;render()}};
el('reset').onclick=()=>{checkpoint();labels.fill(0);const {who,act,index}=selection();for(const [y,x,end,r] of masks[who][act][index])labels.fill(r,y*512+x,y*512+end);render()};
el('save').onclick=()=>{retain();localStorage.setItem('dojo-hurtmask-overrides',JSON.stringify(saved));el('status').textContent='Đã lưu. Game ở tab khác cập nhật ngay; refresh nếu cần.'};
el('export').onclick=()=>{retain();const url=URL.createObjectURL(new Blob([JSON.stringify(saved)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='dojo-hurtmask-overrides.json';a.click();URL.revokeObjectURL(url)};
el<HTMLInputElement>('import').onchange=async e=>{try{const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;const data=JSON.parse(await file.text());for(const [key,value] of Object.entries(data)){const [who,storedAction,f]=key.split('/');const act=who==='ember'&&storedAction==='idle-ronin'?'idle':storedAction;if(!['moon','ember'].includes(who)||!(act in frameCounts)||!Number.isInteger(Number(f))||Number(f)<0||Number(f)>=frameCounts[act as Action]||!Array.isArray(value)||!value.every(r=>Array.isArray(r)&&r.length===4&&r.every(Number.isInteger)&&r[0]>=0&&r[0]<512&&r[1]>=0&&r[1]<r[2]&&r[2]<=512&&r[3]>0&&r[3]<4))throw new Error('Mask JSON không hợp lệ');}saved={...saved,...data};loadedKey='';await load();el('status').textContent='Đã nhập. Bấm Lưu vào game để áp dụng.';}catch(e){el('status').textContent=String(e)}};
void load();
