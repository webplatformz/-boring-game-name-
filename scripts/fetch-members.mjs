// Build-time data pipeline: pull the *real* sitting members of the Swiss Federal
// Assembly from the Parliament OData web service, enrich with true tenure and
// committee memberships, derive the game's card stats, and write
// src/data/members.json.
//
// Run:  npm run data
//
// Why build-time? ws.parlament.ch blocks CORS/HEAD (403), so the browser can't
// call it directly. We bake a static snapshot into the bundle: instant load,
// offline-friendly, no runtime dependency. Re-run to refresh.
//
// Data notes:
//  - MemberCouncil.DateJoining resets every legislature, so it is NOT tenure.
//    True first-entry comes from the MemberCouncilHistory collection, batched
//    by PersonNumber.
//  - Committees come from MemberCommittee, batched the same way (count + names
//    + chair flag drive the CMTE stat and the Detail screen later).
//  - ATK/DEF/OVR are game-invented but *derived deterministically* from real
//    signals (tenure, age, chamber) so a given member always scores the same.

import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'src', 'data', 'members.json')

const BASE = 'https://ws.parlament.ch/odata.svc'
const UA = 'Mozilla/5.0 (bundeshaus-pack data build)'
const LANG = 'DE'
const NOW = Date.parse('2026-08-12') // fixed reference so builds are reproducible
const YEAR_MS = 365.25 * 24 * 3600 * 1000

// ── rarity by true tenure (years since first ever entering the Assembly) ──
const RARITY_TIERS = [
  { key: 'legend', minYears: 20 },
  { key: 'ultra', minYears: 14 },
  { key: 'rare', minYears: 9 },
  { key: 'uncommon', minYears: 5 },
  { key: 'common', minYears: 0 },
]
function rarityOf(years) {
  return RARITY_TIERS.find((t) => years >= t.minYears).key
}

// ── party normalisation: raw PartyAbbreviation → { code (for colour), label } ──
const PARTY_MAP = {
  SVP: { code: 'SVP', label: 'SVP' },
  SP: { code: 'SP', label: 'SP' },
  'FDP-Liberale': { code: 'FDP', label: 'FDP' },
  FDP: { code: 'FDP', label: 'FDP' },
  LDP: { code: 'FDP', label: 'LDP' },
  'M-E': { code: 'MITTE', label: 'Die Mitte' },
  'Die Mitte': { code: 'MITTE', label: 'Die Mitte' },
  CVP: { code: 'MITTE', label: 'Die Mitte' },
  GRÜNE: { code: 'GRUENE', label: 'GRÜNE' },
  glp: { code: 'GLP', label: 'GLP' },
  GLP: { code: 'GLP', label: 'GLP' },
  EVP: { code: 'EVP', label: 'EVP' },
  EDU: { code: 'EDU', label: 'EDU' },
  Lega: { code: 'LEGA', label: 'Lega' },
  MCG: { code: 'MCG', label: 'MCG' },
  Al: { code: 'AL', label: 'PdA/AL' },
}
function normParty(raw) {
  return PARTY_MAP[raw] || { code: 'NONE', label: raw && raw !== '-' ? raw : 'parteilos' }
}

// ── deterministic per-member jitter so stats are stable across builds ──
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

function deriveStats({ personNumber, years, age, chamber }) {
  const rnd = mulberry32(personNumber * 2654435761)
  const jitterA = Math.round((rnd() - 0.5) * 14) // ±7
  const jitterD = Math.round((rnd() - 0.5) * 12) // ±6
  const senate = chamber === 'SR' ? 3 : 0
  const atk = clamp(Math.round(50 + years * 1.5 + senate + jitterA), 40, 99)
  const def = clamp(Math.round(44 + (age - 45) * 0.7 + years * 1.1 + jitterD), 40, 99)
  const ovr = Math.min(99, Math.round(atk * 0.44 + def * 0.34 + years * 0.95))
  return { atk, def, ovr }
}

