import { expect, test, type Page } from '@playwright/test'

declare global {
  interface Window {
    __debateRandomCalls: number
  }
}

const OWNED_MEMBER_ID = 4053

async function seedOwnedCard(page: Page, deterministic = false) {
  await page.addInitScript(
    ({ memberId, deterministic }) => {
      localStorage.setItem('bundeshaus-disclaimer-v1', 'acknowledged')
      localStorage.setItem('bundeshaus-language-v1', 'en')
      localStorage.setItem(
        'bundeshaus-achievements-v1',
        JSON.stringify({ unlocked: { 'first-pull': Date.now() } }),
      )
      localStorage.setItem(
        'bundeshaus-pack-v1',
        JSON.stringify({
          packs: 10,
          owned: { [memberId]: 1 },
          cardsRevealed: 1,
          packsOpened: 1,
          refillAt: null,
        }),
      )
      if (deterministic) {
        window.__debateRandomCalls = 0
        Math.random = () => {
          window.__debateRandomCalls += 1
          return 0
        }
      }
    },
    { memberId: OWNED_MEMBER_ID, deterministic },
  )
  await page.goto('/')
}

async function startTrainingDebate(page: Page) {
  await page.getByText('Thomas Aeschi', { exact: true }).click()
  await page
    .getByRole('button', { name: /SINGLE RANDOM DEBATE/ })
    .click()
}

test('selecting a card asks for the debate mode before matchmaking', async ({ page }) => {
  await seedOwnedCard(page)
  await page.getByRole('button', { name: 'DEBATE', exact: true }).click()
  await page.getByText('Thomas Aeschi', { exact: true }).click()

  await expect(page.getByText('CHOOSE DEBATE MODE', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('button', { name: /SINGLE RANDOM DEBATE/ }),
  ).toBeEnabled()
  await expect(
    page.getByRole('button', { name: /START A CAMPAIGN/ }),
  ).toBeEnabled()

  await page.getByRole('button', { name: '← CHOOSE ANOTHER CARD' }).click()
  await expect(page.getByText('CHOOSE YOUR DEBATER', { exact: true })).toBeVisible()
})

test('a campaign starts at common and resumes after leaving Debate', async ({
  page,
}) => {
  await seedOwnedCard(page, true)
  await page.getByRole('button', { name: 'DEBATE', exact: true }).click()
  await page.getByText('Thomas Aeschi', { exact: true }).click()
  await page.getByRole('button', { name: /START A CAMPAIGN/ }).click()

  await expect(page.getByText('STAGE 1/6 · COMMON')).toBeVisible()
  await expect(page.getByRole('button', { name: 'ATTACK', exact: true })).toBeEnabled()
  const campaignId = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('bundeshaus-pack-v1')!)
    return save.campaign.id as string
  })

  await page.getByRole('button', { name: 'CARDS', exact: true }).click()
  await page.getByRole('button', { name: 'DEBATE', exact: true }).click()

  await expect(page.getByText('STAGE 1/6 · COMMON')).toBeVisible()
  await expect(page.getByRole('button', { name: 'ATTACK', exact: true })).toBeEnabled()
  await expect
    .poll(() =>
      page.evaluate(() => {
        const save = JSON.parse(localStorage.getItem('bundeshaus-pack-v1')!)
        return save.campaign.id as string
      }),
    )
    .toBe(campaignId)
})

