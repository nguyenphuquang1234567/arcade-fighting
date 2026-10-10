import Phaser from 'phaser';
import {Combat,bot,attacks,type Action,type Input} from './combat';
import './style.css';
import {getHitboxes, getHurtboxes, SPRITE_SCALE, SPRITE_BASELINE, poseFrame} from './geometry';
import {fighters, actions, frameCounts, frameCount, spriteFile} from './fighters';
const $=(id:string)=>document.getElementById(id)!;
const combat=new Combat();let mode='bot',paused=false,sound=true,showBoxes=false,scene:Dojo;
const keys=new Set<string>(),pressed=new Set<string>();
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(!keys.has(e.code))pressed.add(e.code);keys.add(e.code);if(e.code==='Escape'&&!e.repeat){if(paused)quitMatch();else togglePause()};if(e.code==='KeyH'&&!e.repeat)toggleBoxes()});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();pressed.clear();if(combat.phase==='fight'&&!paused)togglePause()});
const touchPointers=new Map<number,string>();
const stickKeys=new Set<string>();
let stickPointer:number|undefined;
const touchHeld=(code:string)=>stickKeys.has(code)||[...touchPointers.values()].includes(code);
function clearTouch(){touchPointers.clear();stickKeys.clear();stickPointer=undefined;$('stick-knob').style.transform='translate(-50%,-50%)';document.querySelectorAll('[data-touch]').forEach(b=>b.classList.remove('held'))}
for(const button of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-touch]'))){
 button.addEventListener('pointerdown',e=>{
  e.preventDefault();if(combat.phase!=='fight'||paused)return;
  const code=button.dataset.touch!;if(!touchHeld(code)&&!keys.has(code))pressed.add(code);
  touchPointers.set(e.pointerId,code);button.setPointerCapture(e.pointerId);button.classList.add('held');
 });
 const release=(e:PointerEvent)=>{touchPointers.delete(e.pointerId);if(!touchHeld(button.dataset.touch!))button.classList.remove('held')};
 button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
 button.addEventListener('contextmenu',e=>e.preventDefault());
}
const stick=$('touch-stick');
function moveStick(e:PointerEvent){
 const rect=stick.getBoundingClientRect(),radius=rect.width/2,max=radius*.57;
 let dx=e.clientX-rect.left-radius,dy=e.clientY-rect.top-rect.height/2;
 const distance=Math.hypot(dx,dy);if(distance>max){dx*=max/distance;dy*=max/distance}
 $('stick-knob').style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
 const wasJump=stickKeys.has('KeyW');stickKeys.clear();
 const dead=max*.25;
 if(dx>dead)stickKeys.add('KeyD');else if(dx<-dead)stickKeys.add('KeyA');
 if(dy>dead)stickKeys.add('KeyS');else if(dy<-dead){stickKeys.add('KeyW');if(!wasJump)pressed.add('KeyW')}
}
stick.addEventListener('pointerdown',e=>{
 e.preventDefault();if(stickPointer!==undefined||combat.phase!=='fight'||paused)return;
 stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);moveStick(e);
});
stick.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer){e.preventDefault();moveStick(e)}});
const releaseStick=(e:PointerEvent)=>{if(e.pointerId!==stickPointer)return;stickPointer=undefined;stickKeys.clear();$('stick-knob').style.transform='translate(-50%,-50%)'};
stick.addEventListener('pointerup',releaseStick);stick.addEventListener('pointercancel',releaseStick);stick.addEventListener('lostpointercapture',releaseStick);stick.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('blur',clearTouch);
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTouch()});
function input(second=false):Input{const m=second?['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Digit1','Digit2','Digit3','Digit0']:['KeyA','KeyD','KeyW','KeyS','KeyJ','KeyK','KeyL','KeyU'];return{move:Number(keys.has(m[1])||touchHeld(m[1]))-Number(keys.has(m[0])||touchHeld(m[0])),jump:pressed.has(m[2])||stickKeys.has(m[2]),guard:keys.has(m[3])||touchHeld(m[3]),attack:pressed.has(m[4])?'attack':pressed.has(m[5])?'kick':pressed.has(m[6])?'sword_attack':pressed.has(m[7])?'ground_slide':undefined}}

