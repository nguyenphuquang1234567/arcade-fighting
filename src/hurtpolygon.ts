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
export function loadPolygonOverrides(){if(typeof localStorage==='undefined')return;try{const data=JSON.parse(localStorage.getItem(POLYGON_STORAGE_KEY)??'{}');overrides=validateOverrides(data)?{}:data;}catch{overrides={};}}
loadPolygonOverrides();if(typeof window!=='undefined')window.addEventListener('storage',loadPolygonOverrides);
