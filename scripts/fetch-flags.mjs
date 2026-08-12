// Fetch official, public-domain Swiss cantonal flag SVGs from Wikimedia Commons
// into public/flags/<AB>.svg, cached in the repo so the app has no runtime
// dependency on Wikimedia. Swiss cantonal arms are in the public domain.
//
// Run:  npm run flags
//
// Polite by design: sequential requests, a descriptive User-Agent, and a delay
// between calls (Commons rate-limits bursts with HTTP 429). Any canton that
// cannot be resolved falls back to a clean geometric SVG so the build is never
// blocked — swap those for full heraldry later if you want.

import { mkdir, writeFile, readFile, access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'public', 'flags')

const UA =
  'bundeshaus-pack/0.1 (Swiss Parliament card game; educational prototype)'
const DELAY_MS = 700

// Each canton: abbreviation → candidate Commons file titles (tried in order).
const CANTONS = {
  ZH: ['Flag of Canton of Zürich.svg'],
  BE: ['Flag of Canton of Bern.svg'],
  LU: ['Flag of Canton of Lucerne.svg', 'Flag of Canton of Luzern.svg'],
  UR: ['Flag of Canton of Uri.svg'],
  SZ: ['Flag of Canton of Schwyz.svg'],
  OW: ['Flag of Canton of Obwalden.svg'],
  NW: ['Flag of Canton of Nidwalden.svg'],
  GL: ['Flag of Canton of Glarus.svg'],
  ZG: ['Flag of Canton of Zug.svg'],
  FR: ['Flag of Canton of Fribourg.svg'],
  SO: ['Flag of Canton of Solothurn.svg'],
  BS: ['Flag of Canton of Basel-Stadt.svg'],
  BL: ['Flag of Canton of Basel-Landschaft.svg'],
  SH: ['Flag of Canton of Schaffhausen.svg'],
  AR: ['Flag of Canton of Appenzell Ausserrhoden.svg'],
  AI: ['Flag of Canton of Appenzell Innerrhoden.svg'],
  SG: ['Flag of Canton of St. Gallen.svg'],
  GR: ['Flag of Canton of Graubünden.svg', 'Flag of Canton of Grisons.svg'],
  AG: ['Flag of Canton of Aargau.svg'],
  TG: ['Flag of Canton of Thurgau.svg'],
  TI: ['Flag of Canton of Ticino.svg'],
  VD: ['Flag of Canton of Vaud.svg'],
  VS: ['Flag of Canton of Valais.svg'],
  NE: ['Flag of Canton of Neuchâtel.svg'],
  GE: ['Flag of Canton of Geneva.svg', 'Flag of Canton of Geneve.svg'],
  JU: ['Flag of Canton of Jura.svg'],
}

// Minimal correct-colour geometric fallbacks (used only if a fetch fails).
const FALLBACK = {
  ZH: two('#0F4C9E', '#ffffff', 'diag'),
  SO: two('#E4002B', '#ffffff', 'horiz'),
  TI: two('#E4002B', '#0F4C9E', 'vert'),
  VS: two('#E4002B', '#ffffff', 'vert'),
  NE: tri('#17683A', '#ffffff', '#E4002B', 'vert'),
  FR: two('#141414', '#ffffff', 'horiz'),
  AG: two('#141414', '#0F4C9E', 'vert'),
}
function two(a, b, dir) {
  const g =
    dir === 'diag'
      ? `<polygon points="0,0 32,0 0,32" fill="${a}"/><polygon points="32,0 32,32 0,32" fill="${b}"/>`
      : dir === 'vert'
        ? `<rect width="16" height="32" fill="${a}"/><rect x="16" width="16" height="32" fill="${b}"/>`
        : `<rect width="32" height="16" fill="${a}"/><rect y="16" width="32" height="16" fill="${b}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${g}</svg>`
}
function tri(a, b, c, _dir) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="10.67" fill="${a}"/><rect y="10.67" width="32" height="10.67" fill="${b}"/><rect y="21.33" width="32" height="10.67" fill="${c}"/></svg>`
}
function genericFallback(ab) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#5C7391"/><text x="16" y="21" font-family="sans-serif" font-size="12" font-weight="700" fill="#fff" text-anchor="middle">${ab}</text></svg>`
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function resolveUrl(title) {
  const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url&titles=${encodeURIComponent('File:' + title)}`
  const res = await fetch(api, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`API HTTP ${res.status}`)
  const data = await res.json()
  const page = data?.query?.pages?.[0]
  if (page?.missing) return null
  return page?.imageinfo?.[0]?.url ?? null
}

async function download(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`SVG HTTP ${res.status}`)
  return await res.text()
}

async function exists(p) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const force = process.argv.includes('--force')
  let fetched = 0
  let cached = 0
  let fell = 0

  for (const [ab, titles] of Object.entries(CANTONS)) {
    const out = join(OUT, `${ab}.svg`)
    if (!force && (await exists(out))) {
      const body = await readFile(out, 'utf8')
      if (body.length > 200) {
        cached++
        continue
      }
    }

    let svg = null
    for (const title of titles) {
      try {
        const url = await resolveUrl(title)
        await sleep(DELAY_MS)
        if (!url) continue
        svg = await download(url)
        await sleep(DELAY_MS)
        break
      } catch (e) {
        process.stderr.write(`  ${ab} "${title}": ${e.message}\n`)
        await sleep(DELAY_MS)
      }
    }

    if (svg && svg.includes('<svg')) {
      await writeFile(out, svg)
      fetched++
      process.stdout.write(`✓ ${ab}  (${(svg.length / 1024).toFixed(1)} kB)\n`)
    } else {
      const fb = FALLBACK[ab] || genericFallback(ab)
      await writeFile(out, fb)
      fell++
      process.stdout.write(`• ${ab}  (geometric fallback)\n`)
    }
  }

  process.stdout.write(
    `\nflags: ${fetched} fetched, ${cached} cached, ${fell} fallback → ${OUT}\n`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
