import ts from 'typescript';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dojo-block-'));
try{
 fs.writeFileSync(path.join(temp,'package.json'),'{"type":"commonjs"}');
 for(const name of fs.readdirSync('src')){if(name.endsWith('.json'))fs.copyFileSync(path.join('src',name),path.join(temp,name));else if(name.endsWith('.ts')&&!name.endsWith('.d.ts'))fs.writeFileSync(path.join(temp,name.replace(/\.ts$/,'.js')),ts.transpileModule(fs.readFileSync(path.join('src',name),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,resolveJsonModule:true,esModuleInterop:true}}).outputText);}
 const {Combat}=createRequire(import.meta.url)(path.join(temp,'combat.js'));
 const idle={move:0,jump:false,guard:false},hold={...idle,guard:true};
 const setup=(training=false,full=false)=>{const c=new Combat();c.start(training,['an','yuki'],full);return c;};
 const advance=(c,input,n,dt)=>{for(let i=0;i<n;i++)c.update(dt,[input,idle]);};
 for(const hz of [30,60,120]){
  const c=setup(),f=c.fighters[0];advance(c,hold,hz*5,1/hz);assert.equal(f.blockMana,0);c.update(1/hz,[hold,idle]);assert.equal(f.guard,false);advance(c,hold,hz,1/hz);assert.equal(f.blockMana,0);
  advance(c,idle,hz*5,1/hz);assert.ok(Math.abs(f.blockMana-100)<1e-6);assert.equal(f.blockExhausted,false);c.update(1/hz,[hold,idle]);assert.equal(f.guard,true);
 }
 const c=setup(),f=c.fighters[0];f.energy=0;advance(c,hold,60,1/60);assert.equal(f.guard,true);assert.ok(Math.abs(f.blockMana-80)<1e-6);advance(c,idle,30,1/60);assert.ok(Math.abs(f.blockMana-90)<1e-6);
 f.y=-150;f.vy=-500;const x=f.x;c.update(1/60,[{...hold,move:1,jump:true,attack:'attack',super:true,ulti:true},idle]);assert.equal(f.x,x);assert.ok(f.y>-150);assert.equal(f.guard,true);assert.equal(f.superTime,undefined);assert.equal(f.ultiTime,undefined);
 for(const skins of [['an','yuki'],['yuki','an']]){const practice=new Combat();practice.start(true,skins,true);for(let i=0;i<1200;i++)practice.update(1/60,[hold,hold]);for(const fighter of practice.fighters){assert.equal(fighter.blockMana,100);assert.equal(fighter.guard,true);assert.equal(fighter.blockUnlimited,true);}}
 const training=setup(true);advance(training,hold,301,1/60);assert.equal(training.fighters[0].blockMana,0);assert.equal(training.fighters[0].guard,false);
 const attack=setup();attack.fighters[0].action='attack';attack.fighters[0].duration=.28;attack.update(.01,[hold,idle]);assert.equal(attack.fighters[0].blockMana,100);assert.equal(attack.fighters[0].guard,false);
 c.resetFighters();assert.equal(c.fighters[0].blockMana,100);
 console.log('Block mana: 5s drain/regen at 30/60/120Hz, exhaustion, partial regen, separate energy, airborne lock, training and round reset passed.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
