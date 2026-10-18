import anUltiSeams from './an-ulti-seams.json';
import {AN_ULTI_SCALE,AN_ULTI_ORIGIN_X,AN_ULTI_ORIGIN_Y} from './an-ulti';
import {ULTI_SCALE,ULTI_ORIGIN_X,ULTI_ORIGIN_Y} from './yuki-ulti';
import {fighterDepth} from './fighter-layer';
import {superFrameIndex} from './yuki-super';
import Phaser from 'phaser';
import {Combat,bot,attacks,maxHp,type Action,type Input} from './combat';
import './style.css';
import {hitboxCorners} from './hitbox-model';
import {getHitboxes, getHurtboxes, SPRITE_SCALE, SPRITE_BASELINE, poseFrame} from './geometry';
import {fighters, actions, frameCounts, frameCount, spriteFile, attackFrame} from './fighters';
const $=(id:string)=>document.getElementById(id)!;
const combat=new Combat();let mode='bot',paused=false,sound=true,showBoxes=false,scene:Dojo;
const isAnMode=()=>mode==='an'||mode==='an-local'||mode==='an-local-training'||mode==='an-training';
const isLocalMode=()=>mode==='yuki-local-training'||mode==='local'||mode==='an-local'||mode==='an-local-training';
const isYukiPlayerMode=()=>mode==='yuki-local-training'||mode==='yuki-an'||mode==='yuki-training';
const isYukiMode=()=>isAnMode()||isYukiPlayerMode();
const animeSkin=(i:number)=>isYukiPlayerMode()?(i===0?'yuki':'an'):(i===0?'an':'yuki');
const isTrainingMode=()=>mode==='yuki-local-training'||mode==='an-local-training'||mode==='training'||mode==='an-training'||mode==='yuki-training';
let anUnlocked=false;
function unlockAn(){if(anUnlocked)return true;const code=window.prompt('Nhập mã để mở các chế độ An vs Yuki');if(code===null)return false;if(code!=='Quang'){window.alert('Mã không đúng.');return false}anUnlocked=true;return true}
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
function input(second=false):Input{const m=second?['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Digit1','Digit2','Digit3','Digit0']:['KeyA','KeyD','KeyW','KeyS','KeyJ','KeyK','KeyL','KeyU'];return{ulti:pressed.has(second?'Digit5':'KeyO'),super:pressed.has(second?'Digit4':'KeyI'),move:Number(keys.has(m[1])||touchHeld(m[1]))-Number(keys.has(m[0])||touchHeld(m[0])),jump:keys.has(m[2])||touchHeld(m[2]),guard:keys.has(m[3])||touchHeld(m[3]),attack:pressed.has(m[4])?'attack':pressed.has(m[5])?'kick':pressed.has(m[6])?'sword_attack':pressed.has(m[7])?'ground_slide':undefined}}

