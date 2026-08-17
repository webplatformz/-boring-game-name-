import { expect, test, type Page } from '@playwright/test'

async function openFirstCard(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('bundeshaus-disclaimer-v1', 'acknowledged')
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Rip open a pack' }).click()
  await expect(page.getByText('CARD 1 / 5')).toBeVisible({ timeout: 3_000 })
}

test('scales the pack-opening card on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 900 })
  await openFirstCard(page)

  const card = page.locator('.pack-opening-card')
  const box = await card.boundingBox()
  expect(box?.height).toBeGreaterThan(715)
  expect(box?.height).toBeLessThan(725)
  expect((box?.width ?? 0) / (box?.height ?? 1)).toBeCloseTo(336 / 504, 2)

  const topCard = page.locator('.pack-opening-top-card')
  await topCard.click()
  await expect(page.getByText('TAP OR SWIPE FOR THE NEXT CARD')).toBeVisible()
  await page.waitForTimeout(600)
  const score = topCard.getByRole('button', { name: /ATK \d+\. Show score formula/ })
  await expect(score).toBeVisible()
  await score.click()
  const tooltip = page.getByRole('tooltip')
  await expect(tooltip).toBeVisible()
  expect((await tooltip.boundingBox())?.width).toBeGreaterThan(285)

  await score.click()
  const committee = topCard.getByRole('button', { name: /CMTE \d+\. Show committee metrics/ })
  await committee.click()
  const committeeTooltip = page.getByRole('tooltip')
  await expect(committeeTooltip).toBeVisible()
  const tooltipTransform = await committeeTooltip.evaluate((element) => getComputedStyle(element.parentElement!).transform)
  expect(tooltipTransform).toMatch(/^matrix\(1\.4/)
})

test('keeps the scaled card inside a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 820 })
  await openFirstCard(page)

  const box = await page.locator('.pack-opening-card').boundingBox()
  expect(box?.width).toBeGreaterThan(355)
  expect(box?.x).toBeGreaterThanOrEqual(20)
  expect((box?.x ?? 401) + (box?.width ?? 0)).toBeLessThanOrEqual(380)
  expect(box?.height).toBeLessThan(541)
  expect((box?.width ?? 0) / (box?.height ?? 1)).toBeCloseTo(336 / 504, 2)
})
