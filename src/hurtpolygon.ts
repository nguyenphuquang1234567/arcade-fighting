import raw from './hurtpolygons.json';
import sourceEdits from './polygon-overrides.json';
import type {Action,Fighter} from './combat';
import {polygonKey,POLYGON_STORAGE_KEY,validateOverrides,type PolygonFrame,type PolygonOverrides} from './polygon-model';
export const polygonSeeds=raw as Record<'moon'|'ember',Record<Action,PolygonFrame[]>>;
export const sourcePolygons=sourceEdits as PolygonOverrides;
let overrides:PolygonOverrides={};
export function installPolygons(key:string,frame:PolygonFrame){overrides[key]=frame;}
export function polygonsFor(f:Pick<Fighter,'character'|'action'>,frame:number):PolygonFrame{
 const key=polygonKey(f.character,f.action,frame);return overrides[key]??sourcePolygons[key]??polygonSeeds[f.character][f.action][frame];
}
// Apply the authored Ronin propagation once; later manual browser edits keep priority.
export function migrateRoninReferences(){
 if(typeof localStorage==='undefined')return;
 const marker=POLYGON_STORAGE_KEY+'-ronin-reference-fit-v1';
 if(localStorage.getItem(marker))return;
 const original=localStorage.getItem(POLYGON_STORAGE_KEY);
 const data=JSON.parse(original??'{}');
 if(validateOverrides(data))return;
 if(original)localStorage.setItem(marker+'-backup',original);
 for(const [key,frame] of Object.entries(sourcePolygons)){
  if(key.startsWith('moon/')&&Number(key.split('/').at(-1))>0)data[key]=frame;
 }
 localStorage.setItem(POLYGON_STORAGE_KEY,JSON.stringify(data));
 localStorage.setItem(marker,'done');
}
export function migrateEmberReferences(){
 if(typeof localStorage==='undefined')return;
 const marker=POLYGON_STORAGE_KEY+'-ember-reference-fit-v1';
 if(localStorage.getItem(marker))return;
 const original=localStorage.getItem(POLYGON_STORAGE_KEY);
 const data=JSON.parse(original??'{}');
 if(validateOverrides(data))return;
 if(original)localStorage.setItem(marker+'-backup',original);
 for(const [key,frame] of Object.entries(sourcePolygons)){
  if(key.startsWith('ember/'))data[key]=frame;
 }
 localStorage.setItem(POLYGON_STORAGE_KEY,JSON.stringify(data));
 localStorage.setItem(marker,'done');
}
export function loadPolygonOverrides(){if(typeof localStorage==='undefined')return;try{migrateRoninReferences();migrateEmberReferences();const data=JSON.parse(localStorage.getItem(POLYGON_STORAGE_KEY)??'{}');overrides=validateOverrides(data)?{}:data;}catch{overrides={};}}
loadPolygonOverrides();if(typeof window!=='undefined')window.addEventListener('storage',loadPolygonOverrides);
