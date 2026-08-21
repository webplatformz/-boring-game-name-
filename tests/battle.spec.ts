import { expect, test } from '@playwright/test'

const OWNED_MEMBER_ID = 4053

test('leaving Debate cancels the active turn and returns to the picker', async ({ page }) => {
  await page.addInitScript((memberId) => {
    localStorage.setItem('bundeshaus-disclaimer-v1', 'acknowledged')
    localStorage.setItem('bundeshaus-language-v1', 'en')
    localStorage.setItem(
      'bundeshaus-pack-v1',
      JSON.stringify({
        packs: 10,
        owned: { [memberId]: 1 },
        cardsRevealed: 1,
        packsOpened: 1,
        refillAt: null,
      }),
    )
  }, OWNED_MEMBER_ID)
  await page.goto('/')

  await page.getByRole('button', { name: 'BATTLE', exact: true }).click()
  await page.getByText('Thomas Aeschi', { exact: true }).click()
  await page.getByRole('button', { name: 'ATTACK', exact: true }).click()
  await page.getByRole('button', { name: 'COLLECTION', exact: true }).click()
  await page.waitForTimeout(3_000)

  await page.getByRole('button', { name: 'BATTLE', exact: true }).click()
  await expect(page.getByText('CHOOSE YOUR FIGHTER', { exact: true })).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('bundeshaus-battle-v1')))
    .toBeNull()
})
