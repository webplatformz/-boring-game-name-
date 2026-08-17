import { expect, test, type Page } from '@playwright/test'

const OWNED = {
  1108: 1, // Guy Parmelin — mythic
  4053: 1, // Thomas Aeschi — legend
  4025: 1, // Roland Rino Büchel — rare
  4296: 1, // Susanne Vincenz-Stauffacher — common
}

async function openCollection(page: Page) {
  await page.addInitScript(({ owned }) => {
    localStorage.setItem('bundeshaus-disclaimer-v1', 'acknowledged')
    localStorage.setItem('bundeshaus-language-v1', 'en')
    localStorage.setItem(
      'bundeshaus-pack-v1',
      JSON.stringify({ packs: 10, owned, cardsRevealed: 4, packsOpened: 1, refillAt: null }),
    )
    localStorage.setItem(
      'bundeshaus-collection-v1',
      JSON.stringify({ sortKey: 'rarity', sortDir: -1, rarities: [], cantons: [] }),
    )
  }, { owned: OWNED })
  await page.goto('/')
  await page.getByRole('button', { name: 'COLLECTION', exact: true }).click()
}

async function memberOrder(page: Page) {
  return page.locator('.collection-table-row').evaluateAll((rows) =>
    rows.map((row) => row.getAttribute('data-member-name')),
  )
}

test('collection headers replace sort chips and sort each table column', async ({ page }) => {
  await openCollection(page)

  const table = page.getByRole('table', { name: 'COLLECTION' })
  await expect(table).toBeVisible()
  await expect(table.getByRole('columnheader')).toHaveCount(5)
  await expect(table.locator('button[data-sort-key]')).toHaveCount(5)
  await expect(table.locator('[data-sort-key="rarity"]')).toHaveText(/RARITY/)
  await expect(table.locator('[role="columnheader"][aria-sort="descending"]')).toContainText('RARITY')
  expect(await memberOrder(page)).toEqual([
    'Guy Parmelin',
    'Thomas Aeschi',
    'Roland Rino Büchel',
    'Susanne Vincenz-Stauffacher',
  ])

  const memberHeader = table.locator('button[data-sort-key="name"]')
  await memberHeader.click()
  await expect(memberHeader.locator('..')).toHaveAttribute('aria-sort', 'ascending')
  expect(await memberOrder(page)).toEqual([
    'Thomas Aeschi',
    'Roland Rino Büchel',
    'Guy Parmelin',
    'Susanne Vincenz-Stauffacher',
  ])

  await memberHeader.click()
  await expect(memberHeader.locator('..')).toHaveAttribute('aria-sort', 'descending')
  expect(await memberOrder(page)).toEqual([
    'Susanne Vincenz-Stauffacher',
    'Guy Parmelin',
    'Roland Rino Büchel',
    'Thomas Aeschi',
  ])
})

test('five-column collection table fits and uses the available mobile height', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await openCollection(page)

  const table = page.getByRole('table', { name: 'COLLECTION' })
  const tableBox = await table.boundingBox()
  expect(tableBox).not.toBeNull()
  expect((tableBox?.y ?? 0) + (tableBox?.height ?? 0)).toBeLessThanOrEqual(740)
  expect(tableBox?.height ?? 0).toBeGreaterThan(220)

  const gridMetrics = await table.locator('.collection-table-grid').first().evaluate((grid) => {
    const style = getComputedStyle(grid)
    return {
      columns: style.gridTemplateColumns.split(' ').length,
      clientWidth: grid.clientWidth,
      scrollWidth: grid.scrollWidth,
    }
  })
  expect(gridMetrics.columns).toBe(5)
  expect(gridMetrics.scrollWidth).toBeLessThanOrEqual(gridMetrics.clientWidth)
  await expect(table.locator('.collection-rarity-cell').first()).toBeVisible()
})
