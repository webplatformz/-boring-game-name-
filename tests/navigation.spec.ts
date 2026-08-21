import { expect, test, type Page } from '@playwright/test'

async function openApp(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('bundeshaus-disclaimer-v1', 'acknowledged')
  })
  await page.goto('/')
}

test('keeps compact tab navigation in the header on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 900 })
  await openApp(page)

  const navigation = page.getByRole('navigation', { name: 'Primary' })
  const box = await navigation.boundingBox()
  expect(box?.y).toBe(0)
  expect(box?.height).toBeLessThan(55)
  await expect(page.getByRole('button', { name: 'PACKS' })).toHaveAttribute('aria-current', 'page')

  await page.getByRole('button', { name: 'DEBATE' }).click()
  await expect(page.getByRole('button', { name: 'DEBATE' })).toHaveAttribute('aria-current', 'page')
  await expect(navigation).toBeVisible()
})

test('uses one compact navigation row on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await openApp(page)

  const navigation = page.getByRole('navigation', { name: 'Primary' })
  const buttons = navigation.getByRole('button')
  const boxes = await buttons.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().toJSON()))

  expect((await navigation.boundingBox())?.height).toBeLessThan(55)
  expect(new Set(boxes.map((box) => Math.round(box.y))).size).toBe(1)
  expect(boxes.every((box) => box.width >= 70)).toBe(true)

  const navigationBottom = ((await navigation.boundingBox())?.y ?? 0) + ((await navigation.boundingBox())?.height ?? 0)
  await navigation.getByRole('button', { name: 'COLLECTION', exact: true }).click()
  await page.waitForTimeout(300)
  expect((await page.getByText('THE COLLECTION').boundingBox())?.y).toBeGreaterThanOrEqual(navigationBottom)
  const collection = await page.locator('.screen-fill').boundingBox()
  expect((collection?.y ?? 0) + (collection?.height ?? 801)).toBeLessThanOrEqual(801)

  await navigation.getByRole('button', { name: 'TRADE', exact: true }).click()
  await expect(page.getByText('CARD TRADE-IN')).toBeVisible()
  await page.waitForTimeout(300)
  const trade = await page.locator('.screen-fill').boundingBox()
  expect((trade?.y ?? 0) + (trade?.height ?? 801)).toBeLessThanOrEqual(801)
})

test('places the mobile Home footer after its content', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 667 })
  await openApp(page)
  await page.waitForTimeout(350)

  const footer = await page.getByRole('contentinfo', { name: 'Legal and data information' }).boundingBox()
  const stats = await page.getByRole('group', { name: 'PACK OPENING STATS' }).boundingBox()
  const ripButton = await page.getByRole('button', { name: 'RIP IT OPEN' }).boundingBox()

  expect(footer?.y).toBeGreaterThanOrEqual((stats?.y ?? 0) + (stats?.height ?? 0))
  expect(footer?.y).toBeGreaterThanOrEqual((ripButton?.y ?? 0) + (ripButton?.height ?? 0))
})

test('centres the mobile Best card modal in a viewport-wide overlay', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 667 })
  await page.addInitScript(() => {
    localStorage.setItem('bundeshaus-disclaimer-v1', 'acknowledged')
    localStorage.setItem(
      'bundeshaus-pack-v1',
      JSON.stringify({ packs: 10, owned: { 4053: 1 }, cardsRevealed: 1, packsOpened: 1, refillAt: null }),
    )
  })
  await page.goto('/')
  await page.getByRole('button', { name: /Show card for/ }).click()

  const overlay = page.locator('.card-modal-overlay')
  const card = page.locator('.card-modal-card')
  await expect(overlay).toBeVisible()
  await expect(card).toBeVisible()

  const overlayBox = await overlay.boundingBox()
  const cardBox = await card.boundingBox()
  expect(overlayBox).toMatchObject({ x: 0, y: 0, width: 360, height: 667 })
  expect((cardBox?.x ?? 0) + (cardBox?.width ?? 0) / 2).toBeCloseTo(180, 0)
  expect(Math.abs((cardBox?.y ?? 0) + (cardBox?.height ?? 0) / 2 - 667 / 2)).toBeLessThan(30)
  expect(await overlay.evaluate((element) => element.parentElement === document.body)).toBe(true)
})
