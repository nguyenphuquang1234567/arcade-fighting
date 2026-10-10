import { polygonCollision, getHitboxes } from './geometry';
export type Action='idle'|'walk'|'run'|'jump'|'attack'|'kick'|'sword_attack'|'ground_slide'|'hurt'|'death';
export type Input={move:number,jump:boolean,guard:boolean,attack?:Action};
export type Fighter={character:'moon'|'ember',x:number,y:number,vy:number,hp:number,energy:number,face:number,action:Action,time:number,duration:number,hit:boolean,guard:boolean,wins:number};
export const attacks:Partial<Record<Action,{damage:number,cost:number,duration:number,active:number,activeEnd:number}>>={attack:{damage:9,cost:8,duration:.36,active:.13,activeEnd:.21},kick:{damage:14,cost:15,duration:.4,active:.16,activeEnd:.24},sword_attack:{damage:23,cost:28,duration:.6,active:.274,activeEnd:.48},ground_slide:{damage:11,cost:20,duration:.5,active:.2,activeEnd:.4}};
export class Combat{
 training=false;fighters:Fighter[]=[];remaining=60;round=1;phase:'menu'|'fight'|'roundover'|'over'='menu';delay=0;onHit?:(x:number,y:number,blocked:boolean,action:Action)=>void;onAttack?:(action:Action)=>void;onRound?:(winner:number,finished:boolean)=>void;
 constructor(){this.resetFighters()}
 resetFighters(){this.fighters=[360,920].map((x,i)=>({character:i===0?'moon':'ember',x,y:0,vy:0,hp:100,energy:100,face:i===0?1:-1,action:'idle',time:0,duration:0,hit:false,guard:false,wins:this.fighters[i]?.wins||0}));this.remaining=60;}
 start(training=false){this.training=training;this.fighters=[];this.round=1;this.resetFighters();this.phase='fight'}
 update(dt:number,inputs:Input[]){if(this.phase==='roundover'){this.delay-=dt;if(this.delay<=0){this.round++;this.resetFighters();this.phase='fight'}return}if(this.phase!=='fight')return;if(!this.training)this.remaining=Math.max(0,this.remaining-dt);
 this.fighters.forEach((f,i)=>{const input=inputs[i],enemy=this.fighters[1-i];f.time+=dt;f.energy=this.training?100:Math.min(100,f.energy+dt*13);if(f.action!=='death'&&f.duration>0&&f.time>=f.duration){f.action='idle';f.duration=0;f.time=0}if(f.duration===0)f.face=enemy.x>=f.x?1:-1;f.guard=input.guard&&f.y===0&&f.duration===0;
 if(f.duration===0){if(input.jump&&f.y===0){f.vy=-890;f.action='jump';f.time=0}if(input.attack&&attacks[input.attack]&&!f.guard){const a=attacks[input.attack]!;if(f.energy>=a.cost){if(!this.training)f.energy-=a.cost;f.action=input.attack;f.duration=a.duration;f.time=0;f.hit=false;this.onAttack?.(f.action);}}
 if(f.duration===0){f.x+=input.move*(f.guard?90:290)*dt;const next=f.y<0||f.vy<0?'jump':input.move?'run':'idle';if(f.action!==next){f.action=next;f.time=0}}}
 if(f.action==='ground_slide')f.x+=f.face*360*dt;
 f.vy+=1800*dt;f.y=Math.min(0,f.y+f.vy*dt);if(f.y===0)f.vy=0;f.x=Math.max(90,Math.min(1190,f.x));
 });
 // Resolve attacks after BOTH fighters have moved and chosen their guard state.
 // Snapshot contacts so simultaneous strikes can trade rather than favor index 0.
 const contacts=this.fighters.flatMap((f,i)=>{
   const enemy=this.fighters[1-i];
   if(f.hit||enemy.hp<=0)return [];
   const contact=polygonCollision(getHitboxes(f,attacks[f.action]),enemy,attacks[enemy.action]);
   const attack=attacks[f.action];
   return contact&&attack?[{f,enemy,attack,contact,blocked:enemy.guard&&enemy.energy>=10,direction:f.face}]:[];
 });
 for(const {f,enemy,attack,contact,blocked,direction} of contacts){
   f.hit=true;
   if(!this.training)enemy.hp=Math.max(0,enemy.hp-(blocked?attack.damage*.18:attack.damage));
   if(blocked&&!this.training)enemy.energy-=10;
   if(enemy.hp<=0){enemy.action='death';enemy.duration=10;enemy.time=0;enemy.hit=true;enemy.guard=false;}
   else if(!blocked){enemy.action='hurt';enemy.duration=.28;enemy.time=0;enemy.hit=true;}
   enemy.x=Math.max(90,Math.min(1190,enemy.x+direction*(blocked?12:32)));
   this.onHit?.(contact.x+contact.width/2,contact.y+contact.height/2,blocked,f.action);
 }

 const [a,b]=this.fighters;const gap=b.x-a.x;if(Math.abs(gap)<65&&Math.abs(a.y-b.y)<90){const push=(65-Math.abs(gap))/2*(gap>=0?1:-1);a.x=Math.max(90,Math.min(1190,a.x-push));b.x=Math.max(90,Math.min(1190,b.x+push));}
 if(!this.training&&(a.hp<=0||b.hp<=0||this.remaining<=0)){const winner=a.hp===b.hp?-1:a.hp>b.hp?0:1;if(winner>=0)this.fighters[winner].wins++;const finished=this.fighters.some(f=>f.wins>=2);this.phase=finished?'over':'roundover';this.delay=3;this.onRound?.(winner,finished)}
 }
}
// Stronger bot: quicker approach and pressure, with imperfect defensive reactions.
export function bot(c:Combat,now:number):Input{
 const f=c.fighters[1],p=c.fighters[0],distance=Math.abs(p.x-f.x);
 const cycle=Math.floor(now/850),window=now%850;
 return {
  move:distance>120?Math.sign(p.x-f.x):distance<75&&cycle%4===0?-Math.sign(p.x-f.x)*.65:0,
  jump:distance>200&&cycle%5===0&&window>=300&&window<380,
  guard:!!attacks[p.action]&&distance<220&&p.time>.10&&cycle%5===0,
  attack:distance<190&&window>=300&&window<400
   ?(['attack','kick','attack','ground_slide','sword_attack'] as Action[])[cycle%5]
   :undefined
 };
}
