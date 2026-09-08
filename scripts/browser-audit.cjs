const { chromium } = require('@playwright/test');
const fs = require('node:fs');
(async () => {
 const browser = await chromium.launch({ channel: 'chrome', headless: true });
 const page = await browser.newPage(); const results = []; const errors = [];
 page.on('pageerror', error => errors.push(error.message));
 for (const [width,height] of [[1920,1080],[1440,900],[1366,768],[1024,1366],[768,1024],[430,932],[390,844]]) {
  await page.setViewportSize({width,height});
  for (const route of ['/','/work','/work/apparel-color-and-texture','/services','/about','/contact','/privacy']) {
   const response=await page.goto(`http://localhost:3000${route}`,{waitUntil:'networkidle'});
   await page.evaluate(async()=>{await document.fonts.ready; await Promise.all([...document.images].filter(img=>img.loading!=='lazy').map(img=>img.decode().catch(()=>{})))});
   await page.waitForTimeout(1200);
   const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,brokenImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.getAttribute('alt')), h1:[...document.querySelectorAll('h1')].map(h=>({text:h.textContent,bounds:JSON.stringify(h.getBoundingClientRect())})), horizontal:[...document.querySelectorAll('h1,h2,p,button')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.left< -2||r.right>innerWidth+2)}).slice(0,10).map(el=>el.textContent)}));
   const name=route==='/'?'home':route.split('/').pop();
   await page.screenshot({path:`artifacts/browser/${name}-${width}.png`});
   results.push({route,width,height,status:response.status(),...metrics});
  }
 }
 fs.writeFileSync('artifacts/browser/audit.json',JSON.stringify({results,errors},null,2));
 console.log(JSON.stringify({pages:results.length, failures:results.filter(r=>r.status!==200||r.overflow||r.brokenImages.length||r.horizontal.length),errors}));
 await browser.close();
})().catch(e=>{console.error(e.message);process.exit(1)});
