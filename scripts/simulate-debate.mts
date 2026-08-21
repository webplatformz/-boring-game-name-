import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  checkWin,
  DEBATE_TURN_LIMIT,
  DEFAULT_DEBATE_RULES,
  INITIAL_POLL,
  resolveTurn,
  type DebateAction,
  type PollSide,
  type PollState,
} from '../src/game/debate.ts'
import {
  chooseAiAction,
  pickOpponentFrom,
  type DebateMatchCard,
} from '../src/game/debateMatch.ts'

const here = path.dirname(fileURLToPath(import.meta.url))
const data = JSON.parse(
  fs.readFileSync(path.join(here, '../src/data/members.json'), 'utf8'),
) as { members: DebateMatchCard[] }
const cards = data.members
const tiers = ['common', 'uncommon', 'rare', 'ultra', 'legend', 'mythic']
const trials = Number(process.env.TRIALS ?? 100000)
const seedStart = Number(process.env.SEED ?? 20260821)
const rules = {
  ...DEFAULT_DEBATE_RULES,
  defendTrickleMultiplier: Number(
    process.env.DEF_TRICKLE_MULTIPLIER ??
      DEFAULT_DEBATE_RULES.defendTrickleMultiplier,
  ),
  repelledRecruitMultiplier: Number(
    process.env.REPELLED_TRICKLE_MULTIPLIER ??
      DEFAULT_DEBATE_RULES.repelledRecruitMultiplier,
  ),
}

type Random = () => number
type Policy = (
  card: DebateMatchCard,
  opponent: DebateMatchCard,
  random: Random,
) => () => DebateAction

