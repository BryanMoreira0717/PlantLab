// Teste de troca de modelos (Passo 9 + Regra M-01).
// Uso: 1) backend em :8000 (`python -m uvicorn main:app`); 2) `npm run dev`
// em outro terminal; 3) `node e2e/swap-models.mjs [url-front]`.
// Fluxo real da UI: identifica "cacto" (suculenta → .glb real) e depois
// "bambu" (graminea → sem .glb → placeholder), sem nenhum erro de console.
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'

const BASE = process.argv[2] ?? 'http://localhost:5173'
const errors = []
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('[console] ' + m.text().slice(0, 300))
})
page.on('pageerror', (e) => errors.push('[pageerror] ' + String(e).slice(0, 300)))

async function identifyAs(name, archetype) {
  await page.locator('#plant-name').fill(name)
  await page.locator('.identify-btn').click()
  await page.waitForSelector('.id-result .chip, .card .error-box', { timeout: 15000 })
  if ((await page.locator('.id-result .chip').count()) === 0) {
    const err = await page.locator('.card .error-box').first().innerText().catch(() => '?')
    console.log(`IDENTIFY "${name}": ERRO "${err}"`)
    return false
  }
  await page.locator('.viewer-wrap').scrollIntoViewIfNeeded()
  await page.waitForTimeout(3000)
  const chipText = await page.locator('.id-result .chip').innerText()
  const label = await page.locator('.viewer-wrap').getAttribute('aria-label')
  const ok = chipText.trim() === archetype && (label?.includes(archetype) ?? false)
  console.log(`IDENTIFY "${name}": chip=${chipText.trim()} label-ok=${label?.includes(archetype)}`)
  return ok
}

await page.goto(BASE, { waitUntil: 'networkidle' })

const okCacto = await identifyAs('cacto', 'suculenta')
writeFileSync('e2e/shot-cacto.png', await page.locator('.viewer-wrap').screenshot())

const okBambu = await identifyAs('bambu', 'graminea')
writeFileSync('e2e/shot-bambu.png', await page.locator('.viewer-wrap').screenshot())

console.log('CONSOLE-ERRORS:', errors.length ? errors : 'zero')
await browser.close()

if (!okCacto || !okBambu) process.exit(1)
if (errors.length) process.exit(2)
console.log('SWAP-MODELS OK')
