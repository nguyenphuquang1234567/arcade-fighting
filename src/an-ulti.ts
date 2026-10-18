// Alpha >=128: An idle rear-foot (181,491), ulti frame1 (144.5,412).
// Both use the same 372px head-to-ground height before the game's .6 scale.
export const AN_ULTI_SCALE=0.710828025477707;
export const AN_ULTI_ORIGIN_X=269.30645161290323;
export const AN_ULTI_ORIGIN_Y=431.7258064516129;
import beamProfile from './an-ulti-beam-profile.json';
import {ultiBeamHitbox} from './yuki-ulti';
export function anUltiBeamHitbox(time:number,x:number,y:number,face:number){
 const row=beamProfile.find(r=>r.frame===Math.min(99,Math.floor(Math.max(0,time)*25)));if(!row||time<13/25||time>=4)return;
 const start=x+face*(row.x-AN_ULTI_ORIGIN_X)*AN_ULTI_SCALE;
 const originalHeight=(row.bottom-row.top+1)*AN_ULTI_SCALE;
 // Match Yuki's height for the same animation frame without shrinking An's beam.
 const height=Math.max(originalHeight,ultiBeamHitbox(time,x,y,face)?.height??originalHeight);
 const centerY=665+y+((row.top+row.bottom+1)/2-AN_ULTI_ORIGIN_Y)*AN_ULTI_SCALE;
 return {x:face>0?start:0,y:centerY-height/2,width:Math.max(0,face>0?1280-start:start),height};
}
