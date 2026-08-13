// Build src/data/members.json from the cached raw OData snapshots under
// src/data/raw/. Pure computation — no network calls. Re-run after tweaking any
// derivation constants to see the effect instantly.
//
// Run:  npm run data:build
//
// Data notes:
//  - MemberCouncil.DateJoining resets every legislature, so it is NOT tenure.
//    True first-entry comes from the MemberCouncilHistory collection.
//  - Committees come from MemberCommittee (count + names + chair flag drive
//    the CMTE stat and the Detail screen later).
//  - Vote counts come from the Voting collection.
//  - Portraits come from Wikimedia Commons via scripts/fetch-portraits.mjs; the
//    caches it writes supply each member's author/licence credit.
//  - Rarity is percentile-ranked over a composite score (tenure + committee
//    workload + chair role + chamber), so the distribution stays stable across
//    rebuilds instead of drifting with cohort clusters.
//  - ATK/DEF/OVR are game-invented but *derived deterministically* from real
//    signals so a given member always scores the same:
//      ATK ← age + number of votes cast
//      DEF ← years in parliament + committee count
//      OVR ← (ATK + DEF) * rarityFactor, linearly mapped to a 0–100 scale.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RAW_DIR = join(__dirname, '..', 'src', 'data', 'raw')
const OUT = join(__dirname, '..', 'src', 'data', 'members.json')

const NOW = Date.parse('2026-08-12') // fixed reference so builds are reproducible
const YEAR_MS = 365.25 * 24 * 3600 * 1000

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

// ── rarity via percentile-ranked composite score ──
const RARITY_TIERS = [
  { key: 'legend', share: 0.02 },
  { key: 'ultra', share: 0.06 },
  { key: 'rare', share: 0.14 },
  { key: 'uncommon', share: 0.28 },
  { key: 'common', share: 0.50 },
]
function rarityScore({ years, chairCount, chamber }) {
  return years + 0.75 * chairCount + 2 * (chamber === 'SR' ? 1 : 0)
}
function assignRarities(records) {
  const ranked = [...records].sort((a, b) => b._score - a._score)
  const N = ranked.length
  let idx = 0
  for (const tier of RARITY_TIERS) {
    const isLast = tier === RARITY_TIERS[RARITY_TIERS.length - 1]
    const stop = isLast ? N : idx + Math.round(tier.share * N)
    while (idx < stop) ranked[idx++]._rarity = tier.key
  }
}

// ── deterministic stat derivation from real signals ──
const RARITY_FACTOR = {
  common: 1.0,
  uncommon: 1.2,
  rare: 1.4,
  ultra: 1.7,
  legend: 2.0,
}
const MIN_OVR_RAW = 90 // realistic floor: freshman common (~atk 45 + def 45) × 1.0
const MAX_OVR_RAW = 340 // realistic ceiling: strong legend (~atk 85 + def 85) × 2.0

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

function deriveStats({ years, age, voteCount, committeeCount, rarity, maxVotes }) {
  const ageNorm = clamp((age - 30) / 40, 0, 1)
  const voteNorm = maxVotes > 0 ? clamp(voteCount / maxVotes, 0, 1) : 0
  const atk = Math.round(40 + (0.4 * ageNorm + 0.6 * voteNorm) * 59)

  const yearsNorm = clamp(years / 30, 0, 1)
  const cmteNorm = clamp(committeeCount / 6, 0, 1)
  const def = Math.round(40 + (0.6 * yearsNorm + 0.4 * cmteNorm) * 59)

  const rarityFactor = RARITY_FACTOR[rarity] ?? 1.0
  const ovrRaw = (atk + def) * rarityFactor
  // Map to 50–99 so every member has a meaningful headline number.
  const ovr = clamp(
    Math.round(50 + ((ovrRaw - MIN_OVR_RAW) / (MAX_OVR_RAW - MIN_OVR_RAW)) * 49),
    50,
    99,
  )

  return { atk, def, ovr }
}

// ── raw helpers ───────────────────────────────────────────────────────────
const parseMsDate = (s) => {
  if (!s) return null
  const m = /-?\d+/.exec(s)
  return m ? Number(m[0]) : null
}
const yearsSince = (ms) => (ms == null ? null : (NOW - ms) / YEAR_MS)

async function readRaw(name, hint = 'npm run data:fetch') {
  const path = join(RAW_DIR, name)
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (e) {
    if (e.code === 'ENOENT') {
      throw new Error(`Missing raw cache: ${name}. Run \`${hint}\` first.`)
    }
    throw e
  }
}

// ── portraits ─────────────────────────────────────────────────────────────
// Both caches are written by scripts/fetch-portraits.mjs. The join key is
// Wikidata P1307 ("Swiss parliament ID"), which is the same PersonNumber we use
// as the member id here.
function buildPortraitIndex(wikidata, imageinfo) {
  const titleById = new Map()
  for (const b of wikidata?.results?.bindings ?? []) {
    const pid = b?.pid?.value
    const img = b?.img?.value
    if (!pid || !img || titleById.has(pid)) continue
    const tail = img.split('/').pop()
    titleById.set(pid, 'File:' + decodeURIComponent(tail).replace(/_/g, ' '))
  }

  return (id) => {
    const info = imageinfo[titleById.get(String(id))]
    if (!info) return null
    return {
      src: `/portraits/${id}.webp`,
      author: info.author,
      licence: info.licence,
      licenceUrl: info.licenceUrl || null,
      // Required credit line for the bare "Attribution" licence used by the
      // official Parliamentary Services portraits.
      attribution: info.attribution || null,
      source: info.descriptionUrl,
    }
  }
}

