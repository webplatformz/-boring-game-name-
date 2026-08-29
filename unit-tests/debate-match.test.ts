import assert from 'node:assert/strict'
import test from 'node:test'
import type { RarityKey } from '../src/theme.ts'
import {
  pickOpponentAtRarity,
  pickOpponentFrom,
  type DebateMatchCard,
} from '../src/game/debateMatch.ts'

function card(
  id: number,
  partyCode: string,
  rarity: RarityKey,
): DebateMatchCard {
  return {
    id,
    partyCode,
    ratings: { atk: 60, def: 60, ovr: 60, rarity },
  }
}

test('campaign matchmaking uses the exact rarity and prefers another party', () => {
  const player = card(1, 'A', 'common')
  const members = [
    player,
    card(2, 'A', 'rare'),
    card(3, 'B', 'rare'),
    card(4, 'C', 'uncommon'),
  ]

  assert.equal(
    pickOpponentAtRarity(members, player, 'rare', () => 0).id,
    3,
  )
})

test('campaign matchmaking falls back to the same party but never the player', () => {
  const player = card(1, 'A', 'mythic')
  const sameParty = card(2, 'A', 'mythic')
  assert.equal(
    pickOpponentAtRarity([player, sameParty], player, 'mythic', () => 0).id,
    2,
  )
  assert.throws(
    () => pickOpponentAtRarity([player], player, 'mythic'),
    /eligible mythic opponent/,
  )
})

test('training matchmaking retains its nearby-tier fallback behavior', () => {
  const player = card(1, 'A', 'rare')
  const samePartyNearby = card(2, 'A', 'uncommon')
  const crossPartyNearby = card(3, 'B', 'ultra')
  const crossPartyFar = card(4, 'B', 'mythic')

  assert.equal(
    pickOpponentFrom(
      [player, samePartyNearby, crossPartyNearby, crossPartyFar],
      player,
      ['common', 'uncommon', 'rare', 'ultra', 'legend', 'mythic'],
      () => 0,
    ).id,
    3,
  )
})
