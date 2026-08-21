# Debate Mode

Single-player-vs-AI debate mode built on card `atk`/`def`/`ovr` stats. The
feature runs in-product under the name **Debate**. This
doc tracks three layers: the **current implementation** (live), the
**planned v2 resolution mechanic** (designed, not built), and **future
stakes/rewards** (designed, not built). No votation/initiative data is
used; no test framework exists in this repo — verification relies on
`tsc --noEmit` / `npm run build` plus deleted scratch scripts.

## Part 1 — Current implementation (v1: Attack/Defend coin-flip)

**Status: implemented and verified.**

Each battle is one sudden-death round: player picks a card from `owned`,
faces an AI opponent drawn from `MEMBERS` **tier-matched** to the player's
card (same rarity ± 1, never the same card, and never the same party when
another eligible option exists — `pickOpponent` in `src/game/battle.ts`),
both secretly choose Attack or Defend, and a single
stat comparison decides the winner. No rewards beyond a persisted win/loss
counter.

**Resolution rules** (`resolveRound`):
- Attack vs Attack → higher `atk` wins.
- Defend vs Defend → higher `def` wins (sudden death always needs a winner).
- Attack vs Defend → attacker wins if `atk > defender.def`, else defender wins.
- Ties → compare `ovr`, then coin-flip.

**AI action selection** (`chooseAiAction`): `P(attack) = atk / (atk + def)`.

**Architecture:**
- `src/game/battle.ts` — pure logic: `pickOpponent`, `chooseAiAction`, `resolveRound`.
- `src/game/useBattle.ts` — standalone hook (not merged into `useGame`),
  state machine `pick → fight → reveal → result`. Only the `'battle'`
  screen transition (`goBattle()`) lives in `useGame`/`App.tsx`. Handles
  timer cancellation on reset/unmount and a double-submit guard on actions.
  Timing: `BATTLE_SUSPENSE_MS = 900` (tap → reveal), `BATTLE_RESULT_MS = 1800`
  (reveal → result banner) — tuned up from 600/500 so players can actually
  read what was chosen.
