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
//  - Declared external interests come from PersonInterest. Counts describe
//    disclosed links; they are never folded into ATK/DEF/OVR or rarity.
//  - Campaign financing comes from the official EFK 2023 final-account XLSX
//    exports normalized by scripts/import-efk-financing.mjs. Direct campaigns
//    and shared campaign pools remain strictly separate.
//  - Portraits come from Wikimedia Commons via scripts/fetch-portraits.mjs; the
//    caches it writes supply each member's author/licence credit.
//  - Rarity is percentile-ranked over a composite score (tenure + committee
//    workload + chair role + chamber), so the distribution stays stable across
//    rebuilds instead of drifting with cohort clusters. The 7 sitting Federal
//    Councillors (chamber 'BR') sit outside that ranking entirely — they are
//    assigned the "mythic" rarity directly (see Pass 2 below).
//  - ATK/DEF/OVR are game-invented but *derived deterministically* from real
//    signals. NR and SR members are percentile-ranked inside their chamber so
//    their structurally different committee workloads remain comparable:
//      ATK ← leadership + workload + tenure + age/network experience
//      DEF ← tenure + workload + age/network experience
//      OVR ← visible ATK/DEF only; rarity never changes performance.

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
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

const COMMITTEE_LEADERSHIP_WEIGHT = {
  'Präsident/in': 1.0,
  '1. Vizepräsident/in': 0.8,
  'Vizepräsident/in': 0.6,
  '2. Vizepräsident/in': 0.5,
  'Stimmenzähler/in': 0.2,
  'Ersatzstimmenzähler/in': 0.1,
}
const GROUP_LEADERSHIP_WEIGHT = {
  'Präsident/in': 1.0,
  'Vizepräsident/in': 0.6,
}

const STAT_PERCENTILE_CURVE = [
  [0.0, 45],
  [0.05, 52],
  [0.1, 56],
  [0.25, 63],
  [0.5, 70],
  [0.75, 78],
  [0.9, 85],
  [0.95, 89],
  [0.98, 93],
  [1.0, 97],
]

function committeeWorkloadWeight(role) {
  return role === 'Stellvertreter/in' ? 0.35 : 1.0
}

function committeeLeadershipWeight(role) {
  return COMMITTEE_LEADERSHIP_WEIGHT[role] ?? 0
}

function groupLeadershipWeight(role) {
  return GROUP_LEADERSHIP_WEIGHT[role] ?? 0
}

function assignMidrankPercentiles(records, valueKey, percentileKey) {
  const ranked = [...records].sort(
    (a, b) => a[valueKey] - b[valueKey] || a.m.PersonNumber - b.m.PersonNumber,
  )
  const n = ranked.length
  let i = 0
  while (i < n) {
    let stop = i + 1
    while (stop < n && ranked[stop][valueKey] === ranked[i][valueKey]) stop++
    const percentile = ((i + stop - 1) / 2 + 0.5) / n
    for (let j = i; j < stop; j++) ranked[j][percentileKey] = percentile
    i = stop
  }
}

function ratingFromPercentile(percentile) {
  const p = clamp(percentile, 0, 1)
  for (let i = 1; i < STAT_PERCENTILE_CURVE.length; i++) {
    const [x1, y1] = STAT_PERCENTILE_CURVE[i]
    if (p > x1) continue
    const [x0, y0] = STAT_PERCENTILE_CURVE[i - 1]
    return Math.round(y0 + ((p - x0) / (x1 - x0)) * (y1 - y0))
  }
  return STAT_PERCENTILE_CURVE.at(-1)[1]
}

function deriveOverall(atk, def) {
  return Math.round(0.45 * atk + 0.45 * def + 0.1 * Math.min(atk, def))
}

