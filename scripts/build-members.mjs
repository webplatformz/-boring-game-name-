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
//  - Detailed vote outcomes for both chambers come from the official
//    per-session workbooks linked by the parliamentary voting database.
//  - Personally authored affairs come from BusinessRole; their official state
//    comes from Business. Only affairs at least 12 months old are eligible for
//    the "advanced" signal so recent submissions are not unfairly penalised.
//  - Declared external interests come from PersonInterest. Counts describe
//    disclosed links; they are never folded into ATK/DEF/OVR or rarity.
//  - Campaign financing comes from the official EFK 2023 final-account XLSX
//    exports normalized by scripts/import-efk-financing.mjs. Direct campaigns
//    and shared campaign pools remain strictly separate.
//  - Portraits come from Wikimedia Commons via scripts/fetch-portraits.mjs; the
//    caches it writes supply each member's author/licence credit.
//  - Rarity is percentile-ranked over the newly calculated OVR, so card classes
//    follow the performance distribution. The 7 sitting Federal Councillors
//    (chamber 'BR') remain a fixed "mythic" set outside that ranking.
//  - ATK/DEF/OVR are game-invented but *derived deterministically* from real
//    signals. NR and SR members are percentile-ranked inside their chamber so
//    their structurally different committee workloads remain comparable:
//      ATK ← authored-proposal drive + advancement + current leadership
//      DEF ← voting reliability + current committee work + parliamentary
//            experience + a small age/network-experience component
//      OVR ← visible ATK/DEF only; rarity never changes performance.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RAW_DIR = join(__dirname, '..', 'src', 'data', 'raw')
const OUT = join(__dirname, '..', 'src', 'data', 'members.json')

const NOW = Date.parse('2026-08-14T00:00:00Z') // fixed reference so builds are reproducible
const YEAR_MS = 365.25 * 24 * 3600 * 1000
const CURRENT_LEGISLATURE_START = Date.parse('2023-12-04T00:00:00Z')
const PROPOSAL_MATURITY_MS = YEAR_MS

const PARLIAMENT_OPEN_DATA_SOURCE =
  'https://www.parlament.ch/de/%C3%BCber-das-parlament/fakten-und-zahlen/open-data-web-services'
const PARLIAMENT_ODATA_SOURCE = 'https://ws.parlament.ch/odata.svc/'
const PARLIAMENT_VOTING_SOURCE = 'https://www.parlament.ch/de/ratsbetrieb/abstimmungen'
const PARLIAMENT_VOTE_XLSX_SOURCE =
  'https://www.parlament.ch/de/ratsbetrieb/abstimmungen/abstimmung-nr-xls'
