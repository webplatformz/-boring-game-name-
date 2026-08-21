# Debate Mode

Single-player-vs-AI Debate mode built on card `atk`/`def`/`ovr` stats.
The five-turn polling duel is fully wired in the product. Future stakes and
rewards remain design-only. No votation/initiative data is used.

Model checks use Node's built-in test runner via `npm run verify:debate`;
the production-rule simulation runs via `npm run simulate:debate`.

## Legacy history

The removed v1 mode resolved one Attack/Defend choice as sudden death. Its
browser-only `bundeshaus-battle-v1` records remain untouched because those wins
cannot be truthfully classified as Debate majority or turn-limit wins. No v1
resolver or product route remains.

## Current implementation — Debate polling duel

**Status: implemented and verified.** The picker uses tier-matched,
cross-party-preferred matchmaking, the AI weights actions by card stats, and
each Debate runs for up to five turns.

### Concept

Debate is an abstract card-game simulation, not a representation of any
portrayed person's political opinions, positions, or statements. Feedback
copy must describe only card stats, chosen actions, poll movement, and game
rules.

Instead of one coin-flip, a Debate runs over a simulated public
opinion poll across up to **5 turns**. A pool of 100 points is split into
five buckets:

```text
Firm (mine) | Rather (mine) | Undecided | Rather (opponent) | Firm (opponent)
```

Voters only ever move one-way, same-side: `Undecided → Rather(mine)` or
`Rather(mine) → Firm(mine)`. They **never** flip straight from one side to
the other, and Firm/Undecided are one-way destinations.

### Turn actions & outcome table

Every turn compares the relevant stat(s) for the two chosen actions. The
rule is symmetric and independent of who's the player vs. the AI: **the
higher-value side of any comparison always pulls something new out of
Undecided; the lower side never does.** Defend is the only action that can
be a true no-op (a loss on Defend/Defend gains nothing); Attack always
touches Undecided in some way, win, lose, or tie.

| # | Actions | Comparison | Result | Effect |
|---|---------|-----------|--------|--------|
| 1 | Defend/Defend | DEF(A) vs DEF(B) | A higher | Both secure own Rather→Firm (own DEF, as always) **+** A trickles `Undecided → Rather(A)`, sized by the DEF margin. |
| 2 | Defend/Defend | DEF(A) vs DEF(B) | tie | Both secure own Rather→Firm (own DEF). No Undecided movement. |
| 3 | Defend/Defend | DEF(A) vs DEF(B) | B higher | Mirror of #1. |
| 4 | Attack/Defend | ATK(attacker) vs DEF(defender) | attacker higher | Destabilize `Rather(defender) → Undecided` **+** recruit `Undecided → Rather(attacker)`, both sized by the margin. Defender still secures whatever Rather survives via their own DEF. |
| 5 | Attack/Defend | ATK(attacker) vs DEF(defender) | tie | No destabilize, but attacker still recruits a small flat `Undecided → Rather(attacker)` (ATK-based, not margin-based). Defender secures normally. |
| 6 | Attack/Defend | ATK(attacker) vs DEF(defender) | defender higher | Attack repelled. Defender gets a bonus secure (`Rather(defender) → Firm(defender)`, margin-sized) **+** attacker suffers backlash (`Rather(attacker) → Undecided`, margin-sized). |
| 7 | Attack/Attack | ATK(A) vs ATK(B) | A higher | Proportional recruit split favoring A, sized by own ATK (scarcity-aware, see formula). |
| 8 | Attack/Attack | ATK(A) vs ATK(B) | tie | Even 50/50 recruit split of whatever Undecided demand is satisfiable. |
| 9 | Attack/Attack | ATK(A) vs ATK(B) | B higher | Mirror of #7. |

All deltas for a turn are computed from the same pre-turn snapshot and
applied atomically, with one deliberate exception: within a single
Attack/Defend cell, the attacker's effect ("first move") resolves against
the pre-turn `Rather(defender)`, and the defender's own baseline secure
then resolves against whatever remains — the attack lands first, then the
defender rallies with what's left. Every margin-based amount is floored at
1 once the margin is `> 0` (still capped by the available pool), so a won
comparison always has *some* visible effect — the "nothing happens" case is
now reserved for actual ties only.

### Formulas (`K = 4`, a tunable constant; recommended starting point)

