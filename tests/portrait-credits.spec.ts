import { expect, test } from '@playwright/test'

test.beforeEach(({ page }) => page.addInitScript(() => {
  localStorage.setItem('bundeshaus-disclaimer-v1', 'acknowledged')
  localStorage.setItem('bundeshaus-language-v1', 'en')
}))

test('permanent footer opens complete central portrait credits', async ({ page }) => {
  await page.goto('/')
  const footer = page.getByRole('contentinfo', { name: 'Legal and data information' })
  await footer.getByRole('link', { name: 'PHOTO CREDITS' }).click()

  await expect(page).toHaveURL(/#photo-credits$/)
  await expect(page.getByRole('heading', { name: 'Portrait sources and licences' })).toBeVisible()
  await expect(page.getByText('253 portraits with individual source and licence records.')).toBeVisible()
  await expect(page.locator('article[id^="portrait-credit-"]')).toHaveCount(253)

  const parliamentPortrait = page.locator('#portrait-credit-4053')
  await expect(parliamentPortrait.getByRole('heading', { name: 'Thomas Aeschi' })).toBeVisible()
  await expect(parliamentPortrait.getByRole('link', { name: 'http://www.parlament.ch' })).toBeVisible()
  await expect(parliamentPortrait.getByText('Attribution-only permission')).toBeVisible()
  await expect(parliamentPortrait.getByText(/Square-cropped, resized to 512 × 512 pixels/)).toBeVisible()

  const ccPortrait = page.locator('#portrait-credit-806')
  await expect(ccPortrait.getByRole('heading', { name: 'Maya Graf' })).toBeVisible()
  await expect(ccPortrait.getByRole('link', { name: 'CC BY-SA 4.0' })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by-sa/4.0')
})

test('portrait credits follow the selected language', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('bundeshaus-language-v1', 'de'))
  await page.goto('/#photo-credits')

  await expect(page.getByRole('heading', { name: 'Portraitquellen und Lizenzen' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'BILDNACHWEISE' })).toBeVisible()
  await expect(page.getByText(/Quadratisch zugeschnitten, auf 512 × 512 Pixel skaliert/).first()).toBeVisible()
})
