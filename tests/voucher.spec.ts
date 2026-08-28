import { expect, test, type Page } from '@playwright/test'
import { generateVoucherCode } from '../src/game/vouchers'

async function openHome(page: Page, save: Record<string, unknown>) {
  await page.addInitScript(() => {
    localStorage.setItem('bundeshaus-disclaimer-v1', 'acknowledged')
    localStorage.setItem('bundeshaus-language-v1', 'en')
  })
  await page.goto('/')
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: 'bundeshaus-pack-v1', value: save },
  )
  await page.reload()
}

async function redeem(page: Page, code: string) {
  await page.getByLabel('Redeem a voucher code').click()
  await page.getByPlaceholder('ENTER CODE').fill(code)
  await page.getByRole('button', { name: 'REDEEM', exact: true }).click()
}

test('a refill voucher grants its encoded pack amount and can be redeemed again', async ({ page }) => {
  const code = await generateVoucherCode({ type: 'refill', rarity: null, amount: 3 })
  await openHome(page, { packs: 1, owned: {}, cardsRevealed: 0, packsOpened: 0, refillAt: null })

  await redeem(page, code)
  await expect(page.getByText('PACKS REFILLED TO 4!')).toBeVisible()

  let stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bundeshaus-pack-v1')!))
  expect(stored.packs).toBe(4)

  // Refill vouchers are deliberately exempt from the per-device single-use
  // check, unlike rarity/timer vouchers: the exact same code redeems again,
  // adding its amount on top of whatever the player already has. The dialog
  // stays open after a refill success, so just fill and submit again.
  await page.getByPlaceholder('ENTER CODE').fill(code)
  await page.getByRole('button', { name: 'REDEEM', exact: true }).click()
  await expect(page.getByText('PACKS REFILLED TO 7!')).toBeVisible()
  stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bundeshaus-pack-v1')!))
  expect(stored.packs).toBe(7)
})

test('a rarity voucher opens a 5-card pack of a single non-mythic rarity, and can only be redeemed once', async ({ page }) => {
  const code = await generateVoucherCode({ type: 'rarity', rarity: 'legend', amount: null })
  await openHome(page, { packs: 2, owned: {}, cardsRevealed: 0, packsOpened: 0, refillAt: null })

  await redeem(page, code)
  await expect(page.getByText('SPECIAL LEGENDARY VOUCHER PACK')).toBeVisible({ timeout: 3_000 })
  await expect(page.getByText('CARD 1 / 5')).toBeVisible({ timeout: 3_000 })

  // Voucher packs don't consume the regular pack count.
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bundeshaus-pack-v1')!))
  expect(stored.packs).toBe(2)

  await page.getByRole('button', { name: 'SKIP ALL →' }).click()
  await redeem(page, code)
  await expect(page.getByText('THIS VOUCHER HAS ALREADY BEEN USED.')).toBeVisible()
})

test('an invalid code is rejected without touching packs', async ({ page }) => {
  await openHome(page, { packs: 3, owned: {}, cardsRevealed: 0, packsOpened: 0, refillAt: null })

  await redeem(page, 'NOT-A-REAL-CODE')
  await expect(page.getByText("THAT CODE ISN’T VALID.")).toBeVisible()

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bundeshaus-pack-v1')!))
  expect(stored.packs).toBe(3)
})