function rng(seed: number): Random {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function support(poll: PollState, side: PollSide): number {
  return side === 'player'
    ? poll.firmPlayer + poll.ratherPlayer
    : poll.firmOpponent + poll.ratherOpponent
}

function pickPair(random: Random): [DebateMatchCard, DebateMatchCard] {
  const player = cards[Math.floor(random() * cards.length)]
  return [
    player,
    pickOpponentFrom(cards, player, tiers, random),
  ]
}

const fixed = (action: DebateAction) => () => action
const weighted = (card: DebateMatchCard, random: Random) => () =>
  chooseAiAction(card, random)
const threshold = (card: DebateMatchCard, opponent: DebateMatchCard) => () =>
  card.ratings.atk >= opponent.ratings.def ? 'attack' as const : 'defend' as const

function run(
  k: number,
  playerPolicy: Policy,
  opponentPolicy: Policy,
  seed: number,
  accept: (
    player: DebateMatchCard,
    opponent: DebateMatchCard,
  ) => boolean = () => true,
) {
  const random = rng(seed)
  let wins = 0
  let betterWins = 0
  let decisivePairs = 0
  let majority = 0
  let turns = 0
  let rawTies = 0
  let stalemateLike = 0
  const margins: number[] = []
  let played = 0

  while (played < trials) {
    const [player, opponent] = pickPair(random)
    if (!accept(player, opponent)) continue
    played += 1
    const choosePlayer = playerPolicy(player, opponent, random)
    const chooseOpponent = opponentPolicy(opponent, player, random)
    let poll = INITIAL_POLL(player, opponent)
    let moved = 0
    let outcome

    for (let turn = 1; turn <= DEBATE_TURN_LIMIT; turn++) {
      const before = poll
      poll = resolveTurn(
        poll,
        player,
        choosePlayer(),
        opponent,
        chooseOpponent(),
        { ...rules, k, random },
      )
      moved += Math.abs(poll.undecided - before.undecided)
      const rawTie =
        turn === DEBATE_TURN_LIMIT &&
        support(poll, 'player') === support(poll, 'opponent')
      const winner = checkWin(
        poll,
        turn,
        DEBATE_TURN_LIMIT,
        player,
        opponent,
        { random },
      )
      if (winner) {
        outcome = { ...winner, turns: turn, rawTie }
        break
      }
    }

    if (!outcome) throw new Error('Debate did not resolve at the turn limit')
    wins += outcome.winner === 'player' ? 1 : 0
    majority += outcome.majority ? 1 : 0
    if (player.ratings.ovr !== opponent.ratings.ovr) {
      decisivePairs += 1
      const better = player.ratings.ovr > opponent.ratings.ovr
        ? 'player'
        : 'opponent'
      if (outcome.winner === better) betterWins += 1
    }
    turns += outcome.turns
    rawTies += outcome.rawTie ? 1 : 0
    if (!outcome.majority && moved <= 3) stalemateLike += 1
    margins.push(
      Math.abs(support(poll, 'player') - support(poll, 'opponent')),
    )
  }

  margins.sort((a, b) => a - b)
  return {
    win: wins / trials,
    betterWin: betterWins / decisivePairs,
    majority: majority / trials,
    avgTurns: turns / trials,
    rawTie: rawTies / trials,
    stalemate: stalemateLike / trials,
    median: margins[Math.floor(trials * 0.5)],
  }
}

const policies: Record<string, Policy> = {
  'always attack': () => fixed('attack'),
  'always defend': () => fixed('defend'),
  'stat-weighted': (card, _opponent, random) => weighted(card, random),
  threshold,
}

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

function row(name: string, result: ReturnType<typeof run>) {
  return `${name.padEnd(22)} ${pct(result.win).padStart(7)} ${pct(result.majority).padStart(8)} ${result.avgTurns.toFixed(2).padStart(7)} ${pct(result.rawTie).padStart(7)} ${pct(result.stalemate).padStart(9)} ${String(result.median).padStart(7)}`
}

function betterRow(name: string, result: ReturnType<typeof run>) {
  return `${name.padEnd(22)} ${pct(result.betterWin).padStart(11)} ${pct(1 - result.betterWin).padStart(11)}`
}

const productionK = DEFAULT_DEBATE_RULES.k
console.log(`Cards: ${cards.length}; trials per row: ${trials}; matchmaking: same rarity +/- 1, cross-party when possible; turn limit: ${DEBATE_TURN_LIMIT}; DEF trickle: ${rules.defendTrickleMultiplier}x; repelled-attack recruit: ${rules.repelledRecruitMultiplier}x`)
console.log('\nStrategy matchups (player vs opponent; win rate is player win rate)')
console.log('strategy'.padEnd(22) + ' win%  majority avgTurns rawTie stalemate medianMargin')
for (const [name, policy] of Object.entries(policies)) {
  console.log(row(name, run(productionK, policy, policies['stat-weighted'], seedStart + name.length)))
}
console.log('\nK sensitivity: stat-weighted vs stat-weighted')
console.log('K'.padEnd(5) + ' win%  majority avgTurns rawTie stalemate medianMargin')
for (const k of [3, 4, 5, 6, 7, 8, 10, 12]) {
  console.log(String(k).padEnd(5) + row('', run(k, policies['stat-weighted'], policies['stat-weighted'], seedStart + k)).slice(22))
}
console.log('\nBest-response proxy: threshold strategy (attack when ATK >= opponent DEF) vs stat-weighted')
console.log(row('threshold', run(productionK, policies.threshold, policies['stat-weighted'], seedStart + 99)))
console.log('\nWeaker-card slice: player OVR is lower than opponent OVR; threshold vs stat-weighted')
console.log(row('weaker threshold', run(productionK, policies.threshold, policies['stat-weighted'], seedStart + 100, (player, opponent) => player.ratings.ovr < opponent.ratings.ovr)))
console.log('\nInterpretation: stalemate-like = no majority and <=3 total absolute points moved from Undecided over the debate; rawTie = equal final support before OVR/coin-break.')
console.log('\nBetter-card results exclude equal-OVR pairs; better card means higher OVR.')
console.log('strategy'.padEnd(22) + ' better wins  upsets')
for (const [name, policy] of Object.entries(policies)) {
  console.log(betterRow(name, run(productionK, policy, policies['stat-weighted'], seedStart + 200 + name.length)))
}
console.log('\nMirror matchups: both cards use the same strategy')
console.log('strategy'.padEnd(22) + ' better wins  upsets')
for (const [name, policy] of Object.entries(policies)) {
  console.log(betterRow(name, run(productionK, policy, policy, seedStart + 300 + name.length)))
}
