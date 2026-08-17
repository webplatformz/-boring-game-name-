import { expect, test } from '@playwright/test'

test('opens the links for the clicked sector without closing the card', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('bundeshaus-disclaimer-v1', 'acknowledged')
    localStorage.setItem(
      'bundeshaus-pack-v1',
      JSON.stringify({ packs: 10, owned: { 4053: 1 }, cardsRevealed: 1, packsOpened: 1, refillAt: null }),
    )
  })
  await page.goto('/')
  await page.getByRole('button', { name: /Show card for/ }).click()

  const card = page.locator('.card-modal-card')
  const economy = card.getByRole('button', { name: 'Sector: Economy & finance. Show related links' })
  await economy.hover()
  await expect(card.getByText('ECONOMY & FINANCE', { exact: true })).toBeVisible()

  await economy.click()
  await expect(page.getByText('DISCLOSED EXTERNAL LINKS')).toBeVisible()
  await expect(page.getByText('EXPERTsuisse, Zürich')).toBeVisible()
  await expect(page.getByText('Helvetische Bank AG, Zürich')).toBeVisible()
  await expect(page.getByText('Stiftung für junge Auslandschweizer (Revisor)')).toHaveCount(0)
  await expect(page.locator('.card-modal-overlay')).toBeVisible()

  await card.getByRole('button', { name: 'Sector: Foreign affairs. Show related links' }).click()
  await expect(page.getByText('Stiftung für junge Auslandschweizer (Revisor)')).toBeVisible()
  await expect(page.getByText('EXPERTsuisse, Zürich')).toHaveCount(0)
})