class Dojo extends Phaser.Scene{
 sprites:Phaser.GameObjects.Sprite[]=[];shadows:Phaser.GameObjects.Ellipse[]=[];music?:Phaser.Sound.BaseSound;boxGraphics?:Phaser.GameObjects.Graphics;
 preload(){for(const {key:who} of fighters)for(const action of actions)this.load.spritesheet(`${who}-${action}`,`/characters/${who}/${spriteFile(who,action)}`,{frameWidth:512,frameHeight:512});this.load.image('background','/images/sunset_temple_background.png');this.load.image('courtyard','/images/dojo_courtyard_midground.png');this.load.image('spark','/images/hit_spark_fx.png');this.load.audio('music','/audio/bgm_sunset_dojo.mp3');this.load.audio('punch-hit','/audio/punch-hit-retro.wav');this.load.audio('kick-hit','/audio/kick-hit-retro.wav');this.load.audio('sword-swing','/audio/samurai-slash.wav');this.load.audio('ko','/audio/ko-compressed.wav')}
 create(){scene=this;this.add.image(640,360,'background').setDisplaySize(1280,720);this.add.image(640,631,'courtyard').setDisplaySize(1280,240);this.add.rectangle(640,720,1280,180,0x160f20,.28).setOrigin(.5,1);
 for(const {key:who} of fighters){for(const action of actions){this.anims.create({key:`${who}-${action}`,frames:this.anims.generateFrameNumbers(`${who}-${action}`,{start:0,end:frameCount(who,action)-1}),frameRate:['attack','kick','sword_attack'].includes(action)?frameCounts[action]/attacks[action]!.duration:action==='idle'?3:action==='run'?20:action==='walk'?5:6,repeat:['idle','run','walk'].includes(action)?-1:0})}this.shadows.push(this.add.ellipse(0,655,125,18,0x090513,.5));this.sprites.push(this.add.sprite(0,SPRITE_BASELINE,`${who}-idle`).setOrigin(.5,1).setScale(SPRITE_SCALE))}
 this.music=this.sound.add('music',{loop:true,volume:.35});combat.onAttack=action=>{if(action==='sword_attack')this.time.delayedCall(257,()=>{if(sound&&combat.phase==='fight')this.sound.play('sword-swing',{volume:.85})})};combat.onHit=(x,y,blocked,action)=>{this.cameras.main.shake(90,blocked?.001:.004);const fx=this.add.image(x,y,'spark').setDisplaySize(blocked?65:110,blocked?50:85).setTint(blocked?0x97d9ff:0xffd991);this.tweens.add({targets:fx,alpha:0,scaleX:fx.scaleX*1.6,scaleY:fx.scaleY*1.6,duration:180,onComplete:()=>fx.destroy()});if(sound&&(action==='ground_slide'||action==='attack'||action==='kick'))this.sound.play(action==='kick'?'kick-hit':'punch-hit',{volume:.85});else if(!blocked)this.tone(110)};combat.onRound=(winner,finished)=>{if(sound&&combat.fighters.some(f=>f.hp<=0))this.sound.play('ko',{volume:1}); $('callout').textContent=winner<0?'DRAW':combat.fighters.some(f=>f.hp<=0)?'K.O.':'TIME UP';if(finished){setTimeout(()=>{showMenu(winner===0?'Moon Ronin prevails.':'Ember Brawler prevails.');},1700)}};
 this.boxGraphics=this.add.graphics().setDepth(50);this.renderState();}
 tone(frequency:number){if(!sound)return;const context=(this.sound as Phaser.Sound.WebAudioSoundManager).context;if(!context)return;const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type='triangle';oscillator.frequency.setValueAtTime(frequency,context.currentTime);oscillator.frequency.exponentialRampToValueAtTime(40,context.currentTime+.12);gain.gain.setValueAtTime(.12,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.15);oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.16)}
 update(time:number,delta:number){if(!paused)combat.update(Math.min(delta/1000,.035),[input(),mode!=='local'?bot(combat,time):input(true)]);pressed.clear();if(combat.phase==='fight'&&!paused)$('callout').textContent=!combat.training&&combat.remaining>59?'FIGHT':'';this.renderState()}
 renderState(){combat.fighters.forEach((f,i)=>{const sprite=this.sprites[i];if(!sprite)return;sprite.setPosition(f.x,SPRITE_BASELINE+f.y).setFlipX(f.face<0);const animation=`${fighters[i].key}-${f.action}`;sprite.anims.stop();sprite.setTexture(animation,poseFrame(f,attacks[f.action]));sprite.setTint(f.guard?0xb1dfff:0xffffff);this.shadows[i].setPosition(f.x,655).setAlpha(f.y<0?.2:.5);const prefix=i===0?'p':'r';$(`${prefix}-hp`).style.width=`${f.hp}%`;$(`${prefix}-energy`).style.width=`${f.energy}%`;$(`${prefix}-wins`).textContent=[0,1].map(n=>f.wins>n?'●':'○').join(' ')});this.drawBoxes();$('timer').textContent=combat.training?'∞':String(Math.ceil(combat.remaining)).padStart(2,'0');$('round').textContent=combat.training?'TRAINING':`ROUND ${String(combat.round).padStart(2,'0')}`;}
 drawBoxes(){
   const graphics=this.boxGraphics;if(!graphics)return;graphics.clear();if(!showBoxes)return;
   for(const fighter of combat.fighters){
     const timing=attacks[fighter.action];
     for(const polygon of getHurtboxes(fighter,timing)){
       const color={head:0xffd166,body:0x56e5c6,legs:0x77aaff}[polygon.region];
       graphics.fillStyle(color,.32).beginPath();
       polygon.points.forEach((p,i)=>i?graphics.lineTo(p.x,p.y):graphics.moveTo(p.x,p.y));
       graphics.closePath();if(!polygon.holes?.length)graphics.fillPath();graphics.lineStyle(1.5,color,.9).strokePath();
       for(const hole of polygon.holes??[]){graphics.beginPath();hole.forEach((p,i)=>i?graphics.lineTo(p.x,p.y):graphics.moveTo(p.x,p.y));graphics.closePath().strokePath();}
     }
     for(const b of getHitboxes(fighter,timing))graphics.fillStyle(0xff625c,.25).lineStyle(2,0xff625c,1).fillRect(b.x,b.y,b.width,b.height).strokeRect(b.x,b.y,b.width,b.height);
   }
 }
}
function toggleBoxes(){showBoxes=!showBoxes;}
function showMenu(title?:string){clearTouch();$('overlay').classList.remove('hidden');if(title){document.querySelector('h1')!.textContent=title;$('start').innerHTML='REMATCH <span>↗</span>'}$('status').textContent='AWAITING CHALLENGER';$('callout').textContent='';}
function togglePause(){if(combat.phase!=='fight')return;paused=!paused;clearTouch();$('pause-menu').hidden=!paused;$('callout').textContent=paused?'PAUSED':'';$('pause').textContent=paused?'ESC / VỀ MENU':'ESC / PAUSE'}
$('pause').onclick=togglePause;
$('resume-match').onclick=()=>{if(paused)togglePause()};
function quitMatch(){
 paused=false;combat.phase='menu';keys.clear();pressed.clear();clearTouch();
 $('pause-menu').hidden=true;$('pause').textContent='ESC / PAUSE';
 showMenu();document.querySelector('h1')!.innerHTML='Only one<br><em>shadow remains.</em>';
 $('start').innerHTML='ENTER THE DOJO <span>↗</span>';
}
$('quit-match').onclick=quitMatch;