```ts
const amt = (margin: number, pool: number) =>
  margin > 0 ? min(pool, max(1, round(margin / K))) : 0

// Defend vs Defend — baseline secure always applies, independent of comparison
secureAmount_A = min(ratherA, round(DEF_A / K))
secureAmount_B = min(ratherB, round(DEF_B / K))
// higher DEF additionally trickles Undecided -> own Rather; the lower side gets nothing
defMargin = DEF_A - DEF_B
if (defMargin !== 0) {
  winner = defMargin > 0 ? 'A' : 'B'
  trickle = min(undecided, round(amt(abs(defMargin), undecided) * 1.5))
  rather[winner] += trickle; undecided -= trickle
}

// Attack vs Defend — attacker's branch resolves first (pre-turn snapshot),
// defender's baseline secure resolves second, against the remainder
margin = ATK_attacker - DEF_defender
undecidedBefore = undecided
if (margin > 0) {                                                  // row 4: attacker wins
  destabilize = amt(margin, ratherDefender)                         // Rather(defender) -> Undecided
  recruit = amt(margin, undecided)                                  // Undecided -> Rather(attacker), pre-turn undecided
  ratherDefender -= destabilize; ratherAttacker += recruit
  undecided += destabilize - recruit
} else if (margin === 0) {                                          // row 5: stalemate
  recruit = min(undecided, max(1, round(ATK_attacker / (K * 2))))    // smaller flat pull, no destabilize
  undecided -= recruit; ratherAttacker += recruit
} else {                                                             // row 6: defender wins
  secureBonus = amt(-margin, ratherDefender)                         // extra Rather(defender) -> Firm(defender), first
  ratherDefender -= secureBonus; firmDefender += secureBonus
  backlash = amt(-margin, ratherAttacker)                            // Rather(attacker) -> Undecided
  ratherAttacker -= backlash; undecided += backlash
  recruit = min(undecidedBefore, amt(-margin, undecidedBefore))      // normal-strength Undecided -> Rather(defender)
  undecided -= recruit; ratherDefender += recruit
}
// defender's baseline secure (own DEF) applies last, against whatever Rather(defender) remains
baselineSecure = min(ratherDefender, round(DEF_defender / K))
ratherDefender -= baselineSecure; firmDefender += baselineSecure

// Attack vs Attack (rows 7-9, recruiting race, scarcity-aware)
desiredMine = round(ATK_mine / K); desiredOpp = round(ATK_opp / K)
if (desiredMine + desiredOpp === 0) {
  recruitMine = 0; recruitOpp = 0                                   // defensive guard, unreachable with real stat ranges
} else if (desiredMine + desiredOpp <= undecided) {
  recruitMine = desiredMine; recruitOpp = desiredOpp
} else {
  exactMine = undecided * desiredMine / (desiredMine + desiredOpp)
  exactOpp = undecided * desiredOpp / (desiredMine + desiredOpp)
  recruitMine = floor(exactMine); recruitOpp = floor(exactOpp)
  // Give an indivisible remainder to the larger fractional share. If both
  // shares are exact halves, compare OVR, then use an injectable coin flip.
  assignRemainderByFractionThenOvrThenCoinFlip()
}
```

**Edge cases, resolved:**
- Rows 4/6: the attacker's branch resolves against the pre-turn Rather
  pool; the defender's baseline secure resolves second, against the
  remainder — the two can never together over-draw the pool.
- Every margin-based amount floors at 1 (not 0) once the margin is `> 0`,
  so winning a comparison is never invisible — reserved for true ties.
- Case 6's defender recruit uses `undecidedBefore`, so the backlash and recruit
  are both based on the same pre-turn snapshot; the recruit cannot amplify
  itself from the backlash.
- `desiredMine + desiredOpp === 0` can't happen with real stats (min ATK 45
  vs. `K = 4` needs ATK < 3 to floor to 0) — the guard exists only for
  future retuning or debuffed-stat content, not a live concern.
- Scarce Attack/Attack recruitment allocates indivisible points by fractional
  share, then OVR, then a coin flip. This avoids a player-slot rounding bias.
- A side's Rather pool hitting 0 (fully converted to Firm) makes that side
  permanently immune to further destabilize/backlash — intentional, the
  payoff for consistent defending.
- Once Undecided hits 0, the remaining 100 points are entirely Firm+Rather
  split between the two sides, so one side already has a majority (the
  existing win condition fires) unless it's an exact 50/50 split — no
  separate handling needed.

With real stat ranges (ATK/DEF 45–97, avg ~71), one action moves roughly
8–16 points — meaningful within 5 turns, not a one-shot blowout. The
defensive tuning below increases the impact of a successful defense without
making Defend universally dominant.

### Starting distribution

