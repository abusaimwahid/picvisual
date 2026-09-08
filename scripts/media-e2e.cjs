const { chromium, expect } = require('@playwright/test');
const { PrismaClient } = require('@prisma/client');
const fs=require('node:fs');const db=new PrismaClient();const base='http://localhost:3000';const results=[];const ids=[];
const pass=name=>{results.push({name,status:'PASS'});console.log('PASS',name)};
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:900}});
 try {
 await page.goto(base+'/admin/login');await page.getByLabel('Work email').fill(process.env.ADMIN_EMAIL);await page.getByLabel('Password',{exact:true}).fill(process.env.ADMIN_INITIAL_PASSWORD);await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(base+'/admin');
 for(const type of ['image','video']){
  await page.goto(base+'/admin/media');const file=type==='image'?{name:`internal-launch-qa-${Date.now()}.png`,mimeType:'image/png',buffer:fs.readFileSync('artifacts/technical-fixture.png')}:'artifacts/technical-fixture.mp4';
  const form=page.locator('form').filter({has:page.getByRole('heading',{name:'Upload media',exact:true})});await form.locator('input[type=file]').setInputFiles(file);await form.getByRole('button',{name:'Upload media',exact:true}).click();await page.waitForURL(/success=uploaded/,{timeout:90000});
  const asset=await db.media.findFirstOrThrow({where:{filename:type==='image'?file.name:'technical-fixture.mp4'},orderBy:{createdAt:'desc'}});ids.push(asset.id);if(asset.mediaType!==type.toUpperCase())throw Error('Wrong media type');if(!asset.width||!asset.height)throw Error('Missing dimensions');pass(`${type} direct upload, provider verification and DB creation`);
 }
 const technical=await db.media.findUnique({where:{id:ids[0]}});
 await page.goto(base+'/admin/media?q='+encodeURIComponent(technical.filename));await expect(page.getByText(technical.filename,{exact:true}).first()).toBeVisible();pass('Media search');
 await page.getByText('Edit metadata',{exact:true}).click();
 const metadata=page.locator('form').filter({has:page.locator(`input[name=id][value="${technical.id}"]`)}).filter({has:page.locator('input[name=alt]')});
 await metadata.locator('[name=alt]').fill('Disposable internal image upload fixture');await metadata.locator('[name=caption]').fill('Internal QA only; never publish');await metadata.getByRole('button',{name:/Save/}).click();await page.waitForURL(/success=metadata-saved/);if((await db.media.findUnique({where:{id:technical.id}})).alt!=='Disposable internal image upload fixture')throw Error('Metadata failed');pass('Media metadata editing');
 for(const id of ids){await page.goto(base+'/admin/media');const form=page.locator('form').filter({has:page.locator(`input[name=id][value="${id}"]`)}).filter({has:page.getByRole('button',{name:/Delete/})});page.once('dialog',dialog=>dialog.accept());await form.getByRole('button',{name:/Delete/}).click();await page.waitForURL(/success=deleted/);if(await db.media.findUnique({where:{id}}))throw Error('Media not deleted');pass('Unreferenced provider and DB delete');}
 await page.goto(base+'/admin/media');const approved=await db.media.findFirstOrThrow({where:{originalFilename:'CHAMOIS_CH03_2.jpg'}});const deleteForm=page.locator('form').filter({has:page.locator(`input[name=id][value="${approved.id}"]`)}).filter({has:page.getByRole('button',{name:/Delete/})});if(await deleteForm.count())await expect(deleteForm.getByRole('button',{name:/Delete/})).toBeDisabled();pass('Referenced media visibly protected');
 }finally{fs.writeFileSync('artifacts/browser/media-e2e.json',JSON.stringify(results,null,2));await browser.close();await db.$disconnect();}
})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});
