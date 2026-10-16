import {superFrameIndex} from './yuki-super';
import saved from './super-hurtbox-overrides.json';
import idle from './capsule-overrides.json';
import {capsulePolygon} from './hurtcapsule';
import type {CapsuleEdit,CapsuleEdits} from './capsule-model';
export function superCapsuleEdits(time:number):CapsuleEdit[]{
 const frame=superFrameIndex(time)+1;
 return (saved as Record<string,CapsuleEdit[]>)[frame]??(idle as CapsuleEdits)[`yuki/idle/${Math.floor(time*3)%2}`]??[{x:0,y:0,width:130,part:'body'},{x:0,y:0,width:70,part:'head'}];
}
export function superHurtboxes(time:number,edits=superCapsuleEdits(time)){
 return edits.map(edit=>capsulePolygon('yuki','idle',Math.floor(time*3)%2,edit));
}
