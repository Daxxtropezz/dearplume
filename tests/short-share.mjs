// Run with: npm run test:share (uses the existing TypeScript dev dependency).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const nodeRequire = createRequire(import.meta.url);
const ts = nodeRequire('typescript');

process.env.DEARPLUME_SHARE_SECRET = 'a'.repeat(64);
process.env.BLOB_READ_WRITE_TOKEN = 'test-only-token';
const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const blobs = new Map();
const fakeBlob = {
  async put(pathname, data, options) {
    assert.equal(options.access, 'private');
    blobs.set(pathname, typeof data === 'string' ? data : await data.text());
    return { pathname };
  },
  async get(pathname) {
    const value = blobs.get(pathname);
    return value === undefined ? null : { statusCode: 200, stream: new Blob([value]).stream(), blob: {size: value.length} };
  },
  async del(pathnames) { for(const p of Array.isArray(pathnames)?pathnames:[pathnames])blobs.delete(p); },
  async list({ prefix }) { return { blobs: [...blobs.keys()].filter(p=>p.startsWith(prefix)).map(pathname=>({pathname})),hasMore:false,cursor:undefined}; },
};
const cache = new Map();
function load(file) {
  const absolute = path.resolve(base,file);
  if(cache.has(absolute)) return cache.get(absolute).exports;
  const source=fs.readFileSync(absolute,'utf8');
  const js=ts.transpileModule(source,{fileName:absolute,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const mod={exports:{}};cache.set(absolute,mod);
  const req=(name)=>{
    if(name==='server-only') return {};
    if(name==='@vercel/blob') return fakeBlob;
    if(name==='next/server') return {NextResponse:{json:(data,opts={})=>Response.json(data,opts)}};
    if(name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
    return nodeRequire(name);
  };
  vm.runInThisContext(`(function(exports,require,module,process,Buffer,Blob,Request,Response){${js}\n})`,{filename:absolute})(mod.exports,req,mod,process,Buffer,Blob,Request,Response);
  return mod.exports;
}
(async()=>{
  const {encryptShare,decryptShare}=load('src/lib/messageShareCrypto.ts');
  const {storeSharedToken,resolveSharedToken,purgeExpiredShares,isShareReference}=load('src/lib/shareStorage.ts');
  const route=load('src/app/api/message-share/route.ts');
  const now=Date.now();
  const password='correct_password_123', accessSalt='1234567890abcdef1234567890abcdef';
  const payload={v:1,createdAt:now,expiresAt:now+600000,note:{title:'For you',message:'A little note',asciiArt:'@#@#',externalMusic:{provider:'youtube',id:'3JbmE3jjCSk'}},appearance:{typingSpeedMs:40,backgroundColor:'#fffafa',flyingIcon:'heart',flyingColor:'#ff6688'}};
  const ciphertext=encryptShare(payload,password,accessSalt);
  const shortRef=await storeSharedToken(ciphertext,payload.expiresAt);
  assert(isShareReference(shortRef));
  assert(shortRef.length<45);
  assert(![...blobs.values()][0].includes('A little note'));
  assert.equal(await resolveSharedToken(shortRef),ciphertext);
  assert.deepEqual(decryptShare(await resolveSharedToken(shortRef),password,accessSalt),payload);
  assert.throws(()=>decryptShare(ciphertext,'not_the_password',accessSalt));
  assert.equal(await resolveSharedToken(ciphertext),ciphertext); // legacy full URL token
  const createBody={action:'create',note:{title:payload.note.title,message:payload.note.message,asciiArt:payload.note.asciiArt,externalMusic:payload.note.externalMusic},appearance:{...payload.appearance,messagePlacement:'right',musicPlacement:'top-left'},duration:{value:5,unit:'minutes'},password,accessSalt};
  const create=await route.POST(new Request('http://localhost/api/message-share',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(createBody)}));
  assert.equal(create.status,200);
  const {id,expiresAt}=await create.json();
  assert(isShareReference(id));
  assert(expiresAt > now);
  assert.equal(new URL('http://localhost/s#'+id).toString().length<100,true);
  const unlock=await route.POST(new Request('http://localhost/api/message-share',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'unlock',token:id,password,accessSalt})}));
  assert.equal(unlock.status,200);
  const unsealed=(await unlock.json()).payload;
  assert.equal(unsealed.note.title,payload.note.title);
  assert.equal(unsealed.appearance.messagePlacement,'right');
  assert.equal(unsealed.appearance.musicPlacement,'top-left');
  const oldPosition={...createBody,appearance:{...createBody.appearance,musicPlacement:'top-right'}};
  const legacyPosition=await route.POST(new Request('http://localhost/api/message-share',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(oldPosition)}));
  assert.equal(legacyPosition.status,200);
  const invalid=await route.POST(new Request('http://localhost/api/message-share',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...createBody,appearance:{...createBody.appearance,musicPlacement:'fake-position'}})}));
  assert.equal(invalid.status,400);
  const wrong=await route.POST(new Request('http://localhost/api/message-share',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'unlock',token:id,password:'badpasswordhere',accessSalt})}));
  assert.equal(wrong.status,403);
  const expired=await storeSharedToken(ciphertext,Date.now()-100);
  await assert.rejects(()=>resolveSharedToken(expired),/expired/);
  assert.equal(await purgeExpiredShares(),1);
  assert(![...blobs.keys()].some(key=>key.endsWith('/'+expired.split('_').slice(2).join('_')+'.txt')));
  console.log('PASS: short-link creation/unlock, layout settings validation, encrypted persistence, wrong-password rejection, expiry, cleanup and legacy compatibility.');
})().catch(e=>{console.error(e);process.exitCode=1});
