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

import { writeFile, readFile, mkdir, stat, unlink } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import readXlsxFile from 'read-excel-file/node'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RAW_DIR = join(__dirname, '..', 'src', 'data', 'raw')

const BASE = 'https://ws.parlament.ch/odata.svc'
const UA = 'Mozilla/5.0 (bundeshaus-pack data build)'
const LANG = 'DE'
const CURRENT_LEGISLATURE_START = '2023-12-04T00:00:00'
const PROPOSAL_MATURITY_CUTOFF = Date.parse('2025-08-14T00:00:00Z')

// Parliament publishes member-level voting records as one official workbook
// per session. These prepared exports avoid hundreds of rate-limited OData
// aggregation calls and expose the same six decision categories directly.
const NATIONAL_COUNCIL_VOTE_FILES = [
  ['2023 winter', 'https://www.parlament.ch/centers/documents/de/Abstimmungen_NR_2023WS_DE.xlsx'],
  ['2024 spring', 'https://www.parlament.ch/centers/documents/_layouts/15/DocIdRedir.aspx?ID=DOCID-1-12111'],
  ['2024 special April', 'https://www.parlament.ch/centers/documents/_layouts/15/DocIdRedir.aspx?ID=DOCID-1-12216'],
  ['2024 summer', 'https://www.parlament.ch/centers/documents/_layouts/15/DocIdRedir.aspx?ID=DOCID-1-12236'],
  ['2024 autumn', 'https://www.parlament.ch/centers/documents/_layouts/15/DocIdRedir.aspx?ID=DOCID-1-12398'],
  ['2024 winter', 'https://www.parlament.ch/centers/documents/_layouts/15/DocIdRedir.aspx?ID=DOCID-1-12527'],
  ['2025 spring', 'https://www.parlament.ch/centers/documents/_layouts/15/DocIdRedir.aspx?ID=DOCID-1-12677'],
  ['2025 special May', 'https://www.parlament.ch/centers/documents/de/Abstimmungen_NR_2025SonderMai_DE.xlsx'],
  ['2025 summer', 'https://www.parlament.ch/centers/documents/de/Abstimmungen_NR_2025SS_DE.xlsx'],
  ['2025 autumn', 'https://www.parlament.ch/centers/documents/de/Abstimmungen_NR_2025HS_DE.xlsx'],
  ['2025 winter', 'https://www.parlament.ch/centers/documents/_layouts/15/DocIdRedir.aspx?ID=DOCID-1-13186'],
  ['2026 spring', 'https://www.parlament.ch/centers/documents/_layouts/15/DocIdRedir.aspx?ID=DOCID-1-13334'],
  ['2026 special April', 'https://www.parlament.ch/centers/documents/de/Abstimmungen_NR_2026SonderApril_DE.xlsx'],
  ['2026 summer', 'https://www.parlament.ch/centers/documents/de/Abstimmungen_NR_2026SS_DE.xlsx'],
]

const COUNCIL_OF_STATES_VOTE_FILES = [
  ['2023 winter', 'https://www.parlament.ch/centers/documents/de/Abstimmungen_SR_2023WS_DE.xlsx'],
  ['2024 spring', 'https://www.parlament.ch/centers/documents/_layouts/15/DocIdRedir.aspx?ID=DOCID-1-12112'],
  ['2024 summer', 'https://www.parlament.ch/centers/documents/_layouts/15/DocIdRedir.aspx?ID=DOCID-1-12237'],
  ['2024 autumn', 'https://www.parlament.ch/centers/documents/_layouts/15/DocIdRedir.aspx?ID=DOCID-1-12399'],
  ['2024 winter', 'https://www.parlament.ch/centers/documents/_layouts/15/DocIdRedir.aspx?ID=DOCID-1-12526'],
  ['2025 spring', 'https://www.parlament.ch/centers/documents/de/Abstimmungen_SR_2025FS_DE.xlsx'],
  ['2025 summer', 'https://www.parlament.ch/centers/documents/de/Abstimmungen_SR_2025SS_DE.xlsx'],
  ['2025 autumn', 'https://www.parlament.ch/centers/documents/de/Abstimmungen_SR_2025HS_DE.xlsx'],
  ['2025 winter', 'https://www.parlament.ch/centers/documents/_layouts/15/DocIdRedir.aspx?ID=DOCID-1-13185'],
  ['2026 spring', 'https://www.parlament.ch/centers/documents/_layouts/15/DocIdRedir.aspx?ID=DOCID-1-13335'],
  ['2026 summer', 'https://www.parlament.ch/centers/documents/de/Abstimmungen_SR_2026SS_DE.xlsx'],
]

