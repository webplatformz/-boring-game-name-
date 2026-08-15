import { expect, test, type Page } from '@playwright/test'

// Thomas Aeschi — legendary, so his card always renders a full-strength glow.
const LEGENDARY_ID = 4053

/** Seeds a save holding one legendary card, so the collection is deterministic. */
async function seedLegendary(page: Page) {
  await page.addInitScript((id: number) => {
    localStorage.setItem(
      'bundeshaus-pack-v1',
      JSON.stringify({ packs: 10, owned: { [id]: 1 }, refillAt: null }),
    )
  }, LEGENDARY_ID)
}

async function openLegendaryCard(page: Page) {
  await seedLegendary(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'COLLECTION', exact: true }).click()
  await page.getByText('Thomas Aeschi').click()
  // Let the modal's entry animation and the glow's anchor measurement settle.
  await page.waitForTimeout(700)
}

test('nothing between a card and the viewport clips its glow', async ({ page }) => {
  await openLegendaryCard(page)

  // Glows and backdrops are painted far outside the card box, so any clipping
  // ancestor cuts them off at the content column's edge instead of the window's.
  const clippingAncestors = await page.evaluate(() => {
    const card = document.querySelector('.app-shell-width')
    const clipping: string[] = []
    for (let el: Element | null = card; el && el !== document.body; el = el.parentElement) {
      const { overflowX, overflowY } = getComputedStyle(el)
      if (overflowX !== 'visible' || overflowY !== 'visible') {
        clipping.push(`${el.tagName.toLowerCase()}.${el.className || '(no class)'}`)
      }
    }
    return clipping
  })

  expect(clippingAncestors).toEqual([])

  // The bleed must not turn into sideways scrolling: the viewport clips it.
  const scrolls = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(scrolls).toBe(false)
})

test('legendary card renders its full glow', async ({ page }) => {
  await openLegendaryCard(page)
  await expect(page).toHaveScreenshot('legendary-card-glow.png', { maxDiffPixelRatio: 0.02 })
})
