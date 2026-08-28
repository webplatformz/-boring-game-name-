// Offline voucher code generator. Imports the app's own codec (src/game/vouchers.ts)
// directly so there is exactly one implementation to keep in sync.
//
// Usage:
//   node --experimental-strip-types scripts/generate-vouchers.mts refill --count 3
//   node --experimental-strip-types scripts/generate-vouchers.mts timer --count 10
//   node --experimental-strip-types scripts/generate-vouchers.mts rarity --rarity legend --count 5
//
// Or via the npm script:
//   npm run vouchers:generate -- rarity --rarity legend --count 5
//
// `--count` means different things per type:
//   - refill: the number of packs the single generated voucher grants
//             (refill vouchers are reusable, so only one code is ever printed)
//   - rarity/timer: the number of distinct codes to generate

import { DEFAULT_REFILL_AMOUNT, generateVoucherCode, VOUCHER_RARITIES, VOUCHER_TYPES, type VoucherType } from '../src/game/vouchers.ts'
import type { RarityKey } from '../src/theme.ts'

function usage(): never {
  console.error(
    [
      `Usage: node --experimental-strip-types scripts/generate-vouchers.mts <${VOUCHER_TYPES.join('|')}> [--count N] [--rarity ${VOUCHER_RARITIES.join('|')}]`,
      '',
      "For refill, --count is the number of packs the voucher grants (default 5); exactly one code is printed.",
      'For rarity/timer, --count is the number of codes to generate (default 1).',
      '',
      'Examples:',
      '  node --experimental-strip-types scripts/generate-vouchers.mts refill --count 3',
      '  node --experimental-strip-types scripts/generate-vouchers.mts timer --count 10',
      '  node --experimental-strip-types scripts/generate-vouchers.mts rarity --rarity legend --count 5',
    ].join('\n'),
  )
  process.exit(1)
}

function parseArgs(argv: string[]): { type: string | undefined; count: number | undefined; rarity: string | undefined } {
  const [type, ...rest] = argv
  let count: number | undefined
  let rarity: string | undefined
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--count') count = Number(rest[++i])
    else if (rest[i] === '--rarity') rarity = rest[++i]
  }
  return { type, count, rarity }
}

async function main() {
  const { type, count, rarity } = parseArgs(process.argv.slice(2))

  if (!type || !(VOUCHER_TYPES as readonly string[]).includes(type)) usage()
  if (count !== undefined && (!Number.isInteger(count) || count < 1)) usage()
  if (type === 'rarity' && !(VOUCHER_RARITIES as readonly string[]).includes(rarity ?? '')) usage()

  const voucherType = type as VoucherType

  if (voucherType === 'refill') {
    const amount = count ?? DEFAULT_REFILL_AMOUNT
    if (amount > 255) usage()
    console.log(await generateVoucherCode({ type: 'refill', rarity: null, amount }))
    return
  }

  const voucherRarity = voucherType === 'rarity' ? (rarity as RarityKey) : null
  const codeCount = count ?? 1
  for (let i = 0; i < codeCount; i++) {
    console.log(await generateVoucherCode({ type: voucherType, rarity: voucherRarity, amount: null }))
  }
}

main()