test('banking a won campaign stage awards packs and exhausts one copy', async ({
  page,
}) => {
  await page.addInitScript(({ playerId }) => {
    localStorage.setItem('bundeshaus-disclaimer-v1', 'acknowledged')
    localStorage.setItem('bundeshaus-language-v1', 'en')
    localStorage.setItem(
      'bundeshaus-achievements-v1',
      JSON.stringify({ unlocked: { 'first-pull': Date.now() } }),
    )
    localStorage.setItem(
      'bundeshaus-pack-v1',
      JSON.stringify({
        packs: 10,
        owned: { [playerId]: 1 },
        cardsRevealed: 1,
        packsOpened: 1,
        regularPacksOpened: 1,
        refillAt: null,
        campaign: {
          version: 1,
          id: 'bank-test',
          playerId,
          stageIndex: 0,
          phase: 'awaiting-choice',
          unbankedPacks: 1,
          duel: {
            version: 1,
            playerId,
            opponentId: 4296,
            phase: 'settled',
            poll: {
              firmPlayer: 51,
              ratherPlayer: 0,
              undecided: 49,
              ratherOpponent: 0,
              firmOpponent: 0,
            },
            playerAction: 'attack',
            oppAction: 'attack',
            lastTurn: {
              pollBefore: {
                firmPlayer: 0,
                ratherPlayer: 12,
                undecided: 88,
                ratherOpponent: 0,
                firmOpponent: 0,
              },
              poll: {
                firmPlayer: 51,
                ratherPlayer: 0,
                undecided: 49,
                ratherOpponent: 0,
                firmOpponent: 0,
              },
              playerAction: 'attack',
              oppAction: 'attack',
            },
            turn: 1,
            winner: { winner: 'player', majority: true },
          },
        },
      }),
    )
  }, { playerId: OWNED_MEMBER_ID })
  await page.goto('/')
  await page.getByRole('button', { name: 'DEBATE', exact: true }).click()

  await expect(page.getByText('YOU WON!', { exact: true })).toBeVisible()
  await expect(page.getByTestId('debate-poll')).toBeVisible()
  await expect(page.getByTestId('debate-card-player')).toBeVisible()
  await expect(page.getByTestId('debate-card-opponent')).toBeVisible()
  await expect(page.getByRole('button', { name: 'KEEP GOING' })).toBeVisible()
  await page.getByRole('button', { name: 'BANK & END' }).click()
  await expect(page.getByText('REWARDS BANKED')).toBeVisible()
  await expect(page.getByTestId('debate-card-player')).toBeVisible()
  await expect(page.getByRole('button', { name: 'DONE' })).toBeVisible()

  const save = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('bundeshaus-pack-v1')!),
  )
  // One campaign pack plus the Bronze Safe Hands achievement reward.
  expect(save.packs).toBe(12)
  expect(save.campaign).toBeNull()
  expect(save.debateExhaustion[OWNED_MEMBER_ID].count).toBe(1)
  expect(save.campaignRecord.campaignsBanked).toBe(1)
  expect(save.campaignRecord.packsAwarded).toBe(1)
})

test('resuming a locked campaign turn skips interrupted animations safely', async ({
  page,
}) => {
  await page.addInitScript(({ playerId }) => {
    localStorage.setItem('bundeshaus-disclaimer-v1', 'acknowledged')
    localStorage.setItem('bundeshaus-language-v1', 'en')
    localStorage.setItem(
      'bundeshaus-pack-v1',
      JSON.stringify({
        packs: 10,
        owned: { [playerId]: 1 },
        cardsRevealed: 1,
        packsOpened: 1,
        regularPacksOpened: 1,
        refillAt: null,
        campaign: {
          version: 1,
          id: 'resume-locked-test',
          playerId,
          stageIndex: 0,
          phase: 'in-duel',
          unbankedPacks: 0,
          duel: {
            version: 1,
            playerId,
            opponentId: 4296,
            phase: 'actions-locked',
            poll: {
              firmPlayer: 0,
              ratherPlayer: 12,
              undecided: 88,
              ratherOpponent: 0,
              firmOpponent: 0,
            },
            playerAction: 'defend',
            oppAction: 'attack',
            lastTurn: null,
            turn: 1,
            winner: null,
          },
        },
      }),
    )
  }, { playerId: OWNED_MEMBER_ID })
  await page.goto('/')
  await page.getByRole('button', { name: 'DEBATE', exact: true }).click()

  await expect(page.getByTestId('debate-poll')).toContainText('TURN 2 / 5')
  await expect(page.getByRole('button', { name: 'ATTACK', exact: true })).toBeEnabled()
  const campaign = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('bundeshaus-pack-v1')!).campaign,
  )
  expect(campaign.duel.phase).toBe('awaiting-action')
  expect(campaign.duel.turn).toBe(2)
  expect(campaign.duel.lastTurn.playerAction).toBe('defend')
  expect(campaign.duel.lastTurn.oppAction).toBe('attack')
})

