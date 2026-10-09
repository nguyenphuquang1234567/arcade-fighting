import {defineConfig,type Plugin} from 'vite';
import {readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {validateCapsules} from './src/capsule-model';
import {validateOverrides} from './src/polygon-model';
function polygonWriter():Plugin{let writing:Promise<void>=Promise.resolve();return{name:'dojo-polygon-writer',apply:'serve',configureServer(server){
 for(const kind of ['polygons','capsules'])server.middlewares.use('/__dojo/'+kind,async(req,res)=>{
  const reply=(code:number,data:unknown)=>{res.statusCode=code;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data))};
  if(req.method!=='POST'){reply(405,{error:'POST only'});return}
  const address=req.socket.remoteAddress,host=req.headers.host??'';
  let origin='';try{origin=new URL(req.headers.origin??'').host}catch{}
  if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(address??'')||origin!==host||!/^((localhost|127\.0\.0\.1)(:\d+)?|\[::1\](:\d+)?)$/.test(host)){reply(403,{error:'Chỉ lưu từ trình duyệt localhost của máy này'});return}
  if(!req.headers['content-type']?.startsWith('application/json')){reply(415,{error:'JSON required'});return}
  try{
   let size=0;const chunks:Buffer[]=[];for await(const chunk of req){const b=Buffer.from(chunk);size+=b.length;if(size>5_000_000){reply(413,{error:'Dữ liệu quá lớn'});return}chunks.push(b)}
   const payload=JSON.parse(Buffer.concat(chunks).toString()),error=(kind==='capsules'?validateCapsules:validateOverrides)(payload.overrides);if(error){reply(400,{error});return}
   writing=writing.catch(()=>{}).then(async()=>{
   const target=path.resolve(server.config.root,kind==='capsules'?'src/capsule-overrides.json':'src/polygon-overrides.json');const existing=JSON.parse(await readFile(target,'utf8'));
   const combined={...existing,...payload.overrides};const mergedError=(kind==='capsules'?validateCapsules:validateOverrides)(combined);if(mergedError){reply(400,{error:mergedError});return}
   const temporary=target+'.tmp';await writeFile(temporary,JSON.stringify(combined,null,2)+'\n');await rename(temporary,target);
   reply(200,{frames:Object.keys(combined).length});
   });await writing;
  }catch(e){reply(400,{error:e instanceof Error?e.message:String(e)})}
 });
}}}
export default defineConfig({publicDir:'assets',plugins:[polygonWriter()],build:{rollupOptions:{input:{game:'index.html',polygons:'polygon-editor.html',masks:'mask-editor.html',capsule:'capsule-preview.html'}}}});
