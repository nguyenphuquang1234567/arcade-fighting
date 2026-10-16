import Phaser from 'phaser';
import {Combat,bot,attacks,MAX_HP,type Action,type Input} from './combat';
import './style.css';
import {hitboxCorners} from './hitbox-model';
import {getHitboxes, getHurtboxes, SPRITE_SCALE, SPRITE_BASELINE, poseFrame} from './geometry';
import {fighters, actions, frameCounts, frameCount, spriteFile, attackFrame} from './fighters';
const $=(id:string)=>document.getElementById(id)!;
const combat=new Combat();let mode='bot',paused=false,sound=true,showBoxes=false,scene:Dojo;
const isAnMode=()=>mode==='an'||mode==='an-local'||mode==='an-training';
const isLocalMode=()=>mode==='local'||mode==='an-local';
const isYukiMode=()=>isAnMode()||mode==='yuki-an';
const animeSkin=(i:number)=>mode==='yuki-an'?(i===0?'yuki':'an'):(i===0?'an':'yuki');
const isTrainingMode=()=>mode==='training'||mode==='an-training';
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
function input(second=false):Input{const m=second?['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Digit1','Digit2','Digit3','Digit0']:['KeyA','KeyD','KeyW','KeyS','KeyJ','KeyK','KeyL','KeyU'];return{move:Number(keys.has(m[1])||touchHeld(m[1]))-Number(keys.has(m[0])||touchHeld(m[0])),jump:keys.has(m[2])||touchHeld(m[2]),guard:keys.has(m[3])||touchHeld(m[3]),attack:pressed.has(m[4])?'attack':pressed.has(m[5])?'kick':pressed.has(m[6])?'sword_attack':pressed.has(m[7])?'ground_slide':undefined}}

