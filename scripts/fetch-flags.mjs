// Fetch square Swiss cantonal flag SVGs into public/flags/<AB>.svg, cached in
// the repo so the app has no runtime dependency on a third party.
//
// Run:  npm run flags               (skips files already present)
//       npm run flags -- --force    (re-download everything)
//
// Source: Wikimedia Commons. Each filename below identifies the square flag
// asset used for that canton. The Commons API resolves the current original
// file and records its revision timestamp and SHA-1 in ATTRIBUTION.txt.

import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'public', 'flags')

const UA =
  'bundeshaus-pack/0.1 (Swiss Parliament card game; educational prototype)'

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'

// The Commons filenames are deliberately explicit: a generic search result can
// contain historical banners, municipal flags, or shield-shaped arms.
const CANTONS = [
  ['ZH', 'Flag of Canton of Zürich.svg', '5db49389c94c6eb7725b37a1c568aca28a581f71'],
  ['BE', 'Flag of Canton of Bern.svg', '4e34a7bb7aa4f3578f3187e28868a930121a1440'],
  ['LU', 'Flag of Canton of Lucerne.svg', '8698197cebbfbef8c5b199c8ad7aff951a6b31d4'],
  ['UR', 'Flag of Canton of Uri.svg', 'e98d645e135f70d8a7d9686841e244ca393bfb9e'],
  ['SZ', 'Flag of Canton of Schwyz.svg', 'de10ba8e434f7477f41c4c92a919c7a478eef871'],
  ['OW', 'Flag of Canton of Obwalden.svg', 'c13141e22998d03a5a38abdc5c9a9c9235d9505b'],
  ['NW', 'Flag of Canton of Nidwalden.svg', '203a9bdf01ca854cbbc4d989ff6d7c5ca122022d'],
  ['GL', 'Flag of Canton of Glarus.svg', '8e1261912962ba9c535aae434837d19a42513e1d'],
  ['ZG', 'Flag of Canton of Zug.svg', 'e32dda807d6164b5553922046c66a21ffb739c73'],
  ['FR', 'Flag of Canton of Fribourg.svg', '91eae648d8bdaa0f0f252380adee149f1051d750'],
  ['SO', 'Flag of Canton of Solothurn.svg', '6d0ec03171404a24c573fc1e29cf7812bc057881'],
  ['BS', 'Flag of Canton of Basel.svg', '8dd4aaca9eeef50e19c02e4e71d500ea5ab954b4'],
  ['BL', 'Flag of Canton of Basel-Landschaft.svg', '9c8ee26676bd89c6715f64ba44dfb6ebfe4695cf'],
  ['SH', 'Flag of Canton of Schaffhausen.svg', '614f398e4ce8ca33c3e3586fb09bf1b5a0adc81c'],
  ['AR', 'Flag of Canton of Appenzell Ausserrhoden.svg', 'e90dbf010e40a21b2cf7564e5493b59ec99bf311'],
  ['AI', 'Flag of Canton of Appenzell Innerrhoden.svg', '649c3332aef72b0184c6293acfe760c71bf6ff65'],
  ['SG', 'Flag of Canton of Sankt Gallen.svg', 'd730081e132fdf4f1bdc2ae12620759628077972'],
  ['GR', 'Flag of Canton of Graubünden.svg', 'b3fcaaab02e469c0acb6a8cca464878e4bc98750'],
  ['AG', 'Flag of Canton of Aargau.svg', '6f46c105ff58b88f55efff0334aff7874ffae620'],
  ['TG', 'Flag of Canton of Thurgau.svg', 'e5a6b28608ee7933582f9aa2d5025ec59125502d'],
  ['TI', 'Flag of Canton of Ticino.svg', '01f58654bfa13d691371638ce06bb8119eb81554'],
  ['VD', 'Flag of Canton of Vaud.svg', 'd53e7cec2bda4bbad9ddc951f5a4b8c3b8a45eab'],
  ['VS', 'Flag of Canton of Valais.svg', 'ad02539a790389ead41b25b6992cbd0f7e9998aa'],
  ['NE', 'Flag of Canton of Neuchâtel.svg', '68bdef5a9bd07e87683f20b7abe4ed8742006d77'],
  ['GE', 'Flag of Canton of Geneva.svg', 'a015555d3757185dce95c014892ddcdcc8529126'],
  ['JU', 'Flag of Canton of Jura.svg', '44e21caf71e6b1eae691fb2b73c5a7e58f32a155'],
].map(([ab, file, sha1]) => ({ ab, file, sha1 }))

const MIN_BYTES = 100