function deriveRegularStats(records) {
  for (const chamber of ['NR', 'SR']) {
    const cohort = records.filter((r) => r.chamber === chamber)
    for (const [valueKey, percentileKey] of [
      ['_leadershipPoints', '_leadershipPercentile'],
      ['_workloadPoints', '_workloadPercentile'],
      ['_tenureYears', '_tenurePercentile'],
      ['_ageYears', '_agePercentile'],
    ]) {
      assignMidrankPercentiles(cohort, valueKey, percentileKey)
    }

    for (const r of cohort) {
      r._attackRaw =
        0.5 * r._leadershipPercentile +
        0.25 * r._workloadPercentile +
        0.15 * r._tenurePercentile +
        0.1 * r._agePercentile
      r._defenceRaw =
        0.5 * r._tenurePercentile +
        0.35 * r._workloadPercentile +
        0.15 * r._agePercentile
    }

    assignMidrankPercentiles(cohort, '_attackRaw', '_attackPercentile')
    assignMidrankPercentiles(cohort, '_defenceRaw', '_defencePercentile')
    for (const r of cohort) {
      r._atk = ratingFromPercentile(r._attackPercentile)
      r._def = ratingFromPercentile(r._defencePercentile)
      r._ovr = deriveOverall(r._atk, r._def)
      r._strengths = {
        leadership: Math.round(r._leadershipPercentile * 100),
        workload: Math.round(r._workloadPercentile * 100),
        tenure: Math.round(r._tenurePercentile * 100),
        age: Math.round(r._agePercentile * 100),
      }
    }
  }
}

function deriveFederalCouncilStats(records) {
  for (const r of records.filter((member) => member.chamber === 'BR')) {
    const electionMs = parseMsDate(r.m.DateElection)
    const executiveYears = Math.max(0, yearsSince(electionMs) ?? 0)
    const officeExperience = Math.sqrt(clamp(executiveYears / 12, 0, 1))
    const ageExperience = clamp((r._ageYears - 35) / 35, 0, 1)
    const experience = 0.8 * officeExperience + 0.2 * ageExperience
    r._atk = Math.round(86 + 10 * experience)
    r._def = Math.round(88 + 9 * experience)
    r._ovr = deriveOverall(r._atk, r._def)
    r._strengths = {
      officeTenure: Math.round(officeExperience * 100),
      ageNetwork: Math.round(ageExperience * 100),
    }
  }
}

// ── raw helpers ───────────────────────────────────────────────────────────
const parseMsDate = (s) => {
  if (!s) return null
  const m = /-?\d+/.exec(s)
  return m ? Number(m[0]) : null
}
const yearsSince = (ms) => (ms == null ? null : (NOW - ms) / YEAR_MS)

// ── transparency disclosures ──────────────────────────────────────────────
const PARLIAMENT_INTERESTS_SOURCE =
  'https://www.parlament.ch/de/%C3%BCber-das-parlament/Seiten/faktenblatt-offenlegungspflicht.aspx'
const EFK_FINANCING_SOURCE =
  'https://politikfinanzierung.efk.admin.ch/app/de/exports/elections'

const LEADERSHIP_ROLE =
  /präsident|president|presidente|geschäftsführ|directeur|direktor|delegiert|ombuds|vorsteher/i

const SECTOR_RULES = [
  {
    sector: 'Economy & finance',
    pattern:
      /bank|finanz|finance|versicherung|assurance|wirtschaft|economie|industrie|gewerbe|handel|commerce|arbeitgeber|employeur|treuhand|immobil|startup|unternehm|entreprise|steuer|fiscal|pensionskasse/i,
  },
  {
    sector: 'Health & social',
    pattern:
      /gesund|santé|spital|hôpital|pflege|sozial|social|krank|médic|arzt|ärzt|pharma|behinder|handicap|senior|alter|retraite|famil|kinder|enfant/i,
  },
  {
    sector: 'Energy & environment',
    pattern:
      /energie|energy|klima|climat|umwelt|environnement|natur|nature|solar|wind|wasser|eau|wald|forêt|holz|bois|elektr|strom|nuklear|atom|nachhalt|durab/i,
  },
  {
    sector: 'Transport & telecom',
    pattern:
      /verkehr|transport|mobilit|bahn|rail|strass|route|auto|velo|vélo|luftfahrt|aviation|flughafen|aéroport|telekom|télécom|digital|post\b/i,
  },
  {
    sector: 'Education & culture',
    pattern:
      /bildung|éducation|schule|école|universit|hochschul|forschung|recherche|wissenschaft|science|kultur|culture|museum|musik|théâtre|theater|sport/i,
  },
  {
    sector: 'Agriculture & food',
    pattern:
      /landwirtschaft|agri|bauern|paysan|milch|lait|fleisch|viande|wein|vin\b|lebensmittel|aliment|ernähr|forst/i,
  },
  {
    sector: 'Security & defence',
    pattern: /sicherheit|sécurit|armee|armée|militär|militaire|polizei|police|feuerwehr|pompiers|cyber/i,
  },
  {
    sector: 'Law & justice',
    pattern: /recht|jurist|anwalt|avocat|justice|gericht|tribunal|notar|mediation|médiation/i,
  },
  {
    sector: 'Foreign affairs',
    pattern: /europa|europe|international|ausland|étranger|diplomat|humanit|entwicklung|coopération/i,
  },
]

