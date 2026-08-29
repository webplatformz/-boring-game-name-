import assert from 'node:assert/strict'
import test from 'node:test'
import { reconcilePackRefill } from '../src/game/packRefill.ts'

const rules = { maxPacks: 10, intervalMs: 10 * 60 * 1_000 }

test('starts a ten-minute refill timer below the automatic cap', () => {
  assert.deepEqual(reconcilePackRefill(7, null, 1_000, rules), {
    packs: 7,
    refillAt: 601_000,
  })
})

test('spending again does not reset an existing refill timer', () => {
  assert.deepEqual(reconcilePackRefill(3, 400_000, 100_000, rules), {
    packs: 3,
    refillAt: 400_000,
  })
})

test('grants every elapsed interval and preserves the next partial interval', () => {
  assert.deepEqual(
    reconcilePackRefill(4, 600_000, 2_100_000, rules),
    {
      packs: 7,
      refillAt: 2_400_000,
    },
  )
})

test('stops at ten without reducing balances already above the cap', () => {
  assert.deepEqual(
    reconcilePackRefill(9, 600_000, 2_100_000, rules),
    { packs: 10, refillAt: null },
  )
  assert.deepEqual(
    reconcilePackRefill(14, 600_000, 2_100_000, rules),
    { packs: 14, refillAt: null },
  )
})
