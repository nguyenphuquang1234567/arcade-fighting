import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'shadow-combat-'));
try {
 fs.writeFileSync(path.join(temp,'package.json'),'{"type":"commonjs"}');
 for(const name of ['combat','geometry','fighters','hurtbox-poses','hurtmask'])fs.writeFileSync(path.join(temp,name+'.js'),ts.transpileModule(fs.readFileSync('src/'+name+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);
 fs.copyFileSync('src/hurtmasks.json',path.join(temp,'hurtmasks.json'));
 const require=createRequire(import.meta.url);
 const {Combat,attacks}=require(path.join(temp,'combat.js'));
 const {getHitboxes,getHurtboxes,worldBox,overlap,polygonContact,poseFrame,maskCollision}=require(path.join(temp,'geometry.js'));
 const neutral={move:0,jump:false,guard:false};
 const setup=(action,distance=90)=>{const c=new Combat();c.start();const [a,b]=c.fighters;a.x=500;b.x=500+distance;a.face=1;b.face=-1;a.action=action;a.duration=attacks[action].duration;a.time=attacks[action].active;return c;};
 let count=0;const check=(name,fn)=>{fn();count++;console.log('PASS',name)};
 for(const action of ['attack','kick','sword_attack','ground_slide']){
  check(action+' active window and overlap',()=>{const c=setup(action,action==='ground_slide'?140:90);const [a,b]=c.fighters;const timing=attacks[action];a.time=timing.active-.001;assert.equal(getHitboxes(a,timing).length,0);a.time=timing.active;assert.ok(getHitboxes(a,timing).length);c.update(0,[neutral,neutral]);assert.equal(b.hp,100-timing.damage);c.update(.01,[neutral,neutral]);assert.equal(b.hp,100-timing.damage);});
  check(action+' rejects behind / out of range / airborne target',()=>{for(const mode of ['behind','far','air']){const c=setup(action,mode==='behind'?-90:mode==='far'?350:90);if(mode==='air')c.fighters[1].y=-300;c.update(0,[neutral,neutral]);assert.equal(c.fighters[1].hp,100,mode);}});
  check(action+' recovery cannot hurt',()=>{const c=setup(action);c.fighters[0].time=attacks[action].activeEnd;c.update(0,[neutral,neutral]);assert.equal(c.fighters[1].hp,100);});
 }
 check('facing mirrors boxes with the sprite',()=>{const c=setup('attack');const f=c.fighters[0];const local={x:350,y:200,width:100,height:50};const right=worldBox(f,local);f.face=-1;const left=worldBox(f,local);assert.equal(left.x,2*f.x-right.x-right.width);assert.equal(left.y,right.y);});
 check('miss can connect later within the active window',()=>{const c=setup('attack',350);c.update(0,[neutral,neutral]);assert.equal(c.fighters[0].hit,false);c.fighters[1].x=590;c.update(.02,[neutral,neutral]);assert.equal(c.fighters[1].hp,91);});
 check('guard state is resolved before opponent damage',()=>{const c=setup('attack');c.update(0,[neutral,{...neutral,guard:true}]);assert.equal(c.fighters[1].hp,100-9*.18);assert.equal(c.fighters[1].energy,90);});
 check('simultaneous attacks trade without player-index priority',()=>{const c=setup('attack');const b=c.fighters[1];b.action='attack';b.duration=attacks.attack.duration;b.time=attacks.attack.active;c.update(0,[neutral,neutral]);assert.equal(c.fighters[0].hp,91);assert.equal(b.hp,91);});
 check('low slide posture avoids a high punch',()=>{const c=setup('attack');const b=c.fighters[1];b.action='ground_slide';b.duration=attacks.ground_slide.duration;b.time=.01;assert.deepEqual([...new Set(getHurtboxes(b,attacks.ground_slide).map(p=>p.region))].sort(),['body','head','legs']);c.update(0,[neutral,neutral]);assert.equal(b.hp,100);});
 check('boxes follow jumping fighters vertically',()=>{const c=setup('kick');const f=c.fighters[0];const before=getHitboxes(f,attacks.kick)[0];f.y=-120;assert.equal(getHitboxes(f,attacks.kick)[0].y,before.y-120);});
 check('edge touch is not a hit',()=>assert.equal(overlap({x:0,y:0,width:10,height:10},{x:10,y:0,width:10,height:10}),undefined));
 check('dead fighters have no hurtbox',()=>{const c=setup('kick');c.fighters[1].hp=0;assert.deepEqual(getHurtboxes(c.fighters[1]),[]);});
 check('polygon rejects empty corners inside its bounding box',()=>{const p={region:'head',points:[{x:0,y:0},{x:10,y:0},{x:0,y:10}]};assert.equal(polygonContact({x:8,y:8,width:1,height:1},p),undefined);assert.equal(polygonContact({x:1,y:1,width:2,height:2},p).region,'head');});
 check('polygon points mirror and follow height',()=>{const c=setup('kick');const f=c.fighters[0];const right=getHurtboxes(f,attacks.kick);f.face=-1;f.y=-90;const left=getHurtboxes(f,attacks.kick);right.forEach((p,i)=>p.points.forEach((v,j)=>{assert.ok(Math.abs(left[i].points[j].x-(2*f.x-v.x))<1e-9);assert.ok(Math.abs(left[i].points[j].y-(v.y-90))<1e-9);}));});
 check('every character and pose has valid anatomical polygons',()=>{const {hurtboxPoses}=require(path.join(temp,'hurtbox-poses.js'));const c=new Combat();for(const f of c.fighters)for(const [action,poses] of Object.entries(hurtboxPoses[f.character])){if(action==='death')continue;f.action=action;for(let frame=0;frame<poses.length;frame++){const timing=attacks[action];f.time=timing?(action==='ground_slide'?(frame?timing.activeEnd:0):frame< (poses.length===6?2:4)?frame/(poses.length===6?2:4)*timing.active:timing.active+(frame-(poses.length===6?2:4))/(poses.length-1-(poses.length===6?2:4))*(timing.duration-timing.active)):frame/(action==='idle'?3:action==='run'||action==='walk'?5:6);const polygons=getHurtboxes(f,timing);assert.ok(polygons.length>0);for(const p of polygons)assert.ok(p.points.length>=3&&p.points.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)));}}});
 check('extended punching arms are not hurtboxes for either fighter',()=>{const c=setup('attack');for(const f of c.fighters){f.action='attack';f.time=attacks.attack.active;f.duration=attacks.attack.duration;assert.equal(maskCollision([worldBox(f,{x:355,y:195,width:110,height:55})],f,attacks.attack),undefined);}});
 check('mask collision uses occupied pixels and preserves region',()=>{const {installMask,maskKey}=require(path.join(temp,'hurtmask.js'));const c=new Combat(),f=c.fighters[0];installMask(maskKey(f.character,f.action,0),[[100,100,110,1],[100,120,130,3]]);const gap=worldBox(f,{x:111,y:100,width:8,height:1});assert.equal(maskCollision([gap],f),undefined);assert.equal(maskCollision([worldBox(f,{x:120,y:100,width:1,height:1})],f).region,'legs');f.face=-1;f.y=-80;assert.equal(maskCollision([worldBox(f,{x:100,y:100,width:1,height:1})],f).region,'head');assert.equal(maskCollision([worldBox(f,{x:110,y:100,width:10,height:1})],f),undefined);});
 console.log(`${count} combat checks passed`);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
