import { expect, test, type Page } from '@playwright/test'

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
      if (deterministic) Math.random = () => 0
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
  await page.getByRole('button', { name: 'COLLECTION', exact: true }).click()
  await page.waitForTimeout(3_000)

  await page.getByRole('button', { name: 'DEBATE', exact: true }).click()
  await expect(page.getByText('CHOOSE YOUR DEBATER', { exact: true })).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('bundeshaus-battle-v1')))
    .toBeNull()
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
  expect(opponentBox?.width).toBeLessThanOrEqual(125)
  expect(playerBox?.width).toBeLessThanOrEqual(125)
  expect(pollBox?.width).toBeLessThanOrEqual(320)
  expect(horizontalOverflow).toBeLessThanOrEqual(0)
})