// ── OData helpers ─────────────────────────────────────────────────────────
const parseMsDate = (s) => {
  if (!s) return null
  const m = /-?\d+/.exec(s)
  return m ? Number(m[0]) : null
}
const yearsSince = (ms) => (ms == null ? null : (NOW - ms) / YEAR_MS)
const rows = (payload) => {
  const d = payload?.d
  if (Array.isArray(d)) return { rows: d, next: null }
  return { rows: d?.results ?? [], next: d?.results ? d?.__next ?? null : null }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.json()
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

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// Batch a collection by PersonNumber (chunks keep the $filter URL short).
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

async function main() {
  process.stdout.write('Fetching active members…\n')
  const active = await getAllPaged(
    'MemberCouncil',
    `$filter=${encodeURIComponent(`Active eq true and Language eq '${LANG}'`)}`,
  )
  const members = active.filter((m) => m.CouncilAbbreviation === 'NR' || m.CouncilAbbreviation === 'SR')
  process.stdout.write(`  ${members.length} sitting members (NR/SR)\n`)

  const personNumbers = [...new Set(members.map((m) => m.PersonNumber))]

  process.stdout.write('Fetching tenure history…\n')
  const history = await fetchByPersons(
    'MemberCouncilHistory',
    'PersonNumber,DateJoining',
    personNumbers,
  )
  const earliestJoin = new Map()
  for (const h of history) {
    const j = parseMsDate(h.DateJoining)
    if (j == null) continue
    const cur = earliestJoin.get(h.PersonNumber)
    if (cur == null || j < cur) earliestJoin.set(h.PersonNumber, j)
  }

  process.stdout.write('Fetching committees…\n')
  const committees = await fetchByPersons(
    'MemberCommittee',
    'PersonNumber,CommitteeName,Abbreviation1,CommitteeFunctionName,CommitteeTypeName',
    personNumbers,
  )
  const cmteByPerson = new Map()
  for (const c of committees) {
    const list = cmteByPerson.get(c.PersonNumber) ?? []
    const fn = c.CommitteeFunctionName || ''
    list.push({
      abbr: c.Abbreviation1 || '',
      name: c.CommitteeName || '',
      chair: /Präsident/i.test(fn),
      role: fn,
      standing: c.CommitteeTypeName === 'Ständig',
    })
    cmteByPerson.set(c.PersonNumber, list)
  }

  // ── build cards ──
  const built = members.map((m) => {
    const joinMs = Math.min(
      earliestJoin.get(m.PersonNumber) ?? Infinity,
      parseMsDate(m.DateJoining) ?? Infinity,
    )
    const years = Math.max(0, Math.round(yearsSince(joinMs) ?? 0))
    const age = Math.max(0, Math.round(yearsSince(parseMsDate(m.DateOfBirth)) ?? 0))
    const chamber = m.CouncilAbbreviation
    const party = normParty(m.PartyAbbreviation)
    const cmtes = (cmteByPerson.get(m.PersonNumber) ?? []).filter((c) => c.standing)
    const { atk, def, ovr } = deriveStats({ personNumber: m.PersonNumber, years, age, chamber })

    return {
      id: m.PersonNumber,
      first: m.FirstName,
      last: m.LastName,
      name: `${m.FirstName} ${m.LastName}`,
      gender: m.GenderAsString || null,
      party: party.label,
      partyCode: party.code,
      partyRaw: m.PartyAbbreviation,
      parlGroup: m.ParlGroupName || null,
      canton: m.CantonAbbreviation,
      cantonName: m.CantonName,
      chamber,
      chamberName: m.CouncilName,
      years,
      age,
      committees: cmtes.map((c) => ({ abbr: c.abbr, name: c.name, chair: c.chair })),
      committeeCount: cmtes.length,
      atk,
      def,
      ovr,
      rarity: rarityOf(years),
      mandates: m.Mandates || null,
    }
  })

  // Stable card numbers: by OVR desc, then name.
  built.sort((a, b) => b.ovr - a.ovr || a.name.localeCompare(b.name))
  built.forEach((m, i) => (m.no = String(i + 1).padStart(3, '0')))

  // ── report ──
  const dist = {}
  for (const m of built) dist[m.rarity] = (dist[m.rarity] || 0) + 1
  const meta = {
    source: 'Swiss Federal Assembly OData web service (ws.parlament.ch)',
    generatedAt: new Date(NOW).toISOString().slice(0, 10),
    count: built.length,
    rarity: dist,
    note: 'ATK/DEF/OVR are game stats derived deterministically from real tenure, age and chamber. Portraits are placeholders.',
  }

  await mkdir(dirname(OUT), { recursive: true })
  await writeFile(OUT, JSON.stringify({ meta, members: built }, null, 2))

  process.stdout.write(`\nWrote ${built.length} members → ${OUT}\n`)
  process.stdout.write(`Rarity: ${JSON.stringify(dist)}\n`)
  const top = built.slice(0, 5).map((m) => `${m.name} (${m.rarity} ${m.ovr})`)
  process.stdout.write(`Top pulls: ${top.join(', ')}\n`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
