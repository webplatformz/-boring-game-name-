import { expect, test, type Locator, type Page } from '@playwright/test'

const SAVE_KEY = 'bundeshaus-pack-v1'

async function openApp(page: Page, save: Record<string, unknown>) {
  await page.addInitScript(() => {
    localStorage.setItem('bundeshaus-disclaimer-v1', 'acknowledged')
    localStorage.setItem('bundeshaus-language-v1', 'en')
  })
  await page.goto('/')
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: SAVE_KEY, value: save },
  )
  await page.reload()
}

function statValue(stats: Locator, label: string, value: string) {
  return stats.getByText(label, { exact: true }).locator('..').getByText(value, { exact: true })
}

test('loads legacy saves with zero opening stats on Home and Collection', async ({ page }) => {
  await openApp(page, { packs: 10, owned: {}, refillAt: null })

  const homeStats = page.getByRole('group', { name: 'PACK OPENING STATS' })
  await expect(statValue(homeStats, 'CARDS REVEALED', '0')).toBeVisible()
  await expect(statValue(homeStats, 'PACKS OPENED', '0')).toBeVisible()

  await page.getByRole('button', { name: 'COLLECTION', exact: true }).click()
  const collectionStats = page.getByRole('group', { name: 'PACK OPENING STATS' })
  await expect(statValue(collectionStats, 'CARDS REVEALED', '0')).toBeVisible()
  await expect(statValue(collectionStats, 'PACKS OPENED', '0')).toBeVisible()
})

test('Skip all counts every card and one pack, persists, and renders below the trade ad', async ({ page }) => {
  await openApp(page, {
    packs: 10,
    owned: {},
    cardsRevealed: 7,
    packsOpened: 2,
    refillAt: null,
  })

  await page.getByRole('button', { name: 'Rip open a pack' }).click()
  await expect(page.getByText('CARD 1 / 5')).toBeVisible({ timeout: 3_000 })
  await page.getByRole('button', { name: 'SKIP ALL →' }).click()

  const homeStats = page.getByRole('group', { name: 'PACK OPENING STATS' })
  await expect(statValue(homeStats, 'CARDS REVEALED', '12')).toBeVisible()
  await expect(statValue(homeStats, 'PACKS OPENED', '3')).toBeVisible()

  const collectionTile = page.getByRole('button', { name: 'Open the collection' })
  const tradeTile = page.getByText('CARD DUPLICATES?', { exact: true }).locator('..').locator('..')
  const [collectionBox, tradeBox, statsBox] = await Promise.all([
    collectionTile.boundingBox(),
    tradeTile.boundingBox(),
    homeStats.boundingBox(),
  ])
  const collectionToTradeGap = (tradeBox?.y ?? 0) - ((collectionBox?.y ?? 0) + (collectionBox?.height ?? 0))
  const tradeToStatsGap = (statsBox?.y ?? 0) - ((tradeBox?.y ?? 0) + (tradeBox?.height ?? 0))
  expect(tradeToStatsGap).toBeCloseTo(collectionToTradeGap, 0)
  expect(statsBox?.width).toBeCloseTo(collectionBox?.width ?? 0, 0)

  const tileStyles = await Promise.all(
    [collectionTile, tradeTile, homeStats].map((locator) =>
      locator.evaluate((element) => {
        const style = getComputedStyle(element)
        return [style.backgroundColor, style.borderTopColor, style.borderRadius]
      }),
    ),
  )
  expect(tileStyles[1]).toEqual(tileStyles[0])
  expect(tileStyles[2]).toEqual(tileStyles[0])

  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), SAVE_KEY)
  expect(stored).toMatchObject({ cardsRevealed: 12, packsOpened: 3, packs: 9 })

  await page.reload()
  const reloadedStats = page.getByRole('group', { name: 'PACK OPENING STATS' })
  await expect(statValue(reloadedStats, 'CARDS REVEALED', '12')).toBeVisible()
  await expect(statValue(reloadedStats, 'PACKS OPENED', '3')).toBeVisible()

  await page.getByRole('button', { name: 'COLLECTION', exact: true }).click()
  const collectionStats = page.getByRole('group', { name: 'PACK OPENING STATS' })
  await expect(statValue(collectionStats, 'CARDS REVEALED', '12')).toBeVisible()
  await expect(statValue(collectionStats, 'PACKS OPENED', '3')).toBeVisible()
})