function updateMenuHelp(){
 $('menu-p1').innerHTML='<strong>P1 · RONIN</strong>'+document.querySelector('.fighter:not(.right) .hud-controls')!.innerHTML;
 $('menu-p2').innerHTML='<strong>P2 · EMBER</strong>'+$('p2-controls').innerHTML;
 $('menu-p2').hidden=mode!=='local';
 $('mode-description').textContent=mode==='training'?'Training / Luyện tập với bot: vô hạn máu, năng lượng và thời gian.':mode==='local'?'Local / Hai người cùng bàn phím: P1 điều khiển Ronin, P2 điều khiển Ember.':'VS Computer / Đấu với bot: anh điều khiển Ronin bằng bộ phím P1.';
 $('mode-rules').textContent=mode==='training'?'INFINITE HEALTH · ENERGY · TIME / VÔ HẠN MÁU · NĂNG LƯỢNG · THỜI GIAN':'FIRST TO TWO ROUNDS · 60 SECOND DUELS / THẮNG 2 ROUND · 60 GIÂY MỖI ROUND';
}
updateMenuHelp();
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button=>button.onclick=()=>{mode=button.dataset.mode!;updateMenuHelp();$('p2-controls').hidden=mode!=='local';document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('selected',b===button));$('p2-help').textContent=mode==='local'?'P2: Arrows move / guard · 1 / 2 / 3 / 0 attacks':'Keep your stamina. A patient fighter survives.'});
$('start').onclick=()=>{if(!scene)return;keys.clear();pressed.clear();combat.start(mode==='training');paused=false;$('pause-menu').hidden=true;$('pause').textContent='ESC / PAUSE';$('overlay').classList.add('hidden');$('status').textContent=mode==='training'?'TRAINING · INFINITE HEALTH':mode==='bot'?'YOU VS EMBER AI':'LOCAL DUEL';if(sound&&!scene.music?.isPlaying)scene.music?.play()};
$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'SOUND ON':'SOUND OFF';if(sound)scene?.music?.play();else scene?.music?.pause()};
const game=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:1280,height:720,backgroundColor:'#251b2d',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:Dojo,render:{antialias:true}});
Object.assign(window,{__dojo:{combat,get collisionBoxes(){return combat.fighters.map(f=>({hurt:getHurtboxes(f,attacks[f.action]),hit:getHitboxes(f,attacks[f.action])}));},get showBoxes(){return showBoxes;},get paused(){return paused},get animationState(){return scene?.sprites.map(sprite=>({key:sprite.texture.key,frames:scene.anims.get(sprite.texture.key)?.frames.length,fps:scene.anims.get(sprite.texture.key)?.frameRate,frame:Number(sprite.frame.name)+1}))}}});

// CSS can change the arena size after the browser's initial rotation event.
let layoutFrame=0;
function refreshLayout(){
 cancelAnimationFrame(layoutFrame);
 layoutFrame=requestAnimationFrame(()=>game.scale.refresh());
}
new ResizeObserver(refreshLayout).observe($('game'));
window.addEventListener('resize',refreshLayout);
window.visualViewport?.addEventListener('resize',refreshLayout);
window.addEventListener('orientationchange',()=>{clearTouch();refreshLayout()});
screen.orientation?.addEventListener('change',()=>{clearTouch();refreshLayout()});
