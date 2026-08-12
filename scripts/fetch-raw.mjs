// Fetch raw OData collections from the Swiss Parliament web service and cache
// them as JSON files under src/data/raw/. The build step (build-members.mjs)
// consumes those caches without touching the network, so iterating on stat
// derivation is instant.
//
// Run:
//   npm run data:fetch           # skips files already on disk
//   npm run data:fetch -- --force  # re-fetch everything
//
// Why? ws.parlament.ch blocks CORS and rate-limits aggressively. Caching the
// raw snapshots keeps rebuilds fast and offline-friendly.

import { writeFile, readFile, mkdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RAW_DIR = join(__dirname, '..', 'src', 'data', 'raw')

const BASE = 'https://ws.parlament.ch/odata.svc'
const UA = 'Mozilla/5.0 (bundeshaus-pack data build)'
const LANG = 'DE'

const FORCE = process.argv.includes('--force')

// ── OData helpers ─────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getJson(url, { retries = 4, backoffMs = 1000 } = {}) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
      return await res.json()
    } catch (e) {
      lastErr = e
      if (attempt === retries) break
      await sleep(backoffMs * 2 ** attempt)
    }
  }
  throw lastErr
}

const rows = (payload) => {
  const d = payload?.d
  if (Array.isArray(d)) return { rows: d, next: null }
  return { rows: d?.results ?? [], next: d?.results ? d?.__next ?? null : null }
}

async function getAllPaged(path, params) {
  const url = `${BASE}/${path}?${params}&$format=json`
  let payload = await getJson(url)
  let { rows: acc, next } = rows(payload)
  const all = [...acc]
  let guard = 0
  while (next && guard++ < 50) {
    payload = await getJson(next.includes('$format') ? next : `${next}&$format=json`)
    const r = rows(payload)
    all.push(...r.rows)
    next = r.next
    await sleep(200)
  }
  return all
}

// OData v2: $inlinecount=allpages returns the total in d.__count. The parlament
// endpoint returns HTTP 500 on $top=0, so we fetch $top=1 and discard the row.
async function countRows(path, filter) {
  const params = `$filter=${encodeURIComponent(filter)}&$top=1&$inlinecount=allpages&$format=json`
  const payload = await getJson(`${BASE}/${path}?${params}`)
  const n = Number(payload?.d?.__count)
  return Number.isFinite(n) ? n : 0
}

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function fetchByPersons(path, select, personNumbers) {
  const out = []
  const groups = chunk(personNumbers, 20)
  let i = 0
  for (const g of groups) {
    const orClause = g.map((p) => `PersonNumber eq ${p}`).join(' or ')
    const filter = `Language eq '${LANG}' and (${orClause})`
    const params = `$filter=${encodeURIComponent(filter)}&$select=${encodeURIComponent(select)}`
    const r = await getAllPaged(path, params)
    out.push(...r)
    process.stdout.write(`  ${path}: batch ${++i}/${groups.length} (+${r.length})\r`)
    await sleep(250)
  }
  process.stdout.write('\n')
  return out
}

// ── cache helpers ─────────────────────────────────────────────────────────
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
  await writeFile(path, JSON.stringify(data, null, 2))
  process.stdout.write(`  wrote ${name}\n`)
  return data
}

// ── pipeline ──────────────────────────────────────────────────────────────
async function main() {
  await mkdir(RAW_DIR, { recursive: true })

  process.stdout.write('Fetching active MemberCouncil…\n')
  const active = await cached('members-council.json', async () => {
    const all = await getAllPaged(
      'MemberCouncil',
      `$filter=${encodeURIComponent(`Active eq true and Language eq '${LANG}'`)}`,
    )
    return all.filter((m) => m.CouncilAbbreviation === 'NR' || m.CouncilAbbreviation === 'SR')
  })
  process.stdout.write(`  ${active.length} sitting members (NR/SR)\n`)

  const personNumbers = [...new Set(active.map((m) => m.PersonNumber))]

  process.stdout.write('Fetching MemberCouncilHistory…\n')
  await cached('council-history.json', () =>
    fetchByPersons('MemberCouncilHistory', 'PersonNumber,DateJoining', personNumbers),
  )

  process.stdout.write('Fetching MemberCommittee…\n')
  await cached('committees.json', () =>
    fetchByPersons(
      'MemberCommittee',
      'PersonNumber,CommitteeName,Abbreviation1,CommitteeFunctionName,CommitteeTypeName',
      personNumbers,
    ),
  )

  process.stdout.write('Fetching Voting counts (per person)…\n')
  await cached('vote-counts.json', async () => {
    const counts = {}
    let i = 0
    for (const pn of personNumbers) {
      const n = await countRows('Voting', `Language eq '${LANG}' and PersonNumber eq ${pn}`)
      counts[pn] = n
      process.stdout.write(`  Voting: ${++i}/${personNumbers.length} (person ${pn}: ${n})\r`)
      await sleep(150)
    }
    process.stdout.write('\n')
    return counts
  })

  process.stdout.write(`\nRaw cache in ${RAW_DIR}\n`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
