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

test('a bonus pack granted while a refill cooldown is pending is not wiped out once the cooldown elapses', async ({ page }) => {
  // Regression test: the player was out of packs (0) with a refill cooldown
  // already running when the "First Pull" achievement fired and granted a
  // bonus pack, bringing packs to 1. The cooldown effect used to unconditionally
  // reset packs to a flat STARTING_PACKS once it elapsed, silently discarding
  // that bonus pack instead of leaving it in place.
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

  // The bonus grant should have already cleared the cooldown; wait well past
  // the point where the (now-stale) refill timer would otherwise have fired.
  await page.waitForTimeout(1_500)

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bundeshaus-pack-v1')!))
  expect(stored).toMatchObject({ packs: 1, refillAt: null })
})
