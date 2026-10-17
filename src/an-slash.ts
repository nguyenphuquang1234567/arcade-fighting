import type {HurtPolygon,Point} from './collision-types';
export const AN_SLASH_DURATION=.6;
export function anSlashFrame(time:number){return Math.min(61,Math.floor(Math.max(0,time)*62/AN_SLASH_DURATION))}
// Authored in idle coordinates: the 768px render cell has an extra 128px on each side.
const poses=[
 [1,281,157,269,230,271,322,236,377,183,481,327,374,347,477],
 [18,271,153,251,226,260,323,230,378,181,481,327,375,365,478],
 [24,265,154,244,225,252,323,222,379,181,481,315,378,365,478],
 [28,292,163,276,225,282,325,241,380,184,481,337,376,346,480],
 [32,296,158,278,224,284,325,245,380,183,481,337,377,346,480],
 [48,294,158,278,224,284,325,244,380,183,481,337,377,346,480],
 [54,283,158,273,228,280,325,244,380,183,481,331,375,346,480],
 [62,281,157,269,230,271,322,236,377,183,481,327,374,347,477],
];
function pose(frame:number){let a=poses[0],b=poses[poses.length-1];for(let i=0;i<poses.length-1;i++)if(frame>=poses[i][0]&&frame<=poses[i+1][0]){a=poses[i];b=poses[i+1];break}const t=Math.max(0,Math.min(1,(frame-a[0])/(b[0]-a[0])));return a.map((v,i)=>v+(b[i]-v)*t)}
function capsule(x1:number,y1:number,x2:number,y2:number,r:number,region:'head'|'body'):HurtPolygon{const angle=Math.atan2(y2-y1,x2-x1),points:Point[]=[];for(const [x,y,start] of [[x1,y1,angle+Math.PI/2],[x2,y2,angle-Math.PI/2]])for(let i=0;i<=16;i++){const a=start+i*Math.PI/16;points.push({x:x+r*Math.cos(a),y:y+r*Math.sin(a)})}return {region,points}}
export function anSlashHurtboxes(time:number){const p=pose(anSlashFrame(time)+1);return [capsule(p[1],p[2]-7,p[1],p[2]+9,26,'head'),capsule(p[3],p[4],p[5],p[6],38,'body'),capsule(p[5]-18,p[6],p[7],p[8],20,'body'),capsule(p[7],p[8],p[9],p[10],18,'body'),capsule(p[5]+18,p[6],p[11],p[12],21,'body'),capsule(p[11],p[12],p[13],p[14],18,'body')]}
const blade=[ [26,170,205,205,65],[27,230,218,430,255],[28,417,225,565,260],[29,423,219,585,242],[30,422,216,592,232],[31,424,215,594,227],[32,423,216,594,227],[33, 423, 207, 585, 228],[34, 423, 206, 585, 226],[35, 423, 205, 585, 224],[36, 423, 204, 585, 224],[37, 423, 204, 585, 224],[38, 423, 204, 585, 224],[39, 423, 204, 584, 223],[40, 423, 205, 584, 224],[41, 423, 205, 584, 225],[42, 423, 205, 583, 225],[43, 423, 206, 582, 226],[44, 423, 206, 582, 226],[45, 423, 207, 582, 227],[46, 423, 207, 582, 228],[47, 423, 208, 581, 230],[48, 423, 209, 581, 230],[49, 423, 210, 581, 226],[50, 423, 212, 581, 222] ];
export function anSlashHitboxes(time:number){const frame=anSlashFrame(time)+1;if(frame<26||frame>50)return [];const k=blade[frame-26],width=Math.hypot(k[3]-k[1],k[4]-k[2]);return [{x:(k[1]+k[3])/2-width/2,y:(k[2]+k[4])/2-10,width,height:20,angle:Math.atan2(k[4]-k[2],k[3]-k[1])*180/Math.PI}]}
