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

  await page.getByRole('button', { name: 'BATTLE' }).click()
  await expect(page.getByRole('button', { name: 'BATTLE' })).toHaveAttribute('aria-current', 'page')
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
