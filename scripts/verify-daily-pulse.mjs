import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
import {homedir} from 'node:os'
import {resolve} from 'node:path'
import assert from 'node:assert/strict'
const runtime=resolve(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const {chromium}=createRequire(resolve(runtime,'package.json'))('playwright')
const out=resolve('artifacts/nico-daily-pulse');await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true}),checks={},errors=[]
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce',timezoneId:'Asia/Shanghai'})
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort())
 async function setup(){
 await page.goto('http://127.0.0.1:5173/#/__hub-preview');await page.locator('.crystal-hub.is-ready').waitFor({timeout:60000})
 return page.evaluate(async()=>{
  const auth=(await import('/src/stores/auth.ts')).useAuthStore(),family=(await import('/src/stores/family.ts')).useFamilyStore(),smoking=(await import('/src/stores/smoking.ts')).useSmokingStore()
  const {getLocalDateString,addLocalDays}=await import('/src/utils/date.ts'),{validatePulseDate,encodePulseNote,decodePulseNote}=await import('/src/utils/dailyPulse.ts')
  const today=getLocalDateString(),yesterday=addLocalDays(today,-1),legacy=addLocalDays(today,-2)
  auth.session={user:{id:'pulse-test-user',email:'test@example.test'}};auth.initialized=true
  const member={id:'test-member',familyId:'test-family',userId:'pulse-test-user',role:'quitter',nickname:'隔离验收',joinedAt:today}
  family.currentFamily={id:'test-family',name:'测试家庭',inviteCode:'TESTONLY',createdBy:'pulse-test-user',createdAt:today};family.currentMember=member;family.members=[member];family.initialized=true;family.initializedForUser='pulse-test-user'
  family.initializeFamily=family.refreshFamily=async()=>{}
  smoking.smokingProfile={id:'test-profile',quitStartDate:addLocalDays(today,-90),baselineDailyCigarettes:20,cigarettesPerPack:20,pricePerPack:30}
  let records=JSON.parse(localStorage.getItem('isolated-pulse-test-records')||'null')
  if(!records){records={};for(let i=3;i<28;i++){if(i%4===0)continue;const date=addLocalDays(today,-i);records[date]={id:date,checkinDate:date,cigarettes:i%3===0?2:0,cravingLevel:2,cravingScore:i%11,mood:i%3===0?'anxious':i%2===0?'fulfilled':'calm',note:'隔离视觉测试记录',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}}records[legacy]={id:legacy,checkinDate:legacy,cigarettes:4,cravingLevel:4,note:'旧版真实形态样本'}}
  smoking.checkins=Object.values(records);smoking.todayCheckin=records[today]??null
  smoking.ensureSmokingProfileLoaded=async()=>smoking.smokingProfile;smoking.ensureStatisticsLoaded=async()=>{}
  smoking.loadDailyCheckin=async date=>{await new Promise(resolve=>setTimeout(resolve,30));return records[date]??null}
  smoking.saveDailyCheckin=async values=>{if(window.__failSave)throw new Error('隔离测试：保存失败');validatePulseDate(values.checkinDate,smoking.smokingProfile.quitStartDate);const decoded=decodePulseNote(encodePulseNote(values.note,values.cravingScore,values.mood)),old=records[values.checkinDate],now=new Date().toISOString();const row={id:old?.id??values.checkinDate,checkinDate:values.checkinDate,cigarettes:values.cigarettes,cravingLevel:1+Math.round(values.cravingScore*4/10),...decoded,createdAt:old?.createdAt??now,updatedAt:now};records[values.checkinDate]=row;localStorage.setItem('isolated-pulse-test-records',JSON.stringify(records));smoking.checkins=Object.values(records);return row}
  window.__records=records;return {today,yesterday,legacy,tomorrow:addLocalDays(today,1)}
 })}
 const dates=await setup()
 async function open(){await page.getByRole('button',{name:'每日打卡',exact:true}).focus();await page.locator('.hub-interaction').focus();await page.keyboard.press('Enter');await page.locator('.pulse-form').waitFor()}
 async function fill(count,score,mood){await page.locator('.pulse-edit-tabs button').first().click();await page.locator('#pulse-cigarettes').fill(String(count));await page.locator('.pulse-edit-tabs button').nth(1).click();await page.locator('#pulse-score').fill(String(score));await page.locator('.pulse-edit-tabs button').nth(2).click();await page.locator('.pulse-moods').getByRole('button',{name:mood,exact:true}).click()}
 async function save(){await page.locator('.pulse-submit').click();await page.locator('.pulse-success').waitFor();await page.waitForTimeout(700)}
 async function archive(){await page.locator('.pulse-archive-button').click();await page.locator('.halo-archive canvas').waitFor();await page.waitForTimeout(200)}
 await open();assert.equal(await page.locator('#pulse-cigarettes').inputValue(),'');checks.blankIsNotZero=true
 await page.screenshot({path:resolve(out,'daily-before.png')})
 await fill(0,8,'焦虑');await save();assert.equal(await page.evaluate(date=>window.__records[date].cravingScore,dates.today),8);checks.todaySaved=true
 await archive();assert.equal(await page.locator('.archive-node').count(),49)
 for(let ring=0;ring<7;ring++)assert.equal(await page.locator(`.archive-node[data-ring="${ring}"]`).count(),7)
 const slots=await page.locator('.archive-node').evaluateAll(nodes=>nodes.map(n=>({date:n.dataset.date,slot:n.dataset.slot,left:n.style.left,top:n.style.top})))
 await page.locator(`.archive-node[data-date="${dates.yesterday}"]`).click();assert.match(await page.locator('.archive-detail').innerText(),/尚无记录/);assert.equal(await page.locator('.archive-detail dl').count(),0)
 await page.getByRole('button',{name:'补签这一天',exact:false}).click();await page.locator('.pulse-form').waitFor();await page.locator('.pulse-edit-tabs button').first().click();assert.equal(await page.locator('#pulse-cigarettes').inputValue(),'');checks.archiveBackfillLoadsBlank=true
 await fill(2,10,'疲惫');await page.evaluate(()=>window.__failSave=true);await page.locator('.pulse-submit').click();await page.getByRole('alert').waitFor();assert.equal(await page.evaluate(date=>!!window.__records[date],dates.yesterday),false);checks.failureDoesNotLightSlot=true
 await page.evaluate(()=>window.__failSave=false);await save();checks.yesterdayBackfill=true
 await archive();assert.deepEqual(await page.locator('.archive-node').evaluateAll(nodes=>nodes.map(n=>({date:n.dataset.date,slot:n.dataset.slot,left:n.style.left,top:n.style.top}))),slots);checks.fixedSevenBySevenSlots=true
 await page.locator(`.archive-node[data-date="${dates.yesterday}"]`).focus();await page.keyboard.press('Enter');assert.match(await page.locator('.archive-detail').innerText(),/2 支/);assert.match(await page.locator('.archive-detail').innerText(),/10\/10/);assert.match(await page.locator('.archive-detail').innerText(),/疲惫/);checks.accessibleAccurateDetails=true
 await page.screenshot({path:resolve(out,'archive-desktop.png')})
 await page.getByRole('button',{name:'上一个 49 天',exact:false}).click();assert.equal(await page.locator('.archive-node').count(),49);await page.getByRole('button',{name:'较近 49 天',exact:false}).click();checks.windowPaging=true
 await page.keyboard.press('Escape');assert.equal(await page.locator('.halo-archive').count(),0);assert.ok(page.url().includes('/__hub-module/checkin'));checks.escapeClosesOnlyOverlay=true
 await page.locator('.pulse-edit-tabs button').first().click();await page.locator('.pulse-note-editor summary').click();await page.locator('#pulse-note').fill('未保存的草稿');await page.locator(`.pulse-dates button[data-date="${dates.today}"]`).click();await page.getByRole('alertdialog').waitFor();await page.getByRole('button',{name:'取消切换',exact:true}).click();assert.equal(await page.locator('.pulse-dates [aria-pressed=true]').getAttribute('data-date'),dates.yesterday)
 await page.locator(`.pulse-dates button[data-date="${dates.today}"]`).click();await page.getByRole('button',{name:'保留草稿并继续'}).click();await page.locator('.pulse-form').waitFor();assert.equal(await page.locator('#pulse-cigarettes').inputValue(),'0')
 await page.locator(`.pulse-dates button[data-date="${dates.yesterday}"]`).click();await page.locator('.pulse-form').waitFor();assert.equal(await page.locator('#pulse-note').inputValue(),'未保存的草稿');checks.draftsDoNotLeakDates=true
 await page.locator(`.pulse-dates button[data-date="${dates.legacy}"]`).click();await page.getByRole('button',{name:'放弃修改并继续'}).click();await page.locator('.pulse-form').waitFor();assert.equal(await page.locator('#pulse-cigarettes').inputValue(),'4');assert.equal(await page.locator('.pulse-edit-tabs button').nth(1).locator('b').innerText(),'— /10');checks.legacyNotInvented=true
 await page.getByRole('button',{name:'打开完整月历'}).click();assert.ok(await page.locator(`.pulse-month-grid [data-date="${dates.tomorrow}"]`).isDisabled());await page.locator(`.pulse-month-grid [data-date="${dates.today}"]`).click();await page.locator('.pulse-form').waitFor();assert.equal(await page.locator('.pulse-dates [aria-pressed=true]').getAttribute('data-date'),dates.today);checks.calendarDateAndFutureBlock=true
 await fill(1,0,'平静');await save();await page.screenshot({path:resolve(out,'daily-desktop.png')})
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:resolve(out,'daily-mobile.png')});await archive();await page.locator(`.archive-node[data-date="${dates.today}"]`).click();await page.screenshot({path:resolve(out,'archive-mobile.png')})
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const box=await page.locator('.archive-node:not(.mobile-inactive)').first().boundingBox();assert.ok(box.width>=44&&box.height>=44);assert.equal(await page.locator('.halo-archive canvas').count(),1);checks.mobileTouchAndReducedMotion=true
 await page.setViewportSize({width:844,height:390});await page.screenshot({path:resolve(out,'archive-landscape.png')});checks.landscape=true
 await page.getByRole('button',{name:'关闭光环档案'}).click();await setup();await open();assert.equal(await page.locator('#pulse-cigarettes').inputValue(),'1');assert.equal(await page.locator('.pulse-edit-tabs button').nth(1).locator('b').innerText(),'0 /10');checks.reloadRetainsIsolatedRecord=true
 const tzPage=await browser.newPage({timezoneId:'America/New_York'})
 await tzPage.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort())
 await tzPage.goto('http://127.0.0.1:5173/#/')
 const calendarCheck=await tzPage.evaluate(async()=>{const {addLocalDays,differenceInLocalCalendarDays,getLocalDateString}=await import('/src/utils/date.ts');return {spring:addLocalDays('2026-03-08',1),fall:addLocalDays('2026-11-01',1),gap:differenceInLocalCalendarDays('2026-03-09','2026-03-08'),local:getLocalDateString(new Date('2026-01-01T00:30:00Z'))}})
 assert.deepEqual(calendarCheck,{spring:'2026-03-09',fall:'2026-11-02',gap:1,local:'2025-12-31'});checks.localDateAndDST=true;await tzPage.close()
 assert.deepEqual(errors,[])
 await writeFile(resolve(out,'verification.json'),JSON.stringify({fixture:'Isolated browser store and local storage; external requests blocked. Live DB not tested.',checks,errors},null,2))
 await writeFile(resolve(out,'index.html'),`<!doctype html><meta charset="utf-8"><title>NICØ Daily Pulse</title><style>body{margin:24px;background:#f4f4ef;color:#3c5664;font:14px system-ui}main{display:grid;grid-template-columns:1fr 1fr;gap:20px}img{width:100%;border-radius:14px}figure{margin:0}</style><h1>NICØ · Daily Pulse / Halo Archive</h1><p>4 圈 × 7 个固定日期槽。以下为隔离测试数据，不是线上用户记录。</p><main>${['daily-before','daily-desktop','archive-desktop','daily-mobile','archive-mobile','archive-landscape'].map(id=>`<figure><img src="${id}.png"><figcaption>${id}</figcaption></figure>`).join('')}</main><pre>${JSON.stringify(checks,null,2)}</pre>`)
 console.log(JSON.stringify(checks))
}finally{await browser.close()}