test('leaving Debate cancels the active turn and returns to the picker', async ({ page }) => {
  await seedOwnedCard(page)

  await page.getByRole('button', { name: 'DEBATE', exact: true }).click()
  await startTrainingDebate(page)
  await page.getByRole('button', { name: 'ATTACK', exact: true }).click()
  await page.getByRole('button', { name: 'CARDS', exact: true }).click()
  await page.waitForTimeout(3_000)

  await page.getByRole('button', { name: 'DEBATE', exact: true }).click()
  await expect(page.getByText('CHOOSE YOUR DEBATER', { exact: true })).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('bundeshaus-battle-v2')))
    .toBeNull()
})

test('leaving during a revealed turn prevents delayed record persistence', async ({ page }) => {
  await seedOwnedCard(page, true)

  await page.getByRole('button', { name: 'DEBATE', exact: true }).click()
  await startTrainingDebate(page)
  await page.getByRole('button', { name: 'ATTACK', exact: true }).click()
  await expect(page.getByTestId('debate-feedback')).not.toBeEmpty({
    timeout: 2_000,
  })
  await page.getByRole('button', { name: 'CARDS', exact: true }).click()
  await page.waitForTimeout(2_500)

  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('bundeshaus-battle-v2')))
    .toBeNull()
  await page.getByRole('button', { name: 'DEBATE', exact: true }).click()
  await expect(page.getByText('CHOOSE YOUR DEBATER', { exact: true })).toBeVisible()
  await startTrainingDebate(page)
  await expect(page.getByRole('button', { name: 'ATTACK', exact: true })).toBeEnabled()
})

test('Debate starts a fresh v2 record instead of classifying legacy wins', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'bundeshaus-battle-v1',
      JSON.stringify({ wins: 12, losses: 4 }),
    )
  })
  await seedOwnedCard(page)

  await page.getByRole('button', { name: 'DEBATE', exact: true }).click()
  await expect(page.getByText('0W', { exact: true })).toBeVisible()
  await expect(page.getByText('0L', { exact: true })).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('bundeshaus-battle-v1')))
    .not.toBeNull()
})

test('Debate derives total wins and rejects malformed v2 counters', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'bundeshaus-battle-v2',
      JSON.stringify({
        wins: 99,
        losses: -1,
        majorityWins: 2.5,
        turnLimitWins: 3,
      }),
    )
  })
  await seedOwnedCard(page)

  await page.getByRole('button', { name: 'DEBATE', exact: true }).click()
  await expect(page.getByText('3W', { exact: true })).toBeVisible()
  await expect(page.getByText('0L', { exact: true })).toBeVisible()
})

