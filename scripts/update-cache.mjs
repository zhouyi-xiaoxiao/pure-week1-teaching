import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),sw=fs.readFileSync(root+'/sw.js','utf8'),old=JSON.parse(sw.match(/const ASSETS=(\[[\s\S]*?\]);/)[1]);
const runtime=['hub.html','architecture.html','docs/TSR_ARCHITECTURE.md','hub.css','hub.js','hub.css?v=1','hub.js?v=1','teaching-catalog.json','app.js?v=hub1','library.js?v=hub1','style.css?v=hub1'];
if(fs.existsSync(root+'/courses'))for(const f of fs.readdirSync(root+'/courses',{recursive:true}))if(/\.(html|json)$/.test(f))runtime.push('courses/'+f);
const assets=[...new Set([...old,...runtime])].sort();const digest=crypto.createHash('sha256');for(const f of assets){const clean=f.split('?')[0];const p=root+'/'+(clean==='./'?'index.html':clean);if(!fs.existsSync(p))throw Error('Missing precache asset '+p);digest.update(f);digest.update(fs.readFileSync(p));}
const cache='pure-week1-tsr-'+digest.digest('hex').slice(0,12);let next=sw.replace(/const CACHE='[^']+';/,`const CACHE='${cache}';`).replace(/const ASSETS=\[[\s\S]*?\];/,`const ASSETS=${JSON.stringify(assets)};`);
// Avoid giving the Pure script as the offline fallback for a missing other-course page.
next=next.replace("e.request.mode==='navigate'?caches.match('./index.html'):Response.error()", "e.request.mode==='navigate'?caches.match('hub.html'):Response.error()");fs.writeFileSync(root+'/sw.js',next);console.log(JSON.stringify({cache,assets:assets.length}));
