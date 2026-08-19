// Normalize the official EFK election-financing XLSX exports into a compact,
// auditable JSON snapshot consumed by build-members.mjs. The EFK workbook
// repeats shared-campaign totals once per supported candidate; this importer
// groups those rows back into one campaign so totals are never multiplied.
//
// Usage:
//   node scripts/import-efk-financing.mjs <national-council.xlsx> <council-of-states.xlsx>

// Download the two "Schlussrechnung über die Einnahmen und Zuwendungen"
// files for the 2023 elections from:
//   https://politikfinanzierung.efk.admin.ch/app/de/exports/elections

// The EFK-generated files contain inline-string worksheet XML, so reading the
// two required sheets through the system `unzip` command keeps this project
// dependency-free.

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const execFileAsync = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'src', 'data', 'raw', 'financing-2023.json')
const SOURCE = 'https://politikfinanzierung.efk.admin.ch/app/de/exports/elections'

const [nrPath, srPath] = process.argv.slice(2)
if (!nrPath || !srPath) {
  throw new Error(
    'Expected the National Council and Council of States final-account XLSX paths.\n' +
      'Usage: node scripts/import-efk-financing.mjs <national-council.xlsx> <council-of-states.xlsx>',
  )
}

function decodeXml(value = '') {
  return value
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
}

function columnOf(cellRef) {
  return /^[A-Z]+/.exec(cellRef)?.[0] ?? ''
}

function parseRows(xml) {
  const rows = []
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = {}
    // Cells with no value are self-closing. Match those explicitly so a blank
    // J cell cannot accidentally consume the following K cell's content.
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = /\br="([A-Z]+\d+)"/.exec(cellMatch[1])?.[1]
      if (!ref) continue
      const cellBody = cellMatch[2] ?? ''
      const inline = [...cellBody.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)]
        .map((match) => decodeXml(match[1]))
        .join('')
      const raw = /<v>([\s\S]*?)<\/v>/.exec(cellBody)?.[1]
      row[columnOf(ref)] = inline || decodeXml(raw ?? '')
    }
    rows.push(row)
  }
  const headers = rows.shift() ?? {}
  return rows.map((row) =>
    Object.fromEntries(Object.entries(headers).map(([column, label]) => [label, row[column] ?? ''])),
  )
}

async function readSheet(path, sheetNumber) {
  const { stdout } = await execFileAsync('unzip', [
    '-p',
    path,
    `xl/worksheets/sheet${sheetNumber}.xml`,
  ], { maxBuffer: 40 * 1024 * 1024 })
  return parseRows(stdout)
}

const number = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const campaignKey = (row, council) =>
  [council, row.Akteur, row.Kampagne, row['Kampagne für']].join('\u001f')

function donorLabel(row) {
  const person = [row['Vorname des Urhebers der Zuwendung'], row['Name des Urhebers der Zuwendung']]
    .filter(Boolean)
    .join(' ')
  return row['Firma des Urhebers der Zuwendung'] || person || 'Not named in export'
}

async function importCouncil(path, council) {
  const [incomeRows, donorRows] = await Promise.all([readSheet(path, 1), readSheet(path, 2)])
  const campaigns = new Map()

  for (const row of incomeRows) {
    const key = campaignKey(row, council)
    let campaign = campaigns.get(key)
    if (!campaign) {
      campaign = {
        council,
        actor: row.Akteur,
        actorType: row['Art des Akteurs'],
        campaign: row.Kampagne,
        campaignFor: row['Kampagne für'],
        disclosure: row.Offenlegungsmeldung,
        dataAsOf: row.Datenstand,
        totalIncome: number(row['Gesamtbetrag der Einnahmen (in CHF)']),
        monetaryContributions: number(row['Einnahmen durch monetäre Zuwendungen (in CHF)']),
        nonMonetaryContributions: number(row['Wert der Einnahmen durch nichtmonetäre Zuwendungen (in CHF)']),
        eventIncome: number(row['Einnahmen durch Veranstaltungen (in CHF)']),
        salesIncome: number(row['Einnahmen durch den Verkauf von Gütern und Dienstleistungen (in CHF)']),
        ownFunds: number(row['Monetäre Eigenmittel (in CHF)']),
        candidates: [],
        largeDonors: [],
      }
      campaigns.set(key, campaign)
    }

    const candidate = {
      first: row.Vorname,
      last: row.Name,
      canton: row.Kanton,
      party: row['Parteizugehörigkeit (Mutterpartei)'],
    }
    if (candidate.first || candidate.last) {
      const candidateKey = [candidate.first, candidate.last, candidate.canton].join('\u001f')
      if (!campaign.candidates.some((entry) => entry._key === candidateKey)) {
        campaign.candidates.push({ ...candidate, _key: candidateKey })
      }
    }
  }

  for (const row of donorRows) {
    const campaign = campaigns.get(campaignKey(row, council))
    if (!campaign) continue
    const donor = {
      name: donorLabel(row),
      location: row['Gemeinde des Geschäftssitzes'] || row.Wohnsitzgemeinde || row.Land || '',
      kind: row['Art der Zuwendung'],
      value: number(row['Wert (in CHF)']),
      date: row['Gewährungsdatum der Zuwendung'],
    }
    const donorKey = [donor.name, donor.location, donor.kind, donor.value, donor.date].join('\u001f')
    if (!campaign.largeDonors.some((entry) => entry._key === donorKey)) {
      campaign.largeDonors.push({ ...donor, _key: donorKey })
    }
  }

  return [...campaigns.values()].map((campaign) => ({
    ...campaign,
    candidates: campaign.candidates.map((candidateWithKey) => {
      const { _key, ...candidate } = candidateWithKey
      void _key
      return candidate
    }),
    largeDonors: campaign.largeDonors.map((donorWithKey) => {
      const { _key, ...donor } = donorWithKey
      void _key
      return donor
    }),
  }))
}

const campaigns = [
  ...(await importCouncil(nrPath, 'NR')),
  ...(await importCouncil(srPath, 'SR')),
].sort((a, b) =>
  a.council.localeCompare(b.council) ||
  a.actor.localeCompare(b.actor, 'de') ||
  a.campaign.localeCompare(b.campaign, 'de'),
)

const output = {
  meta: {
    election: '2023 Swiss federal election',
    electionDate: '2023-10-22',
    source: SOURCE,
    note: 'Official EFK final-account exports. Shared campaign amounts are stored once and are never divided among or attributed directly to supported candidates.',
  },
  campaigns,
}

await writeFile(OUT, JSON.stringify(output, null, 2))
process.stdout.write(`Wrote ${campaigns.length} unique campaigns → ${OUT}\n`)