class Dojo extends Phaser.Scene{
 pendingResult?:string;resultElapsed=0;
 ultiSounds:Partial<Record<'an'|'yuki',Phaser.Sound.BaseSound>>={};
 ultiBeams:Partial<Record<'an'|'yuki',Phaser.GameObjects.Image>>={};
 sprites:Phaser.GameObjects.Sprite[]=[];shadows:Phaser.GameObjects.Ellipse[]=[];music?:Phaser.Sound.BaseSound;boxGraphics?:Phaser.GameObjects.Graphics;
 preload(){this.load.image('background','/images/sunset_temple_background.png');this.load.image('courtyard','/images/dojo_courtyard_midground.png');this.load.image('spark','/images/hit_spark_arcade.png');this.load.audio('an-ulti','/audio/an-ulti.wav');this.load.audio('yuki-ulti','/audio/yuki-ulti.wav');this.load.audio('music','/audio/bgm_sunset_dojo.mp3');this.load.audio('punch-hit','/audio/punch-hit-retro.wav');this.load.audio('kick-hit','/audio/kick-hit-retro.wav');this.load.audio('sword-swing','/audio/samurai-slash.wav');this.load.audio('an-death-voice','/audio/an-death.wav');this.load.audio('ko','/audio/ko-compressed.wav')}
 create(){scene=this;this.add.image(640,360,'background').setDisplaySize(1280,720);this.add.image(640,631,'courtyard').setDisplaySize(1280,240);this.add.rectangle(640,720,1280,180,0x160f20,.28).setOrigin(.5,1);
 for(let i=0;i<2;i++){this.shadows.push(this.add.ellipse(0,655,125,18,0x090513,.5));this.sprites.push(this.add.sprite(0,SPRITE_BASELINE,'__DEFAULT').setVisible(false).setOrigin(.5,1).setScale(SPRITE_SCALE))}
 for(const skin of ['an','yuki'] as const)this.ultiSounds[skin]=this.sound.add('an-ulti',{volume:1});combat.onUlti=f=>{const audio=this.ultiSounds[f.collisionSkin!];audio?.stop();if(sound)audio?.play();};this.music=this.sound.add('music',{loop:true,volume:.35});combat.onDeath=f=>{if(sound&&(f.collisionSkin==='an'||f.collisionSkin==='yuki'))this.sound.play('an-death-voice',{volume:1})};combat.onAttack=action=>{if(action==='sword_attack')this.time.delayedCall(257,()=>{if(sound&&combat.phase==='fight')this.sound.play('sword-swing',{volume:.85})})};combat.onHit=(x,y,blocked,action)=>{this.cameras.main.shake(90,blocked?.001:.004);const fx=this.add.image(x,y,'spark').setDisplaySize(blocked?65:110,blocked?50:85).setAngle(Phaser.Math.Between(0,71)*5).setTint(blocked?0x97d9ff:0xffffff);this.tweens.add({targets:fx,alpha:0,scaleX:fx.scaleX*1.6,scaleY:fx.scaleY*1.6,duration:180,onComplete:()=>fx.destroy()});if(sound&&(action==='ground_slide'||action==='attack'||action==='kick'))this.sound.play(action==='kick'?'kick-hit':'punch-hit',{volume:.85});else if(!blocked)this.tone(110)};combat.onRound=(winner,finished)=>{if(sound&&!isYukiMode()&&combat.fighters.some(f=>f.hp<=0))this.sound.play('ko',{volume:1}); $('callout').textContent=winner<0?'DRAW':combat.fighters.some(f=>f.hp<=0)?'K.O.':'TIME UP';if(finished){this.resultElapsed=0;this.pendingResult=isYukiMode()?(winner===0?(isAnMode()?'An prevails.':'Yuki prevails.'):(isYukiPlayerMode()?'An Bot prevails.':isLocalMode()?'Yuki prevails.':'Yuki Bot prevails.')):winner===0?'Moon Ronin prevails.':'Ember Brawler prevails.'}};
 this.boxGraphics=this.add.graphics().setDepth(50);this.renderState();}
 matchReady=false;loadingMatch=false;loadedGroup?:boolean;
 async prepareMatch(){
  if(this.loadingMatch)return false;
  const anime=isYukiMode();
  if(this.loadedGroup===anime){this.matchReady=true;return true}
  this.loadingMatch=true;this.matchReady=false;
  this.sprites.forEach(s=>s.setTexture('__DEFAULT').setVisible(false));
  // Wait for any death-page request before clearing the old roster.
  if(this.load.isLoading())await new Promise<void>(resolve=>this.load.once('complete',resolve));
  for(const key of this.textures.getTextureKeys())if(/^(an|yuki|moon|ember)-/.test(key))this.textures.remove(key);
  this.deathLoads.clear();
  let failed=false;
  const fail=()=>{failed=true};this.load.on('loaderror',fail);
  if(anime){for(let page=0;page<5;page++){this.queueUltiPage(page,'an');this.queueUltiPage(page,'yuki');}for(let page=0;page<13;page++)this.load.spritesheet(`an-super-page-${page}`,`/characters/an/super-pages/${page}.png`,{frameWidth:512,frameHeight:512,endFrame:page===12?3:7});for(let page=0;page<13;page++)this.load.spritesheet(`yuki-super-page-${page}`,`/characters/yuki/super-pages/${page}.png`,{frameWidth:512,frameHeight:512,endFrame:page===12?3:7});for(let page=0;page<2;page++)this.load.spritesheet(`an-death-page-${page}`,`/characters/an/death-pages-120/${page}.png`,{frameWidth:512,frameHeight:512,endFrame:7});for(let page=0;page<16;page++)this.load.spritesheet(`an-slash62-${page}`,`/characters/an/slash-62-pages/${page}.png`,{frameWidth:768,frameHeight:512,endFrame:page===15?1:3});this.load.spritesheet('an-hurt','/characters/an/hurt.png',{frameWidth:512,frameHeight:512});this.load.spritesheet('an-jump','/characters/an/jump.png',{frameWidth:512,frameHeight:512});this.load.spritesheet('an-slide','/characters/an/ground_slide.png',{frameWidth:512,frameHeight:512});this.load.multiatlas('an-kick','/characters/an/kick-pages/atlas.json','/characters/an/kick-pages');this.load.multiatlas('an-attack','/characters/an/attack-pages/atlas.json','/characters/an/attack-pages');this.load.multiatlas('an-run','/characters/an/run-pages/atlas.json','/characters/an/run-pages');this.load.spritesheet('an-idle','/characters/an/idle.png',{frameWidth:512,frameHeight:512});for(let page=0;page<16;page++)this.load.spritesheet(`yuki-slash62-${page}`,`/characters/yuki/slash-62-pages/${page}.png`,{frameWidth:768,frameHeight:512,endFrame:page===15?1:3});for(let page=0;page<2;page++)this.load.spritesheet(`yuki-death-page-${page}`,`/characters/yuki/death-pages-105/${page}.png`,{frameWidth:512,frameHeight:512,endFrame:7});this.load.multiatlas('yuki-kick','/characters/yuki/kick-pages/atlas.json','/characters/yuki/kick-pages');this.load.multiatlas('yuki-punch','/characters/yuki/attack-pages/atlas.json','/characters/yuki/attack-pages');this.load.spritesheet('yuki-slide','/characters/yuki/ground_slide.png',{frameWidth:512,frameHeight:512});this.load.spritesheet('yuki-jump','/characters/yuki/jump.png',{frameWidth:512,frameHeight:512});this.load.spritesheet('yuki-hurt','/characters/yuki/hurt.png',{frameWidth:512,frameHeight:512});this.load.multiatlas('yuki-run','/characters/yuki/run-pages/atlas.json','/characters/yuki/run-pages');this.load.spritesheet('yuki-idle','/characters/yuki/idle.png',{frameWidth:512,frameHeight:512});}else{for(const {key:who} of fighters)for(const action of actions){if(['attack','kick','run'].includes(action))this.load.multiatlas(`${who}-${action}`,`/characters/${who}/${action}-pages/atlas.json`,`/characters/${who}/${action}-pages`);else this.load.spritesheet(`${who}-${action}`,`/characters/${who}/${spriteFile(who,action)}`,{frameWidth:512,frameHeight:512})}}
  await new Promise<void>(resolve=>{this.load.once('complete',resolve);this.load.start()});
  this.load.off('loaderror',fail);this.loadingMatch=false;
  if(failed){this.loadedGroup=undefined;return false}
  this.loadedGroup=anime;this.matchReady=true;this.sprites.forEach(s=>s.setVisible(true));return true;
 }
 superFrame(time:number,skin:'an'|'yuki'='yuki'){
  if(skin==='an'){const index=Math.min(99,Math.floor(Math.max(0,time)*100/1.5));return {key:`an-super-page-${Math.floor(index/8)}`,frame:index%8}}
  const index=superFrameIndex(time),page=Math.floor(index/8);
  const key=`yuki-super-page-${page}`;if(this.textures.exists(key))return {key,frame:index%8};
  for(let p=page-1;p>=0;p--){const k=`yuki-super-page-${p}`;if(this.textures.exists(k))return {key:k,frame:7}}
  return {key:'yuki-idle',frame:0};
 }
 queueUltiPage(page:number,skin:'an'|'yuki'){
 for(const beam of [false,true]){const key=`${skin}-ulti-${beam?'beam-':''}${page}`;if(this.textures.exists(key)||this.deathLoads.has(key))continue;this.deathLoads.add(key);this.load.once(`filecomplete-spritesheet-${key}`,()=>this.deathLoads.delete(key));this.load.spritesheet(key,`/characters/${skin}/ulti-pages/${beam?'beam-':''}${page}.webp`,{frameWidth:beam?192:768,frameHeight:432,endFrame:3});}
 }
 ultiShownFrames={an:0,yuki:0};
 streamUlti(){
 if(!this.matchReady||!isYukiMode())return;
 for(const skin of ['an','yuki'] as const){const f=combat.fighters.find(f=>f.collisionSkin===skin&&f.ultiTime!==undefined),page=f?Math.floor(Math.min(99,Math.floor(f.ultiTime!*25))/4):0;
 const wanted=new Set<number>([Math.floor(this.ultiShownFrames[skin]/4)]);for(let p=page;p<=Math.min(24,page+4);p++){wanted.add(p);this.queueUltiPage(p,skin)}
 for(let p=0;p<25;p++)if(!wanted.has(p))for(const beam of [false,true]){const key=`${skin}-ulti-${beam?'beam-':''}${p}`;if(this.textures.exists(key)&&!this.sprites.some(s=>s.texture.key===key)&&this.ultiBeams[skin]?.texture.key!==key)this.textures.remove(key)}
 }
 if(!this.load.isLoading()&&this.deathLoads.size)this.load.start();
 }
 renderUlti(){
 for(const skin of ['an','yuki'] as const){const active=combat.phase==='fight'&&combat.fighters.some(f=>f.collisionSkin===skin&&f.ultiTime!==undefined),audio=this.ultiSounds[skin];if(!active||!sound)audio?.stop();else if(paused&&audio?.isPlaying)audio.pause();else if(!paused&&audio?.isPaused)audio.resume();this.ultiBeams[skin]?.setVisible(false);}
 for(let i=0;i<combat.fighters.length;i++){const f=combat.fighters[i],skin=f.collisionSkin;if(!skin||f.ultiTime===undefined)continue;const requested=Math.min(99,Math.floor(f.ultiTime*25)),requestedPage=Math.floor(requested/4);
 if(f.ultiTime<1/25)this.ultiShownFrames[skin]=0;
 if(this.textures.exists(`${skin}-ulti-${requestedPage}`)&&this.textures.exists(`${skin}-ulti-beam-${requestedPage}`))this.ultiShownFrames[skin]=requested;
 const index=this.ultiShownFrames[skin],page=Math.floor(index/4),key=`${skin}-ulti-${page}`,beam=`${skin}-ulti-beam-${page}`,scale=skin==='an'?AN_ULTI_SCALE:ULTI_SCALE,ox=skin==='an'?AN_ULTI_ORIGIN_X:ULTI_ORIGIN_X,oy=skin==='an'?AN_ULTI_ORIGIN_Y:ULTI_ORIGIN_Y;
 if(!this.textures.exists(key)||!this.textures.exists(beam))continue;
 if(skin==='an'&&index<13){this.sprites[i].setTexture(key,index%4).setCrop().setFlipX(false).setScale(f.face*scale,scale).setOrigin(ox/768,oy/432).setDepth(5);continue;}
 const seam=skin==='an'?((anUltiSeams as Record<string,number>)[index]??672):672;
 this.sprites[i].setTexture(key,index%4).setCrop(0,0,seam,432).setFlipX(false).setScale(f.face*scale,scale).setOrigin(ox/768,oy/432).setDepth(5);
 if(skin==='yuki'||skin==='an'){
 const x=f.x+f.face*(seam-ox)*scale,width=Math.max(0,f.face>0?1280-x:x),pixels=Math.max(1,Math.ceil(width/scale)),canvasKey=`${skin}-ulti-tiled-extension`;
 let texture=this.textures.get(canvasKey) as Phaser.Textures.CanvasTexture;
 if(!this.textures.exists(canvasKey))texture=this.textures.createCanvas(canvasKey,pixels,432)!;
 const stamp=`${index}/${pixels}`;
 if((texture as any).__beamStamp!==stamp){texture.setSize(pixels,432);const ctx=texture.context;ctx.clearRect(0,0,pixels,432);const source=this.textures.get(key).getSourceImage() as HTMLImageElement;
 for(let offset=0,tile=0;offset<pixels;offset+=96,tile++){ctx.save();ctx.translate(offset+(tile%2===0?96:0),0);ctx.scale(tile%2===0?-1:1,1);ctx.drawImage(source,index%2*768+seam-96,Math.floor(index%4/2)*432,96,432,0,0,96,432);ctx.restore();}texture.refresh();(texture as any).__beamStamp=stamp;}
 const extension=this.ultiBeams[skin]??(this.ultiBeams[skin]=this.add.image(0,0,canvasKey));extension.setTexture(canvasKey).setVisible(true).setDepth(5).setOrigin(0,0).setFlipX(false).setPosition(x,SPRITE_BASELINE+f.y-oy*scale).setScale(f.face*scale,scale);continue;
 }

 }
 combat.fighters.forEach((f,i)=>{if(f.ultiTime===undefined&&combat.fighters[1-i].ultiTime!==undefined)this.sprites[i].setDepth(6)});
 }
 deathLoads=new Set<string>();
 deathFrame(skin:'an'|'yuki',time:number){
  const count=skin==='an'?120:105,index=Math.min(count-1,Math.floor(Math.max(0,time)*count/6)),page=Math.floor(index/8);
  const key=`${skin}-death-page-${page}`;
  if(this.textures.exists(key))return {key,frame:index%8};
  for(let p=page-1;p>=0;p--){const previous=`${skin}-death-page-${p}`;if(this.textures.exists(previous))return {key:previous,frame:7}}
  return {key:`${skin}-idle`,frame:0};
 }
 streamAnDeath(){
  if(!this.matchReady||!isYukiMode())return;
  for(const skin of ['an','yuki'] as const){
   const count=skin==='an'?120:105,last=Math.ceil(count/8)-1;
   const dying=combat.fighters.find(f=>f.collisionSkin===skin&&f.action==='death');
   const page=dying?Math.floor(Math.min(count-1,Math.floor(Math.max(0,dying.time)*count/6))/8):0;
   const wanted=new Set([page,Math.min(last,page+1)]);
   for(let p=0;p<=last;p++){const key=`${skin}-death-page-${p}`;if(!wanted.has(p)&&this.textures.exists(key)&&!this.sprites.some(s=>s.texture.key===key))this.textures.remove(key)}
   for(const p of wanted){const key=`${skin}-death-page-${p}`;if(this.textures.exists(key)||this.deathLoads.has(key))continue;
    this.deathLoads.add(key);this.load.once(`filecomplete-spritesheet-${key}`,()=>this.deathLoads.delete(key));
    this.load.spritesheet(key,`/characters/${skin}/${skin==='an'?'death-pages-120':'death-pages-105'}/${p}.png`,{frameWidth:512,frameHeight:512,endFrame:Math.min(7,count-p*8-1)});
   }
  }
  if(!this.load.isLoading()&&this.deathLoads.size)this.load.start();
 }
 tone(frequency:number){if(!sound)return;const context=(this.sound as Phaser.Sound.WebAudioSoundManager).context;if(!context)return;const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type='triangle';oscillator.frequency.setValueAtTime(frequency,context.currentTime);oscillator.frequency.exponentialRampToValueAtTime(40,context.currentTime+.12);gain.gain.setValueAtTime(.12,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.15);oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.16)}
 update(time:number,delta:number){if(!paused&&this.matchReady&&this.loadedGroup===isYukiMode())combat.update(Math.min(delta/1000,.035),[input(),!isLocalMode()?bot(combat,time):input(true)]);if(this.pendingResult){if(combat.phase!=='over')this.pendingResult=undefined;else if(!paused){if(combat.deathAnimationComplete)this.resultElapsed+=Math.min(delta/1000,.035);if(combat.deathAnimationComplete&&this.resultElapsed>=1){showMenu(this.pendingResult);this.pendingResult=undefined}}}pressed.clear();if(combat.phase==='fight'&&!paused)$('callout').textContent=!combat.training&&combat.roundElapsed<1?'FIGHT':'';this.renderState()}
 renderState(){if(!this.matchReady||this.loadedGroup!==isYukiMode())return;combat.fighters.forEach((f,i)=>{const sprite=this.sprites[i];if(!sprite)return;sprite.setCrop();sprite.setDepth(fighterDepth(f));sprite.setPosition(f.x,SPRITE_BASELINE+f.y).setFlipX(f.face<0);const yuki=isYukiMode();f.collisionSkin=yuki?(animeSkin(i)):undefined;const yukiRun=yuki&&f.action==='run';const yukiHurt=yuki&&f.action==='hurt';const yukiDeath=yuki&&f.action==='death';const yukiJump=yuki&&f.action==='jump';const yukiSlide=yuki&&f.action==='ground_slide';const yukiPunch=yuki&&f.action==='attack';const yukiKick=yuki&&f.action==='kick';const yukiSlash=yuki&&f.action==='sword_attack';const animation=yuki?(yukiSlash?`yuki-slash62-${Math.floor(Math.min(61,Math.floor(f.time*62/.6))/4)}`:yukiDeath?this.deathFrame('yuki',f.time).key:yukiHurt?'yuki-hurt':yukiKick?'yuki-kick':yukiPunch?'yuki-punch':yukiSlide?'yuki-slide':yukiJump?'yuki-jump':yukiRun?'yuki-run':'yuki-idle'):`${fighters[i].key}-${f.action}`;sprite.anims.stop();sprite.setTexture(animation,yuki?(yukiSlash?Math.min(61,Math.floor(f.time*62/.6))%4:yukiDeath?this.deathFrame('yuki',f.time).frame:yukiHurt?0:yukiKick?attackFrame(f.time,attacks.kick!.active,attacks.kick!.duration,9):yukiPunch?poseFrame(f,attacks.attack):yukiSlide?poseFrame(f,attacks[f.action]):yukiJump?poseFrame(f):yukiRun?Math.floor(Math.max(0,f.time)*20)%10:Math.floor(Math.max(0,f.time)*3)%2):poseFrame(f,attacks[f.action]));if(isYukiMode()&&animeSkin(i)==='an')sprite.setTexture(f.action==='death'?this.deathFrame('an',f.time).key:f.action==='sword_attack'?`an-slash62-${Math.floor(Math.min(61,Math.floor(f.time*62/.6))/4)}`:f.action==='hurt'?'an-hurt':f.action==='jump'?'an-jump':f.action==='ground_slide'?'an-slide':f.action==='kick'?'an-kick':f.action==='attack'?'an-attack':f.action==='run'?'an-run':'an-idle',f.action==='death'?this.deathFrame('an',f.time).frame:f.action==='sword_attack'?Math.min(61,Math.floor(f.time*62/.6))%4:f.action==='hurt'?0:f.action==='jump'?poseFrame(f):f.action==='ground_slide'?poseFrame(f,attacks.ground_slide):f.action==='kick'?attackFrame(f.time,attacks.kick!.active,attacks.kick!.duration,9):f.action==='attack'?poseFrame(f,attacks.attack):f.action==='run'?Math.floor(Math.max(0,f.time)*20)%10:Math.floor(Math.max(0,f.time)*3)%2);if(f.collisionSkin&&f.superTime!==undefined){const pose=this.superFrame(f.superTime,f.collisionSkin);sprite.setTexture(pose.key,pose.frame)}const anSuper=f.collisionSkin==='an'&&f.superTime!==undefined;const anSuperScale=372/321;sprite.setScale(SPRITE_SCALE*(anSuper?anSuperScale:1));sprite.setOrigin(.5,anSuper?(413+(512-491)/anSuperScale)/512:1);sprite.setTint(f.guard?0xb1dfff:0xffffff);this.shadows[i].setPosition(f.x,655).setAlpha(f.y<0?.2:.5);const prefix=i===0?'p':'r';const ultiHud=$(`${prefix}-ulti`);ultiHud.hidden=!f.collisionSkin;ultiHud.querySelector('i')!.style.width=`${f.ultiCharge}%`;ultiHud.querySelector('span')!.textContent=f.ultiCharge>=100?`ULTI READY · ${i===0?'O':'5'}`:`ULTI ${Math.floor(f.ultiCharge)} / 100`;$(`${prefix}-hp`).style.width=`${f.hp/maxHp(f)*100}%`;$(`${prefix}-energy`).style.width=`${f.energy}%`;const superHud=$(`${prefix}-super`);superHud.hidden=!f.collisionSkin;superHud.querySelector('i')!.style.width=`${f.superCharge}%`;superHud.querySelector('span')!.textContent=f.superCharge>=100?`SUPER READY · ${i===0?'I':'4'}`:`SUPER ${Math.floor(f.superCharge)} / 100`;$(`${prefix}-wins`).textContent=[0,1].map(n=>f.wins>n?'●':'○').join(' ')});$('touch-super').hidden=!isYukiMode();$('touch-ulti').hidden=!isYukiMode();this.streamAnDeath();this.streamUlti();this.renderUlti();this.drawBoxes();$('timer').textContent='∞';$('round').textContent=combat.training?'TRAINING':`ROUND ${String(combat.round).padStart(2,'0')}`;}
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
     for(const b of getHitboxes(fighter,timing)){graphics.fillStyle(0xff625c,.25).lineStyle(2,0xff625c,1).beginPath();hitboxCorners(b).forEach((p,i)=>i?graphics.lineTo(p.x,p.y):graphics.moveTo(p.x,p.y));graphics.closePath().fillPath().strokePath();}
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
 $('p-super-help').hidden=!isYukiMode();$('p-ulti-help').hidden=!isYukiMode();$('r-super-help').hidden=!(isLocalMode()&&isYukiMode());$('r-ulti-help').hidden=!(isLocalMode()&&isYukiMode());
 $('menu-p1').innerHTML=`<strong>P1 · ${isAnMode()?'AN':isYukiMode()?'YUKI':'RONIN'}</strong>`+document.querySelector('.fighter:not(.right) .hud-controls')!.innerHTML.replace(/ id="[^"]*"/g,'');
 $('menu-p2').innerHTML=`<strong>P2 · ${isYukiMode()?(animeSkin(1)==='yuki'?'YUKI':'AN'):'EMBER'}</strong>`+$('p2-controls').innerHTML.replace(/ id="[^"]*"/g,'');
 $('menu-p2').hidden=!isLocalMode();
 $('mode-description').textContent=mode==='yuki-local-training'?'Local Yuki vs An luyện tập: P1 Yuki · I SUPER / O ULTI. P2 An · 4 SUPER. Vô hạn máu, năng lượng, thanh luôn đầy.':mode==='an-local-training'?'Local An vs Yuki luyện tập: vô hạn máu, năng lượng; SUPER hai người luôn đầy, ULTI Yuki luôn đầy. P1: I SUPER · P2: 4 SUPER / 5 ULTI.':mode==='yuki-training'?'Train Yuki vs An Bot: P1 điều khiển Yuki; cả hai vô hạn máu, năng lượng và thời gian. Đánh trúng để tích SUPER, bấm I khi đầy.':mode==='yuki-an'?'Yuki đấu với bot An: BO3, thắng 2 round; điều khiển Yuki bằng bộ phím P1.':mode==='an-training'?'Train An vs Yuki / Luyện tập: P1 điều khiển An, đối thủ là bot Yuki; cả hai vô hạn máu, năng lượng và thời gian.':mode==='an-local'?'Local An vs Yuki / Hai người cùng bàn phím: P1 điều khiển An, P2 điều khiển Yuki; BO3, thắng 2 round.':isAnMode()?'An đấu với bot Yuki: BO3, thắng 2 round; điều khiển An bằng bộ phím P1.':mode==='training'?'Training / Luyện tập với bot: vô hạn máu, năng lượng và thời gian.':isLocalMode()?'Local / Hai người cùng bàn phím: P1 điều khiển Ronin, P2 điều khiển Ember.':'VS Computer / Đấu với bot: anh điều khiển Ronin bằng bộ phím P1.';
 $('mode-rules').textContent=isTrainingMode()?'INFINITE HEALTH · ENERGY · TIME / VÔ HẠN MÁU · NĂNG LƯỢNG · THỜI GIAN':'FIRST TO TWO ROUNDS · NO TIME LIMIT / THẮNG 2 ROUND · KHÔNG GIỚI HẠN THỜI GIAN';
}
updateMenuHelp();
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button=>button.onclick=()=>{if(scene?.loadingMatch)return;const requested=button.dataset.mode!;if((requested==='yuki-local-training'||requested==='an'||requested==='an-local-training'||requested==='an-local'||requested==='an-training'||requested==='yuki-an'||requested==='yuki-training')&&!unlockAn())return;mode=requested;$('p-name').textContent=isAnMode()?'01 / AN':isYukiMode()?'01 / YUKI':'01 / MOON RONIN';$('r-name').textContent=isYukiMode()?(isYukiPlayerMode()?(isLocalMode()?'AN / 02':'AN BOT / 02'):isLocalMode()?'YUKI / 02':'YUKI BOT / 02'):'EMBER BRAWLER / 02';scene?.renderState();updateMenuHelp();$('p2-controls').hidden=!isLocalMode();document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('selected',b===button));$('p2-help').textContent=isLocalMode()?(isYukiMode()?'P2: Arrows move / guard · 1 / 2 / 3 / 0 attacks · 4 SUPER · 5 ULTI (đầy thanh)':'P2: Arrows move / guard · 1 / 2 / 3 / 0 attacks'):'Keep your stamina. A patient fighter survives.'});
$('start').onclick=async()=>{if(!scene||scene.loadingMatch)return;if(isYukiMode()&&!unlockAn())return;const startButton=$('start') as HTMLButtonElement;startButton.disabled=true;const label=startButton.textContent;startButton.textContent='Đang tải…';const ready=await scene.prepareMatch();startButton.disabled=false;startButton.textContent=label;if(!ready){$('status').textContent='Không tải được ảnh. Anh thử lại nhé.';return;}keys.clear();pressed.clear();combat.start(isTrainingMode(),isYukiMode()?[animeSkin(0),animeSkin(1)]:[],mode==='an-local-training'||mode==='yuki-local-training');combat.fighters.forEach((f,i)=>f.collisionSkin=isYukiMode()?animeSkin(i):undefined);paused=false;$('pause-menu').hidden=true;$('pause').textContent='ESC / PAUSE';$('overlay').classList.add('hidden');$('status').textContent=mode==='yuki-local-training'?'LOCAL YUKI VS AN · INFINITE TRAINING':mode==='an-local-training'?'LOCAL AN VS YUKI · INFINITE TRAINING':mode==='yuki-training'?'YUKI VS AN BOT · INFINITE TRAINING':mode==='yuki-an'?'YUKI VS AN BOT · BO3':mode==='an-training'?'AN VS YUKI BOT · INFINITE TRAINING':mode==='an-local'?'LOCAL AN VS YUKI · BO3':isAnMode()?'AN VS YUKI BOT · BO3':mode==='training'?'TRAINING · INFINITE HEALTH':mode==='bot'?'YOU VS EMBER AI':'LOCAL DUEL';if(sound&&!scene.music?.isPlaying)scene.music?.play()};
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

