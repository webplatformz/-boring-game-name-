import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const data = JSON.parse(fs.readFileSync(path.join(here, '../src/data/members.json'), 'utf8'))
const cards = data.members
const tiers = ['common', 'uncommon', 'rare', 'ultra', 'legend', 'mythic']
const trials = Number(process.env.TRIALS ?? 100000)
const seedStart = Number(process.env.SEED ?? 20260821)
const defTrickleMultiplier = Number(process.env.DEF_TRICKLE_MULTIPLIER ?? 1)
const repelledTrickleMultiplier = Number(process.env.REPELLED_TRICKLE_MULTIPLIER ?? 0)

function rng(seed) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clone = (s) => ({ ...s })
const support = (s, side) => side === 'player'
  ? s.firmPlayer + s.ratherPlayer
  : s.firmOpponent + s.ratherOpponent
const initial = (a, b) => {
  const lean = Math.min(15, Math.round(Math.abs(a.ratings.ovr - b.ratings.ovr) * 0.5))
  return a.ratings.ovr >= b.ratings.ovr
    ? { firmPlayer: 0, ratherPlayer: lean, undecided: 100 - lean, ratherOpponent: 0, firmOpponent: 0 }
    : { firmPlayer: 0, ratherPlayer: 0, undecided: 100 - lean, ratherOpponent: lean, firmOpponent: 0 }
}

function amount(margin, pool, k) {
  return margin > 0 ? Math.min(pool, Math.max(1, Math.round(margin / k))) : 0
}

function resolve(s, a, pa, b, pb, k) {
  const n = clone(s)
  const atk = (side) => side === 'player' ? a.ratings.atk : b.ratings.atk
  const def = (side) => side === 'player' ? a.ratings.def : b.ratings.def
  if (pa === 'defend' && pb === 'defend') {
    const margin = def('player') - def('opponent')
    const secureP = Math.min(n.ratherPlayer, Math.round(def('player') / k))
    const secureO = Math.min(n.ratherOpponent, Math.round(def('opponent') / k))
    n.ratherPlayer -= secureP; n.firmPlayer += secureP
    n.ratherOpponent -= secureO; n.firmOpponent += secureO
    const trickle = Math.min(
      n.undecided,
      Math.round(amount(Math.abs(margin), n.undecided, k) * defTrickleMultiplier),
    )
    if (margin > 0) { n.ratherPlayer += trickle; n.undecided -= trickle }
    if (margin < 0) { n.ratherOpponent += trickle; n.undecided -= trickle }
    return n
  }
  if (pa === 'attack' && pb === 'attack') {
    const wantP = Math.round(atk('player') / k)
    const wantO = Math.round(atk('opponent') / k)
    let recruitP, recruitO
    if (wantP + wantO <= n.undecided) [recruitP, recruitO] = [wantP, wantO]
    else { recruitP = Math.round(n.undecided * wantP / (wantP + wantO)); recruitO = n.undecided - recruitP }
    n.undecided -= recruitP + recruitO; n.ratherPlayer += recruitP; n.ratherOpponent += recruitO
    return n
  }
  const attacker = pa === 'attack' ? 'player' : 'opponent'
  const defender = attacker === 'player' ? 'opponent' : 'player'
  const margin = atk(attacker) - def(defender)
  const undecidedBefore = n.undecided
  const rather = (side) => side === 'player' ? n.ratherPlayer : n.ratherOpponent
  const addRather = (side, d) => { if (side === 'player') n.ratherPlayer += d; else n.ratherOpponent += d }
  const addFirm = (side, d) => { if (side === 'player') n.firmPlayer += d; else n.firmOpponent += d }
  const removeRather = (side, d) => { if (side === 'player') n.ratherPlayer -= d; else n.ratherOpponent -= d }
  if (margin > 0) {
    const destabilize = amount(margin, rather(defender), k)
    const recruit = amount(margin, n.undecided, k)
    removeRather(defender, destabilize); n.undecided += destabilize - recruit; addRather(attacker, recruit)
  } else if (margin === 0) {
    const recruit = Math.min(n.undecided, Math.max(1, Math.round(atk(attacker) / (k * 2))))
    n.undecided -= recruit; addRather(attacker, recruit)
  } else {
    const secure = amount(-margin, rather(defender), k)
    removeRather(defender, secure); addFirm(defender, secure)
    const backlash = amount(-margin, rather(attacker), k)
    removeRather(attacker, backlash); n.undecided += backlash
    const recruit = Math.min(
      undecidedBefore,
      Math.round(amount(-margin, undecidedBefore, k) * repelledTrickleMultiplier),
    )
    n.undecided -= recruit; addRather(defender, recruit)
  }
  const baseline = Math.min(rather(defender), Math.round(def(defender) / k))
  removeRather(defender, baseline); addFirm(defender, baseline)
  return n
}

function result(s, turn, a, b) {
  const p = support(s, 'player'), o = support(s, 'opponent')
  if (p > 50) return { winner: 'player', majority: true, turns: turn, rawTie: false }
  if (o > 50) return { winner: 'opponent', majority: true, turns: turn, rawTie: false }
  if (turn < 5) return null
  if (p !== o) return { winner: p > o ? 'player' : 'opponent', majority: false, turns: turn, rawTie: false }
  return { winner: a.ratings.ovr > b.ratings.ovr ? 'player' : b.ratings.ovr > a.ratings.ovr ? 'opponent' : 'coin', majority: false, turns: turn, rawTie: true }
}