class Dojo extends Phaser.Scene{
 pendingResult?:string;resultElapsed=0;
 sprites:Phaser.GameObjects.Sprite[]=[];shadows:Phaser.GameObjects.Ellipse[]=[];music?:Phaser.Sound.BaseSound;boxGraphics?:Phaser.GameObjects.Graphics;
 preload(){this.load.image('background','/images/sunset_temple_background.png');this.load.image('courtyard','/images/dojo_courtyard_midground.png');this.load.image('spark','/images/hit_spark_arcade.png');this.load.audio('music','/audio/bgm_sunset_dojo.mp3');this.load.audio('punch-hit','/audio/punch-hit-retro.wav');this.load.audio('kick-hit','/audio/kick-hit-retro.wav');this.load.audio('sword-swing','/audio/samurai-slash.wav');this.load.audio('an-death-voice','/audio/an-death.wav');this.load.audio('ko','/audio/ko-compressed.wav')}
 create(){scene=this;this.add.image(640,360,'background').setDisplaySize(1280,720);this.add.image(640,631,'courtyard').setDisplaySize(1280,240);this.add.rectangle(640,720,1280,180,0x160f20,.28).setOrigin(.5,1);
 for(let i=0;i<2;i++){this.shadows.push(this.add.ellipse(0,655,125,18,0x090513,.5));this.sprites.push(this.add.sprite(0,SPRITE_BASELINE,'__DEFAULT').setVisible(false).setOrigin(.5,1).setScale(SPRITE_SCALE))}
 this.music=this.sound.add('music',{loop:true,volume:.35});combat.onDeath=f=>{if(sound&&(f.collisionSkin==='an'||f.collisionSkin==='yuki'))this.sound.play('an-death-voice',{volume:1})};combat.onAttack=action=>{if(action==='sword_attack')this.time.delayedCall(257,()=>{if(sound&&combat.phase==='fight')this.sound.play('sword-swing',{volume:.85})})};combat.onHit=(x,y,blocked,action)=>{this.cameras.main.shake(90,blocked?.001:.004);const fx=this.add.image(x,y,'spark').setDisplaySize(blocked?65:110,blocked?50:85).setAngle(Phaser.Math.Between(0,71)*5).setTint(blocked?0x97d9ff:0xffffff);this.tweens.add({targets:fx,alpha:0,scaleX:fx.scaleX*1.6,scaleY:fx.scaleY*1.6,duration:180,onComplete:()=>fx.destroy()});if(sound&&(action==='ground_slide'||action==='attack'||action==='kick'))this.sound.play(action==='kick'?'kick-hit':'punch-hit',{volume:.85});else if(!blocked)this.tone(110)};combat.onRound=(winner,finished)=>{if(sound&&!isYukiMode()&&combat.fighters.some(f=>f.hp<=0))this.sound.play('ko',{volume:1}); $('callout').textContent=winner<0?'DRAW':combat.fighters.some(f=>f.hp<=0)?'K.O.':'TIME UP';if(finished){this.resultElapsed=0;this.pendingResult=isYukiMode()?(winner===0?(isAnMode()?'An prevails.':'Yuki prevails.'):(mode==='yuki-an'?'An Bot prevails.':isLocalMode()?'Yuki prevails.':'Yuki Bot prevails.')):winner===0?'Moon Ronin prevails.':'Ember Brawler prevails.'}};
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
  if(anime){for(let page=0;page<2;page++)this.load.spritesheet(`an-death-page-${page}`,`/characters/an/death-pages/${page}.png`,{frameWidth:512,frameHeight:512,endFrame:7});this.load.spritesheet('an-slash','/characters/an/sword_attack.png',{frameWidth:512,frameHeight:512});this.load.spritesheet('an-hurt','/characters/an/hurt.png',{frameWidth:512,frameHeight:512});this.load.spritesheet('an-jump','/characters/an/jump.png',{frameWidth:512,frameHeight:512});this.load.spritesheet('an-slide','/characters/an/ground_slide.png',{frameWidth:512,frameHeight:512});this.load.spritesheet('an-kick','/characters/an/kick.png',{frameWidth:512,frameHeight:512});this.load.spritesheet('an-attack','/characters/an/attack.png',{frameWidth:512,frameHeight:512});this.load.spritesheet('an-run','/characters/an/run.png',{frameWidth:512,frameHeight:512});this.load.spritesheet('an-idle','/characters/an/idle.png',{frameWidth:512,frameHeight:512});this.load.spritesheet('yuki-slash','/characters/yuki/sword_attack.png',{frameWidth:512,frameHeight:512});for(let page=0;page<2;page++)this.load.spritesheet(`yuki-death-page-${page}`,`/characters/yuki/death-pages-105/${page}.png`,{frameWidth:512,frameHeight:512,endFrame:7});this.load.spritesheet('yuki-kick','/characters/yuki/kick-user-9.png',{frameWidth:512,frameHeight:512});this.load.spritesheet('yuki-punch','/characters/yuki/attack.png',{frameWidth:512,frameHeight:512});this.load.spritesheet('yuki-slide','/characters/yuki/ground_slide.png',{frameWidth:512,frameHeight:512});this.load.spritesheet('yuki-jump','/characters/yuki/jump.png',{frameWidth:512,frameHeight:512});this.load.spritesheet('yuki-hurt','/characters/yuki/hurt.png',{frameWidth:512,frameHeight:512});this.load.spritesheet('yuki-run','/characters/yuki/run.png',{frameWidth:512,frameHeight:512});this.load.spritesheet('yuki-idle','/characters/yuki/idle.png',{frameWidth:512,frameHeight:512});}else{for(const {key:who} of fighters)for(const action of actions)this.load.spritesheet(`${who}-${action}`,`/characters/${who}/${spriteFile(who,action)}`,{frameWidth:512,frameHeight:512});}
  await new Promise<void>(resolve=>{this.load.once('complete',resolve);this.load.start()});
  this.load.off('loaderror',fail);this.loadingMatch=false;
  if(failed){this.loadedGroup=undefined;return false}
  this.loadedGroup=anime;this.matchReady=true;this.sprites.forEach(s=>s.setVisible(true));return true;
 }
 deathLoads=new Set<string>();
 deathFrame(skin:'an'|'yuki',time:number){
  const count=skin==='an'?85:105,index=Math.min(count-1,Math.floor(Math.max(0,time)*count/6)),page=Math.floor(index/8);
  const key=`${skin}-death-page-${page}`;
  if(this.textures.exists(key))return {key,frame:index%8};
  for(let p=page-1;p>=0;p--){const previous=`${skin}-death-page-${p}`;if(this.textures.exists(previous))return {key:previous,frame:7}}
  return {key:`${skin}-idle`,frame:0};
 }
 streamAnDeath(){
  if(!this.matchReady||!isYukiMode())return;
  for(const skin of ['an','yuki'] as const){
   const count=skin==='an'?85:105,last=Math.ceil(count/8)-1;
   const dying=combat.fighters.find(f=>f.collisionSkin===skin&&f.action==='death');
   const page=dying?Math.floor(Math.min(count-1,Math.floor(Math.max(0,dying.time)*count/6))/8):0;
   const wanted=new Set([page,Math.min(last,page+1)]);
   for(let p=0;p<=last;p++){const key=`${skin}-death-page-${p}`;if(!wanted.has(p)&&this.textures.exists(key)&&!this.sprites.some(s=>s.texture.key===key))this.textures.remove(key)}
   for(const p of wanted){const key=`${skin}-death-page-${p}`;if(this.textures.exists(key)||this.deathLoads.has(key))continue;
    this.deathLoads.add(key);this.load.once(`filecomplete-spritesheet-${key}`,()=>this.deathLoads.delete(key));
    this.load.spritesheet(key,`/characters/${skin}/${skin==='an'?'death-pages':'death-pages-105'}/${p}.png`,{frameWidth:512,frameHeight:512,endFrame:Math.min(7,count-p*8-1)});
   }
  }
  if(!this.load.isLoading()&&this.deathLoads.size)this.load.start();
 }
 tone(frequency:number){if(!sound)return;const context=(this.sound as Phaser.Sound.WebAudioSoundManager).context;if(!context)return;const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type='triangle';oscillator.frequency.setValueAtTime(frequency,context.currentTime);oscillator.frequency.exponentialRampToValueAtTime(40,context.currentTime+.12);gain.gain.setValueAtTime(.12,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.15);oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.16)}
 update(time:number,delta:number){if(!paused&&this.matchReady&&this.loadedGroup===isYukiMode())combat.update(Math.min(delta/1000,.035),[input(),!isLocalMode()?bot(combat,time):input(true)]);if(this.pendingResult){if(combat.phase!=='over')this.pendingResult=undefined;else if(!paused){if(combat.deathAnimationComplete)this.resultElapsed+=Math.min(delta/1000,.035);if(combat.deathAnimationComplete&&this.resultElapsed>=1){showMenu(this.pendingResult);this.pendingResult=undefined}}}pressed.clear();if(combat.phase==='fight'&&!paused)$('callout').textContent=!combat.training&&combat.roundElapsed<1?'FIGHT':'';this.renderState()}
 renderState(){if(!this.matchReady||this.loadedGroup!==isYukiMode())return;combat.fighters.forEach((f,i)=>{const sprite=this.sprites[i];if(!sprite)return;sprite.setPosition(f.x,SPRITE_BASELINE+f.y).setFlipX(f.face<0);const yuki=isYukiMode();f.collisionSkin=yuki?(animeSkin(i)):undefined;const yukiRun=yuki&&f.action==='run';const yukiHurt=yuki&&f.action==='hurt';const yukiDeath=yuki&&f.action==='death';const yukiJump=yuki&&f.action==='jump';const yukiSlide=yuki&&f.action==='ground_slide';const yukiPunch=yuki&&f.action==='attack';const yukiKick=yuki&&f.action==='kick';const yukiSlash=yuki&&f.action==='sword_attack';const animation=yuki?(yukiSlash?'yuki-slash':yukiDeath?this.deathFrame('yuki',f.time).key:yukiHurt?'yuki-hurt':yukiKick?'yuki-kick':yukiPunch?'yuki-punch':yukiSlide?'yuki-slide':yukiJump?'yuki-jump':yukiRun?'yuki-run':'yuki-idle'):`${fighters[i].key}-${f.action}`;sprite.anims.stop();sprite.setTexture(animation,yuki?(yukiSlash?poseFrame(f,attacks.sword_attack):yukiDeath?this.deathFrame('yuki',f.time).frame:yukiHurt?0:yukiKick?attackFrame(f.time,attacks.kick!.active,attacks.kick!.duration,9):yukiPunch?poseFrame(f,attacks.attack):yukiSlide?poseFrame(f,attacks[f.action]):yukiJump?poseFrame(f):yukiRun?Math.floor(Math.max(0,f.time)*20)%10:Math.floor(Math.max(0,f.time)*3)%2):poseFrame(f,attacks[f.action]));if(isYukiMode()&&animeSkin(i)==='an')sprite.setTexture(f.action==='death'?this.deathFrame('an',f.time).key:f.action==='sword_attack'?'an-slash':f.action==='hurt'?'an-hurt':f.action==='jump'?'an-jump':f.action==='ground_slide'?'an-slide':f.action==='kick'?'an-kick':f.action==='attack'?'an-attack':f.action==='run'?'an-run':'an-idle',f.action==='death'?this.deathFrame('an',f.time).frame:f.action==='sword_attack'?poseFrame(f,attacks.sword_attack):f.action==='hurt'?0:f.action==='jump'?poseFrame(f):f.action==='ground_slide'?poseFrame(f,attacks.ground_slide):f.action==='kick'?attackFrame(f.time,attacks.kick!.active,attacks.kick!.duration,9):f.action==='attack'?poseFrame(f,attacks.attack):f.action==='run'?Math.floor(Math.max(0,f.time)*20)%10:Math.floor(Math.max(0,f.time)*3)%2);sprite.setOrigin(.5,1);sprite.setTint(f.guard?0xb1dfff:0xffffff);this.shadows[i].setPosition(f.x,655).setAlpha(f.y<0?.2:.5);const prefix=i===0?'p':'r';$(`${prefix}-hp`).style.width=`${f.hp/MAX_HP*100}%`;$(`${prefix}-energy`).style.width=`${f.energy}%`;$(`${prefix}-wins`).textContent=[0,1].map(n=>f.wins>n?'●':'○').join(' ')});this.streamAnDeath();this.drawBoxes();$('timer').textContent='∞';$('round').textContent=combat.training?'TRAINING':`ROUND ${String(combat.round).padStart(2,'0')}`;}
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
 $('menu-p1').innerHTML=`<strong>P1 · ${isAnMode()?'AN':isYukiMode()?'YUKI':'RONIN'}</strong>`+document.querySelector('.fighter:not(.right) .hud-controls')!.innerHTML;
 $('menu-p2').innerHTML=`<strong>P2 · ${isYukiMode()?'YUKI':'EMBER'}</strong>`+$('p2-controls').innerHTML;
 $('menu-p2').hidden=!isLocalMode();
 $('mode-description').textContent=mode==='yuki-an'?'Yuki đấu với bot An: BO3, thắng 2 round; điều khiển Yuki bằng bộ phím P1.':mode==='an-training'?'Train An vs Yuki / Luyện tập: P1 điều khiển An, đối thủ là bot Yuki; cả hai vô hạn máu, năng lượng và thời gian.':mode==='an-local'?'Local An vs Yuki / Hai người cùng bàn phím: P1 điều khiển An, P2 điều khiển Yuki; BO3, thắng 2 round.':isAnMode()?'An đấu với bot Yuki: BO3, thắng 2 round; điều khiển An bằng bộ phím P1.':mode==='training'?'Training / Luyện tập với bot: vô hạn máu, năng lượng và thời gian.':isLocalMode()?'Local / Hai người cùng bàn phím: P1 điều khiển Ronin, P2 điều khiển Ember.':'VS Computer / Đấu với bot: anh điều khiển Ronin bằng bộ phím P1.';
 $('mode-rules').textContent=isTrainingMode()?'INFINITE HEALTH · ENERGY · TIME / VÔ HẠN MÁU · NĂNG LƯỢNG · THỜI GIAN':'FIRST TO TWO ROUNDS · NO TIME LIMIT / THẮNG 2 ROUND · KHÔNG GIỚI HẠN THỜI GIAN';
}
updateMenuHelp();
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button=>button.onclick=()=>{if(scene?.loadingMatch)return;const requested=button.dataset.mode!;if((requested==='an'||requested==='an-local'||requested==='an-training'||requested==='yuki-an')&&!unlockAn())return;mode=requested;$('p-name').textContent=isAnMode()?'01 / AN':isYukiMode()?'01 / YUKI':'01 / MOON RONIN';$('r-name').textContent=isYukiMode()?(mode==='yuki-an'?'AN BOT / 02':isLocalMode()?'YUKI / 02':'YUKI BOT / 02'):'EMBER BRAWLER / 02';scene?.renderState();updateMenuHelp();$('p2-controls').hidden=!isLocalMode();document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('selected',b===button));$('p2-help').textContent=isLocalMode()?'P2: Arrows move / guard · 1 / 2 / 3 / 0 attacks':'Keep your stamina. A patient fighter survives.'});
$('start').onclick=async()=>{if(!scene||scene.loadingMatch)return;if(isYukiMode()&&!unlockAn())return;const startButton=$('start') as HTMLButtonElement;startButton.disabled=true;const label=startButton.textContent;startButton.textContent='Đang tải…';const ready=await scene.prepareMatch();startButton.disabled=false;startButton.textContent=label;if(!ready){$('status').textContent='Không tải được ảnh. Anh thử lại nhé.';return;}keys.clear();pressed.clear();combat.start(isTrainingMode());combat.fighters.forEach((f,i)=>f.collisionSkin=isYukiMode()?animeSkin(i):undefined);paused=false;$('pause-menu').hidden=true;$('pause').textContent='ESC / PAUSE';$('overlay').classList.add('hidden');$('status').textContent=mode==='yuki-an'?'YUKI VS AN BOT · BO3':mode==='an-training'?'AN VS YUKI BOT · INFINITE TRAINING':mode==='an-local'?'LOCAL AN VS YUKI · BO3':isAnMode()?'AN VS YUKI BOT · BO3':mode==='training'?'TRAINING · INFINITE HEALTH':mode==='bot'?'YOU VS EMBER AI':'LOCAL DUEL';if(sound&&!scene.music?.isPlaying)scene.music?.play()};
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