const SCORE_ALGORITHM_VERSION = 2

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
function assignRarities(records) {
  const ranked = [...records].sort(
    (a, b) => b._ovr - a._ovr || b._attackRaw + b._defenceRaw - (a._attackRaw + a._defenceRaw),
  )
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
  'Präsident/in': 2,
  '1. Vizepräsident/in': 1,
  'Vizepräsident/in': 1,
  '2. Vizepräsident/in': 1,
}
const GROUP_LEADERSHIP_WEIGHT = {
  'Präsident/in': 2,
  'Vizepräsident/in': 1,
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
      ['_proposalDrive', '_proposalDrivePercentile'],
      ['_proposalProgress', '_proposalProgressPercentile'],
      ['_leadershipPoints', '_leadershipPercentile'],
      ['_workloadPoints', '_workloadPercentile'],
    ]) {
      assignMidrankPercentiles(cohort, valueKey, percentileKey)
    }

    for (const r of cohort) {
      r._attackRaw =
        0.45 * r._proposalDrivePercentile +
        0.3 * r._proposalProgressPercentile +
        0.25 * r._leadershipPercentile
      r._defenceRaw =
        0.2 * r._participationRate +
        0.45 * r._workloadPercentile +
        0.3 * r._experienceStrength +
        0.05 * r._ageExperienceStrength
    }

    assignMidrankPercentiles(cohort, '_attackRaw', '_attackPercentile')
    assignMidrankPercentiles(cohort, '_defenceRaw', '_defencePercentile')
    for (const r of cohort) {
      r._atk = ratingFromPercentile(r._attackPercentile)
      r._def = ratingFromPercentile(r._defencePercentile)
      r._ovr = deriveOverall(r._atk, r._def)
      r._strengths = {
        proposalDrive: Math.round(r._proposalDrivePercentile * 100),
        proposalProgress: Math.round(r._proposalProgressPercentile * 100),
        leadership: Math.round(r._leadershipPercentile * 100),
        votingReliability: Math.round(r._participationRate * 100),
        committeeWork: Math.round(r._workloadPercentile * 100),
        experience: Math.round(r._experienceStrength * 100),
        ageExperience: Math.round(r._ageExperienceStrength * 100),
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

function authoredAffairWeight(typeName) {
  const type = String(typeName ?? '').toLowerCase()
  if (type.includes('parlamentarische initiative') || type.includes('motion')) return 3
  if (type.includes('postulat')) return 2
  if (type.includes('interpellation') || type.includes('anfrage') || type.includes('frage')) return 1
  return 0
}

function businessHasAdvanced(business) {
  if (!business) return false
  const status = String(business.BusinessStatusText ?? '').toLowerCase()
  if (/zurückgezogen|zurueckgezogen|nicht zustande gekommen/.test(status)) return false
  const type = String(business.BusinessTypeName ?? '').toLowerCase()

  // An official answer is the intended next stage for questions and
  // interpellations. For motions/postulates and parliamentary initiatives, a
  // generic "Erledigt" state is ambiguous (accepted, rejected, or otherwise
  // closed), so only an explicit later procedural stage counts as advancement.
  if (/interpellation|anfrage|frage/.test(type)) {
    return /stellungnahme|antwort|erledigt/.test(status)
  }
  if (/motion|postulat/.test(type)) {
    return /überwiesen|geplant|kommission|beratung|abschreibungsantrag|berichterstattung|bericht in erfüllung/.test(
      status,
    )
  }
  if (type.includes('parlamentarische initiative')) {
    return /geplant|kommission|beratung|vorprüfung|folge gegeben|nicht folge gegeben/.test(status)
  }
  return false
}

function buildAuthoredAffairsByPerson(roles, businesses) {
  const businessById = new Map(businesses.map((business) => [business.ID, business]))
  const byPerson = new Map()
  const seen = new Set()
  for (const role of roles) {
    const key = `${role.MemberCouncilNumber}:${role.BusinessNumber}`
    if (seen.has(key)) continue
    seen.add(key)
    const weight = authoredAffairWeight(role.BusinessTypeName)
    if (weight === 0) continue
    const submittedAt = parseMsDate(role.BusinessSubmissionDate)
    const mature = submittedAt != null && submittedAt <= NOW - PROPOSAL_MATURITY_MS
    const business = businessById.get(role.BusinessNumber)
    const advanced = mature && businessHasAdvanced(business)
    const list = byPerson.get(role.MemberCouncilNumber) ?? []
    list.push({
      number: role.BusinessShortNumber,
      title: role.BusinessTitle,
      type: role.BusinessTypeName,
      weight,
      submittedAt,
      mature,
      advanced,
      status: business?.BusinessStatusText ?? null,
    })
    byPerson.set(role.MemberCouncilNumber, list)
  }
  return byPerson
}

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
      /bank|raiffeisen|finanz|finance|versicherung|assurance|wirtschaft|economie|industrie|gewerbe|handel|commerce|arbeitgeber|employeur|treuhand|immobil|real estate|startup|unternehm|entreprise|steuer|fiscal|pensionskasse|rechnungs|controlling|hauseigent|mieter|locataire|wohn|construction|baumeister|swissmem|suissetec|handelskammer|chambre de commerce|consulting|holding|gastro|touris/i,
  },
  {
    sector: 'Health & social',
    pattern:
      /gesund|santé|spital|hôpital|klinik|clinic|pflege|sozial|social|krank|médic|arzt|ärzt|aerzte|pharma|behinder|infirmis|handicap|parapleg|parkinson|palliativ|senior|alter|retraite|famil|kinder|enfant|jugend|jeunesse|cure a domicile|sociosanit/i,
  },
  {
    sector: 'Energy & environment',
    pattern:
      /energie|energy|klima|climat|umwelt|environnement|natur|nature|solar|wind|wasser|eau|hydro|wald|forêt|holz|bois|elektr|strom|nuklear|atom|nachhalt|durab|biofuel|kraftwerk|forces motrices|pärke|parcs|wildtier|wwf|biovision/i,
  },
  {
    sector: 'Transport & telecom',
    pattern:
      /verkehr|transport|mobilit|bahn|rail|strass|route|auto|velo|vélo|luftfahrt|aviation|aerosuisse|flughafen|aéroport|schifffahrt|navigation|spedlog|logistik|logistique|\btcs\b|telekom|télécom|digital|glasfaser|fibre|post\b/i,
  },
  {
    sector: 'Education & culture',
    pattern:
      /bildung|éducation|schule|école|universit|hochschul|\beth\b|forschung|recherche|wissenschaft|science|kultur|culture|museum|musik|musique|chor|cinema|film|media|média|verlag|edition|théâtre|theater|sport|pfadi/i,
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
    pattern: /europa|europe|international|ausland|étranger|diplomat|humanit|entwicklung|coopération|swissaid|solidar suisse|schweiz-[a-z]/i,
  },
  {
    sector: 'Politics & civic',
    pattern:
      /\b(svp|sp|fdp|plr|glp|grüne|gruene|centre)\b|sozialdemokrat|libéraux-radicaux|liberal-conserv|partei|parti |politische|politique|bürgergemeinde|communi|gemeindeverband|alliance f|gleichstellung|civiva|zivildienst/i,
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

function sectorBreakdownForTies(ties) {
  return SECTOR_RULES.map(({ sector }) => {
    const matches = ties.filter((tie) => tie.sector === sector)
    return {
      sector,
      count: matches.length,
      paid: matches.filter((tie) => tie.paid).length,
      leadership: matches.filter((tie) => tie.leadership).length,
    }
  })
    .filter((summary) => summary.count > 0)
    .sort(
      (a, b) =>
        b.count - a.count ||
        b.paid - a.paid ||
        b.leadership - a.leadership ||
        a.sector.localeCompare(b.sector),
    )
}

function sectorBreakdownForDonors(donors) {
  return SECTOR_RULES.map(({ sector }) => {
    const matches = donors.filter((donor) => donor.sector === sector)
    return {
      sector,
      count: matches.length,
      value: Math.round(matches.reduce((sum, donor) => sum + donor.value, 0) * 100) / 100,
    }
  })
    .filter((summary) => summary.count > 0)
    .sort((a, b) => b.value - a.value || b.count - a.count || a.sector.localeCompare(b.sector))
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
      classifiedTotal: 0,
      primarySector: null,
      sectors: [],
      sectorBreakdown: [],
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
  const sectorBreakdown = sectorBreakdownForTies(ties)
  const sectors = sectorBreakdown.map((summary) => summary.sector)
  return {
    coverage: 'declared',
    total: ties.length,
    paid: ties.filter((tie) => tie.paid).length,
    leadership: ties.filter((tie) => tie.leadership).length,
    sectorBreadth: sectors.length,
    committeeOverlaps: ties.filter((tie) => tie.committeeOverlap).length,
    classifiedTotal: sectorBreakdown.reduce((sum, summary) => sum + summary.count, 0),
    primarySector: sectorBreakdown[0]?.sector ?? null,
    sectors,
    sectorBreakdown,
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
            classifiedLargeDonorCount: 0,
            classifiedLargeDonorTotal: 0,
            primaryDonorSector: null,
            donorSectors: [],
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
        .map((donor) => ({ ...donor, sector: sectorForInterest(donor.name) }))
        .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'de'))
      const donorSectors = sectorBreakdownForDonors(directDonors)
      const classifiedDonors = directDonors.filter((donor) => donor.sector != null)
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
          classifiedLargeDonorCount: classifiedDonors.length,
          classifiedLargeDonorTotal:
            Math.round(classifiedDonors.reduce((sum, donor) => sum + donor.value, 0) * 100) / 100,
          primaryDonorSector: donorSectors[0]?.sector ?? null,
          donorSectors,
          topLargeDonors: directDonors.slice(0, 3).map((donor) => ({
            name: donor.name,
            value: donor.value,
            kind: donor.kind,
            sector: donor.sector,
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
  const [
    members,
    history,
    committees,
    voteOutcomes,
    authoredRoles,
    authoredBusinesses,
    interests,
    financing,
  ] = await Promise.all([
    readRaw('members-council.json'),
    readRaw('council-history.json'),
    readRaw('committees.json'),
    readRaw('vote-outcomes-current.json'),
    readRaw('authored-affairs-current.json'),
    readRaw('authored-business-status-current.json'),
    readRaw('interests.json'),
    readRaw('financing-2023.json', 'npm run data:financing -- <nr.xlsx> <sr.xlsx>'),
  ])
  const [wikidataPortraits, commonsImageinfo] = await Promise.all([
    readRaw('wikidata-portraits.json', 'npm run portraits'),
    readRaw('commons-imageinfo.json', 'npm run portraits'),
  ])
  const portraitFor = buildPortraitIndex(wikidataPortraits, commonsImageinfo)
  process.stdout.write(`Loaded raw: ${members.length} members, ${history.length} history rows, ${committees.length} committee rows, ${authoredRoles.length} authored affairs, ${interests.length} interest disclosures, ${financing.campaigns.length} financing campaigns, ${Object.keys(voteOutcomes).length} detailed vote records\n`)

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
  const authoredByPerson = buildAuthoredAffairsByPerson(authoredRoles, authoredBusinesses)

  // Pass 1: gather the individual signals used by the score formula.
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
    const votes = voteOutcomes[m.PersonNumber] ?? null
    const authoredAffairs = authoredByPerson.get(m.PersonNumber) ?? []
    const activeYears = Math.max(
      0.25,
      (NOW - Math.max(Number.isFinite(joinMs) ? joinMs : CURRENT_LEGISLATURE_START, CURRENT_LEGISLATURE_START)) /
        YEAR_MS,
    )
    const proposalPoints = authoredAffairs.reduce((sum, affair) => sum + affair.weight, 0)
    const advancedProposalPoints = authoredAffairs.reduce(
      (sum, affair) => sum + (affair.advanced ? affair.weight : 0),
      0,
    )
    const voteCount = votes?.eligible ?? 0
    const rec = {
      m,
      years,
      age,
      chamber,
      party,
      cmtes,
      committeeCount,
      chairCount,
      voteCount,
      votes,
      authoredAffairs,
      proposalPoints,
      advancedProposalPoints,
      activeYears,
    }
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
    rec._proposalDrive = proposalPoints / activeYears
    rec._proposalProgress = advancedProposalPoints / activeYears
    rec._participationRate = chamber === 'BR' ? 0 : votes?.participationRate ?? 0
    rec._experienceStrength = Math.sqrt(clamp(tenureYears / 24, 0, 1))
    rec._ageExperienceStrength = clamp((ageYears - 35) / 25, 0, 1)
    return rec
  })

  // Pass 2: derive performance from those signals, then reclassify rarity from
  // the resulting OVR distribution. The Federal Council stays a fixed mythic
  // cohort and does not move regular-card percentile cutoffs.
  const regular = raw.filter((r) => r.chamber !== 'BR')
  const federalCouncil = raw.filter((r) => r.chamber === 'BR')
  deriveRegularStats(regular)
  deriveFederalCouncilStats(federalCouncil)
  assignRarities(regular)
  for (const r of federalCouncil) r._rarity = 'mythic'
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
      voteOutcomes: r.votes,
      scoring: {
        proposalCount: r.authoredAffairs.length,
        proposalPoints: r.proposalPoints,
        proposalPointsPerYear: Math.round(r._proposalDrive * 100) / 100,
        matureProposalCount: r.authoredAffairs.filter((affair) => affair.mature).length,
        advancedProposalCount: r.authoredAffairs.filter((affair) => affair.advanced).length,
        advancedProposalPoints: r.advancedProposalPoints,
        advancedProposalPointsPerYear: Math.round(r._proposalProgress * 100) / 100,
        leadershipPoints: r._leadershipPoints,
        committeeWorkPoints: Math.round(r._workloadPoints * 100) / 100,
        participationRate:
          r.chamber === 'BR' ? null : Math.round(r._participationRate * 10000) / 10000,
        experienceYears: Math.round(r._tenureYears * 100) / 100,
        ageYears: Math.round(r._ageYears * 100) / 100,
      },
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
    source: 'Swiss Federal Assembly Open Data and official parliamentary voting workbooks',
    algorithmVersion: SCORE_ALGORITHM_VERSION,
    scoreSources: {
      openData: PARLIAMENT_OPEN_DATA_SOURCE,
      odata: PARLIAMENT_ODATA_SOURCE,
      voting: PARLIAMENT_VOTING_SOURCE,
      votingWorkbooks: PARLIAMENT_VOTE_XLSX_SOURCE,
    },
    disclosureSources: {
      interests: PARLIAMENT_INTERESTS_SOURCE,
      financing: EFK_FINANCING_SOURCE,
    },
    portraitSource:
      'Wikimedia Commons, matched via Wikidata property P1307 (Swiss parliament ID). Mostly official Parliamentary Services portraits; see public/portraits/CREDITS.md for per-image author and licence.',
    generatedAt: new Date(NOW).toISOString().slice(0, 10),
    count: built.length,
    rarity: dist,
    note: 'ATK = 45% personally authored proposal drive + 30% mature authored proposals that advanced + 25% current committee/parliamentary-group leadership. DEF = 20% voting reliability + 45% current standing-committee work + 30% parliamentary experience + 5% age/network experience. Proposal types are weighted 3 points for parliamentary initiatives/motions, 2 for postulates, and 1 for interpellations/questions. Advancement is type-aware: questions/interpellations require an answer; motions/postulates require an explicit scheduled, committee, referral, or reporting stage; parliamentary initiatives require scheduling or committee/preliminary review. A generic closed status alone is not proof. Yes, no and abstention count as participation; non-participation counts against reliability; excused, presiding, source-marked unknown, and present-without-decision records are excluded. NR and SR inputs are normalized inside their chamber and mapped to the same 45–97 rating curve. Federal Councillors use institutional baselines plus executive tenure and age/network experience. OVR = 0.45·ATK + 0.45·DEF + 0.10·min(ATK,DEF). Party size, party prestige, party finances, lobbying and campaign-finance disclosures never affect ATK, DEF or OVR. Regular-card rarity is reapplied from the new OVR distribution; rarity never changes performance.',
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
