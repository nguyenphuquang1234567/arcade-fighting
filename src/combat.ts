import {anStrike} from './an-super';
import {superStrike} from './yuki-super';
import {frameCount} from './fighters';
import { polygonCollision, getHitboxes, attackTiming } from './geometry';
export type Action='idle'|'walk'|'run'|'jump'|'attack'|'kick'|'sword_attack'|'ground_slide'|'hurt'|'death';
export type Input={move:number,jump:boolean,guard:boolean,ulti?:boolean,super?:boolean,attack?:Action};
export type Fighter={ultiCharge:number,ultiTime?:number,ultiHit?:boolean,ultiLastHitTime?:number,superCharge:number,superTime?:number,superHitStages?:number[],collisionSkin?:'yuki'|'an',character:'moon'|'ember',x:number,y:number,vy:number,hp:number,energy:number,face:number,action:Action,time:number,duration:number,hit:boolean,guard:boolean,wins:number};
export const attacks:Partial<Record<Action,{damage:number,cost:number,duration:number,active:number,activeEnd:number}>>={attack:{damage:9,cost:8,duration:.36,active:.13,activeEnd:.21},kick:{damage:14,cost:15,duration:.4,active:.16,activeEnd:.24},sword_attack:{damage:23,cost:28,duration:.6,active:.274,activeEnd:.48},ground_slide:{damage:11,cost:20,duration:.5,active:.2,activeEnd:.4}};
export const MAX_HP=200;
export const ANIME_MAX_HP=300;
export function maxHp(f:Pick<Fighter,'collisionSkin'>){return f.collisionSkin?ANIME_MAX_HP:MAX_HP;}
export const ANIME_DEATH_FRAMES=11;
export const ANIME_DEATH_DURATION=6;
export const ANIME_DEATH_FPS=ANIME_DEATH_FRAMES/ANIME_DEATH_DURATION;
export class Combat{
 get deathAnimationComplete(){return this.fighters.every(f=>f.action!=='death'||f.time>=(f.collisionSkin?(f.collisionSkin==='an'?6:ANIME_DEATH_DURATION):frameCount(f.character,'death')/6))}
 skins:('an'|'yuki'|undefined)[]=[];
 practiceFull=false;
 training=false;fighters:Fighter[]=[];remaining=Infinity;roundElapsed=0;round=1;phase:'menu'|'fight'|'roundover'|'over'='menu';delay=0;onHit?:(x:number,y:number,blocked:boolean,action:Action)=>void;onAttack?:(action:Action)=>void;onRound?:(winner:number,finished:boolean)=>void;onDeath?:(fighter:Fighter)=>void;onUlti?:(fighter:Fighter)=>void;
 constructor(){this.resetFighters()}
 resetFighters(){this.fighters=[360,920].map((x,i)=>({character:i===0?'moon':'ember',x,y:0,vy:0,hp:this.skins[i]?ANIME_MAX_HP:MAX_HP,collisionSkin:this.skins[i],ultiCharge:this.practiceFull&&this.skins[i]?100:0,superCharge:this.practiceFull?100:0,energy:100,face:i===0?1:-1,action:'idle',time:0,duration:0,hit:false,guard:false,wins:this.fighters[i]?.wins||0}));this.remaining=Infinity;this.roundElapsed=0;}
 start(training=false,skins:('an'|'yuki'|undefined)[] = [],practiceFull=false){this.practiceFull=practiceFull;this.skins=skins;this.training=training;this.fighters=[];this.round=1;this.resetFighters();this.phase='fight'}
 update(dt:number,inputs:Input[]){if(this.phase==='roundover'||this.phase==='over')for(const f of this.fighters)if(f.action==='death')f.time+=dt;if(this.phase==='roundover'){if(this.deathAnimationComplete)this.delay+=dt;if(this.deathAnimationComplete&&this.delay>=1){this.round++;this.resetFighters();this.phase='fight'}return}if(this.phase!=='fight')return;this.roundElapsed+=dt;
 this.fighters.forEach((f,i)=>{const input=inputs[i],enemy=this.fighters[1-i];f.time+=dt;if(this.practiceFull){f.hp=maxHp(f);f.superCharge=100;if(f.collisionSkin)f.ultiCharge=100;}f.energy=this.training?100:Math.min(100,f.energy+dt*13);if(f.action!=='death'&&f.duration>0&&f.time>=f.duration){f.action='idle';f.duration=0;f.time=0}if(f.duration===0)f.face=enemy.x>=f.x?1:-1;f.guard=input.guard&&f.y===0&&f.duration===0;
 if(f.ultiTime!==undefined){f.ultiTime+=dt;f.guard=false;if(f.ultiTime>=4){f.ultiTime=undefined;f.action='idle';f.time=0}else{f.x=Math.max(90,Math.min(1190,f.x+input.move*290*dt));if(input.jump&&f.y===0)f.vy=-890;f.vy+=1800*dt;f.y=Math.min(0,f.y+f.vy*dt);if(f.y===0)f.vy=0;return;}}
 if(input.ulti&&f.collisionSkin&&f.ultiCharge>=100&&f.duration===0&&f.superTime===undefined){f.ultiCharge=0;f.ultiTime=0;this.onUlti?.(f);f.ultiHit=false;f.ultiLastHitTime=0;f.action='idle';f.time=0;f.guard=false;f.hit=true;return;}
 if(f.superTime!==undefined){f.superTime+=dt;f.guard=false;if(f.superTime>=1.5){f.superTime=undefined;f.action='idle';f.time=0;}else{f.x=Math.max(90,Math.min(1190,f.x+input.move*290*dt));f.vy+=1800*dt;f.y=Math.min(0,f.y+f.vy*dt);if(f.y===0)f.vy=0;return;}}
 if(input.super&&f.collisionSkin&&f.superCharge>=100&&f.duration===0){f.superCharge=0;f.superTime=0;f.superHitStages=[];f.action='idle';f.time=0;f.guard=false;f.hit=true;f.x=Math.max(90,Math.min(1190,f.x+input.move*290*dt));f.vy+=1800*dt;f.y=Math.min(0,f.y+f.vy*dt);if(f.y===0)f.vy=0;return;}
 if(f.duration===0){if(input.jump&&f.y===0){f.vy=-890;f.action='jump';f.time=0}if(input.attack&&attacks[input.attack]&&!f.guard){const a=attackTiming(f,attacks[input.attack]!,input.attack);if(f.energy>=a.cost){if(!this.training)f.energy-=a.cost;f.action=input.attack;f.duration=a.duration;f.time=0;f.hit=false;this.onAttack?.(f.action);}}
 if(f.duration===0){f.x+=input.move*(f.guard?90:290)*dt;const next=f.y<0||f.vy<0?'jump':input.move?'run':'idle';if(f.action!==next){f.action=next;f.time=0}}}
 if(f.action==='ground_slide')f.x+=f.face*360*dt;
 f.vy+=1800*dt;f.y=Math.min(0,f.y+f.vy*dt);if(f.y===0)f.vy=0;f.x=Math.max(90,Math.min(1190,f.x));
 });
 // Resolve attacks after BOTH fighters have moved and chosen their guard state.
 // Snapshot contacts so simultaneous strikes can trade rather than favor index 0.
 const contacts=this.fighters.flatMap((f,i)=>{
   const enemy=this.fighters[1-i];
   if(f.ultiTime!==undefined){if(enemy.hp<=0||f.ultiTime-(f.ultiLastHitTime??0)<.5-1e-9||f.ultiTime>=4)return [];const contact=polygonCollision(getHitboxes(f),enemy,attacks[enemy.action]);return contact?[{f,enemy,attack:{...attacks.sword_attack!,damage:6},special:undefined,contact,blocked:enemy.guard&&enemy.energy>=10,direction:f.face}]:[];}
   const special=f.collisionSkin&&f.superTime!==undefined?(f.collisionSkin==='an'?anStrike(f.superTime):superStrike(f.superTime)):undefined;
   if(enemy.hp<=0||(f.superTime!==undefined?(!special||f.superHitStages?.includes(special.stage)):f.hit))return [];
   const contact=polygonCollision(getHitboxes(f,attacks[f.action]),enemy,attacks[enemy.action]);
   const baseAttack=attacks[special?.action??f.action];
   const attack=baseAttack&&special?{...baseAttack,damage:special.action==='kick'?12:5}:baseAttack;
   return contact&&attack?[{f,enemy,attack,special,contact,blocked:enemy.guard&&enemy.energy>=10,direction:f.face}]:[];
 });
 for(const {f,enemy,attack,special,contact,blocked,direction} of contacts){
   if(f.ultiTime!==undefined)f.ultiLastHitTime=f.ultiTime;
   if(special)(f.superHitStages??=[]).push(special.stage);else f.hit=true;
   if(!blocked&&!special&&f.ultiTime===undefined&&f.collisionSkin){f.superCharge=Math.min(100,f.superCharge+attack.damage);if(f.collisionSkin)f.ultiCharge=Math.min(100,f.ultiCharge+attack.damage*.9);}
   if(!blocked){enemy.superTime=undefined;enemy.ultiTime=undefined;}
   if(!this.training)enemy.hp=Math.max(0,enemy.hp-(blocked?attack.damage*.18:attack.damage));
   if(blocked&&!this.training)enemy.energy-=10;
   if(enemy.hp<=0){enemy.action='death';enemy.duration=10;enemy.time=0;enemy.hit=true;enemy.guard=false;this.onDeath?.(enemy);}
   else if(!blocked){enemy.action='hurt';enemy.duration=.28;enemy.time=0;enemy.hit=true;}
   if(enemy.hp>0)enemy.x=Math.max(90,Math.min(1190,enemy.x+direction*(blocked?12:32)));
   this.onHit?.(contact.x+contact.width/2,contact.y+contact.height/2,blocked,f.ultiTime!==undefined?'attack':special?.action??f.action);
 }

 const [a,b]=this.fighters;const gap=b.x-a.x;if(a.hp>0&&b.hp>0&&Math.abs(gap)<65&&Math.abs(a.y-b.y)<90){const push=(65-Math.abs(gap))/2*(gap>=0?1:-1);a.x=Math.max(90,Math.min(1190,a.x-push));b.x=Math.max(90,Math.min(1190,b.x+push));}
 if(!this.training&&(a.hp<=0||b.hp<=0)){const winner=a.hp===b.hp?-1:a.hp>b.hp?0:1;if(winner>=0)this.fighters[winner].wins++;const finished=this.fighters.some(f=>f.wins>=2);this.phase=finished?'over':'roundover';this.delay=0;this.onRound?.(winner,finished)}
 }
}
// Anime bots use a faster offensive cadence; defensive reactions retain the original clock.
export function bot(c:Combat,now:number):Input{
 const f=c.fighters[1],p=c.fighters[0],distance=Math.abs(p.x-f.x);
 const anime=!!f.collisionSkin,period=anime?500:850;
 const cycle=Math.floor(now/period),window=now%period,decisionStart=anime?120:300;
 const defenseCycle=Math.floor(now/850);
 const useUlti=!!f.collisionSkin&&f.ultiCharge>=100&&f.ultiTime===undefined&&f.superTime===undefined&&f.duration===0&&p.hp>0&&Math.abs(p.y-f.y)<140;
 const useSuper=!useUlti&&f.ultiTime===undefined&&!!f.collisionSkin&&f.superCharge>=100&&f.superTime===undefined&&f.duration===0&&p.hp>0&&distance<170&&Math.abs(p.y-f.y)<110;
 return {
  ulti:useUlti,
  super:useSuper,
  move:distance>120?Math.sign(p.x-f.x):distance<75&&cycle%4===0?-Math.sign(p.x-f.x)*.65:0,
  jump:distance>200&&cycle%5===0&&window>=decisionStart&&window<decisionStart+80,
  guard:!useUlti&&!useSuper&&!!attacks[p.action]&&distance<220&&p.time>.10&&defenseCycle%5===0,
  attack:!useUlti&&!useSuper&&distance<190&&window>=decisionStart&&window<decisionStart+100
   ?(['attack','kick','attack','ground_slide','sword_attack'] as Action[])[cycle%5]
   :undefined
 };
}
