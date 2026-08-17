// Validate that every shipped portrait has a complete, central credit record
// and that licence metadata is not mixed into runtime member/game records.

import { access, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MEMBERS_PATH = join(ROOT, 'src', 'data', 'members.json')
const CREDITS_PATH = join(ROOT, 'src', 'data', 'portrait-credits.json')
const EXPECTED_CHANGES = 'Square-cropped, resized to 512 × 512 pixels and converted to WebP by Bundeshaus Pack.'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

async function main() {
  const [membersData, creditsData] = await Promise.all([
    readJson(MEMBERS_PATH),
    readJson(CREDITS_PATH),
  ])
  const members = membersData.members ?? []
  const credits = creditsData.credits ?? []

  assert(creditsData.meta?.source === 'Wikimedia Commons', 'credits meta.source must identify Wikimedia Commons')
  assert(creditsData.meta?.count === credits.length, 'credits meta.count does not match the credit records')
  assert(credits.length === members.length, `expected one credit for each of ${members.length} members, found ${credits.length}`)

  const memberIds = new Set(members.map((member) => member.id))
  const creditIds = new Set()

  for (const member of members) {
    assert(member.portrait && typeof member.portrait === 'object', `member ${member.id} has no portrait`)
    assert(Object.keys(member.portrait).length === 1 && typeof member.portrait.src === 'string', `member ${member.id} mixes credit metadata into the portrait runtime record`)
  }

  for (const credit of credits) {
    const label = `portrait credit ${credit.memberId ?? '(missing id)'}`
    assert(memberIds.has(credit.memberId), `${label} has no matching member`)
    assert(!creditIds.has(credit.memberId), `${label} is duplicated`)
    creditIds.add(credit.memberId)

    assert(Boolean(credit.memberName), `${label} is missing memberName`)
    assert(/^\/portraits\/\d+\.webp$/.test(credit.image ?? ''), `${label} has an invalid image path`)
    assert(Boolean(credit.title), `${label} is missing the Commons file title`)
    assert(Boolean(credit.author), `${label} is missing the Commons author or rights-holder statement`)
    assert(credit.author !== 'Unknown author Unknown author', `${label} contains duplicated Commons author metadata`)
    assert(credit.licence && credit.licence !== 'Unknown licence', `${label} is missing licence or permission information`)
    assert(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(credit.source ?? ''), `${label} is missing an HTTPS Commons source page`)
    assert(credit.modifications === EXPECTED_CHANGES, `${label} is missing the standard modification notice`)

    if (/^CC\b/.test(credit.licence)) {
      assert(/^https?:\/\//.test(credit.licenceUrl ?? ''), `${label} uses ${credit.licence} without a licence URL`)
    }
    if (credit.attribution !== null) {
      assert(/^https?:\/\//.test(credit.attribution), `${label} has an invalid designated-credit URL`)
    }

    await access(join(ROOT, 'public', credit.image))
  }

  for (const id of memberIds) assert(creditIds.has(id), `member ${id} has no portrait credit`)

  process.stdout.write(`portraits: ${credits.length} files have complete central credit records\n`)
}

main().catch((error) => {
  console.error(`Portrait credit check failed: ${error.message}`)
  process.exit(1)
})
