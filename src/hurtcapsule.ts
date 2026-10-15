import {poseIndex,poseCharacter,type EditorCharacter} from './yuki-assets';
import saved from './capsule-overrides.json';
import {hurtboxPoses} from './hurtbox-poses';
import type {Action} from './combat';
import type {CapsuleEdit,CapsuleEdits} from './capsule-model';
import type {HurtPolygon} from './collision-types';
export function capsulePolygon(character:EditorCharacter,action:Action,frame:number,edit:CapsuleEdit):HurtPolygon{
 const baseAction=action==='walk'?'run':action;
 const p=hurtboxPoses[poseCharacter(character)][baseAction][poseIndex(character,baseAction,frame)].map(v=>v*3.2),r=edit.width/2;
 let x1=p[2],y1=p[1]+65,x2=p[2],y2=Math.max(p[7],p[11])-r;
 if(action==='ground_slide'&&frame===0){x1=p[0]+40;y1=p[3];x2=Math.max(p[6],p[10])-r;y2=p[3];}
 if(y2<y1&&action!=='ground_slide')y2=y1;
 if(edit.part==='head'){x1=x2=p[0];y1=p[1]-8;y2=p[1]+8;}
 x1+=edit.x;x2+=edit.x;y1+=edit.y;y2+=edit.y;
 const angle=(edit.angle??0)*Math.PI/180,cx=(x1+x2)/2,cy=(y1+y2)/2;
 const rotate=(x:number,y:number)=>({x:cx+(x-cx)*Math.cos(angle)-(y-cy)*Math.sin(angle),y:cy+(x-cx)*Math.sin(angle)+(y-cy)*Math.cos(angle)});
 const theta=Math.atan2(y2-y1,x2-x1),points=[];
 // 24 segments per semicircle: maximum contour error below 0.26 source pixels.
 for(const [x,y,start] of [[x1,y1,theta+Math.PI/2],[x2,y2,theta-Math.PI/2]])for(let i=0;i<=24;i++){const a=start+i*Math.PI/24;points.push(rotate(x+r*Math.cos(a),y+r*Math.sin(a)))}
 return {region:edit.part==='head'?'head':'body',points};
}
export function capsulesFor(character:EditorCharacter,action:Action,frame:number):HurtPolygon[]{
 const edits=(saved as CapsuleEdits)[`${character}/${action}/${frame}`]??[{x:0,y:0,width:130,part:'body'},{x:0,y:0,width:70,part:'head'}];
 return edits.map(edit=>capsulePolygon(character,action,frame,edit));
}
