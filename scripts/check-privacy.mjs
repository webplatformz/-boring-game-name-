import { access, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CONFIG_PATH = join(ROOT, 'src', 'data', 'privacy.json')
const REQUIRED_DOCUMENTS = [
  'docs/privacy/DPIA-DRAFT.md',
  'docs/privacy/DATA-MINIMISATION-REVIEW.md',
  'docs/privacy/CORRECTION-REMOVAL-WORKFLOW.md',
]

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const config = JSON.parse(await readFile(CONFIG_PATH, 'utf8'))
assert(/^\d{4}-\d{2}-\d{2}$/.test(config.lastUpdated ?? ''), 'privacy.lastUpdated must be an ISO date')
for (const document of REQUIRED_DOCUMENTS) await access(join(ROOT, document))

const missing = [
  !config.controller?.name && 'controller.name',
  !config.controller?.privacyEmail && 'controller.privacyEmail',
  !config.hosting?.provider && 'hosting.provider',
  !config.hosting?.dataLocations?.length && 'hosting.dataLocations',
  !config.analytics?.provider && 'analytics.provider',
  !config.analytics?.purpose && 'analytics.purpose',
  !config.analytics?.dataLocations?.length && 'analytics.dataLocations',
  !config.analytics?.retention && 'analytics.retention',
  !config.retention?.publishedProfiles && 'retention.publishedProfiles',
  !config.retention?.sourceSnapshots && 'retention.sourceSnapshots',
  !config.retention?.rightsRequests && 'retention.rightsRequests',
  !config.retention?.hostingLogs && 'retention.hostingLogs',
].filter(Boolean)

const status = missing.length ? `draft; notice details pending: ${missing.join(', ')}` : `notice configuration complete; DPIA status: ${config.governance?.dpiaStatus ?? 'not recorded'}`
process.stdout.write(`privacy: ${status}\n`)