const FORCE = process.argv.includes('--force')

// ── OData helpers ─────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getJson(url, { retries = 7, backoffMs = 1000 } = {}) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
      })
      if (res.status === 429 && attempt < retries) {
        const retryAfterHeader = res.headers.get('retry-after')
        const retryAfter = retryAfterHeader == null ? Number.NaN : Number(retryAfterHeader)
        await sleep(Number.isFinite(retryAfter) ? retryAfter * 1000 : 10_000 + attempt * 5_000)
        continue
      }
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

async function getBuffer(url, { retries = 7, backoffMs = 1000 } = {}) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } })
      if (res.status === 429 && attempt < retries) {
        const retryAfterHeader = res.headers.get('retry-after')
        const retryAfter = retryAfterHeader == null ? Number.NaN : Number(retryAfterHeader)
        await sleep(Number.isFinite(retryAfter) ? retryAfter * 1000 : 10_000 + attempt * 5_000)
        continue
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
      return Buffer.from(await res.arrayBuffer())
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
  while (next && guard++ < 500) {
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

function odataDateMillis(value) {
  const match = /-?\d+/.exec(String(value ?? ''))
  return match ? Number(match[0]) : null
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

async function fetchBusinesses(ids) {
  const out = []
  // Fifty numeric IDs remain comfortably below normal URL limits and reduce
  // the mature-affair status refresh to fewer than 90 OData requests.
  const groups = chunk(ids, 50)
  let i = 0
  for (const group of groups) {
    const idClause = group.map((id) => `ID eq ${id}`).join(' or ')
    const filter = `Language eq '${LANG}' and (${idClause})`
    const select = [
      'ID',
      'BusinessTypeName',
      'Title',
      'Proceedings',
      'FederalCouncilProposal',
      'FederalCouncilProposalText',
      'SubmittedBy',
      'BusinessStatus',
      'BusinessStatusText',
      'BusinessStatusDate',
      'SubmissionDate',
      'SubmissionCouncilAbbreviation',
      'SubmissionLegislativePeriod',
    ].join(',')
    const params = `$filter=${encodeURIComponent(filter)}&$select=${encodeURIComponent(select)}`
    const result = await getAllPaged('Business', params)
    out.push(...result)
    process.stdout.write(`  Business: batch ${++i}/${groups.length} (+${result.length})\r`)
    await sleep(200)
  }
  process.stdout.write('\n')
  return out
}

const emptyVoteOutcomes = (source) => ({
  yes: 0,
  no: 0,
  abstention: 0,
  notParticipated: 0,
  excused: 0,
  presiding: 0,
  unknown: 0,
  presentWithoutDecision: 0,
  eligible: 0,
  participated: 0,
  participationRate: 0,
  source,
})

function finalizeVoteOutcomes(outcome) {
  outcome.participated = outcome.yes + outcome.no + outcome.abstention
  outcome.eligible = outcome.participated + outcome.notParticipated
  outcome.participationRate = outcome.eligible > 0 ? outcome.participated / outcome.eligible : 0
  return outcome
}

function normalizeName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(dr|prof|lic|iur|rer|pol)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .sort()
    .join(' ')
}

function decisionKey(value) {
  const text = String(value ?? '').trim().toLowerCase()
  if (!text) return null
  if (text === 'ja') return 'yes'
  if (text === 'nein') return 'no'
  if (text === 'enthaltung') return 'abstention'
  if (text.includes('nicht teilgenommen')) return 'notParticipated'
  if (text.startsWith('entschuldigt')) return 'excused'
  if (text.includes('präsident') && text.includes('stimmt nicht')) return 'presiding'
  if (text === 'unknown') return 'unknown'
  if (text === 'anwesend') return 'presentWithoutDecision'
  return undefined
}

async function fetchVoteWorkbooks(
  members,
  files,
  councilLabel,
  source,
  minimumMatches,
  checkpointName,
) {
  const currentById = new Map(members.map((m) => [Number(m.PersonNumber), m]))
  const currentByName = new Map()
  for (const member of members) {
    for (const alias of [
      `${member.LastName}, ${member.FirstName}`,
      `${member.LastName} ${member.FirstName}`,
      member.OfficialName,
    ]) {
      const key = normalizeName(alias)
      if (key) currentByName.set(key, member)
    }
  }
  const totals = Object.fromEntries(
    members.map((m) => [m.PersonNumber, emptyVoteOutcomes(source)]),
  )
  const checkpointPath = join(RAW_DIR, checkpointName)
  const completed = new Set()
  if (!FORCE && (await exists(checkpointPath))) {
    const saved = JSON.parse(await readFile(checkpointPath, 'utf8'))
    for (const label of saved.completed ?? []) completed.add(label)
    for (const [personNumber, outcome] of Object.entries(saved.totals ?? {})) {
      if (totals[personNumber]) Object.assign(totals[personNumber], outcome, { source })
    }
    process.stdout.write(`  ${councilLabel}: resuming after ${completed.size}/${files.length} session files\n`)
  }

  for (const [label, url] of files) {
    if (completed.has(label)) continue
    const workbook = await readXlsxFile(await getBuffer(url))
    const rows = workbook[0]?.data
    if (!rows?.length) throw new Error(`No rows found in ${councilLabel} workbook: ${label}`)

    const nameRowIndex = rows.findIndex((row) =>
      row.some((cell) => String(cell ?? '').toLowerCase().includes('name des ratsmitglied')),
    )
    if (nameRowIndex < 0) throw new Error(`Member-name row missing in ${councilLabel} workbook: ${label}`)
    const nameRow = rows[nameRowIndex]
    const nameLabelColumn = nameRow.findIndex((cell) =>
      String(cell ?? '').toLowerCase().includes('name des ratsmitglied'),
    )
    const numberRow = rows.find((row) =>
      row.some((cell) => String(cell ?? '').toLowerCase().includes('ratsmitglied (nr)')),
    )
    const voteHeaderIndex = rows.findIndex(
      (row, index) =>
        index > nameRowIndex &&
        row.some((cell) => ['geschäftsnummer', 'abstimmungsdatum'].includes(String(cell ?? '').trim().toLowerCase())),
    )
    if (voteHeaderIndex < 0) throw new Error(`Vote header missing in ${councilLabel} workbook: ${label}`)

    const memberColumns = []
    for (let column = nameLabelColumn + 1; column < nameRow.length; column++) {
      const displayedName = nameRow[column]
      if (!displayedName) continue
      const memberNumber = Number(numberRow?.[column])
      const member =
        (Number.isFinite(memberNumber) ? currentById.get(memberNumber) : null) ??
        currentByName.get(normalizeName(displayedName))
      if (member) memberColumns.push([column, member.PersonNumber])
    }
    if (memberColumns.length < minimumMatches) {
      throw new Error(`Only ${memberColumns.length} current members matched in ${councilLabel} workbook: ${label}`)
    }

    let decisionRows = 0
    for (const row of rows.slice(voteHeaderIndex + 1)) {
      let hasDecision = false
      for (const [column, personNumber] of memberColumns) {
        const key = decisionKey(row[column])
        if (key === undefined) {
          throw new Error(`Unknown ${councilLabel} decision "${row[column]}" in ${label}`)
        }
        if (!key) continue
        totals[personNumber][key]++
        hasDecision = true
      }
      if (hasDecision) decisionRows++
    }
    process.stdout.write(`  ${councilLabel} ${label}: ${decisionRows} votes, ${memberColumns.length} current members\n`)
    completed.add(label)
    await writeFile(
      checkpointPath,
      JSON.stringify({ completed: [...completed], totals }, null, 2),
    )
    await sleep(250)
  }

  for (const outcome of Object.values(totals)) finalizeVoteOutcomes(outcome)
  return totals
}

async function clearCheckpoint(name) {
  try {
    await unlink(join(RAW_DIR, name))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
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
    // NR/SR = sitting parliamentarians. BR = the 7 Federal Councillors, folded
    // in as the "mythic" tier by build-members.mjs.
    return all.filter((m) => ['NR', 'SR', 'BR'].includes(m.CouncilAbbreviation))
  })
  process.stdout.write(`  ${active.length} sitting members (NR/SR/BR)\n`)

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

  process.stdout.write('Fetching PersonInterest disclosures…\n')
  await cached('interests.json', () =>
    fetchByPersons(
      'PersonInterest',
      [
        'ID',
        'PersonNumber',
        'InterestName',
        'OrganizationTypeText',
        'InterestTypeText',
        'FunctionInAgencyText',
        'Paid',
        'Modified',
      ].join(','),
      personNumbers,
    ),
  )

  const regularMembers = active.filter((m) => ['NR', 'SR'].includes(m.CouncilAbbreviation))
  const nationalCouncil = regularMembers.filter((m) => m.CouncilAbbreviation === 'NR')
  const councilOfStates = regularMembers.filter((m) => m.CouncilAbbreviation === 'SR')

  process.stdout.write('Fetching detailed vote outcomes for the current legislature (52)…\n')
  const nationalCouncilVotes = await cached('national-council-vote-outcomes-current.json', () =>
    fetchVoteWorkbooks(
      nationalCouncil,
      NATIONAL_COUNCIL_VOTE_FILES,
      'National Council',
      'National Council official session workbooks',
      175,
      'national-council-vote-outcomes.resume.json',
    ),
  )
  await clearCheckpoint('national-council-vote-outcomes.resume.json')
  const councilOfStatesVotes = await cached('council-of-states-vote-outcomes-current.json', () =>
    fetchVoteWorkbooks(
      councilOfStates,
      COUNCIL_OF_STATES_VOTE_FILES,
      'Council of States',
      'Council of States official session workbooks',
      40,
      'council-of-states-vote-outcomes.resume.json',
    ),
  )
  await clearCheckpoint('council-of-states-vote-outcomes.resume.json')
  await cached('vote-outcomes-current.json', async () => ({
    ...nationalCouncilVotes,
    ...councilOfStatesVotes,
  }))

  process.stdout.write('Fetching personally authored affairs for the current legislature…\n')
  const authoredRoles = await cached('authored-affairs-current.json', async () => {
    const params = [
      `$filter=${encodeURIComponent(`Language eq '${LANG}' and Role eq 7 and BusinessSubmissionDate ge datetime'${CURRENT_LEGISLATURE_START}'`)}`,
      `$select=${encodeURIComponent('MemberCouncilNumber,Role,RoleName,BusinessNumber,BusinessShortNumber,BusinessTitle,BusinessSubmissionDate,BusinessType,BusinessTypeName,BusinessTypeAbbreviation')}`,
    ].join('&')
    const currentIds = new Set(regularMembers.map((m) => m.PersonNumber))
    return (await getAllPaged('BusinessRole', params)).filter((role) =>
      currentIds.has(role.MemberCouncilNumber),
    )
  })
  process.stdout.write(`  ${authoredRoles.length} authored affairs by current members\n`)

  process.stdout.write('Fetching official status for authored affairs…\n')
  const matureBusinessIds = [
    ...new Set(
      authoredRoles
        .filter((role) => {
          const submittedAt = odataDateMillis(role.BusinessSubmissionDate)
          return submittedAt != null && submittedAt <= PROPOSAL_MATURITY_CUTOFF
        })
        .map((role) => role.BusinessNumber),
    ),
  ]
  process.stdout.write(`  ${matureBusinessIds.length} mature affairs need status details\n`)
  await cached('authored-business-status-current.json', () => fetchBusinesses(matureBusinessIds))

  process.stdout.write(`\nRaw cache in ${RAW_DIR}\n`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