test('Debate reveals poll movement and automatically advances the turn', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 667 })
  await seedOwnedCard(page, true)

  await page.getByRole('button', { name: 'DEBATE', exact: true }).click()
  await startTrainingDebate(page)

  const poll = page.getByTestId('debate-poll')
  const pollTrack = page.getByTestId('poll-track')
  const pollMidpoint = page.getByTestId('poll-midpoint')
  const opponentCard = page.getByTestId('debate-card-opponent')
  const playerCard = page.getByTestId('debate-card-player')
  await expect(poll).toContainText('TURN 1 / 5')
  await expect(opponentCard.getByText('?', { exact: true })).toHaveCount(0)
  const [trackBox, midpointBox] = await Promise.all([
    pollTrack.boundingBox(),
    pollMidpoint.boundingBox(),
  ])
  expect((midpointBox?.x ?? 0) + (midpointBox?.width ?? 0) / 2).toBeCloseTo(
    (trackBox?.x ?? 0) + (trackBox?.width ?? 0) / 2,
    0,
  )
  const pollHeightBefore = (await poll.boundingBox())?.height
  const undecidedBefore = await poll.locator('[data-bucket="undecided"]').evaluate(
    (element) => element.getAttribute('style'),
  )

  await page.getByRole('button', { name: 'ATTACK', exact: true }).click()
  await expect(poll.getByText('ATTACKED', { exact: true })).toHaveCount(0)
  await expect(page.getByTestId('debate-feedback')).toContainText(
    /(?:Both attacks recruited support in proportion to ATK|Equal ATK split the available undecided voters)\./,
    { timeout: 2_000 },
  )
  const overflowBoundary = await page.evaluate(() => {
    const fightRow = document.querySelector(
      '[data-testid="debate-fight-row"]',
    )
    const arena = fightRow?.parentElement
    const screen = document.querySelector('[data-testid="debate-screen"]')
    return {
      arenaX: arena ? getComputedStyle(arena).overflowX : null,
      arenaY: arena ? getComputedStyle(arena).overflowY : null,
      screenX: screen ? getComputedStyle(screen).overflowX : null,
      screenY: screen ? getComputedStyle(screen).overflowY : null,
    }
  })
  expect(overflowBoundary).toEqual({
    arenaX: 'visible',
    arenaY: 'visible',
    screenX: 'clip',
    screenY: 'clip',
  })
  await expect(poll.getByText('ATTACKED', { exact: true })).toHaveCount(2)
  expect((await poll.boundingBox())?.height).toBeCloseTo(pollHeightBefore ?? 0, 0)
  await expect(page.getByTestId('poll-deltas').locator('span')).not.toHaveCount(0)
  await expect
    .poll(() =>
      poll.locator('[data-bucket="undecided"]').evaluate(
        (element) => element.getAttribute('style'),
      ),
    )
    .not.toBe(undecidedBefore)
  await expect(poll).toContainText('TURN 2 / 5', { timeout: 4_000 })
  await expect(page.getByTestId('debate-feedback')).toContainText(
    /(?:Both attacks recruited support in proportion to ATK|Equal ATK split the available undecided voters)\./,
  )
  await expect(poll.getByText('ATTACKED', { exact: true })).toHaveCount(0)
  expect((await poll.boundingBox())?.height).toBeCloseTo(pollHeightBefore ?? 0, 0)

  const [opponentBox, playerBox, pollBox, horizontalOverflow] = await Promise.all([
    opponentCard.boundingBox(),
    playerCard.boundingBox(),
    poll.boundingBox(),
    page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ])
  expect(opponentBox?.width).toBeLessThanOrEqual(165)
  expect(playerBox?.width).toBeLessThanOrEqual(165)
  expect(pollBox?.width).toBeLessThanOrEqual(320)
  expect(horizontalOverflow).toBeLessThanOrEqual(0)
})

test('Debate ignores a repeated action submission in the same event loop', async ({ page }) => {
  await seedOwnedCard(page, true)
  await page.getByRole('button', { name: 'DEBATE', exact: true }).click()
  await startTrainingDebate(page)

  const randomCallsBefore = await page.evaluate(
    () => window.__debateRandomCalls,
  )
  await page.getByRole('button', { name: 'ATTACK', exact: true }).evaluate((button) => {
    const actionButton = button as HTMLButtonElement
    actionButton.click()
    actionButton.click()
  })
  await expect(page.getByTestId('debate-feedback')).not.toBeEmpty({
    timeout: 2_000,
  })
  const randomCallsAfter = await page.evaluate(
    () => window.__debateRandomCalls,
  )

  expect(randomCallsAfter - randomCallsBefore).toBe(1)
  await expect(page.getByTestId('debate-poll')).toContainText('TURN 2 / 5', {
    timeout: 4_000,
  })
})