`lean = min(15, round(abs(playerCard.ovr - oppCard.ovr) * 0.5))` — the
higher-OVR side starts with `lean` points in their own Rather bucket, the
rest is Undecided. Tied OVR → fully neutral start (0/0/100/0/0).

### Win conditions

1. **Majority win** (ends early): one side's `Firm + Rather` > 50.
2. **Turn-limit win** (after 5 turns, no majority): higher `Firm + Rather`
   wins — explicitly **less valuable** than a majority win (reward
   differential is a TODO, see Part 3). Exact tie → compare `ovr`, then
   coin-flip.

Undecided voters count for neither side either way.

### Architecture

- `debate.ts`: pure `PollState` + `INITIAL_POLL(...)` +
  `resolveTurn(poll, playerCard, playerAction, oppCard, oppAction): PollState`
  (pure, per-turn) + `checkWin(...)`, centralized tuning and poll invariants,
  and injectable randomness for deterministic verification.
- `debateMatch.ts`: pure cross-party-preferred matchmaking and stat-weighted
  `chooseAiAction`, shared by the app and simulator.
- `useDebate.ts`: `'fight'`/`'reveal'` steps loop per turn. State includes
  `poll`, `turn` (1–5), `winner: { winner, majority } | null` (replaces
  single-shot v1 result), plus a `lastTurn` snapshot so feedback persists
  while the next action is chosen.
  Timer cancellation and a synchronous double-submit guard apply per turn;
  leaving the Debate screen resets an active debate.
- `Debate.tsx`: compact persistent cards surround an animated five-bucket poll
  meter with a fixed 50/50 marker, turn indicator, neutral per-turn explanation,
  signed bucket deltas that persist until the next result, fixed action-reveal
  slots, visible opponent stats, and distinct majority versus turn-limit result
  copy.
- `storage.ts`: `DebateRecord` includes validated `majorityWins` and
  `turnLimitWins`; `wins` is persisted as their derived sum so the existing UI
  keeps its total. Debate uses a fresh `bundeshaus-battle-v2` key because v1
  sudden-death wins cannot be truthfully assigned to either category.

### Completed implementation sequence

The feature was delivered in this order so UI code never duplicated poll
arithmetic:

1. **Freeze the rules and interfaces.** Treat `K = 4`, the `1.5x` higher-DEF
   DEF/DEF trickle, and the normal-strength case-6 defender recruit as the
   initial tuning. Case-6 recruitment uses `undecidedBefore`; all other deltas
   are calculated from one pre-turn snapshot.

2. **Implement opponent selection and the pure poll model.** Update
   `pickOpponentFrom` so it first applies the rarity window and card exclusion,
   then removes the player's party if that leaves any candidates; fall back
   to the full eligible rarity pool only when necessary. Then implement the
   pure poll model in `src/game/debate.ts`. Add
   `PollState`, `PollWinner`, `INITIAL_POLL(playerCard, oppCard)`,
   `resolveTurn(poll, playerCard, playerAction, oppCard, oppAction, options?)`,
   and `checkWin(poll, turnsPlayed, turnLimit)`. Keep `pickOpponent` and
   `chooseAiAction` unchanged apart from calling the AI once per turn.
   Centralize clamping, margin amounts, the DEF/DEF multiplier, and the case-6
   pre-turn recruit so no caller can create negative buckets or totals other
   than 100.

3. **Add model-level verification before UI work.** Use the existing
   `scripts/simulate-debate.mts` as a regression/sensitivity tool and add
   deterministic hand-check cases for: tied OVR initialization; lean in both
   directions; DEF/DEF secure plus boosted trickle; attack victory with
   destabilize/recruit; attack tie; case-6 secure/backlash/recruit using the
   pre-turn pool; Attack/Attack scarcity; early majority; five-turn winner;
   OVR tie-break; and coin-flip tie-break. Verify symmetry by mirroring every
   non-tie case. Use the dependency-free built-in `node:test` runner.

4. **Replace the one-shot hook flow in `src/game/useDebate.ts`.** Preserve the
   existing `pick → fight → reveal → result` timing and cancellation guards,
   but make `fight`/`reveal` represent one turn. Store `poll`, `turn`,
   `winner`, and the locked actions in state. On reveal, resolve exactly once,
   check for a majority, then either show the result or advance to the next
   turn. Retain the double-submit guard per turn and clear timers on reset,
   unmount, and a completed Debate.

