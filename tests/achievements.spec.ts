import { expect, test, type Page } from '@playwright/test'

async function openApp(page: Page, save: Record<string, unknown>, achievementProgress?: Record<string, unknown>) {
  await page.addInitScript(() => {
    localStorage.setItem('bundeshaus-disclaimer-v1', 'acknowledged')
    localStorage.setItem('bundeshaus-language-v1', 'en')
  })
  await page.goto('/')
  await page.evaluate(
    ({ saveValue, achievementValue }) => {
      localStorage.setItem('bundeshaus-pack-v1', JSON.stringify(saveValue))
      if (achievementValue) localStorage.setItem('bundeshaus-achievements-v1', JSON.stringify(achievementValue))
    },
    { saveValue: save, achievementValue: achievementProgress },
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

  await toast.getByRole('button').click()
  await expect(page).toHaveURL(/#achievements$/)
  const achievementsPage = page.getByRole('main')
  await expect(achievementsPage.getByText('ACHIEVEMENTS', { exact: true })).toBeVisible()
  await expect(achievementsPage.getByText('1 OF 30 UNLOCKED')).toBeVisible()
  await expect(achievementsPage.getByText('First Pull', { exact: true })).toBeVisible()
  await expect(page.locator('#achievement-first-pull')).toBeFocused()
  await page.getByRole('button', { name: '← BACK TO GAME' }).click()
  await page.getByLabel('Open achievements').click()
  await expect(page.locator('#achievement-first-pull')).not.toBeFocused()
})

test('migrates historical pack progress and grants every missed repeat reward once', async ({ page }) => {
  await openApp(
    page,
    { packs: 10, owned: {}, cardsRevealed: 1250, packsOpened: 250, refillAt: null },
    { unlocked: { 'first-pull': 1, 'pack-opener-10': 1 } },
  )

  const toast = page.getByRole('status')
  await expect(toast).toContainText('Pack Opener Pro')
  await expect(toast).toContainText('+6 PACKS')

  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('bundeshaus-pack-v1')!))
  expect(save).toMatchObject({ packs: 16, regularPacksOpened: 250 })

  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('bundeshaus-achievements-v1')!))
  expect(progress).toMatchObject({
    schemaVersion: 2,
    repeatCompletions: { 'pack-opener-100': 2 },
    repeatCycleCompletions: { 'pack-opener-100': 2 },
  })

  await toast.getByRole('button').click()
  const achievement = page.locator('#achievement-pack-opener-100')
  await expect(achievement).toBeFocused()
  await expect(achievement.locator('[data-icon="repeat"]')).toBeVisible()
  await expect(achievement).toContainText('COMPLETED 2×')
  await expect(achievement).toContainText('50 / 100')
})

test('grants repeat and one-time rewards together at the 1,000-pack milestone', async ({ page }) => {
  await openApp(
    page,
    { packs: 10, owned: {}, cardsRevealed: 5000, packsOpened: 1000, regularPacksOpened: 1000, refillAt: null },
    { unlocked: { 'first-pull': 1, 'pack-opener-10': 1 } },
  )

  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('bundeshaus-pack-v1')!))
  expect(save.packs).toBe(45)

  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('bundeshaus-achievements-v1')!))
  expect(progress.unlocked).toHaveProperty('pack-opener-1000')
  expect(progress.repeatCompletions['pack-opener-100']).toBe(10)
})

test('a broken streak resets only its current reward cycle', async ({ page }) => {
  await openApp(
    page,
    { packs: 10, owned: {}, cardsRevealed: 0, packsOpened: 0, regularPacksOpened: 0, refillAt: null },
    {
      unlocked: { 'first-pull': 1, 'daily-login-7': 1 },
      repeatCompletions: { 'daily-login-7': 2 },
      repeatCycleCompletions: { 'daily-login-7': 2 },
      streakCurrent: 14,
      streakBest: 14,
      streakLastDate: '2000-01-01',
    },
  )

  const streakProgress = await page.evaluate(() => JSON.parse(localStorage.getItem('bundeshaus-achievements-v1')!))
  expect(streakProgress).toMatchObject({
    streakCurrent: 0,
    repeatCompletions: { 'daily-login-7': 2 },
    repeatCycleCompletions: { 'daily-login-7': 0 },
  })

  await page.getByRole('button', { name: 'Rip open a pack' }).click()
  await expect(page.getByText('CARD 1 / 5')).toBeVisible({ timeout: 3_000 })
  await page.getByRole('button', { name: 'SKIP ALL →' }).click()
  await expect.poll(async () => {
    const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('bundeshaus-achievements-v1')!))
    return {
      streakCurrent: progress.streakCurrent,
      total: progress.repeatCompletions['daily-login-7'],
      cycle: progress.repeatCycleCompletions['daily-login-7'],
    }
  }).toEqual({ streakCurrent: 1, total: 2, cycle: 0 })
})