function svgAspectRatio(body) {
  const viewBox = body.match(/viewBox=["']\s*[-\d.]+\s+[-\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/i)
  if (viewBox) return Number(viewBox[1]) / Number(viewBox[2])

  const width = body.match(/\bwidth=["']([\d.]+)(?:px)?["']/i)
  const height = body.match(/\bheight=["']([\d.]+)(?:px)?["']/i)
  if (width && height) return Number(width[1]) / Number(height[1])

  return null
}

function isValidSquareSvg(body) {
  const ratio = svgAspectRatio(body)
  return (
    body.includes('<svg') &&
    body.includes('</svg>') &&
    body.length >= MIN_BYTES &&
    ratio !== null &&
    Math.abs(ratio - 1) <= 0.01
  )
}

async function fetchWithRetry(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (res.ok) return res
    if (res.status !== 429 || attempt === 3) {
      throw new Error(`HTTP ${res.status}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt))
  }
  throw new Error('request failed')
}

async function resolveCommonsFiles(sources) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    maxlag: '5',
    origin: '*',
    redirects: '1',
    prop: 'imageinfo',
    iiprop: 'url|sha1|mime|timestamp',
    titles: sources.map(({ file }) => `File:${file}`).join('|'),
  })
  const res = await fetchWithRetry(`${COMMONS_API}?${params}`)
  const data = await res.json()
  const aliases = new Map()
  for (const alias of [
    ...(data.query?.normalized ?? []),
    ...(data.query?.redirects ?? []),
  ]) {
    aliases.set(alias.from, alias.to)
  }
  const pages = new Map(
    (data.query?.pages ?? []).map((page) => [page.title, page]),
  )

  function canonicalTitle(title) {
    const visited = new Set()
    while (aliases.has(title) && !visited.has(title)) {
      visited.add(title)
      title = aliases.get(title)
    }
    return title
  }

  return new Map(
    sources.map((source) => {
      const title = canonicalTitle(`File:${source.file}`)
      const page = pages.get(title)
      const info = page?.imageinfo?.[0]

      if (!page || page.missing || !info?.url) {
        throw new Error(`Commons file not found: ${source.file}`)
      }
      if (info.mime !== 'image/svg+xml') {
        throw new Error(
          `Expected SVG for ${source.file}, received ${info.mime ?? 'unknown MIME type'}`,
        )
      }
      if (info.sha1 !== source.sha1) {
        throw new Error(
          `Commons file changed: ${source.file} (expected ${source.sha1}, received ${info.sha1})`,
        )
      }

      return [
        source.ab,
        {
          canonicalFile: page.title.replace(/^File:/, ''),
          descriptionUrl: info.descriptionurl,
          downloadUrl: info.url,
          sha1: info.sha1,
          timestamp: info.timestamp,
        },
      ]
    }),
  )
}

async function fetchFlag(resolved) {
  const res = await fetchWithRetry(resolved.downloadUrl)
  const bytes = Buffer.from(await res.arrayBuffer())
  const sha1 = createHash('sha1').update(bytes).digest('hex')
  if (sha1 !== resolved.sha1) {
    throw new Error(
      `download checksum mismatch (expected ${resolved.sha1}, received ${sha1})`,
    )
  }
  // Keep checked-in assets reviewable without changing their rendered artwork.
  const svg = bytes
    .toString('utf8')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .trimEnd()
    .concat('\n')
  if (!isValidSquareSvg(svg)) {
    const ratio = svgAspectRatio(svg)
    throw new Error(
      `unexpected SVG (${svg.length} B, aspect ratio ${ratio ?? 'unknown'})`,
    )
  }
  return { svg, resolved }
}

async function cachedFlag(path) {
  try {
    await access(path)
  } catch {
    return null
  }
  const body = await readFile(path, 'utf8')
  return isValidSquareSvg(body) ? body : null
}

function attributionText(results) {
  const lines = [
    'Square Swiss cantonal flags in this directory are generated by scripts/fetch-flags.mjs.',
    '',
    'Source collection: https://commons.wikimedia.org/wiki/Category:SVG_flags_of_cantons_of_Switzerland',
    'Copyright status: the source pages identify these Swiss public-body flag depictions as public domain.',
    'Non-copyright restrictions: use of public signs remains subject to applicable Swiss law.',
    'Processing: line endings and trailing whitespace are normalized; artwork is unchanged.',
    'Retrieved: ' + new Date().toISOString(),
    '',
    'Files:',
  ]

  for (const result of results) {
    lines.push(
      `${result.ab}.svg`,
      `  Source: ${result.resolved.descriptionUrl}`,
      `  Commons file: ${result.resolved.canonicalFile}`,
      `  Revision: ${result.resolved.timestamp}`,
      `  SHA-1: ${result.resolved.sha1}`,
    )
  }

  lines.push('', 'Regenerate with `npm run flags -- --force`.', '')
  return lines.join('\n')
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const force = process.argv.includes('--force')

  if (!force) {
    const cached = await Promise.all(
      CANTONS.map(({ ab }) => cachedFlag(join(OUT, `${ab}.svg`))),
    )
    if (cached.every(Boolean)) {
      process.stdout.write(
        `\nflags: 0 fetched, ${CANTONS.length} cached, 0 failed → ${OUT}\n`,
      )
      return
    }
  }

  const resolvedFiles = await resolveCommonsFiles(CANTONS)

  let fetched = 0
  let cached = 0
  const failed = []

  const results = []
  for (const source of CANTONS) {
    const out = join(OUT, `${source.ab}.svg`)
    const resolved = resolvedFiles.get(source.ab)

    try {
      if (!force && (await cachedFlag(out))) {
        results.push({ ...source, status: 'cached', resolved })
        continue
      }

      const { svg } = await fetchFlag(resolved)
      await writeFile(out, svg)
      results.push({ ...source, status: 'fetched', size: svg.length, resolved })
    } catch (error) {
      results.push({ ...source, status: 'failed', message: error.message })
    }
  }

  for (const result of results) {
    if (result.status === 'cached') {
      cached++
    } else if (result.status === 'fetched') {
      fetched++
      process.stdout.write(`✓ ${result.ab}  (${(result.size / 1024).toFixed(1)} kB)\n`)
    } else {
      failed.push(result.ab)
      process.stderr.write(`✗ ${result.ab}\n    ${result.message}\n`)
    }
  }

  if (!failed.length) {
    await writeFile(join(OUT, 'ATTRIBUTION.txt'), attributionText(results))
  }

  process.stdout.write(
    `\nflags: ${fetched} fetched, ${cached} cached, ${failed.length} failed → ${OUT}\n`,
  )

  if (failed.length) {
    process.stderr.write(`\nMissing flags: ${failed.join(', ')}\n`)
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
