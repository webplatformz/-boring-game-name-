import { expect, test } from '@playwright/test'

test('applies every elapsed offline interval and keeps the next countdown', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('bundeshaus-disclaimer-v1', 'acknowledged')
    localStorage.setItem('bundeshaus-language-v1', 'en')
  })
  await page.goto('/')
  const previousDueAt = Date.now() - 25 * 60 * 1_000
  await page.evaluate(
    ({ refillAt }) => {
      localStorage.setItem(
        'bundeshaus-pack-v1',
        JSON.stringify({
          packs: 4,
          owned: {},
          cardsRevealed: 0,
          packsOpened: 0,
          refillAt,
        }),
      )
    },
    { refillAt: previousDueAt },
  )
  await page.reload()

  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('bundeshaus-pack-v1')!),
  )
  expect(stored.packs).toBe(7)
  expect(stored.refillAt).toBe(previousDueAt + 30 * 60 * 1_000)
  await expect(page.getByText(/NEXT PACK IN 4:\d{2}/)).toBeVisible()
})