// ── pipeline ──────────────────────────────────────────────────────────────
async function main() {
  const [members, history, committees, voteCounts] = await Promise.all([
    readRaw('members-council.json'),
    readRaw('council-history.json'),
    readRaw('committees.json'),
    readRaw('vote-counts-current.json'),
  ])
  const [wikidataPortraits, commonsImageinfo] = await Promise.all([
    readRaw('wikidata-portraits.json', 'npm run portraits'),
    readRaw('commons-imageinfo.json', 'npm run portraits'),
  ])
  const portraitFor = buildPortraitIndex(wikidataPortraits, commonsImageinfo)
  process.stdout.write(`Loaded raw: ${members.length} members, ${history.length} history rows, ${committees.length} committee rows, ${Object.keys(voteCounts).length} current-legislature vote counts\n`)

  // Earliest join across all past legislatures.
  const earliestJoin = new Map()
  for (const h of history) {
    const j = parseMsDate(h.DateJoining)
    if (j == null) continue
    const cur = earliestJoin.get(h.PersonNumber)
    if (cur == null || j < cur) earliestJoin.set(h.PersonNumber, j)
  }

  // Standing committee memberships per person.
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

  const maxVotes = Math.max(0, ...Object.values(voteCounts))

  // Pass 1: gather signals + rarity score.
  const raw = members.map((m) => {
    const joinMs = Math.min(
      earliestJoin.get(m.PersonNumber) ?? Infinity,
      parseMsDate(m.DateJoining) ?? Infinity,
    )
    const years = Math.max(0, Math.round(yearsSince(joinMs) ?? 0))
    const age = Math.max(0, Math.round(yearsSince(parseMsDate(m.DateOfBirth)) ?? 0))
    const chamber = m.CouncilAbbreviation
    const party = normParty(m.PartyAbbreviation)
    const cmtes = (cmteByPerson.get(m.PersonNumber) ?? []).filter((c) => c.standing)
    const committeeCount = cmtes.length
    const chairCount = cmtes.filter((c) => c.chair).length
    const voteCount = voteCounts[m.PersonNumber] ?? 0
    const rec = { m, years, age, chamber, party, cmtes, committeeCount, chairCount, voteCount }
    rec._score = rarityScore({ years, chairCount, chamber })
    return rec
  })

  // Pass 2: percentile-bin rarity across cohort.
  assignRarities(raw)

  // Pass 3: derive stats now that rarity is known.
  const built = raw.map((r) => {
    const { atk, def, ovr } = deriveStats({
      years: r.years,
      age: r.age,
      voteCount: r.voteCount,
      committeeCount: r.committeeCount,
      rarity: r._rarity,
      maxVotes,
    })
    return {
      id: r.m.PersonNumber,
      first: r.m.FirstName,
      last: r.m.LastName,
      name: `${r.m.FirstName} ${r.m.LastName}`,
      gender: r.m.GenderAsString || null,
      party: r.party.label,
      partyCode: r.party.code,
      partyRaw: r.m.PartyAbbreviation,
      parlGroup: r.m.ParlGroupName || null,
      canton: r.m.CantonAbbreviation,
      cantonName: r.m.CantonName,
      chamber: r.chamber,
      chamberName: r.m.CouncilName,
      years: r.years,
      age: r.age,
      committees: r.cmtes.map((c) => ({ abbr: c.abbr, name: c.name, chair: c.chair })),
      committeeCount: r.committeeCount,
      voteCount: r.voteCount,
      atk,
      def,
      ovr,
      rarity: r._rarity,
      mandates: r.m.Mandates || null,
      portrait: portraitFor(r.m.PersonNumber),
    }
  })

  // Stable card numbers: by OVR desc, then name.
  built.sort((a, b) => b.ovr - a.ovr || a.name.localeCompare(b.name))
  built.forEach((m, i) => (m.no = String(i + 1).padStart(3, '0')))

  // ── report ──
  const dist = {}
  for (const m of built) dist[m.rarity] = (dist[m.rarity] || 0) + 1
  const missingPortraits = built.filter((m) => !m.portrait)
  if (missingPortraits.length) {
    throw new Error(
      `No portrait for ${missingPortraits.length} member(s): ` +
        missingPortraits.map((m) => `${m.id} ${m.name}`).join(', ') +
        '\nRun `npm run portraits` to refresh the Commons caches.',
    )
  }

  const meta = {
    source: 'Swiss Federal Assembly OData web service (ws.parlament.ch)',
    portraitSource:
      'Wikimedia Commons, matched via Wikidata property P1307 (Swiss parliament ID). Mostly official Parliamentary Services portraits; see public/portraits/CREDITS.md for per-image author and licence.',
    generatedAt: new Date(NOW).toISOString().slice(0, 10),
    count: built.length,
    rarity: dist,
    note: 'MemberCommittee (DEF) reflects current legislature only; Voting count (ATK) restricted to LP 52. Rarity is percentile-ranked (top 2/6/14/28/50%) over years + 0.75·chairs + 2·SR. OVR = (ATK+DEF)*rarityFactor mapped to 50–99.',
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
