// Validate the central Parliament source record and the official/derived field
// boundary. This runs before every production build.

import { access, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PROVENANCE_PATH = join(ROOT, 'src', 'data', 'provenance.json')
const MEMBERS_PATH = join(ROOT, 'src', 'data', 'members.json')
const REQUIRED_ATTRIBUTION = 'Parlamentsdienste der Bundesversammlung, Bern'
const DERIVED_FIELDS = [
  'ratings.strengths',
  'ratings.atk',
  'ratings.def',
  'ratings.ovr',
  'ratings.rarity',
  'ratings.cardNumber',
]
const FORBIDDEN_TOP_LEVEL_RATINGS = [
  'scoring',
  'strengths',
  'atk',
  'def',
  'ovr',
  'rarity',
  'no',
]
const MINIMISED_RUNTIME_FIELDS = [
  'gender',
  'partyRaw',
  'parlGroup',
  'voteCount',
  'voteOutcomes',
  'mandates',
]
const REQUIRED_RATING_KEYS = DERIVED_FIELDS.map((field) => field.replace('ratings.', ''))

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertDate(value, field) {
  assert(/^\d{4}-\d{2}-\d{2}$/.test(value ?? ''), `${field} must be an ISO date (YYYY-MM-DD)`)
  assert(!Number.isNaN(Date.parse(`${value}T00:00:00Z`)), `${field} is not a real date`)
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function main() {
  const provenance = await readJson(PROVENANCE_PATH)
  assert(provenance.requiredAttribution === REQUIRED_ATTRIBUTION, `requiredAttribution must be exactly “${REQUIRED_ATTRIBUTION}”`)
  assertDate(provenance.retrievedAt, 'retrievedAt')
  assert(Boolean(provenance.datasetVersion), 'datasetVersion is required')
  assert(/^https:\/\//.test(provenance.termsUrl ?? ''), 'termsUrl must be an HTTPS URL')
  assert(Array.isArray(provenance.datasets) && provenance.datasets.length > 0, 'at least one Parliament dataset is required')

  for (const dataset of provenance.datasets) {
    assert(Boolean(dataset.id), 'every dataset needs an id')
    assert(Boolean(dataset.label), `dataset ${dataset.id} needs a label`)
    assert(/^https:\/\//.test(dataset.endpoint ?? ''), `dataset ${dataset.id} needs an HTTPS endpoint`)
    assertDate(dataset.retrievedAt, `datasets.${dataset.id}.retrievedAt`)
    assert(Array.isArray(dataset.rawCaches) && dataset.rawCaches.length > 0, `dataset ${dataset.id} needs at least one raw cache`)
    for (const cache of dataset.rawCaches) await access(join(ROOT, cache))
  }

  const derivation = provenance.projectDerivation
  assert(Number.isInteger(derivation?.algorithmVersion), 'projectDerivation.algorithmVersion is required')
  for (const field of DERIVED_FIELDS) {
    assert(derivation.fields?.includes(field), `projectDerivation.fields is missing ${field}`)
  }
  assert(derivation.termsInterpretation?.classification === 'derivation_not_alteration', 'projectDerivation.termsInterpretation classification is missing')
  assert(Boolean(derivation.termsInterpretation?.statement), 'projectDerivation.termsInterpretation statement is missing')

  const snapshot = await readJson(MEMBERS_PATH)
  assert(snapshot.meta?.source === REQUIRED_ATTRIBUTION, 'members.json meta.source does not use the required attribution')
  assert(snapshot.meta?.datasetVersion === provenance.datasetVersion, 'members.json datasetVersion is stale; run npm run data:build')
  assert(snapshot.meta?.dataRetrievedAt === provenance.retrievedAt, 'members.json dataRetrievedAt is stale; run npm run data:build')
  assert(snapshot.meta?.algorithmVersion === derivation.algorithmVersion, 'members.json algorithmVersion is stale; run npm run data:build')

  for (const member of snapshot.members ?? []) {
    assert(member.ratings && typeof member.ratings === 'object', `member ${member.id} has no ratings object`)
    for (const field of REQUIRED_RATING_KEYS) {
      assert(field in member.ratings, `member ${member.id} is missing project-derived ratings.${field}`)
    }
    for (const field of FORBIDDEN_TOP_LEVEL_RATINGS) {
      assert(!(field in member), `member ${member.id} exposes project-derived ${field} as a top-level official field`)
    }
    for (const field of MINIMISED_RUNTIME_FIELDS) {
      assert(!(field in member), `member ${member.id} publishes minimised runtime field ${field}`)
    }
    assert(!('scoring' in member.ratings), `member ${member.id} publishes the intermediate scoring ledger`)
  }

  process.stdout.write(`provenance: ${provenance.datasetVersion}, ${provenance.datasets.length} official datasets, derived fields separated\n`)
}

main().catch((error) => {
  console.error(`Provenance check failed: ${error.message}`)
  process.exit(1)
})
