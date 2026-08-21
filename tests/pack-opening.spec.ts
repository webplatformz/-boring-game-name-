import { expect, test, type Page } from '@playwright/test'
import { CARD_MAX_W } from '../src/theme'

const CARD_ASPECT = 336 / 504

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
  expect(box?.width).toBeCloseTo(CARD_MAX_W, 0)
  expect(box?.height).toBeCloseTo(CARD_MAX_W / CARD_ASPECT, 0)
  expect((box?.width ?? 0) / (box?.height ?? 1)).toBeCloseTo(CARD_ASPECT, 2)

  const topCard = page.locator('.pack-opening-top-card')
  await topCard.click()
  await expect(page.getByText('TAP OR SWIPE FOR THE NEXT CARD')).toBeVisible()
  await page.waitForTimeout(600)
  const score = topCard.getByRole('button', { name: /ATK \d+\. Show score formula/ })
  await expect(score).toBeVisible()
  await score.click()
  const tooltip = page.getByRole('tooltip')
  await expect(tooltip).toBeVisible()
  expect((await tooltip.boundingBox())?.width).toBeCloseTo(256, 0)

  await score.click()
  const committee = topCard.getByRole('button', { name: /CMTE \d+\. Show committee metrics/ })
  await committee.click()
  const committeeTooltip = page.getByRole('tooltip')
  await expect(committeeTooltip).toBeVisible()
  const tooltipScale = await committeeTooltip.evaluate(
    (element) =>
      new DOMMatrix(getComputedStyle(element.parentElement!).transform).a,
  )
  expect(tooltipScale).toBeCloseTo((box?.width ?? 0) / CARD_MAX_W, 1)
})

test('keeps the scaled card inside a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 667 })
  await openFirstCard(page)

  const box = await page.locator('.pack-opening-card').boundingBox()
  expect(box?.width).toBeCloseTo(320, 0)
  expect(box?.x).toBeCloseTo(20, 0)
  expect(box?.height).toBeCloseTo(320 / CARD_ASPECT, 0)
  expect((box?.width ?? 0) / (box?.height ?? 1)).toBeCloseTo(CARD_ASPECT, 2)

  const topCardBox = await page.locator('.pack-opening-top-card').boundingBox()
  expect((topCardBox?.x ?? 0) + (topCardBox?.width ?? 0) / 2).toBeCloseTo(180, 0)
})
