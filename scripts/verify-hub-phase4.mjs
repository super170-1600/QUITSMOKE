import {createRequire} from 'node:module'
import {mkdir,writeFile} from 'node:fs/promises'
import {homedir} from 'node:os'
import {resolve} from 'node:path'
import assert from 'node:assert/strict'
const runtime=resolve(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const {chromium}=createRequire(resolve(runtime,'package.json'))('playwright')
const out=resolve('artifacts/hub-phase4');await mkdir(out,{recursive:true})
const browser=await chromium.launch({channel:'msedge',headless:true}),checks={},errors=[]
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'})
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort())
 await page.goto('http://127.0.0.1:5173/#/__hub-preview');await page.locator('.crystal-hub.is-ready').waitFor({timeout:60000})
 await page.evaluate(async()=>{
  const auth=(await import('/src/stores/auth.ts')).useAuthStore(),family=(await import('/src/stores/family.ts')).useFamilyStore(),smoking=(await import('/src/stores/smoking.ts')).useSmokingStore()
  const message=(await import('/src/stores/message.ts')).useMessageStore(),encouragement=(await import('/src/stores/encouragement.ts')).useEncouragementStore()
  const {getLocalDateString,addLocalDays}=await import('/src/utils/date.ts'),{calculateSmokingStatistics,buildDailyTrend}=await import('/src/utils/statistics.ts')
  const today=getLocalDateString(),member={id:'qa-member',familyId:'qa-family',userId:'qa-user',role:'quitter',nickname:'视觉测试用户',joinedAt:today}
  auth.session={user:{id:'qa-user',email:'visual-test@example.test'}};auth.profile={id:'qa-user',nickname:'视觉测试用户'};auth.initialized=true
  family.currentFamily={id:'qa-family',name:'视觉测试家庭',inviteCode:'TESTONLY',createdBy:'qa-user',createdAt:today};family.currentMember=member;family.members=[member];family.selectedQuitterId='qa-user';family.initialized=true;family.initializedForUser='qa-user'
  family.initializeFamily=family.refreshFamily=family.loadMembers=family.loadQuitterSummaries=async()=>{}
  smoking.smokingProfile={id:'qa-profile',quitStartDate:addLocalDays(today,-13),baselineDailyCigarettes:20,cigarettesPerPack:20,pricePerPack:30}
  smoking.checkins=Array.from({length:14},(_,i)=>({id:`qa-${i}`,checkinDate:addLocalDays(today,i-13),cigarettes:i<7?Math.max(0,10-i):0,cravingLevel:i<7?3:2,note:'隔离测试记录'}));smoking.todayCheckin=smoking.checkins.at(-1)
  smoking.statistics=calculateSmokingStatistics(smoking.smokingProfile,smoking.checkins,today);smoking.trendData=buildDailyTrend(smoking.smokingProfile,smoking.checkins,today)
  smoking.ensureSmokingProfileLoaded=async()=>smoking.smokingProfile;smoking.ensureStatisticsLoaded=async()=>smoking.statistics
  smoking.saveTodayCheckin=async values=>{window.__savedCheckin=values}
  smoking.loadDailyCheckin=async date=>smoking.checkins.find(row=>row.checkinDate===date)??null
  smoking.saveDailyCheckin=async values=>{window.__savedCheckin=values;return {...smoking.todayCheckin,...values,id:'qa-saved'}}
  family.quitterSummaries={'qa-user':{member,smokingProfile:smoking.smokingProfile,todayCheckin:smoking.todayCheckin,statistics:smoking.statistics,trendData:smoking.trendData,checkins:smoking.checkins,loadFailed:false}}
  message.loadMessages=message.loadMyActivity=async()=>{};message.startRealtime=message.stopRealtime=()=>{};encouragement.loadEncouragements=encouragement.loadMyActivity=async()=>{}
  window.__qa={auth,family,smoking}
 })
 const surface=page.locator('.hub-interaction')
 async function open(label,id){await page.getByRole('button',{name:label,exact:true}).focus();await surface.focus();await page.keyboard.press('Enter');await page.locator('.floating-module:not([inert]) .module-'+id).waitFor();await page.waitForTimeout(600)}
 async function back(){await page.getByRole('button',{name:'返回晶体导航'}).click();await page.waitForURL(/#\/__hub-preview$/);await page.locator('.crystal-background:not([inert])').waitFor()}
 for(const [label,id,selector] of [['每日打卡','checkin','main.daily-pulse'],['戒烟数据','progress','.trend-page'],['成就','achievements','.achievement-page'],['互助支持','support','.family-page'],['个人中心','profile','.profile-heading']]){
  await open(label,id);await page.locator(selector).waitFor();await page.locator('.van-toast').waitFor({state:'hidden'});assert.equal(await page.locator('.optical-access').count(),0);await page.screenshot({path:resolve(out,id+'.png')});checks[id]=true
  if(id==='checkin'){await page.locator('.pulse-edit-tabs button').nth(1).click();await page.locator('#pulse-score').fill('2');await page.locator('.pulse-edit-tabs button').nth(2).click();await page.locator('.pulse-moods').getByRole('button',{name:'平静',exact:true}).click();await page.locator('.pulse-submit').click();await page.waitForFunction(()=>window.__savedCheckin);assert.equal((await page.evaluate(()=>window.__savedCheckin)).cigarettes,0);checks.existingCheckinSubmission=true}
  if(id==='progress'){await page.getByRole('tab',{name:'日历',exact:true}).click();await page.locator('.heatmap-card').waitFor();await page.getByRole('tab',{name:'成果',exact:true}).click();await page.locator('.savings-card').waitFor();checks.calendarAndSavings=true}
  await back()
 }
 await page.setViewportSize({width:390,height:844});await open('戒烟数据','progress');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:resolve(out,'mobile-progress.png')});await back();checks.mobileNoHorizontalOverflow=true
 await page.evaluate(()=>{window.__qa.family.currentMember={...window.__qa.family.currentMember,role:'supporter'}})
 await open('每日打卡','checkin');await page.locator('.optical-access').waitFor();assert.equal(await page.locator('main.daily-pulse').count(),0);await back();checks.supporterCannotRecord=true
 await page.evaluate(()=>{window.__qa.family.currentMember={...window.__qa.family.currentMember,role:'quitter'};window.__qa.smoking.ensureStatisticsLoaded=async()=>{throw new Error('Isolated read failure')}})
 await open('成就','achievements');await page.getByRole('button',{name:'重新加载',exact:true}).waitFor();checks.errorRetryAvailable=true;await back()
 await page.evaluate(()=>{window.__qa.smoking.ensureStatisticsLoaded=async()=>window.__qa.smoking.statistics;location.hash='/hub'})
 await page.setViewportSize({width:1440,height:900});await page.waitForURL(/#\/hub$/);await page.locator('.crystal-hub.is-ready').waitFor({timeout:60000})
 await open('戒烟数据','progress');assert.ok(page.url().includes('/dashboard?module=progress'));checks.productionDesktopModuleRoute=true
 await page.setViewportSize({width:390,height:844});await page.waitForURL(/#\/trend\?module=progress/);await page.locator('.module-progress .trend-page').waitFor();checks.displayModePreservesModule=true
 await page.getByRole('button',{name:'返回晶体导航'}).click();await page.waitForURL(/#\/hub$/)
 await page.evaluate(()=>{window.__qa.family.currentMember={...window.__qa.family.currentMember,role:'supporter'};location.hash='/checkin?module=checkin'})
 await page.waitForURL(/#\/(home|dashboard)/);assert.equal(await page.locator('main.daily-pulse').count(),0);checks.originalSupporterRouteGuard=true
 await page.evaluate(()=>{window.__qa.auth.session=null;location.hash='/__hub-preview'})
 await page.locator('.crystal-hub.is-ready').waitFor({timeout:60000})
 await open('个人中心','profile');await page.locator('.optical-access').waitFor();assert.equal(await page.locator('.profile-heading').count(),0);checks.anonymousGate=true
 assert.deepEqual(errors,[])
 await writeFile(resolve(out,'verification.json'),JSON.stringify({fixture:'Isolated browser-only stores; all external requests blocked; no database writes.',checks,errors},null,2))
 await writeFile(resolve(out,'index.html'),`<!doctype html><meta charset="utf-8"><title>QUITSMOKE Phase 4</title><style>body{margin:32px;background:#f3f3ef;color:#465962;font:14px system-ui}main{display:grid;grid-template-columns:1fr 1fr;gap:24px}img{width:100%;border-radius:16px}figure{margin:0}</style><h1>模块视觉预览</h1><p>原有功能组件 · 银白玻璃面板。截图使用隔离测试记录，不代表真实用户数据。</p><main>${['checkin','progress','achievements','support','profile','mobile-progress'].map(id=>`<figure><img src="${id}.png"><figcaption>${id}</figcaption></figure>`).join('')}</main>`)
 console.log(JSON.stringify(checks))
}finally{await browser.close()}