function pickPair(random) {
  const a = cards[Math.floor(random() * cards.length)]
  const i = tiers.indexOf(a.ratings.rarity)
  const eligible = cards.filter((b) => b.id !== a.id && Math.abs(tiers.indexOf(b.ratings.rarity) - i) <= 1)
  const crossParty = eligible.filter((b) => b.partyCode !== a.partyCode)
  const pool = crossParty.length > 0 ? crossParty : eligible
  return [a, pool[Math.floor(random() * pool.length)]]
}

const fixed = (action) => () => action
const weighted = (card, random) => () => random() < card.ratings.atk / (card.ratings.atk + card.ratings.def) ? 'attack' : 'defend'
const threshold = (card, opp) => () => card.ratings.atk >= opp.ratings.def ? 'attack' : 'defend'

function run(k, playerPolicy, opponentPolicy, seed, accept = () => true) {
  const random = rng(seed)
  let wins = 0, betterWins = 0, decisivePairs = 0, majority = 0, turns = 0, rawTies = 0, stalemateLike = 0
  const margins = []
  let played = 0
  while (played < trials) {
    const [a, b] = pickPair(random)
    if (!accept(a, b)) continue
    played++
    const pp = playerPolicy(a, b, random), op = opponentPolicy(b, a, random)
    let state = initial(a, b), moved = 0, out
    for (let t = 1; t <= 5; t++) {
      const before = state
      state = resolve(state, a, pp(), b, op(), k)
      const delta = 100 - state.undecided - (100 - before.undecided)
      moved += Math.abs(delta)
      out = result(state, t, a, b)
      if (out) break
    }
    wins += out.winner === 'player' ? 1 : 0; majority += out.majority ? 1 : 0
    if (a.ratings.ovr !== b.ratings.ovr) {
      decisivePairs++
      if (out.winner === (a.ratings.ovr > b.ratings.ovr ? 'player' : 'opponent')) betterWins++
    }
    turns += out.turns; rawTies += out.rawTie ? 1 : 0
    if (!out.majority && moved <= 3) stalemateLike++
    margins.push(Math.abs(support(state, 'player') - support(state, 'opponent')))
  }
  margins.sort((x, y) => x - y)
  return { win: wins / trials, loss: 1 - wins / trials, betterWin: betterWins / decisivePairs, majority: majority / trials, avgTurns: turns / trials, rawTie: rawTies / trials, stalemate: stalemateLike / trials, p10: margins[Math.floor(trials * .1)], median: margins[Math.floor(trials * .5)] }
}

const policies = {
  'always attack': () => fixed('attack'),
  'always defend': () => fixed('defend'),
  'stat-weighted': (a, b, r) => weighted(a, r),
  'threshold': (a, b) => threshold(a, b),
}

function pct(n) { return `${(n * 100).toFixed(1)}%` }
function row(name, x) {
  return `${name.padEnd(22)} ${pct(x.win).padStart(7)} ${pct(x.majority).padStart(8)} ${x.avgTurns.toFixed(2).padStart(7)} ${pct(x.rawTie).padStart(7)} ${pct(x.stalemate).padStart(9)} ${String(x.median).padStart(7)}`
}
function betterRow(name, x) {
  return `${name.padEnd(22)} ${pct(x.betterWin).padStart(11)} ${pct(1 - x.betterWin).padStart(11)}`
}

console.log(`Cards: ${cards.length}; trials per row: ${trials}; matchmaking: same rarity +/- 1, cross-party when possible; turn limit: 5; DEF trickle: ${defTrickleMultiplier}x; repelled-attack trickle: ${repelledTrickleMultiplier}x`)
console.log('\nStrategy matchups (player vs opponent; win rate is player win rate)')
console.log('strategy'.padEnd(22) + ' win%  majority avgTurns rawTie stalemate medianMargin')
for (const [name, policy] of Object.entries(policies)) console.log(row(name, run(6, policy, policies['stat-weighted'], seedStart + name.length)))
console.log('\nK sensitivity: stat-weighted vs stat-weighted')
console.log('K'.padEnd(5) + ' win%  majority avgTurns rawTie stalemate medianMargin')
for (const k of [3, 4, 5, 6, 7, 8, 10, 12]) console.log(String(k).padEnd(5) + row('', run(k, policies['stat-weighted'], policies['stat-weighted'], seedStart + k)).slice(22))
console.log('\nBest-response proxy: threshold strategy (attack when ATK >= opponent DEF) vs stat-weighted')
console.log(row('threshold', run(6, policies.threshold, policies['stat-weighted'], seedStart + 99)))
console.log('\nWeaker-card slice: player OVR is lower than opponent OVR; threshold vs stat-weighted')
console.log(row('weaker threshold', run(6, policies.threshold, policies['stat-weighted'], seedStart + 100, (a, b) => a.ratings.ovr < b.ratings.ovr)))
console.log('\nInterpretation: stalemate-like = no majority and <=3 net points moved from Undecided over the battle; rawTie = equal final support before OVR/coin-break.')
console.log('\nBetter-card results exclude equal-OVR pairs; better card means higher OVR.')
console.log('strategy'.padEnd(22) + ' better wins  upsets')
for (const [name, policy] of Object.entries(policies)) console.log(betterRow(name, run(4, policy, policies['stat-weighted'], seedStart + 200 + name.length)))
console.log('\nMirror matchups: both cards use the same strategy')
console.log('strategy'.padEnd(22) + ' better wins  upsets')
for (const [name, policy] of Object.entries(policies)) console.log(betterRow(name, run(4, policy, policy, seedStart + 300 + name.length)))
