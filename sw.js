// Overload – offline provoz
// Aplikace se spouští okamžitě z telefonu, aktualizace se stahují na pozadí.
const VERSION='ovl-v3';
const FONTS='etb-fonts';
const CORE=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png','./icons/apple-touch-icon.png','./icons/favicon-32.png'];
const timeout=(p,ms)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms))]);
// Safari odmítá přesměrované odpovědi u načtení stránky, proto je překopírujeme
const clean=r=>r.redirected?r.blob().then(b=>new Response(b,{status:r.status,statusText:r.statusText,headers:r.headers})):Promise.resolve(r);
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION&&k!==FONTS).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
function refresh(){return fetch('./index.html',{cache:'no-cache'}).then(clean).then(r=>{if(r.ok)return caches.open(VERSION).then(c=>c.put('./index.html',r));}).catch(()=>{});}
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(req.mode==='navigate'){
    e.respondWith(caches.match('./index.html').then(hit=>{
      if(hit){e.waitUntil(refresh());return hit;}
      return timeout(fetch(req),8000).then(clean).then(r=>{const cp=r.clone();caches.open(VERSION).then(c=>c.put('./index.html',cp));return r;});
    }));
    return;
  }
  if(url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com'){
    e.respondWith(caches.open(FONTS).then(c=>c.match(req).then(hit=>hit||timeout(fetch(req),3000).then(r=>{c.put(req,r.clone());return r;})
      .catch(()=>new Response('',{status:200,headers:{'Content-Type':url.hostname==='fonts.googleapis.com'?'text/css':'font/woff2'}})))));
    return;
  }
  if(url.origin===location.origin){
    e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(r=>{const cp=r.clone();caches.open(VERSION).then(c=>c.put(req,cp));return r;})));
  }
});