if(import.meta.env.DEV&&new URLSearchParams(location.search).has('ulti-preview')){
 const button=document.createElement('button');button.textContent='THỬ ULTI YUKI';button.style.cssText='position:fixed;right:12px;bottom:12px;z-index:100;background:#59399b;padding:12px';document.body.append(button);
 button.onclick=async()=>{if(!scene||scene.loadingMatch)return;anUnlocked=true;mode='yuki-training';updateMenuHelp();await scene.prepareMatch();combat.start(true,['yuki','an']);combat.fighters[0].x=300;combat.fighters[1].x=1000;combat.fighters[0].ultiCharge=100;paused=false;$('overlay').classList.add('hidden');pressed.add('KeyO');};
}

if(import.meta.env.DEV&&new URLSearchParams(location.search).has('ulti-preview')){
 const button=document.createElement('button');button.textContent='XEM MỐI NỐI TRÁI / PHẢI';button.style.cssText='position:fixed;left:12px;bottom:12px;z-index:100;background:#59399b;padding:12px';document.body.append(button);
 button.onclick=()=>{if(!scene?.matchReady)return;const f=combat.fighters[0];f.collisionSkin='yuki';f.x=640;f.face=f.face>0?-1:1;f.ultiTime=2;paused=true;};
}

if(import.meta.env.DEV&&new URLSearchParams(location.search).has('an-ulti-preview')){
 const button=document.createElement('button');button.textContent='THỬ ULTI AN';button.style.cssText='position:fixed;right:12px;bottom:12px;z-index:100;background:#59399b;padding:12px';document.body.append(button);
 button.onclick=async()=>{if(!scene||scene.loadingMatch)return;anUnlocked=true;mode='an-local-training';updateMenuHelp();await scene.prepareMatch();combat.start(true,['an','yuki'],true);combat.fighters[0].x=350;combat.fighters[1].x=1050;paused=false;$('overlay').classList.add('hidden');pressed.add('KeyO');};
}