- `src/screens/Battle.tsx` — `Picker` (table-row fighter selection, with a
  "NO FIGHTERS YET" empty state), `Arena` (one persistent component shared
  across fight/reveal/result so cards never unmount between steps — only
  the footer swaps between buttons → "LOCKING IN…"/"RESOLVING…" status text
  → win/lose banner), `ScaledCard` (renders `CardFront`/`CardGlow` at native
  330px size and shrinks via CSS `transform: scale()`, since those
  components use fixed-px sizing that doesn't scale responsively).
- `src/game/storage.ts` — `BattleRecord { wins, losses }` under a separate
  `bundeshaus-battle-v1` key, validated as finite non-negative integers
  per-field (falls back safely on corrupt/missing localStorage).
- `src/components/CardFront.tsx` — `highlightStat` prop (pulsing glow on
  the deciding stat via a `statHighlight` keyframe) and `hideStats` prop
  (masks the opponent's ATK/DEF with `?`/hatched bars until the player
  commits an action, so their stats are secret beforehand).
- Reveal juice: attacking card "bumps" toward the opponent (`bumpUp`/
  `bumpDown` keyframes) with a `vsFlash` pulse on the VS divider; result
  screen dims the losing card in place rather than resizing.
- **Known limitation**: mythic cards hide their ATK/DEF block entirely
  (`CardFront.tsx`), so `highlightStat`/`hideStats` have no visible effect
  on them if one appears in a battle. Included in the pool anyway,
  deferred intentionally.

## Part 2 — Planned v2: Debate (Polling Duel) (designed, not implemented)

**Status: mechanics finalized, not implemented.** Replaces only the
**round resolution** — picker, tier-matched cross-party `pickOpponent`, AI
weighting, and persistence scaffolding all carry over.

### Concept

Debate is an abstract card-game simulation, not a representation of any
portrayed person's political opinions, positions, or statements. Feedback
copy must describe only card stats, chosen actions, poll movement, and game
rules.

Instead of one coin-flip, a battle becomes a debate over a simulated public
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
  recruitMine = round(undecided * desiredMine / (desiredMine + desiredOpp)); recruitOpp = undecided - recruitMine
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

### Architecture changes needed

- `battle.ts`: `resolveRound` → `PollState` + `INITIAL_POLL(...)` +
  `resolveTurn(poll, playerCard, playerAction, oppCard, oppAction): PollState`
  (pure, per-turn) + `checkWin(poll, turnsPlayed, turnLimit)`.
  `pickOpponent` gains the cross-party filter described below;
  `chooseAiAction` remains weighted by the card's stats and is called once per
  turn.
- `useBattle.ts`: `'fight'`/`'reveal'` steps now loop per turn. New state:
  `poll`, `turn` (1–5), `winner: { winner, majority } | null` (replaces
  single-shot `BattleResult`). Same timer-cancellation and double-submit
  guard patterns apply **per turn now**, not just once per battle.
- `Battle.tsx`: card-focused `Arena` layout replaced/supplemented with a
  five-bucket horizontal poll meter; needs a "turn N / 5" indicator and
  per-turn reveal copy (why an attack whiffed vs. succeeded). Not designed
  in detail yet.
- `storage.ts`: `BattleRecord` gains `majorityWins`/`turnLimitWins` fields
  (decided — turn-limit wins should be tracked separately since they're
  meant to feel less decisive), validated the same way as `wins`/`losses`.
  `wins` stays as its own field (`= majorityWins + turnLimitWins`) so
  existing UI doesn't need to change shape immediately.

### Implementation plan

The following sequence is ready for handover. The pure model must land before
the hook or UI work begins; the UI should not duplicate poll arithmetic.

1. **Freeze the v2 rules and interfaces.** Treat `K = 4`, the `1.5x` higher-DEF
   DEF/DEF trickle, and the normal-strength case-6 defender recruit as the
   initial tuning. Confirm that case-6 recruitment uses `undecidedBefore` and
   that all other deltas are calculated from one pre-turn snapshot. Keep
   `resolveRound` available until the Debate screen is wired, unless the
   branch explicitly replaces v1. Use Debate consistently for the new screen,
   state labels, result copy, and analytics names.

2. **Implement opponent selection and the pure poll model.** Update
   `pickOpponent` so it first applies the rarity window and card exclusion,
   then removes the player's party if that leaves any candidates; fall back
   to the full eligible rarity pool only when necessary. Then implement the
   pure poll model in `src/game/battle.ts`. Add
   `PollState`, `PollWinner`, `INITIAL_POLL(playerCard, oppCard)`,
   `resolveTurn(poll, playerCard, playerAction, oppCard, oppAction, options?)`,
   and `checkWin(poll, turnsPlayed, turnLimit)`. Keep `pickOpponent` and
   `chooseAiAction` unchanged apart from calling the AI once per turn.
   Centralize clamping, margin amounts, the DEF/DEF multiplier, and the case-6
   pre-turn recruit so no caller can create negative buckets or totals other
   than 100.

3. **Add model-level verification before UI work.** Use the existing
   `scripts/simulate-battle.mjs` as a regression/sensitivity tool and add
   deterministic hand-check cases for: tied OVR initialization; lean in both
   directions; DEF/DEF secure plus boosted trickle; attack victory with
   destabilize/recruit; attack tie; case-6 secure/backlash/recruit using the
   pre-turn pool; Attack/Attack scarcity; early majority; five-turn winner;
   OVR tie-break; and coin-flip tie-break. Verify symmetry by mirroring every
   non-tie case. Do not introduce a test framework solely for this feature.

4. **Replace the one-shot hook flow in `src/game/useBattle.ts`.** Preserve the
   existing `pick → fight → reveal → result` timing and cancellation guards,
   but make `fight`/`reveal` represent one turn. Store `poll`, `turn`,
   `winner`, and the locked actions in state. On reveal, resolve exactly once,
   check for a majority, then either show the result or advance to the next
   turn. Retain the double-submit guard per turn and clear timers on reset,
   unmount, and a completed battle.

5. **Implement the Debate UI in `src/screens/Battle.tsx`.** Replace or
   supplement the card-focused arena with five labeled buckets:
   `Firm (mine)`, `Rather (mine)`, `Undecided`, `Rather (opponent)`, and
   `Firm (opponent)`. Show `turn / 5`, conceal opponent stats until the action
   is committed, and provide one concise, politically neutral reveal
   explanation for each outcome row. Copy may say “ATK exceeded DEF,”
   “defense secured support,” or “the poll remained tied,” but must not imply
   that the portrayed member said, believes, supports, or opposes anything.
   The result view must show the final split and distinguish majority wins from
   turn-limit wins. Preserve the existing empty-picker, responsive layout, and
   card persistence behavior.

6. **Update persistence after the loop works.** Extend `BattleRecord` with
   validated `majorityWins` and `turnLimitWins` fields while retaining
   `wins = majorityWins + turnLimitWins` for existing UI compatibility.
   Treat missing fields as zero and reject malformed or negative values using
   the established storage validation pattern. Do not add rewards or stakes in
   this implementation.

7. **Run the handover verification pass.** Play through mirrored lopsided,
   even, and near-tie cards; confirm early majority, five-turn resolution,
   exact ties, reset during suspense, unmount during a turn, and repeated
   action submission. Run the repository type-check/build and lint commands.
   Re-run the simulation with the documented recommended settings and record
   any tuning change in this document before merging.

### Open TODOs and tuning notes

- Reward differential between majority vs. turn-limit win (see Part 3).
- Simulation recommendation: start with `K = 4`. With stat-weighted actions,
  K = 4 produced about 17–20% majority wins by turn 5 in the tested model;
  K = 6 produced about 3%. K = 3 was faster but risked making resolution too
  explosive.
- Simulation recommendation: multiply the higher-DEF DEF/DEF trickle by
  `1.5`, while keeping the case-6 defended-attack recruit at the normal
  `amt(margin, undecided)` strength. This reduced stalemate-like outcomes
  substantially without making Defend a clear winning strategy.
- Reproducible simulation: `npm run simulate:battle`. The script supports
  `DEF_TRICKLE_MULTIPLIER` and `REPELLED_TRICKLE_MULTIPLIER` for tuning.
- Per-turn UI feedback copy not yet written.
- How this composes with the stakes/rewards layer below is not yet
  addressed — that layer should work with either resolution mechanic.

## Part 3 — Future: stakes & rewards (designed, not implemented)

**Status: design only.** Battles today (either mechanic) have no stakes —
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
- Per-card daily battle cooldown, and its cap, alongside dupes-only wagering.
- Bank/Push UI: a new screen/step between `result` and the next `fight` —
  not designed yet.
- Whether "push" should be blocked while the *original* wagered card is
  still on cooldown from a previous chain.
