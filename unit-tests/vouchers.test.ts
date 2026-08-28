import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_REFILL_AMOUNT,
  generateVoucherCode,
  VOUCHER_RARITIES,
  VOUCHER_TYPES,
  verifyVoucherCode,
} from '../src/game/vouchers.ts'

test('round-trips every voucher type', async () => {
  for (const type of VOUCHER_TYPES) {
    const rarity = type === 'rarity' ? VOUCHER_RARITIES[0] : null
    const amount = type === 'refill' ? 3 : null
    const code = await generateVoucherCode({ type, rarity, amount })
    const result = await verifyVoucherCode(code)
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.equal(result.payload.type, type)
      assert.equal(result.payload.rarity, rarity)
      assert.equal(result.payload.amount, amount)
      assert.match(result.nonce, /^[0-9A-Z]+$/)
    }
  }
})

test('a refill voucher defaults its amount when none is given', async () => {
  const code = await generateVoucherCode({ type: 'refill', rarity: null, amount: null })
  const result = await verifyVoucherCode(code)
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.payload.amount, DEFAULT_REFILL_AMOUNT)
})

test('accepts a code typed without dashes or in lowercase', async () => {
  const code = await generateVoucherCode({ type: 'refill', rarity: null, amount: 5 })
  const messy = code.replaceAll('-', '').toLowerCase()
  const result = await verifyVoucherCode(messy)
  assert.equal(result.ok, true)
})

test('rejects a tampered code', async () => {
  const code = await generateVoucherCode({ type: 'refill', rarity: null, amount: 5 })
  const tampered = (code[0] === '0' ? '1' : '0') + code.slice(1)
  const result = await verifyVoucherCode(tampered)
  assert.equal(result.ok, false)
})

test('rejects garbage input', async () => {
  const result = await verifyVoucherCode('not-a-real-voucher-code')
  assert.equal(result.ok, false)
})

test('rejects an empty string', async () => {
  const result = await verifyVoucherCode('')
  assert.equal(result.ok, false)
})

test('two codes for the same payload are distinct and carry distinct nonces', async () => {
  const a = await generateVoucherCode({ type: 'timer', rarity: null, amount: null })
  const b = await generateVoucherCode({ type: 'timer', rarity: null, amount: null })
  assert.notEqual(a, b)
  const va = await verifyVoucherCode(a)
  const vb = await verifyVoucherCode(b)
  assert.equal(va.ok, true)
  assert.equal(vb.ok, true)
  if (va.ok && vb.ok) assert.notEqual(va.nonce, vb.nonce)
})

test('every non-mythic rarity round-trips through a rarity voucher', async () => {
  for (const rarity of VOUCHER_RARITIES) {
    const code = await generateVoucherCode({ type: 'rarity', rarity, amount: null })
    const result = await verifyVoucherCode(code)
    assert.equal(result.ok, true)
    if (result.ok) assert.equal(result.payload.rarity, rarity)
  }
})

test('generating a rarity voucher without a valid rarity throws', async () => {
  await assert.rejects(() => generateVoucherCode({ type: 'rarity', rarity: null, amount: null }))
  // Mythic is deliberately excluded from VOUCHER_RARITIES (see the file-level
  // comment in game/vouchers.ts), even though it's a valid RarityKey.
  await assert.rejects(() => generateVoucherCode({ type: 'rarity', rarity: 'mythic', amount: null }))
})

test('generating a refill voucher with an out-of-range amount throws', async () => {
  await assert.rejects(() => generateVoucherCode({ type: 'refill', rarity: null, amount: 0 }))
  await assert.rejects(() => generateVoucherCode({ type: 'refill', rarity: null, amount: 256 }))
  await assert.rejects(() => generateVoucherCode({ type: 'refill', rarity: null, amount: 1.5 }))
})
