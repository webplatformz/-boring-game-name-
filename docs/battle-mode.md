# Battle Mode

Single-player-vs-AI battle mode built on card `atk`/`def`/`ovr` stats. This
doc tracks three layers: the **current implementation** (live), the
**planned v2 resolution mechanic** (designed, not built), and **future
stakes/rewards** (designed, not built). No votation/initiative data is
used; no test framework exists in this repo — verification relies on
`tsc --noEmit` / `npm run build` plus deleted scratch scripts.

## Part 1 — Current implementation (v1: Attack/Defend coin-flip)

**Status: implemented and verified.**

Each battle is one sudden-death round: player picks a card from `owned`,
faces an AI opponent drawn from `MEMBERS` **tier-matched** to the player's
card (same rarity ± 1, never the same card — `pickOpponent` in
`src/game/battle.ts`), both secretly choose Attack or Defend, and a single
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

## Part 2 — Planned v2: Polling Duel (designed, not implemented)

**Status: mechanics finalized, not implemented.** Replaces only the
**round resolution** — picker, tier-matched `pickOpponent`, AI weighting,
and persistence scaffolding all carry over.

### Concept

Instead of one coin-flip, a battle becomes a debate over a simulated public
opinion poll across up to **5 turns**. A pool of 100 points is split into
five buckets:

```text
Firm (mine) | Rather (mine) | Undecided | Rather (opponent) | Firm (opponent)
```

Voters only ever move one-way, same-side: `Undecided → Rather(mine)` or
`Rather(mine) → Firm(mine)`. They **never** flip straight from one side to
the other, and Firm/Undecided are one-way destinations.

### Turn actions (ATK has two identities; DEF has one)

- **Defend** — always secures some of your own Rather voters into Firm,
  sized by your **DEF**. Never touches Undecided or the opponent's pool.
- **Attack vs. Defend** — a *challenge*: your **ATK** vs. their **DEF**; on
  success, destabilizes some of their Rather voters into Undecided.
- **Attack vs. Attack** — a *recruiting race*: both sides pull from the
  shared Undecided pool into their own Rather, sized by their own ATK
  (proportional split if combined demand exceeds supply). No destabilizing.

| You | Opponent | Effect |
|---|---|---|
| Defend | Defend | Both secure own Rather → Firm. Undecided untouched. |
| Attack | Defend | ATK vs their DEF; may destabilize their Rather → Undecided. They still secure whatever Rather survives, via their DEF. |
| Defend | Attack | Mirror of the above. |
| Attack | Attack | Both recruit from shared Undecided → own Rather, sized by own ATK. |

All deltas for a turn are computed from the same pre-turn snapshot and
applied atomically (a defend doesn't protect voters from that same turn's
incoming attack, only future ones).

### Formulas (`K = 6`, a tunable constant, unverified by playtesting)

```ts
secureAmount = min(ratherMine, round(DEF_mine / K))                 // Defend
margin = ATK_attacker - DEF_defender
destabilizeAmount = margin > 0 ? min(ratherDefender, round(margin / K)) : 0  // Attack vs Defend

desiredMine = round(ATK_mine / K); desiredOpp = round(ATK_opp / K)  // Attack vs Attack
if (desiredMine + desiredOpp <= undecided) { recruitMine = desiredMine; recruitOpp = desiredOpp }
else { recruitMine = round(undecided * desiredMine / (desiredMine + desiredOpp)); recruitOpp = undecided - recruitMine }
```

With real stat ranges (ATK/DEF 45–97, avg ~71), one action moves roughly
8–16 points — meaningful within 5 turns, not a one-shot blowout.

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
  `pickOpponent`/`chooseAiAction` unchanged; `chooseAiAction` now called
  once per turn.
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

1. **Poll model + pure resolution logic** (`battle.ts`): `PollState`,
   `INITIAL_POLL`, `resolveTurn`, `checkWin`. Verify via scratch script
   against hand-computed examples (including K exhausting a small Rather
   pool, proportional split under scarcity, forced turn-limit ties).
2. **Turn-loop state machine** (`useBattle.ts`): extend state, loop
   `chooseAction` through reveal → resolve → check-win → next turn or
   result. Re-verify timer/double-submit guards hold under looping.
3. **Poll meter UI** (`Battle.tsx`): five-bucket meter, turn counter,
   per-turn feedback text, updated result screen (final split + win type).
4. **Verification pass**: full 5-turn playthroughs across lopsided/mirrored
   stat combos to sanity-check `K` pacing; confirm early majority wins,
   turn-limit wins, and ties all resolve correctly; `tsc`/`build` clean.

### Open TODOs

- Reward differential between majority vs. turn-limit win (see Part 3).
- `K = 6` is an unverified starting guess — expect retuning in step 4.
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
