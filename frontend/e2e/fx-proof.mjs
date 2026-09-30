// Prova dos efeitos especiais (Passo 10+): determinística, sem backend e sem
// gastar quota — usa o override de dev ?fx= + ?archetype=.
// Uso: 1) `npm run dev`; 2) `node e2e/fx-proof.mjs [url]`.
// Checa por efeito: chip visível, screenshot não-vazio, zero erros de console.
import { chromium } from 'playwright'
import { statSync, writeFileSync } from 'node:fs'

const BASE = process.argv[2] ?? 'http://localhost:5173'
const CASES = [
  ['fire', 'suculenta'],
  ['water', 'folha_larga'],
  ['flood', 'folha_larga'],
  ['heat', 'arbustiva'],
  ['drought', 'graminea'],
  ['frost', 'graminea'],
  ['fall', 'arvore_pequena'],
  ['dark', 'suculenta'],
  ['microwave', 'folha_larga'],
  ['soil', 'arbustiva'],
  ['nutrient', 'arbustiva'],
  ['care', 'folha_larga'],
  ['wind', 'arvore_pequena'],
  ['pests', 'folha_larga'],
  ['sunlight', 'graminea'],
  ['rain', 'folha_larga'],
  ['pruning', 'arbustiva'],
  ['repot', 'arvore_pequena'],
  ['pollination', 'arbustiva'],
  ['bloom', 'folha_larga'],
  ['chemical', 'folha_larga'],
  ['hail', 'graminea'],
  ['compost', 'arbustiva'],
]

const errors = []
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('[console] ' + m.text().slice(0, 200))
})
page.on('pageerror', (e) => errors.push('[pageerror] ' + String(e).slice(0, 200)))

let fails = 0
for (const [fx, archetype] of CASES) {
  await page.goto(`${BASE}/?fx=${fx}&archetype=${archetype}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.viewer-wrap canvas', { timeout: 20000 })
  await page.locator('.viewer-wrap').scrollIntoViewIfNeeded()
  await page.waitForTimeout(4000)
  const chip = await page.locator('.fx-chip').count()
  const shot = `e2e/shot-fx-${fx}.png`
  writeFileSync(shot, await page.locator('.viewer-wrap').screenshot())
  const bytes = statSync(shot).size
  const ok = chip === 1 && bytes > 15000
  if (!ok) fails++
  console.log(`FX ${fx}/${archetype}: chip=${chip} bytes=${bytes} ${ok ? 'ok' : 'FALHOU'}`)
}

console.log('CONSOLE-ERRORS:', errors.length ? errors : 'zero')
await browser.close()
if (fails || errors.length) process.exit(1)
console.log('FX-PROOF OK')
