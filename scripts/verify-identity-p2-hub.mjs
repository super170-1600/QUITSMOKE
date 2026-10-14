import {createRequire} from 'node:module'
import {homedir} from 'node:os'
import {resolve} from 'node:path'
import {mkdir,writeFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
const runtime=resolve(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const {chromium}=createRequire(resolve(runtime,'package.json'))('playwright')
const browser=await chromium.launch({channel:'msedge',headless:true}),out=resolve('artifacts/identity-p2-hub'),errors=[],checks=[]
await mkdir(out,{recursive:true})
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'})
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort())
 for(const [face,selector] of [['profile','.identity-space'],['support','.constellation-study'],['progress','.orbital-console'],['checkin','main.daily-pulse']]){await page.goto(`http://127.0.0.1:5173/#/__hub-module/${face}`);await page.locator(selector).waitFor({timeout:60000});await page.screenshot({path:resolve(out,`preview-${face}.png`)})}checks.push('开发模块深链到四个艺术样板')
 await page.goto('http://127.0.0.1:5173/#/__identity-demo');await page.locator('.identity-space').waitFor()
 await page.evaluate(async()=>{
  const auth=(await import('/src/stores/auth.ts')).useAuthStore(),family=(await import('/src/stores/family.ts')).useFamilyStore(),smoking=(await import('/src/stores/smoking.ts')).useSmokingStore(),messages=(await import('/src/stores/message.ts')).useMessageStore(),encouragement=(await import('/src/stores/encouragement.ts')).useEncouragementStore()
  const {cloudbaseApp,requireCloudbaseAuth}=await import('/src/services/cloudbase.ts')
  const user={id:'9007199254740993',username:'fixture-identity'},profile={id:user.id,nickname:'隔离验收账户',created_at:'2026-10-01T00:00:00Z',updated_at:'2026-10-01T00:00:00Z'}
  auth.session={user};auth.profile={...profile};auth.initialized=true
  const member={id:'fixture-member',familyId:'fixture-family',userId:user.id,role:'quitter',nickname:profile.nickname,joinedAt:'2026-10-01T00:00:00Z'}
  family.currentFamily={id:'fixture-family',name:'隔离验收家庭',createdBy:user.id,createdAt:'2026-10-01',inviteCode:'FIXTURE'};family.currentMember=member;family.members=[member];family.initializeFamily=async()=>family.currentFamily
  smoking.smokingProfile={id:'fixture-smoking',quitStartDate:'2026-10-01',baselineDailyCigarettes:20,cigarettesPerPack:20,pricePerPack:30};smoking.ensureSmokingProfileLoaded=async()=>smoking.smokingProfile
  messages.loadMyActivity=encouragement.loadMyActivity=async()=>{}
  const flags={fail:false,writes:[],signouts:0,left:0};window.__identityFixture={auth,family,smoking,profile,flags}
  const db={from(table){let values=null,owner=null;const query={select(){return query},eq(key,value){owner=value;return query},update(input){values=input;return query},insert(input){values=input;return query},async maybeSingle(){return {data:table==='profiles'?{...profile}:null,error:null}},async single(){if(flags.fail){flags.fail=false;return {data:null,error:{message:'fixture failure',code:'08006'}}}if(owner!==user.id)throw new Error('Wrong account owner');flags.writes.push({table,values,owner});if(table==='profiles')Object.assign(profile,values);return {data:{...profile},error:null}}};return query},rpc:async()=>({data:null,error:null})}
  cloudbaseApp.rdb=()=>db
  const sdk=requireCloudbaseAuth();sdk.getUser=async()=>({data:{user},error:null});sdk.signOut=async()=>{flags.signouts++;return {error:null}}
  family.leaveFamily=async()=>{flags.left++;family.currentFamily=null;family.currentMember=null;family.members=[]}
 })
 await page.evaluate(()=>{location.hash='/profile'});await page.waitForURL(/#\/dashboard\?module=profile/);await page.locator('.chip-name').filter({hasText:'隔离验收账户'}).waitFor().catch(async e=>{console.log(await page.locator('body').innerText());throw e});await page.screenshot({path:resolve(out,'profile-desktop.png')});checks.push('桌面普通个人入口保留 profile 模块')
 await page.locator('[data-section=personal]').click();await page.getByLabel('昵称',{exact:true}).fill('真实桥接样式');await page.getByRole('button',{name:'保存更改',exact:true}).click();await page.locator('.identity-status [role=status]').waitFor();assert.equal(await page.locator('.chip-name').innerText(),'真实桥接样式');assert.equal(await page.evaluate(()=>window.__identityFixture.family.currentMember.nickname),'真实桥接样式');await page.screenshot({path:resolve(out,'nickname-confirmed.png')})
 await page.evaluate(()=>window.__identityFixture.flags.fail=true);await page.getByLabel('昵称',{exact:true}).fill('失败保留');await page.getByRole('button',{name:'保存更改',exact:true}).click();await page.locator('.identity-status [role=alert]').waitFor();assert.equal(await page.getByLabel('昵称',{exact:true}).inputValue(),'失败保留');assert.equal(await page.locator('.chip-name').innerText(),'真实桥接样式');checks.push('既有资料 API 通过注入后端回执验证成功及失败')
 await page.getByLabel('返回设置总览').click();await page.locator('[data-section=family]').waitFor();await page.locator('[data-section=family]').click();await page.getByRole('button',{name:'退出家庭',exact:true}).click();await page.getByText('退出家庭？',{exact:true}).waitFor();await page.getByRole('button',{name:'取消',exact:true}).click();assert.equal(await page.evaluate(()=>window.__identityFixture.flags.left),0);checks.push('退出家庭取消不触发写入')
 await page.getByLabel('返回设置总览').click();await page.locator('[data-section=display]').waitFor();await page.locator('[data-section=display]').click();await page.getByRole('button',{name:'手机',exact:true}).click();await page.waitForURL(/#\/profile\?module=profile/);assert.equal(await page.evaluate(()=>localStorage.getItem('quit-smoking-display-mode')),'mobile');await page.setViewportSize({width:390,height:844});await page.screenshot({path:resolve(out,'profile-mobile.png')});checks.push('显示偏好真实持久化且保留个人模块')
 await page.evaluate(()=>window.__identityFixture.family.currentMember={...window.__identityFixture.family.currentMember,role:'supporter'});await page.keyboard.press('Escape');await page.locator('[data-section=personal]').waitFor();assert.equal(await page.locator('[data-section=smoking]').count(),0);await page.screenshot({path:resolve(out,'supporter-mobile.png')})
 await page.getByLabel('返回晶体主页面').click();await page.locator('.crystal-hub.is-ready').waitFor({timeout:60000});checks.push('返回真实 /hub')
 await page.getByRole('button',{name:'个人中心',exact:true}).focus();await page.getByRole('button',{name:'个人中心',exact:true}).click();await page.waitForURL(/#\/profile\?module=profile/);await page.locator('.floating-module .identity-space').waitFor();await page.waitForFunction(()=>!document.querySelector('.floating-module')?.inert);await page.screenshot({path:resolve(out,'profile-crystal-panel.png')});await page.getByRole('button',{name:'返回晶体导航',exact:true}).click();await page.waitForURL(/#\/hub$/);checks.push('晶体切面进入与返回保留共享背景')
 await page.evaluate(()=>{location.hash='/profile'});await page.getByRole('button',{name:'退出登录',exact:true}).click();await page.waitForURL(/#\/login/);assert.equal(await page.evaluate(()=>window.__identityFixture.flags.signouts),1);assert.equal(await page.evaluate(()=>window.__identityFixture.auth.profile),null);assert.equal(await page.evaluate(()=>window.__identityFixture.family.members.length),0);checks.push('真实 auth.logout 流程经隔离 SDK 验证清理状态')
 assert.deepEqual(errors,[]);await writeFile(resolve(out,'verification.json'),JSON.stringify({fixture:'仅浏览器内存注入 SDK/数据库回执；实际应用 API/Store/路由运行；阻断全部外部网络，无线上登录或写入。',checks,errors},null,2));console.log(JSON.stringify(checks))
}finally{await browser.close()}
