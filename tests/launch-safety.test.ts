import test from "node:test";
import assert from "node:assert/strict";
import { isSafeHref, contactInput, settingInput, navigationInput } from "../src/lib/validation/site";
import { publishedProject, publishedService, snapshotJson } from "../src/cms/catalog-publication";
import { validateSvg, validateMediaFile } from "../src/lib/media/validation";
import { hasPermission } from "../src/lib/permissions";
import { createSessionToken, readSessionToken, sessionCookieOptions } from "../src/lib/auth/session";
import type { Project, Service } from "@prisma/client";

test("navigation rejects protocol-relative, encoded, credential and script URLs", () => {
  for (const url of ["//evil.example", "/%2fevil.example", "/\\evil.example", "javascript:alert(1)", "data:text/html,test", "http://example.com", "https://user:password@example.com", "/%0aevil"]) assert.equal(isSafeHref(url), false, url);
  for (const url of ["/work", "/work/apparel-color-and-texture", "https://example.com/work"]) assert.equal(isSafeHref(url), true, url);
  assert.equal(navigationInput.safeParse({ label: "Work", href: "//evil.example", enabled: "true" }).success, false);
});
test("settings validate contact, primary URL, CTA and all social links", () => {
  const valid={siteName:"PicVisual", contactEmail:"info@picvisual.com", description:"Image and video post-production.",siteUrl:"https://picvisual.com"};
  assert.equal(settingInput.safeParse(valid).success,true);
  for(const patch of [{contactEmail:"invalid"},{siteUrl:"http://localhost:3000"},{ctaHref:"//evil.example"},{socialLinks:"Unsafe | javascript:alert(1)"}]) assert.equal(settingInput.safeParse({...valid,...patch}).success,false);
});
test("contact requires valid email, substantive brief, timing and idempotency id", () => {
  const valid={name:"Example Person",email:"fixture@example.invalid",message:"A specific project brief for testing.",startedAt:Date.now(),requestId:"fd902da4-f1b9-4e3e-bdb2-716dc8f8ecea"};
  assert.equal(contactInput.safeParse(valid).success,true);
  for(const patch of [{message:""},{email:"invalid"},{projectLink:"javascript:alert(1)"},{requestId:"invalid"},{startedAt:0}]) assert.equal(contactInput.safeParse({...valid,...patch}).success,false);
});
test("published Project snapshots isolate draft scalar fields, slug, media and gallery", () => {
  const baseline={id:"project",slug:"published",title:"Published title",status:"PUBLISHED",heroMediaId:"approved",services:["Retouching"],media:[{mediaId:"original",order:0}]} as unknown as Project;
  const draft={...baseline,slug:"draft-url",title:"Unpublished title",heroMediaId:"unpublished",publishedSnapshot:snapshotJson(baseline)} as Project;
  const visible=publishedProject(draft)!;
  assert.equal(visible.title,"Published title");assert.equal(visible.slug,"published");assert.equal(visible.heroMediaId,"approved");assert.equal(visible.media?.[0]?.mediaId,"original");
  assert.equal(publishedProject({...draft,status:"ARCHIVED"}),undefined);assert.equal(publishedProject({...draft,status:"DRAFT"}),undefined);
});
test("published Service snapshots isolate draft text, order and media", () => {
  const old={title:"Published service",status:"PUBLISHED",featuredOrder:1,heroMediaId:"approved"} as Service;
  const draft={...old,title:"Private change",featuredOrder:99,heroMediaId:"new",publishedSnapshot:JSON.parse(JSON.stringify(snapshotJson(old)))};
  assert.equal(publishedService(draft)?.title,old.title);assert.equal(publishedService(draft)?.featuredOrder,1);assert.equal(publishedService(draft)?.heroMediaId,"approved");assert.equal(publishedService({...draft,status:"ARCHIVED"}),undefined);
});
test("SVG validation rejects executable, encoded, CSS, XML and data references", () => {
  for(const payload of ['<svg><script>alert(1)</script></svg>','<svg><use href="data:image/svg+xml,test"/></svg>','<svg><use href="&#106;avascript:alert(1)"/></svg>','<svg><animate attributeName="href" to="https://evil.example"/></svg>','<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg></svg>','<svg><style>@import "evil"</style></svg>','<svg><rect fill="url(data:text/plain,test)"/></svg>']) assert.throws(()=>validateSvg(payload));
  assert.doesNotThrow(()=>validateSvg('<svg xmlns="http://www.w3.org/2000/svg"><defs><path id="local" d="M0 0"/></defs><use href="#local"/></svg>'));
});
test("media validation rejects disguised MIME, extensions and oversize files",()=>{
  const bytes=new Uint8Array([137,80,78,71,13,10,26,10]);
  assert.throws(()=>validateMediaFile({name:"fixture.jpg",type:"image/png",size:8,bytes}));
  assert.throws(()=>validateMediaFile({name:"fixture.png",type:"image/png",size:201*1024*1024,bytes}));
});
test("permissions protect owner-only user administration and settings",()=>{
  const user={id:"test",name:null,email:"fixture@example.invalid",isActive:true,role:"EDITOR" as const};
  assert.equal(hasPermission(user,"editContent"),true);assert.equal(hasPermission(user,"manageUsers"),false);assert.equal(hasPermission(user,"manageSettings"),false);
  assert.equal(hasPermission({...user,role:"ADMIN"},"manageUsers"),false);assert.equal(hasPermission({...user,role:"OWNER"},"manageUsers"),true);
});
test("signed sessions reject tampering and enforce an expiring httpOnly cookie",async()=>{
  const old=process.env.AUTH_SECRET; process.env.AUTH_SECRET="local-unit-test-only-not-a-production-secret";
  try {const token=await createSessionToken({userId:"fixture",role:"OWNER"});assert.equal((await readSessionToken(token))?.userId,"fixture");assert.equal(await readSessionToken(token+"tampered"),null);assert.equal(await readSessionToken(undefined),null);assert.equal(sessionCookieOptions.httpOnly,true);assert.equal(sessionCookieOptions.sameSite,"lax");assert.equal(sessionCookieOptions.maxAge,28800);}finally{if(old===undefined)delete process.env.AUTH_SECRET;else process.env.AUTH_SECRET=old;}
});