5. **Implement the Debate UI in `src/screens/Debate.tsx`.** Replace or
   supplement the card-focused arena with five labeled buckets:
   `Firm (mine)`, `Rather (mine)`, `Undecided`, `Rather (opponent)`, and
   `Firm (opponent)`. Show `turn / 5`, keep both cards' stats visible, reveal
   actions in fixed-height poll-header slots, and provide one concise,
   politically neutral reveal explanation for each outcome row that remains
   until the next turn resolves. Copy may say “ATK exceeded DEF,”
   “defense secured support,” or “the poll remained tied,” but must not imply
   that the portrayed member said, believes, supports, or opposes anything.
   The result view must show the final split and distinguish majority wins from
   turn-limit wins. Preserve the existing empty-picker, responsive layout, and
   card persistence behavior.

6. **Update persistence after the loop works.** `DebateRecord` uses validated
   `majorityWins` and `turnLimitWins` fields while retaining
   `wins = majorityWins + turnLimitWins` for existing UI compatibility.
   Missing fields become zero and malformed or negative values are rejected
   using the established validation pattern. A fresh v2 key deliberately
   leaves unclassifiable sudden-death records in v1. No rewards or stakes are
   included.

7. **Handover verification completed.** Deterministic model cases cover
   mirrored lopsided, even, and near-tie cards, early majority, five-turn
   resolution, and exact OVR/coin ties. Browser coverage confirms suspense
   cancellation during suspense and result hold, screen unmount, synchronous
   repeated submissions, persistent
   feedback, responsive layout, and v2 record invariants. The build and lint
   pass. The seeded 100,000-trial simulation runs the production model directly,
   so simulation and gameplay cannot drift.

### Open TODOs and tuning notes

- Reward differential between majority vs. turn-limit win (see Part 3).
- Simulation recommendation: start with `K = 4`. With stat-weighted actions
  and the frozen `1.5x`/normal-strength tuning, K = 4 produced 23.4% majority
  wins by turn 5 in the 2026-08-21 seeded 100,000-trial run; K = 6 produced
  3.9%. K = 3 was faster but risked making resolution too explosive.
- Simulation recommendation: multiply the higher-DEF DEF/DEF trickle by
  `1.5`, while keeping the case-6 defended-attack recruit at the normal
  `amt(margin, undecided)` strength. This reduced stalemate-like outcomes
  substantially without making Defend a clear winning strategy.
- Reproducible simulation: `npm run simulate:debate`. The script imports the
  production model and supports
  `DEF_TRICKLE_MULTIPLIER` and `REPELLED_TRICKLE_MULTIPLIER` for tuning.
- How this composes with the stakes/rewards layer below is not yet
  addressed — that layer should work with either resolution mechanic.

## Future: stakes & rewards (designed, not implemented)

**Status: design only.** Debates today have no stakes —
just a persisted win/loss counter.

### Base wager/reward system (prerequisite)

- **Dupes only**: a card can only be wagered as the fighter if
  `owned[id] >= 2`. A player's only copy of any card is never at risk.
- **Reward on win**: draw one random card of the wagered card's tier
  (reusing `drawTradePackCard`-style logic from `src/game/pack.ts`), held
  as the current stake rather than added to `owned` immediately (see
  streak mechanic below).
- **Cost on loss**: the wagered card is removed from `owned`.
- **Balancing goal**: tune EV to be *worse* than the guaranteed 5-for-1
  trade-in, so battling stays a side gamble, not a better grind path.
- Open: exact reward-draw odds, and whether a per-card daily cooldown is
  needed to stop spamming one strong duplicate.

### Double-or-nothing streak

1. **Ante**: wager a duplicate (tier T). Lose → gone, chain never starts.
   Win → reward R1 (tier T) becomes the current stake; offered **Bank vs.
   Push**.
2. **Bank** → R1 added to `owned`, chain ends.
3. **Push** → R1 itself becomes the stake for a new fight, tier-matched to
   R1 (not the original card). Lose → **entire chain forfeited**. Win →
   next reward, another Bank/Push choice.
4. **Escalating tier-up chance** per push, capped: Push 1 → 10%, Push 2 →
   25%, Push 3 → 40%. Void (stays same-tier) if already `mythic`.
5. **Hard cap: 3 pushes** — auto-banks after a Push 3 win (max chain =
   ante-win + 3 pushes = 4 wins before forced payout). Protects the
   scarce legend (5 members) / mythic (7 members) supply from farming.

### Open questions

- Exact base reward-draw odds (needs tuning against trade-in EV).
- Per-card daily Debate cooldown, and its cap, alongside dupes-only wagering.
- Bank/Push UI: a new screen/step between `result` and the next `fight` —
  not designed yet.
- Whether "push" should be blocked while the *original* wagered card is
  still on cooldown from a previous chain.
