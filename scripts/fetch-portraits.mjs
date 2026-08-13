// Fetch councillor portraits into public/portraits/<id>.webp, cached in the repo
// so the app has no runtime dependency on a third party.
//
// Run:  npm run portraits               (skips files already present)
//       npm run portraits -- --force    (re-download and re-encode everything)
//
// Source: Wikimedia Commons, discovered through Wikidata. Wikidata property
// P1307 ("Swiss parliament ID") is byte-identical to the `id` we already carry
// in src/data/members.json (both originate from ws.parlament.ch Person.ID), so
// the member -> photo join is exact — no name matching, no manual mapping table.
// At the time of writing all 246 sitting members resolve to a P18 image, and the
// bulk of them are the official Parliamentary Services studio portraits (3600 ×
// 3600, consistent framing) released under CC BY.
//
// Licensing: every file used here is CC BY or CC BY-SA, which *requires* credit.
// The author/licence of each portrait is written to public/portraits/CREDITS.md
// and cached in src/data/raw/commons-imageinfo.json, which build-members.mjs
// folds into members.json so the UI can attribute on the card itself.
//
// A member without a usable portrait fails the run loudly rather than silently
// shipping a blank card.

import { mkdir, writeFile, readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'public', 'portraits')
const RAW_DIR = join(__dirname, '..', 'src', 'data', 'raw')
const MEMBERS = join(__dirname, '..', 'src', 'data', 'members.json')

// Wikimedia blocks generic/absent user agents outright, and their API policy
// asks for a descriptive one that identifies the project.
const UA =
  'bundeshaus-pack/0.1 (https://github.com/webplatformz/bundeshaus-pack; Swiss Parliament card game; educational prototype)'

const SPARQL = 'https://query.wikidata.org/sparql'
const COMMONS = 'https://commons.wikimedia.org/w/api.php'

// Output geometry. 512 is comfortably above the largest on-card render on a
// 2× display; WebP q82 keeps each file around 25–40 kB.
const SIZE = 512
const WEBP_QUALITY = 82

// Portraits are head-and-shoulders, so when a source is not square the face
// sits above the geometric centre. Bias the crop window upwards by this
// fraction of the slack we are cutting away.
const TOP_BIAS = 0.35

// Anything smaller than this is a truncated download or an encoder failure.
const MIN_BYTES = 2000
// Sources below this on the short edge get upscaled and will look soft; we warn
// rather than fail, because a soft portrait still beats no portrait.
const LOW_RES_PX = 400

const FORCE = process.argv.includes('--force')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── HTTP helpers ──────────────────────────────────────────────────────────
// Wikimedia's thumbnailer answers 429 under sustained load. That is a "wait,
// then you may proceed" signal, not a failure, so it gets its own much longer
// backoff and honours Retry-After when the server sends one.
async function request(url, { accept, binary = false, retries = 6, backoffMs = 1000 } = {}) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, ...(accept ? { Accept: accept } : {}) },
        redirect: 'follow',
      })
      if (res.status === 429 || res.status === 503) {
        const retryAfter = Number(res.headers.get('retry-after'))
        const wait = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : 5000 * 2 ** attempt
        if (attempt === retries) throw new Error(`HTTP ${res.status} for ${url}`)
        await sleep(wait)
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
      return binary ? Buffer.from(await res.arrayBuffer()) : await res.json()
    } catch (e) {
      lastErr = e
      if (attempt === retries) break
      await sleep(backoffMs * 2 ** attempt)
    }
  }
  throw lastErr
}

// ── cache helpers (mirrors fetch-raw.mjs) ─────────────────────────────────
async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function cached(name, fetcher) {
  const path = join(RAW_DIR, name)
  if (!FORCE && (await exists(path))) {
    process.stdout.write(`  cache hit: ${name} (use --force to refetch)\n`)
    return JSON.parse(await readFile(path, 'utf8'))
  }
  const data = await fetcher()
  await mkdir(RAW_DIR, { recursive: true })
  await writeFile(path, JSON.stringify(data, null, 2))
  process.stdout.write(`  wrote ${name}\n`)
  return data
}

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// ── step 1: Wikidata -> parliament id / Commons file title ────────────────
async function fetchWikidata() {
  const query = `SELECT ?pid ?item ?img WHERE {
  ?item wdt:P1307 ?pid .
  OPTIONAL { ?item wdt:P18 ?img }
}`
  const url = `${SPARQL}?query=${encodeURIComponent(query)}`
  return await request(url, { accept: 'application/sparql-results+json' })
}