const COMMITTEE_SECTORS = [
  [/^(WAK|FK|FinDel)/i, ['Economy & finance', 'Agriculture & food']],
  [/^SGK/i, ['Health & social']],
  [/^UREK/i, ['Energy & environment']],
  [/^KVF/i, ['Transport & telecom']],
  [/^WBK/i, ['Education & culture']],
  [/^SiK/i, ['Security & defence']],
  [/^RK/i, ['Law & justice']],
  [/^APK/i, ['Foreign affairs']],
]

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function sectorForInterest(name) {
  return SECTOR_RULES.find((rule) => rule.pattern.test(name))?.sector ?? null
}

function committeeSectorSet(committees) {
  const sectors = new Set()
  for (const committee of committees) {
    for (const [pattern, matches] of COMMITTEE_SECTORS) {
      if (pattern.test(committee.abbr)) for (const sector of matches) sectors.add(sector)
    }
  }
  return sectors
}

function odataDateToIso(value) {
  const ms = parseMsDate(value)
  return ms == null ? null : new Date(ms).toISOString().slice(0, 10)
}

function buildLobbyingDisclosure(rows, committees, chamber) {
  if (chamber === 'BR') {
    return {
      coverage: 'not_applicable',
      total: 0,
      paid: 0,
      leadership: 0,
      sectorBreadth: 0,
      committeeOverlaps: 0,
      sectors: [],
      ties: [],
      source: PARLIAMENT_INTERESTS_SOURCE,
    }
  }

  const committeeSectors = committeeSectorSet(committees)
  const ties = rows.map((row) => {
    const sector = sectorForInterest(row.InterestName || '')
    return {
      organization: row.InterestName || 'Not specified',
      role: row.FunctionInAgencyText || 'Not specified',
      organizationType: row.OrganizationTypeText || 'Not specified',
      legalType: row.InterestTypeText || 'Not specified',
      paid: Boolean(row.Paid),
      leadership: LEADERSHIP_ROLE.test(row.FunctionInAgencyText || ''),
      sector,
      committeeOverlap: sector != null && committeeSectors.has(sector),
      modified: odataDateToIso(row.Modified),
    }
  })
  ties.sort(
    (a, b) =>
      Number(b.paid) - Number(a.paid) ||
      Number(b.leadership) - Number(a.leadership) ||
      a.organization.localeCompare(b.organization, 'de'),
  )
  const sectors = [...new Set(ties.map((tie) => tie.sector).filter(Boolean))].sort()
  return {
    coverage: 'declared',
    total: ties.length,
    paid: ties.filter((tie) => tie.paid).length,
    leadership: ties.filter((tie) => tie.leadership).length,
    sectorBreadth: sectors.length,
    committeeOverlaps: ties.filter((tie) => tie.committeeOverlap).length,
    sectors,
    ties,
    source: PARLIAMENT_INTERESTS_SOURCE,
  }
}

const FINANCING_MATCH_OVERRIDES = new Map([
  // Typo in the EFK export: Cermuth rather than Wermuth.
  ['cedric cermuth|aargau', 4057],
])

function candidateKey(first, last, canton) {
  return `${normalizeText(first)} ${normalizeText(last)}|${normalizeText(canton)}`
}

function sumBy(campaigns, key) {
  return Math.round(campaigns.reduce((sum, campaign) => sum + (campaign[key] || 0), 0) * 100) / 100
}

