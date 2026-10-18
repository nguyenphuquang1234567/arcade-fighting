import type {Fighter} from './combat';
const strikes=new Set(['attack','kick','sword_attack','ground_slide']);
// Equal rules for both slots: the latest attack comes forward when attacks overlap.
export function fighterDepth(f:Pick<Fighter,'action'|'time'|'superTime'|'ultiTime'>){
 const attacking=f.ultiTime!==undefined||f.superTime!==undefined||strikes.has(f.action);
 if(!attacking)return 1;
 const elapsed=Math.max(0,f.ultiTime??f.superTime??f.time);
 return 2+1/(1+elapsed);
}