test('unlocks the two new achievements from their persisted event progress', async ({ page }) => {
  await openApp(
    page,
    { packs: 10, owned: {}, cardsRevealed: 0, packsOpened: 0, regularPacksOpened: 0, refillAt: null },
    {
      unlocked: {},
      tradeSourceRarities: ['common', 'uncommon', 'rare', 'ultra', 'legend'],
      perfectlyMixedTriggered: true,
    },
  )

  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('bundeshaus-pack-v1')!))
  expect(save.packs).toBe(20)
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('bundeshaus-achievements-v1')!))
  expect(progress.unlocked).toHaveProperty('across-the-aisle')
  expect(progress.unlocked).toHaveProperty('perfectly-mixed')
})

test('unlocks persisted debate and campaign achievements with repeat thresholds', async ({
  page,
}) => {
  const resetAt = Date.now() + 60_000
  await openApp(page, {
    packs: 10,
    owned: { 4053: 5 },
    cardsRevealed: 0,
    packsOpened: 0,
    regularPacksOpened: 0,
    refillAt: null,
    debateExhaustion: { 4053: { count: 5, resetAt } },
    campaignRecord: {
      campaignsStarted: 100,
      campaignsBanked: 1,
      campaignsLost: 51,
      campaignsAbandoned: 1,
      campaignsCompleted: 1,
      packsAwarded: 100,
      stageWins: {
        common: 1,
        uncommon: 1,
        rare: 1,
        ultra: 1,
        legend: 1,
        mythic: 1,
      },
      stageLosses: {
        common: 50,
        uncommon: 0,
        rare: 0,
        ultra: 0,
        legend: 0,
        mythic: 0,
      },
      bankExits: {
        common: 1,
        uncommon: 1,
        rare: 1,
        ultra: 1,
        legend: 1,
      },
    },
  })
  await page.evaluate(() => {
    localStorage.setItem(
      'bundeshaus-battle-v2',
      JSON.stringify({
        wins: 50,
        losses: 1,
        majorityWins: 50,
        turnLimitWins: 0,
      }),
    )
  })
  await page.reload()

  await expect
    .poll(async () => {
      const progress = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('bundeshaus-achievements-v1')!),
      )
      return {
        unlocked: [
          'first-debate',
          'seasoned-debater',
          'safe-hands',
          'mandate-secured',
          'exit-strategy',
          'campaign-treasury',
          'on-the-campaign-trail',
          'full-mobilisation',
        ].every((id) => id in progress.unlocked),
        debateRepeats: progress.repeatCompletions['seasoned-debater'],
        campaignRepeats: progress.repeatCompletions['on-the-campaign-trail'],
      }
    })
    .toEqual({
      unlocked: true,
      debateRepeats: 1,
      campaignRepeats: 1,
    })

  const save = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('bundeshaus-pack-v1')!),
  )
  expect(save.packs).toBe(30)
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

  // The achievement reward remains, and the due automatic interval adds one
  // pack without resetting the cadence.
  await page.waitForTimeout(1_500)

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bundeshaus-pack-v1')!))
  expect(stored.packs).toBe(2)
  expect(stored.refillAt).not.toBeNull()
})

test('an automatic refill never reduces a bonus-pack balance above its cap', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('bundeshaus-disclaimer-v1', 'acknowledged')
    localStorage.setItem('bundeshaus-language-v1', 'en')
    localStorage.setItem(
      'bundeshaus-pack-v1',
      JSON.stringify({
        packs: 0,
        owned: {},
        cardsRevealed: 5_000,
        packsOpened: 1_000,
        regularPacksOpened: 1_000,
        refillAt: Date.now() + 1_000,
      }),
    )
  })
  await page.goto('/')
  await expect(page.getByRole('status')).toBeVisible()

  const rewardedPacks = await page.evaluate(
    () => JSON.parse(localStorage.getItem('bundeshaus-pack-v1')!).packs,
  )
  expect(rewardedPacks).toBeGreaterThan(5)

  await page.waitForTimeout(1_500)
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('bundeshaus-pack-v1')!),
  )
  expect(stored.packs).toBe(rewardedPacks)
  expect(stored.refillAt).toBeNull()
})
