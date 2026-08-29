# Achievements

Achievements are split into three difficulty tiers. The tier determines the number of bonus packs awarded:

| Tier | Reward |
| --- | ---: |
| Bronze | 1 bonus pack |
| Silver | 3 bonus packs |
| Gold | 5 bonus packs |

Most achievements unlock once. Achievements marked **Repeatable** award their tier reward whenever the next
threshold is reached. Their lifetime progress does not reset, except that streak progress resets when the streak
breaks. The UI should show both the number of completions and progress toward the next reward.

Achievements are linked only from the Home screen, next to the stats panel (not in the tab bar), and display a
toast when they grant a reward. Selecting the toast should open the achievement list and navigate to the
corresponding achievement.

## Collection

| Achievement | Tier | Repeatable | Requirement |
| --- | --- | --- | --- |
| **First Pull** | Bronze | No | Open your first pack |
| **Collector 50** | Bronze | No | Own 50 unique members |
| **Collector 100** | Silver | No | Own 100 unique members |
| **Collector All 246** | Gold | No | Own every member |
| **State Council Complete** | Silver | No | Own all 46 State Councillors (SR) |
| **National Council Complete** | Gold | No | Own all 200 National Councillors (NR) |
| **Federal Council Complete** | Gold | No | Own all 7 Federal Councillors (BR) |
| **Rainbow** | Gold | No | Own at least one card of every rarity (common through mythic) |
| **Cantonal Coverage** | Silver | No | Own a member from every canton |
| **Party Party** | Silver | No | Own a member from every party |
| **Bottomless** | Silver | No | Own 1,000 cards |

## Pack opening

Only regular packs count toward pack-opening achievements. Trade-in packs are tracked by trading achievements
instead.

| Achievement | Tier | Repeatable | Requirement |
| --- | --- | --- | --- |
| **Pack Opener 10** | Bronze | No | Open 10 regular packs |
| **Pack Opener 100** | Silver | Yes | Open another 100 regular packs; rewards at 100, 200, 300, and so on |
| **Pack Opener 1000** | Gold | No | Open 1,000 regular packs |

The former card-reveal milestones are retired because regular packs contain five cards, making them duplicates
of the pack-opening milestones.

## Trading

| Achievement | Tier | Repeatable | Requirement |
| --- | --- | --- | --- |
| **First Trade** | Bronze | No | Complete your first trade-in |
| **Trade Expert** | Bronze | No | Complete 10 trade-ins |
| **Trade Veteran** | Silver | Yes | Complete another 100 trade-ins; rewards at 100, 200, 300, and so on |
| **Trade Master** | Gold | No | Complete 1,000 trade-ins |
| **Across the Aisle** | Gold | No | Complete a trade-in from every eligible source rarity |

## Debate

Single random debates remain a reward-free training mode. Their achievements
grant the normal tier bonus packs, but the debates themselves do not grant
campaign rewards.

| Achievement | Tier | Repeatable | Requirement |
| --- | --- | --- | --- |
| **First Debate** | Bronze | No | Finish one single random debate |
| **Seasoned Debater** | Silver | Yes | Win another 50 single random debates; rewards at 50, 100, 150, and so on |

## Campaign

| Achievement | Tier | Repeatable | Requirement |
| --- | --- | --- | --- |
| **Safe Hands** | Bronze | No | Bank campaign rewards for the first time |
| **Upset Victory** | Silver | No | Win a campaign duel against a card of a higher rarity than the player's card |
| **Mandate Secured** | Gold | No | Complete all six campaign stages through Mythic |
| **Exit Strategy** | Gold | No | Bank after every possible exit rarity: Common, Uncommon, Rare, Ultra Rare, and Legend |
| **Campaign Treasury** | Silver | No | Earn 100 packs from campaign rewards |
| **On the Campaign Trail** | Bronze | Yes | Start and conclude another 50 campaigns; rewards at 50, 100, 150, and so on |

**On the Campaign Trail** advances only when a campaign ends by banking,
losing a duel, or completing Mythic. Abandoned campaigns do not count. Although
the achievement describes campaigns started, progress is recorded when each
qualifying campaign concludes so abandonment can be excluded reliably.

**Upset Victory** is evaluated when a winning campaign duel is durably
committed. Comparing the two cards' rarity ranks at that point avoids an
additional lifetime campaign statistic; only the normal unlocked achievement
state is persisted.

## Streaks

Opening at least one pack on a local calendar day advances the streak once. Missing a day resets the current
streak.

| Achievement | Tier | Repeatable | Requirement |
| --- | --- | --- | --- |
| **7-Day Pack Streak** | Bronze | Yes | Maintain a continuous streak; rewards on days 7, 14, 21, and so on |
| **30-Day Pack Streak** | Silver | No | Open a pack on 30 consecutive days |
| **100-Day Pack Streak** | Gold | No | Open a pack on 100 consecutive days |

## Various / Hidden

Hidden achievements are not shown in the UI until they are achieved.

| Achievement | Tier | Repeatable | Requirement |
| --- | --- | --- | --- |
| **Law Student** | Bronze | No | Open all disclaimer and legal pages |
| **Killjoy** | Bronze | No | Click the contact email |
| **Multilingual** | Bronze | No | Select each language at least once |
| **Sleepless** | Silver | No | Open a pack between 3:00 and 3:59 local time |
| **Copy Room Accident** | Gold | No | Own 26 copies of the same card |
| **Mythic Hunter** | Gold | No | Pull a Mythic-rarity card directly from a regular pack |
| **Perfectly Mixed** | Gold | No | Open a regular pack containing five different rarities |
| **Full Mobilisation** | Bronze | No | Own at least five cards and have no campaign-ready owned copies remaining before the next local exhaustion reset |

**Full Mobilisation** is evaluated from the owned-copy counts and current
campaign exhaustion records. It remains hidden because displaying its progress
would encourage players to exhaust cards purely to fill an achievement meter.

## Repeatable achievement rules

- A repeatable achievement grants its reward once for every newly crossed threshold.
- Crossing several thresholds before evaluation grants every missed reward exactly once.
- Lifetime counters are never reset after a payout.
- A broken streak resets current streak progress but does not remove earlier payouts.
- One-time achievements may unlock alongside repeatable achievements at the same milestone. For example, the
  1,000th regular pack grants both **Pack Opener 100**'s tenth payout and **Pack Opener 1000**.
- Existing players receive any one-time achievements and repeatable completions already earned by their persisted
  counters when the new system is introduced.
