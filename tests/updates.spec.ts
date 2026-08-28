import { expect, test } from '@playwright/test'

test.beforeEach(({ page }) => page.addInitScript(() => {
  localStorage.setItem('bundeshaus-disclaimer-v1', 'acknowledged')
  localStorage.setItem('bundeshaus-language-v1', 'en')
}))

test('shows new updates in the footer until the player reads them', async ({ page }) => {
  await page.goto('/')
  const footer = page.getByRole('contentinfo', { name: 'Legal and data information' })
  const updatesLink = footer.getByRole('link', { name: 'UPDATES, unread' })
  await expect(updatesLink).toBeVisible()
  await expect(updatesLink.locator('[aria-hidden="true"]')).toBeVisible()

  await updatesLink.click()
  await expect(page).toHaveURL(/#updates$/)
  await expect(page.getByRole('heading', { name: 'Updates', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'A home for project news' })).toBeVisible()
  await expect(footer.locator('[aria-hidden="true"]')).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => localStorage.getItem('bundeshaus-updates-read-v1'))).toBe('2026-08-28-updates')

  await page.reload()
  await expect(footer.getByRole('link', { name: 'UPDATES', exact: true })).toBeVisible()
  await expect(footer.locator('[aria-hidden="true"]')).toHaveCount(0)
})

test('shows the updates page in Rumantsch', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bundeshaus-language-v1', 'rm'))
  await page.goto('/')

  await page.getByRole('contentinfo').getByRole('link', { name: 'NOVITADS, betg legì' }).click()
  await expect(page.getByRole('heading', { name: 'Novitads', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'In lieu per novitads dal project' })).toBeVisible()
  await expect(page.getByText(/Curtas infurmaziuns davart novas funcziuns/)).toBeVisible()
  await expect(page.getByRole('button', { name: '← ENAVOS AL GIEU' })).toBeVisible()
})
