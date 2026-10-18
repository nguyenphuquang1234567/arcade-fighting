// Alpha >=128: idle rear-foot center (183.5,491); ulti frame1 (225,412).
// Both use the same 372px head-to-ground height before the game's .6 scale.
export const ULTI_SCALE=.6*372/316;
export const ULTI_ORIGIN_X=225+(256-183.5)*.6/ULTI_SCALE;
export const ULTI_ORIGIN_Y=412+(512-491)*.6/ULTI_SCALE;
import beamProfile from './ulti-beam-profile.json';
export function ultiBeamHitbox(time:number,x:number,y:number,face:number){
 const row=beamProfile.find(r=>r.frame===Math.min(99,Math.floor(Math.max(0,time)*25)));if(!row||time>=4)return;
 const start=x+face*(row.x-ULTI_ORIGIN_X)*ULTI_SCALE;
 return {x:face>0?start:0,y:665+y+(row.top-ULTI_ORIGIN_Y)*ULTI_SCALE,width:Math.max(0,face>0?1280-start:start),height:(row.bottom-row.top+1)*ULTI_SCALE};
}
