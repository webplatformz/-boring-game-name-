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

test('leaving Debate cancels the active turn and returns to the picker', async ({ page }) => {
  await seedOwnedCard(page)

  await page.getByRole('button', { name: 'DEBATE', exact: true }).click()
  await page.getByText('Thomas Aeschi', { exact: true }).click()
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
  await page.getByText('Thomas Aeschi', { exact: true }).click()
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
  await page.getByText('Thomas Aeschi', { exact: true }).click()
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
  await page.getByText('Thomas Aeschi', { exact: true }).click()

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
  await page.getByText('Thomas Aeschi', { exact: true }).click()

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
