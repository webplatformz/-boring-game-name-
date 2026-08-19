import { expect, test, type Page } from '@playwright/test'

async function openApp(page: Page, save: Record<string, unknown>) {
  await page.addInitScript(() => {
    localStorage.setItem('bundeshaus-disclaimer-v1', 'acknowledged')
    localStorage.setItem('bundeshaus-language-v1', 'en')
  })
  await page.goto('/')
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: 'bundeshaus-pack-v1', value: save },
  )
  await page.reload()
}

test('opening the first pack unlocks First Pull, shows a toast, and grants a bonus pack', async ({ page }) => {
  await openApp(page, { packs: 10, owned: {}, cardsRevealed: 0, packsOpened: 0, refillAt: null })

  await page.getByRole('button', { name: 'Rip open a pack' }).click()
  await expect(page.getByText('CARD 1 / 5')).toBeVisible({ timeout: 3_000 })
  await page.getByRole('button', { name: 'SKIP ALL →' }).click()

  const toast = page.getByRole('status')
  await expect(toast).toBeVisible()
  await expect(toast).toContainText('ACHIEVEMENT UNLOCKED')
  await expect(toast).toContainText('First Pull')
  await expect(toast).toContainText('+1 PACK')

  // Opening 1 pack costs 1, the achievement reward grants 1 back — net unchanged.
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bundeshaus-pack-v1')!))
  expect(stored).toMatchObject({ packs: 10, packsOpened: 1 })

  await page.getByLabel('Open achievements').click()
  const achievementsPage = page.getByRole('main')
  await expect(achievementsPage.getByText('ACHIEVEMENTS', { exact: true })).toBeVisible()
  await expect(achievementsPage.getByText('1 OF 25 UNLOCKED')).toBeVisible()
  await expect(achievementsPage.getByText('First Pull', { exact: true })).toBeVisible()
})

test('a legacy save that already qualifies for an achievement grants exactly one bonus pack, not two', async ({ page }) => {
  // Regression test: React StrictMode double-invokes mount effects in dev, and
  // the achievement-unlock effect used to grant bonus packs for every
  // invocation instead of once per achievement (see markAchievementsUnlocked).
  await openApp(page, { packs: 10, owned: {}, cardsRevealed: 5, packsOpened: 1, refillAt: null })

  const toast = page.getByRole('status')
  await expect(toast).toBeVisible()
  await expect(page.getByRole('status')).toHaveCount(1)

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bundeshaus-pack-v1')!))
  expect(stored).toMatchObject({ packs: 11 })

  const achievements = await page.evaluate(() => JSON.parse(localStorage.getItem('bundeshaus-achievements-v1')!))
  expect(Object.keys(achievements.unlocked)).toEqual(['first-pull'])
})

test('an achievement pack does not reset an independent refill timer', async ({ page }) => {
  // The player was out of packs with a refill already due when the "First Pull"
  // achievement fired. Loading grants the automatic pack and the achievement
  // adds another pack without cancelling the next automatic refill.
  await page.addInitScript(() => {
    localStorage.setItem('bundeshaus-disclaimer-v1', 'acknowledged')
    localStorage.setItem('bundeshaus-language-v1', 'en')
  })
  await page.goto('/')
  await page.evaluate(() =>
    localStorage.setItem(
      'bundeshaus-pack-v1',
      JSON.stringify({ packs: 0, owned: {}, cardsRevealed: 5, packsOpened: 1, refillAt: Date.now() + 300 }),
    ),
  )
  await page.reload()

  await expect(page.getByRole('status')).toBeVisible()

  // The due automatic refill and the achievement reward should both remain.
  await page.waitForTimeout(1_500)

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bundeshaus-pack-v1')!))
  expect(stored.packs).toBe(2)
  expect(stored.refillAt).toBeGreaterThan(Date.now())
})