// Special:FilePath URLs are percent-encoded and use underscores; the Commons
// API wants the human-readable title.
function fileTitleFromUrl(url) {
  const tail = url.split('/').pop()
  return 'File:' + decodeURIComponent(tail).replace(/_/g, ' ')
}

function indexWikidata(payload) {
  const byId = new Map()
  for (const b of payload?.results?.bindings ?? []) {
    const pid = b?.pid?.value
    const img = b?.img?.value
    if (!pid || !img) continue
    // Some people carry several P18 values; first one wins, deterministically.
    if (!byId.has(pid)) byId.set(pid, { title: fileTitleFromUrl(img), item: b?.item?.value })
  }
  return byId
}

// ── step 2: Commons imageinfo (dimensions + licence + author) ─────────────
const stripHtml = (s) =>
  String(s ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

async function fetchImageInfo(titles) {
  const out = {}
  const groups = chunk(titles, 40)
  let i = 0
  for (const g of groups) {
    const params = new URLSearchParams({
      action: 'query',
      titles: g.join('|'),
      prop: 'imageinfo',
      iiprop: 'url|size|extmetadata',
      format: 'json',
      formatversion: '2',
    })
    const payload = await request(`${COMMONS}?${params}`, { accept: 'application/json' })
    for (const page of payload?.query?.pages ?? []) {
      const info = page?.imageinfo?.[0]
      if (!info) continue
      const meta = info.extmetadata ?? {}
      out[page.title] = {
        url: info.url,
        width: info.width,
        height: info.height,
        descriptionUrl: info.descriptionurl,
        author: stripHtml(meta.Artist?.value) || 'Unknown author',
        licence: stripHtml(meta.LicenseShortName?.value) || 'Unknown licence',
        licenceUrl: stripHtml(meta.LicenseUrl?.value) || '',
        // The bare "Attribution" licence used by the Parliamentary Services
        // portraits carries no licence URL; instead it names the party that
        // must be credited (parlament.ch). Keep it so the credit is complete.
        attribution: stripHtml(meta.Attribution?.value),
        usageTerms: stripHtml(meta.UsageTerms?.value),
      }
    }
    process.stdout.write(`  imageinfo: batch ${++i}/${groups.length}\r`)
    await sleep(250)
  }
  process.stdout.write('\n')
  return out
}

// ── step 3: download + crop + encode ──────────────────────────────────────
// Ask Commons for a thumbnail rather than the 3600 × 3600 original: it is two
// orders of magnitude smaller and still far above our 512 px target.
function downloadUrl(info) {
  const base = info.descriptionUrl?.replace(/\/wiki\/File:.*$/, '') ?? 'https://commons.wikimedia.org'
  const title = info.descriptionUrl?.split('/wiki/')?.[1] ?? ''
  const want = SIZE * 2
  if (title && Math.max(info.width, info.height) > want) {
    return `${base}/wiki/Special:FilePath/${title.replace(/^File:/, '')}?width=${want}`
  }
  return info.url
}

// Centre-crop to a square, shifted toward the top so the subject's head is not
// cut off on tall sources (and off-centre framing is not made worse on wide ones).
async function toSquareWebp(buf) {
  const img = sharp(buf, { failOn: 'error' }).rotate()
  const { width, height } = await img.metadata()
  if (!width || !height) throw new Error('could not read image dimensions')

  const side = Math.min(width, height)
  const left = Math.round((width - side) * 0.5)
  const top = Math.round((height - side) * (0.5 - TOP_BIAS))

  return await img
    .extract({ left, top, width: side, height: side })
    .resize(SIZE, SIZE, { fit: 'cover' })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer()
}

async function buildPortrait(info) {
  const buf = await request(downloadUrl(info), { binary: true })
  if (buf.length < MIN_BYTES) throw new Error(`download too small (${buf.length} B)`)
  const webp = await toSquareWebp(buf)
  if (webp.length < MIN_BYTES) throw new Error(`encoded output too small (${webp.length} B)`)
  return webp
}

// Bounded concurrency — Wikimedia asks clients not to hammer the thumbnailer.
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++
      results[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return results
}

// ── step 4: credits ───────────────────────────────────────────────────────
function renderCredits(rows) {
  const body = rows
    .map((r) => {
      const licence = r.licenceUrl ? `[${r.licence}](${r.licenceUrl})` : r.licence
      const credit = r.attribution ? `${r.author} — credit: ${r.attribution}` : r.author
      return `| ${r.name} | [${r.title.replace(/^File:/, '')}](${r.descriptionUrl}) | ${credit} | ${licence} |`
    })
    .join('\n')

  return `# Portrait credits

Portraits in this directory are generated by \`scripts/fetch-portraits.mjs\` from
[Wikimedia Commons](https://commons.wikimedia.org/), matched to each member through
Wikidata property [P1307](https://www.wikidata.org/wiki/Property:P1307) ("Swiss parliament ID").

Each file has been cropped to a square and re-encoded as WebP (${SIZE} × ${SIZE}); the
images are otherwise unmodified. All source files are under CC BY or CC BY-SA
licences, which require attribution — the author and licence of every portrait are
listed below and are also embedded per member in \`src/data/members.json\`.

Do not edit these files by hand — run \`npm run portraits -- --force\` instead.

| Member | Source file | Author | Licence |
| --- | --- | --- | --- |
${body}
`
}

// ── main ──────────────────────────────────────────────────────────────────
async function main() {
  await mkdir(OUT, { recursive: true })

  const members = JSON.parse(await readFile(MEMBERS, 'utf8')).members
  process.stdout.write(`portraits: ${members.length} members\n`)

  const wikidata = await cached('wikidata-portraits.json', fetchWikidata)
  const byId = indexWikidata(wikidata)

  const unmatched = members.filter((m) => !byId.has(String(m.id)))
  if (unmatched.length) {
    process.stderr.write(
      `\n✗ no Wikidata P18 image for ${unmatched.length} member(s):\n` +
        unmatched.map((m) => `    ${m.id}  ${m.name}`).join('\n') +
        '\n',
    )
    throw new Error('missing portraits — add the image on Wikidata, then re-run')
  }

  const titles = [...new Set(members.map((m) => byId.get(String(m.id)).title))]
  const imageinfo = await cached('commons-imageinfo.json', () => fetchImageInfo(titles))

  const missingInfo = titles.filter((t) => !imageinfo[t])
  if (missingInfo.length) {
    throw new Error(`Commons returned no imageinfo for:\n    ${missingInfo.join('\n    ')}`)
  }

  let fetched = 0
  let skipped = 0
  const failed = []
  const lowRes = []

  const results = await mapLimit(members, 2, async (m) => {
    const { title } = byId.get(String(m.id))
    const info = imageinfo[title]
    const out = join(OUT, `${m.id}.webp`)

    if (Math.min(info.width, info.height) < LOW_RES_PX) {
      lowRes.push(`${m.name} (${info.width}×${info.height})`)
    }

    if (!FORCE && (await exists(out))) {
      const { size } = await stat(out)
      if (size >= MIN_BYTES) return { m, info, title, status: 'cached' }
    }
    try {
      const webp = await buildPortrait(info)
      await writeFile(out, webp)
      await sleep(300)
      return { m, info, title, status: 'fetched', size: webp.length }
    } catch (e) {
      return { m, info, title, status: 'failed', message: e.message }
    }
  })

  for (const r of results) {
    if (r.status === 'cached') skipped++
    else if (r.status === 'fetched') fetched++
    else {
      failed.push(r.m.name)
      process.stderr.write(`✗ ${r.m.id} ${r.m.name}\n    ${r.message}\n`)
    }
  }

  const credits = results
    .filter((r) => r.status !== 'failed')
    .map((r) => ({
      name: r.m.name,
      title: r.title,
      author: r.info.author,
      licence: r.info.licence,
      licenceUrl: r.info.licenceUrl,
      attribution: r.info.attribution,
      descriptionUrl: r.info.descriptionUrl,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))

  await writeFile(join(OUT, 'CREDITS.md'), renderCredits(credits))

  process.stdout.write(
    `\nportraits: ${fetched} fetched, ${skipped} cached, ${failed.length} failed → ${OUT}\n`,
  )

  if (lowRes.length) {
    process.stdout.write(
      `\n⚠ ${lowRes.length} source image(s) below ${LOW_RES_PX}px — upscaled, will look soft:\n` +
        lowRes
          .sort()
          .map((s) => `    ${s}`)
          .join('\n') +
        '\n',
    )
  }

  if (failed.length) {
    process.stderr.write(`\nMissing portraits: ${failed.join(', ')}\n`)
    process.exitCode = 1
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
