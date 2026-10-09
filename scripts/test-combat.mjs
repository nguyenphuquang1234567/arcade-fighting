import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'shadow-combat-'));
try {
 fs.writeFileSync(path.join(temp,'package.json'),'{"type":"commonjs"}');
 for(const name of ['combat','geometry','fighters'])fs.writeFileSync(path.join(temp,name+'.js'),ts.transpileModule(fs.readFileSync('src/'+name+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
 const require=createRequire(import.meta.url);
 const {Combat,attacks}=require(path.join(temp,'combat.js'));
 const {getHitboxes,getHurtboxes,worldBox,overlap}=require(path.join(temp,'geometry.js'));
 const neutral={move:0,jump:false,guard:false};
 const setup=(action,distance=90)=>{const c=new Combat();c.start();const [a,b]=c.fighters;a.x=500;b.x=500+distance;a.face=1;b.face=-1;a.action=action;a.duration=attacks[action].duration;a.time=attacks[action].active;return c;};
 let count=0;const check=(name,fn)=>{fn();count++;console.log('PASS',name)};
 for(const action of ['attack','kick','sword_attack','ground_slide']){
  check(action+' active window and overlap',()=>{const c=setup(action);const [a,b]=c.fighters;const timing=attacks[action];a.time=timing.active-.001;assert.equal(getHitboxes(a,timing).length,0);a.time=timing.active;assert.ok(getHitboxes(a,timing).length);c.update(0,[neutral,neutral]);assert.equal(b.hp,100-timing.damage);c.update(.01,[neutral,neutral]);assert.equal(b.hp,100-timing.damage);});
  check(action+' rejects behind / out of range / airborne target',()=>{for(const mode of ['behind','far','air']){const c=setup(action,mode==='behind'?-90:mode==='far'?350:90);if(mode==='air')c.fighters[1].y=-300;c.update(0,[neutral,neutral]);assert.equal(c.fighters[1].hp,100,mode);}});
  check(action+' recovery cannot hurt',()=>{const c=setup(action);c.fighters[0].time=attacks[action].activeEnd;c.update(0,[neutral,neutral]);assert.equal(c.fighters[1].hp,100);});
 }
 check('facing mirrors boxes with the sprite',()=>{const c=setup('attack');const f=c.fighters[0];const local={x:350,y:200,width:100,height:50};const right=worldBox(f,local);f.face=-1;const left=worldBox(f,local);assert.equal(left.x,2*f.x-right.x-right.width);assert.equal(left.y,right.y);});
 check('miss can connect later within the active window',()=>{const c=setup('attack',350);c.update(0,[neutral,neutral]);assert.equal(c.fighters[0].hit,false);c.fighters[1].x=590;c.update(.02,[neutral,neutral]);assert.equal(c.fighters[1].hp,91);});
 check('guard state is resolved before opponent damage',()=>{const c=setup('attack');c.update(0,[neutral,{...neutral,guard:true}]);assert.equal(c.fighters[1].hp,100-9*.18);assert.equal(c.fighters[1].energy,90);});
 check('simultaneous attacks trade without player-index priority',()=>{const c=setup('attack');const b=c.fighters[1];b.action='attack';b.duration=attacks.attack.duration;b.time=attacks.attack.active;c.update(0,[neutral,neutral]);assert.equal(c.fighters[0].hp,91);assert.equal(b.hp,91);});
 check('low slide posture avoids a high punch',()=>{const c=setup('attack');const b=c.fighters[1];b.action='ground_slide';b.duration=attacks.ground_slide.duration;b.time=.01;assert.equal(getHurtboxes(b,attacks.ground_slide).length,2);c.update(0,[neutral,neutral]);assert.equal(b.hp,100);});
 check('boxes follow jumping fighters vertically',()=>{const c=setup('kick');const f=c.fighters[0];const before=getHitboxes(f,attacks.kick)[0];f.y=-120;assert.equal(getHitboxes(f,attacks.kick)[0].y,before.y-120);});
 check('edge touch is not a hit',()=>assert.equal(overlap({x:0,y:0,width:10,height:10},{x:10,y:0,width:10,height:10}),undefined));
 check('dead fighters have no hurtbox',()=>{const c=setup('kick');c.fighters[1].hp=0;assert.deepEqual(getHurtboxes(c.fighters[1]),[]);});
 console.log(`${count} combat checks passed`);
}finally{fs.rmSync(temp,{recursive:true,force:true});}
