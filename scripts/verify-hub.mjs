import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { homedir } from 'node:os'
import assert from 'node:assert/strict'

const runtime = process.env.PLAYWRIGHT_MODULE_DIR || resolve(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const { chromium } = createRequire(resolve(runtime, 'package.json'))('playwright')
const out = resolve(process.env.HUB_CAPTURE_DIR || 'artifacts/hub-phase1')
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
const errors = []
const renderStats = {}
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => { if (message.type() === 'error' && /WebGLProgram|VALIDATE_STATUS|Shader Error/.test(message.text())) errors.push(message.text()) })
// Visual review is anonymous and offline; it never touches account or business data.
await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
const base = 'http://127.0.0.1:5173/'
const views = process.argv.includes('--quick') ? ['overview'] : ['overview', 'front', 'left', 'right', 'back', 'top', 'checkin', 'progress', 'achievements', 'reserved', 'support', 'profile']
try {
  for (const view of views) {
    await page.goto(`${base}#/__hub-preview?view=${view}`)
    // Hash-query changes reuse Vue components; reload for a new static angle.
    await page.reload()
    await page.locator('.crystal-hub.is-ready').waitFor({ timeout: 30000 })
    await page.waitForTimeout(700)
    assert.equal(await page.locator('.hub-scene canvas').count(), 1)
    assert.equal(await page.locator('h1,aside,.checkin-cta').count(), 0)
    await page.screenshot({ path: resolve(out, `${view}.png`) })
    renderStats[view] = JSON.parse(await page.locator('.hub-scene canvas').getAttribute('data-render-stats') || '{}')
    console.log(`Captured ${view}`)
  }
  if (process.argv.includes('--quick')) { console.log(JSON.stringify(renderStats)); await browser.close(); process.exit(0) }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${base}#/__hub-preview`)
  await page.reload()
  await page.locator('.crystal-hub.is-ready').waitFor()
  await page.waitForTimeout(700)
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await page.screenshot({ path: resolve(out, 'mobile.png') })
  renderStats.mobile = JSON.parse(await page.locator('.hub-scene canvas').getAttribute('data-render-stats') || '{}')
  await page.evaluate(() => document.querySelector('.hub-scene canvas').dispatchEvent(new Event('webglcontextlost', { cancelable: true })))
  await page.locator('.hub-unavailable').waitFor()
  assert.equal(await page.locator('.hub-scene canvas').count(), 0)
  await page.screenshot({ path: resolve(out, 'fallback.png') })
  const routes = ['/hub', '/home', '/checkin', '/trend', '/family', '/profile', '/dashboard', '/setup', '/family/setup']
  for (const path of routes) {
    await page.goto(`${base}#${path}`)
    await page.waitForURL(/#\/login\?redirect=/, { timeout: 20000 })
    assert.equal(new URLSearchParams(page.url().split('?')[1]).get('redirect'), path)
  }
  await page.goto(`${base}#/`)
  await page.locator('.breath-cover').waitFor()
  assert.deepEqual(errors, [])
  const result = { views, mobile: 'passed', contextLoss: 'passed', anonymousProtectedRoutes: routes, publicLanding: 'passed', browserErrors: errors, renderStats }
  await writeFile(resolve(out, 'verification.json'), JSON.stringify(result, null, 2))
  const labels = { overview: '主页面', front: '正面', left: '左侧', right: '右侧', back: '背面', top: '顶部', checkin: '每日打卡', progress: '戒烟数据', achievements: '成就', reserved: '04 空白预留面', support: '互助支持', profile: '个人中心', mobile: '手机', fallback: 'WebGL 降级' }
  await writeFile(resolve(out, 'index.html'), `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>QUITSMOKE Phase 1</title><style>body{margin:40px;background:#f5f5f1;color:#283035;font:14px system-ui}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:32px}img{width:100%;display:block}figure{margin:0}figcaption{padding:12px}a{color:inherit}</style><main>${[...views,'mobile','fallback'].map(view=>`<figure><a href="${view}.png"><img src="${view}.png" alt="${labels[view]}"></a><figcaption>${labels[view]}</figcaption></figure>`).join('')}</main></html>`)
  console.log(JSON.stringify(result, null, 2))
  if (out.endsWith('hub-phase15')) await (await import('./hub-phase15-gallery.mjs')).writeHubPhase15Gallery(out)
} finally { await browser.close() }