function buildFinancingByPerson(records, campaigns) {
  const memberByKey = new Map(
    records
      .filter((record) => record.chamber !== 'BR')
      .map((record) => [candidateKey(record.m.FirstName, record.m.LastName, record.m.CantonName), record.m.PersonNumber]),
  )
  const campaignsByPerson = new Map()

  for (const campaign of campaigns) {
    for (const candidate of campaign.candidates) {
      const key = candidateKey(candidate.first, candidate.last, candidate.canton)
      const personNumber = memberByKey.get(key) ?? FINANCING_MATCH_OVERRIDES.get(key)
      if (personNumber == null) continue
      const list = campaignsByPerson.get(personNumber) ?? []
      if (!list.includes(campaign)) list.push(campaign)
      campaignsByPerson.set(personNumber, list)
    }
  }

  return new Map(
    records.map((record) => {
      const personNumber = record.m.PersonNumber
      if (record.chamber === 'BR') {
        return [
          personNumber,
          {
            coverage: 'not_applicable',
            election: '2023 federal election',
            directIncome: 0,
            monetaryContributions: 0,
            nonMonetaryContributions: 0,
            eventIncome: 0,
            salesIncome: 0,
            ownFunds: 0,
            unallocatedIncome: 0,
            largeDonorCount: 0,
            largeDonorTotal: 0,
            largestDonation: 0,
            topLargeDonors: [],
            directCampaignCount: 0,
            sharedCampaignCount: 0,
            sharedCampaignIncome: 0,
            dataAsOf: null,
            source: EFK_FINANCING_SOURCE,
          },
        ]
      }

      const matched = campaignsByPerson.get(personNumber) ?? []
      const direct = matched.filter((campaign) => campaign.campaignFor === 'Einzelperson')
      const shared = matched.filter((campaign) => campaign.campaignFor !== 'Einzelperson')
      const directDonors = direct
        .flatMap((campaign) => campaign.largeDonors)
        .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'de'))
      const directIncome = sumBy(direct, 'totalIncome')
      const monetaryContributions = sumBy(direct, 'monetaryContributions')
      const nonMonetaryContributions = sumBy(direct, 'nonMonetaryContributions')
      const eventIncome = sumBy(direct, 'eventIncome')
      const salesIncome = sumBy(direct, 'salesIncome')
      const ownFunds = sumBy(direct, 'ownFunds')
      return [
        personNumber,
        {
          coverage: direct.length ? 'direct' : shared.length ? 'shared' : 'none',
          election: '2023 federal election',
          directIncome,
          monetaryContributions,
          nonMonetaryContributions,
          eventIncome,
          salesIncome,
          ownFunds,
          // A few self-reported EFK rows do not reconcile exactly to their
          // published category columns. Preserve that residual visibly rather
          // than silently changing the official total.
          unallocatedIncome:
            Math.round(
              (directIncome -
                monetaryContributions -
                nonMonetaryContributions -
                eventIncome -
                salesIncome -
                ownFunds) *
                100,
            ) / 100,
          largeDonorCount: directDonors.length,
          largeDonorTotal: Math.round(directDonors.reduce((sum, donor) => sum + donor.value, 0) * 100) / 100,
          largestDonation: directDonors[0]?.value ?? 0,
          topLargeDonors: directDonors.slice(0, 3).map((donor) => ({
            name: donor.name,
            value: donor.value,
            kind: donor.kind,
          })),
          directCampaignCount: direct.length,
          sharedCampaignCount: shared.length,
          // Context only: this is the value of whole shared pools and is never
          // allocated to or counted as direct income for this person.
          sharedCampaignIncome: sumBy(shared, 'totalIncome'),
          dataAsOf: matched.map((campaign) => campaign.dataAsOf).filter(Boolean).sort().at(-1) ?? null,
          source: EFK_FINANCING_SOURCE,
        },
      ]
    }),
  )
}

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
  const [members, history, committees, voteCounts, interests, financing] = await Promise.all([
    readRaw('members-council.json'),
    readRaw('council-history.json'),
    readRaw('committees.json'),
    readRaw('vote-counts-current.json'),
    readRaw('interests.json'),
    readRaw('financing-2023.json', 'npm run data:financing -- <nr.xlsx> <sr.xlsx>'),
  ])
  const [wikidataPortraits, commonsImageinfo] = await Promise.all([
    readRaw('wikidata-portraits.json', 'npm run portraits'),
    readRaw('commons-imageinfo.json', 'npm run portraits'),
  ])
  const portraitFor = buildPortraitIndex(wikidataPortraits, commonsImageinfo)
  process.stdout.write(`Loaded raw: ${members.length} members, ${history.length} history rows, ${committees.length} committee rows, ${interests.length} interest disclosures, ${financing.campaigns.length} financing campaigns, ${Object.keys(voteCounts).length} current-legislature vote counts\n`)

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
      chair: fn === 'Präsident/in',
      role: fn,
      standing: c.CommitteeTypeName === 'Ständig',
    })
    cmteByPerson.set(c.PersonNumber, list)
  }

  const interestsByPerson = new Map()
  for (const interest of interests) {
    const list = interestsByPerson.get(interest.PersonNumber) ?? []
    list.push(interest)
    interestsByPerson.set(interest.PersonNumber, list)
  }

  // Pass 1: gather signals + rarity score.
  const raw = members.map((m) => {
    const joinMs = Math.min(
      earliestJoin.get(m.PersonNumber) ?? Infinity,
      parseMsDate(m.DateJoining) ?? Infinity,
    )
    const tenureYears = Math.max(0, yearsSince(Number.isFinite(joinMs) ? joinMs : null) ?? 0)
    const ageYears = Math.max(0, yearsSince(parseMsDate(m.DateOfBirth)) ?? 0)
    const years = Math.round(tenureYears)
    const age = Math.round(ageYears)
    const chamber = m.CouncilAbbreviation
    const party = normParty(m.PartyAbbreviation)
    const cmtes = (cmteByPerson.get(m.PersonNumber) ?? []).filter((c) => c.standing)
    const committeeCount = cmtes.length
    const chairCount = cmtes.filter((c) => c.chair).length
    const voteCount = voteCounts[m.PersonNumber] ?? 0
    const rec = { m, years, age, chamber, party, cmtes, committeeCount, chairCount, voteCount }
    rec._tenureYears = tenureYears
    rec._ageYears = ageYears
    rec._workloadPoints = cmtes.reduce(
      (sum, committee) => sum + committeeWorkloadWeight(committee.role),
      0,
    )
    rec._leadershipPoints =
      cmtes.reduce(
        (sum, committee) => sum + committeeLeadershipWeight(committee.role),
        0,
      ) + groupLeadershipWeight(m.ParlGroupFunctionText)
    rec._score = rarityScore({ years, chairCount, chamber })
    return rec
  })

  // Pass 2: percentile-bin rarity across the NR/SR cohort. The 7 Federal
  // Councillors (chamber 'BR') are a fixed, non-percentile set — they get the
  // "mythic" rarity outright rather than competing for a percentile slot,
  // which would otherwise nudge everyone else's cutoffs.
  const regular = raw.filter((r) => r.chamber !== 'BR')
  const federalCouncil = raw.filter((r) => r.chamber === 'BR')
  assignRarities(regular)
  for (const r of federalCouncil) r._rarity = 'mythic'

  // Pass 3: derive performance independently from collectable rarity.
  deriveRegularStats(regular)
  deriveFederalCouncilStats(federalCouncil)
  const financingByPerson = buildFinancingByPerson(raw, financing.campaigns)

  const built = raw.map((r) => {
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
      committees: r.cmtes.map((c) => ({ abbr: c.abbr, name: c.name, chair: c.chair, role: c.role })),
      committeeCount: r.committeeCount,
      voteCount: r.voteCount,
      atk: r._atk,
      def: r._def,
      ovr: r._ovr,
      strengths: r._strengths,
      lobbying: buildLobbyingDisclosure(
        interestsByPerson.get(r.m.PersonNumber) ?? [],
        r.cmtes,
        r.chamber,
      ),
      financing: financingByPerson.get(r.m.PersonNumber),
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
    disclosureSources: {
      interests: PARLIAMENT_INTERESTS_SOURCE,
      financing: EFK_FINANCING_SOURCE,
    },
    portraitSource:
      'Wikimedia Commons, matched via Wikidata property P1307 (Swiss parliament ID). Mostly official Parliamentary Services portraits; see public/portraits/CREDITS.md for per-image author and licence.',
    generatedAt: new Date(NOW).toISOString().slice(0, 10),
    count: built.length,
    rarity: dist,
    note: 'ATK/DEF are chamber-relative percentile ratings from explicit committee and parliamentary-group leadership, weighted standing-committee workload, exact tenure, and a modest age/network-experience component. Raw Voting row counts are retained as source data but do not affect ratings. Federal Councillors use institutional baselines plus executive tenure and age/network experience. Rarity never changes performance; OVR = 0.45·ATK + 0.45·DEF + 0.10·min(ATK,DEF). Lobbying and campaign-finance disclosures are contextual only and never affect performance or rarity.',
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
