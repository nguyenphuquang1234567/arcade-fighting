import edits from './super-hitbox-overrides.json';
// One-based animation frames; hit rectangles run from the limb root to the striking tip.
export const SUPER_FRAMES=100;
export const SUPER_DURATION=1.5;
type LimbKey=[number,number,number,number,number];
const punches:LimbKey[]=[
 [6,301,225,391,189],[7,305,222,439,173],[8,305,223,420,180],
 [10,308,223,399,194],[11,310,222,443,173],[13,310,222,416,188],
 [16,307,224,416,187],[17,310,221,445,178],[19,310,222,437,184],
 [22,307,224,401,195],[23,310,222,443,174],[25,310,225,426,199],
 [28,305,223,415,191],[29,307,222,439,183],[31,307,223,437,184],
 [34,308,223,406,191],[35,310,221,445,175],[37,310,223,444,188],
 [41,303,224,396,205],[43,306,221,437,182],[45,305,223,430,192],
 [48,307,222,427,188],[49,309,221,448,182],[51,306,222,420,191]
];
const kicks:LimbKey[]=[
 [64,320,325,440,120],[65,325,325,476,62],[69,326,325,501,44],
 [71,326,325,505,125],[73,326,325,510,202],[75,320,325,455,260]
];
export function superStrike(time:number){
 const frame=Math.min(100,Math.floor(Math.max(0,time)*SUPER_FRAMES/SUPER_DURATION)+1);
 const windows=[[6,8],[10,13],[16,19],[22,25],[28,31],[34,37],[41,45],[48,51],[64,75]];
 const stage=windows.findIndex(([a,b])=>frame>=a&&frame<=b);
 if(stage<0)return;
 const keys=stage===8?kicks:punches.filter(k=>k[0]>=windows[stage][0]&&k[0]<=windows[stage][1]);
 let a=keys[0],b=keys[keys.length-1];for(let i=0;i<keys.length-1;i++)if(frame>=keys[i][0]&&frame<=keys[i+1][0]){a=keys[i];b=keys[i+1];break;}
 const t=a[0]===b[0]?0:Math.max(0,Math.min(1,(frame-a[0])/(b[0]-a[0])));
 const x1=a[1]+(b[1]-a[1])*t,y1=a[2]+(b[2]-a[2])*t,x2=a[3]+(b[3]-a[3])*t,y2=a[4]+(b[4]-a[4])*t;
 const width=Math.hypot(x2-x1,y2-y1)+12,height=stage===8?44:34;
 return {stage,action:stage===8?'kick' as const:'attack' as const,box:(edits as Record<string,{x:number,y:number,width:number,height:number,angle?:number}>)[String(frame)]??{x:(x1+x2)/2-width/2,y:(y1+y2)/2-height/2,width,height,angle:Math.atan2(y2-y1,x2-x1)*180/Math.PI}};
}

export function validateSuperEdits(data:unknown):string|undefined{
 if(!data||typeof data!=='object'||Array.isArray(data))return 'Dữ liệu không hợp lệ';
 for(const [key,v] of Object.entries(data)){
  const b=v as {x:number,y:number,width:number,height:number,angle?:number};
  if(!/^\d+$/.test(key)||Number(key)<1||Number(key)>100||!b||![b.x,b.y,b.width,b.height].every(Number.isFinite)||b.width<=0||b.height<=0||b.width>750||b.height>512||Math.abs(b.x)>750||Math.abs(b.y)>750||(b.angle!==undefined&&(!Number.isFinite(b.angle)||Math.abs(b.angle)>180)))return 'Hitbox không hợp lệ: '+key;
 }
}
