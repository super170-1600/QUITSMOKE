import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { homedir } from 'node:os'
import assert from 'node:assert/strict'

// Use the desktop's bundled browser runtime; this adds no project dependencies.
const playwrightDirectory = process.env.PLAYWRIGHT_MODULE_DIR || resolve(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')
const require = createRequire(resolve(playwrightDirectory, 'package.json'))
const { chromium } = require('playwright')
const out = resolve('artifacts/cover')
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', error => errors.push(error.message))
page.on('console', message => {
  if (message.type() === 'error' && /WebGLProgram|VALIDATE_STATUS|Shader Error/.test(message.text())) errors.push(message.text())
})
const base = 'http://127.0.0.1:5173/'
async function ready() {
  await page.goto(base)
  await page.locator('.breath-cover.is-ready').waitFor({ timeout: 30000 })
  await page.waitForTimeout(1800)
}
try {
  await ready()
  const canvasCount = await page.locator('.scene-host canvas').count()
  assert.equal(canvasCount, 1)
  await page.screenshot({ path: resolve(out, 'desktop.png') })
  await page.mouse.click(1320, 820)
  assert.equal(await page.locator('.breath-cover.is-entering').count(), 0, 'Outside the portal must not start navigation')
  const entry = page.getByRole('button', { name: '点击光环，进入戒烟旅程' })
  await entry.hover()
  await page.waitForTimeout(600)
  await page.screenshot({ path: resolve(out, 'hover.png') })
  await entry.click()
  assert.equal(await entry.isDisabled(), true, 'Repeated clicks are blocked during entry')
  await page.waitForTimeout(700)
  await page.screenshot({ path: resolve(out, 'transition.png') })
  await page.waitForTimeout(450)
  await page.screenshot({ path: resolve(out, 'transition-cleared.png') })
  await page.waitForURL(/#\/(login|home|dashboard|setup|family\/setup)/, { timeout: 20000 })
  const destination = page.url()
  assert.ok(destination.includes('#/login'), 'Anonymous start must respect the existing auth guard')
  await page.setViewportSize({ width: 390, height: 844 })
  await ready()
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: resolve(out, 'mobile.png') })
  const box = await entry.boundingBox()
  assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= 390)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await ready()
  await entry.focus()
  await entry.press('Enter')
  await page.waitForURL(/#\/login/, { timeout: 20000 })
  await ready()
  await page.evaluate(() => {
    const canvas = document.querySelector('.scene-host canvas')
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
  })
  await page.locator('.breath-cover.is-fallback').waitFor()
  assert.equal(await page.locator('.scene-host canvas').count(), 0)
  await page.screenshot({ path: resolve(out, 'fallback.png') })
  await entry.click()
  await page.waitForURL(/#\/login/, { timeout: 20000 })
  assert.deepEqual(errors, [], 'No unhandled browser errors')
  const result = { canvasCount, destination, mobile: 'passed', keyboardReducedMotion: 'passed', contextLossFallback: 'passed', browserErrors: errors }
  await writeFile(resolve(out, 'verification.json'), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
} finally { await browser.close() }
