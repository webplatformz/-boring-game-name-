import { expect, test, type Locator, type Page } from '@playwright/test'

const OWNED_MEMBER_ID = 4053

async function openSeededApp(page: Page) {
  await page.addInitScript((memberId) => {
    localStorage.setItem('bundeshaus-disclaimer-v1', 'acknowledged')
    localStorage.setItem('bundeshaus-language-v1', 'en')
    localStorage.setItem(
      'bundeshaus-pack-v1',
      JSON.stringify({ packs: 10, owned: { [memberId]: 1 }, cardsRevealed: 1, packsOpened: 1, refillAt: null }),
    )
  }, OWNED_MEMBER_ID)
  await page.goto('/')
}

async function expectBeforeFooter(page: Page, content: Locator) {
  const footer = page.getByRole('contentinfo', { name: 'Legal and data information' })
  await expect(content).toBeVisible()
  await expect(footer).toBeVisible()
  // Screen and in-screen rise animations temporarily use transforms that can
  // make adjacent boxes visually cross while the new page is entering.
  await page.waitForTimeout(400)

  const [contentBox, footerBox] = await Promise.all([content.boundingBox(), footer.boundingBox()])
  expect(contentBox).not.toBeNull()
  expect(footerBox).not.toBeNull()
  expect((contentBox?.y ?? 0) + (contentBox?.height ?? 0)).toBeLessThanOrEqual((footerBox?.y ?? 0) + 1)
}

test('keeps the footer after every tab screen, including battle results', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 667 })
  await openSeededApp(page)

  await expectBeforeFooter(page, page.locator('.tabbed-screen').first())

  await page.getByRole('button', { name: 'COLLECTION', exact: true }).click()
  await expectBeforeFooter(page, page.locator('.collection-screen'))

  await page.getByRole('button', { name: 'TRADE', exact: true }).click()
  await expectBeforeFooter(page, page.locator('.screen-fill'))

  await page.getByRole('button', { name: 'BATTLE', exact: true }).click()
  await page.getByText('Thomas Aeschi', { exact: true }).click()
  const attack = page.getByRole('button', { name: 'ATTACK', exact: true })
  const outcome = page.getByText(/YOU (?:WON!|LOST)/)
  for (let turn = 0; turn < 5; turn++) {
    await expect(attack.or(outcome)).toBeVisible({ timeout: 5_000 })
    if (await outcome.isVisible()) break
    await attack.click()
  }
  await expect(outcome).toBeVisible({ timeout: 5_000 })

  const fightAgain = page.getByRole('button', { name: 'FIGHT AGAIN' })
  await expectBeforeFooter(page, fightAgain)

  // At the app's regular desktop-test height, the reserved result/footer
  // chrome should keep the entire battle and footer inside the viewport.
  await page.setViewportSize({ width: 690, height: 900 })
  await expectBeforeFooter(page, fightAgain)
  const desktopFooter = await page.getByRole('contentinfo').boundingBox()
  expect((desktopFooter?.y ?? 0) + (desktopFooter?.height ?? 0)).toBeLessThanOrEqual(901)
})

test('keeps the footer after pack opening and every information page', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 667 })
  await openSeededApp(page)

  await page.getByRole('button', { name: 'Rip open a pack' }).click()
  await expect(page.getByText('CARD 1 / 5')).toBeVisible({ timeout: 3_000 })
  await expectBeforeFooter(page, page.locator('.screen-transition > div'))

  const pages = [
    { link: 'SCORE METHOD', heading: 'HOW THE SCORES WORK' },
    { link: 'DATA METHOD', heading: 'How personal data becomes game data' },
    { link: 'PRIVACY', heading: 'Privacy' },
    { link: 'PHOTO CREDITS', heading: 'Portrait sources and licences' },
    { link: 'PROJECT NOTICE', heading: 'About this project' },
  ]

  for (const infoPage of pages) {
    await page.getByRole('contentinfo').getByRole('link', { name: infoPage.link, exact: true }).click()
    const heading = page.getByRole('heading', { name: infoPage.heading, exact: true })
    await expect(heading).toBeVisible()
    await expectBeforeFooter(page, page.locator('main'))
  }
})
