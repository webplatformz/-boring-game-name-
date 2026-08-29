import { expect, test, type Page } from '@playwright/test'

// Thomas Aeschi — legendary, so his card always renders a full-strength glow.
const LEGENDARY_ID = 4053
const ULTRA_ID = 806
const COMMON_OPPONENT_ID = 4296

/** Seeds a save holding one legendary card, so the collection is deterministic. */
async function seedLegendary(page: Page) {
  await page.addInitScript((id: number) => {
    localStorage.setItem('bundeshaus-disclaimer-v1', 'acknowledged')
    localStorage.setItem(
      'bundeshaus-pack-v1',
      JSON.stringify({ packs: 10, owned: { [id]: 1 }, refillAt: null }),
    )
  }, LEGENDARY_ID)
}

async function openLegendaryCard(page: Page) {
  await seedLegendary(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'CARDS', exact: true }).click()
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

test('debate glows keep their full scale behind mode and duel content', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 568 })
  await page.addInitScript((id: number) => {
    localStorage.setItem('bundeshaus-disclaimer-v1', 'acknowledged')
    localStorage.setItem('bundeshaus-language-v1', 'en')
    localStorage.setItem(
      'bundeshaus-pack-v1',
      JSON.stringify({ packs: 10, owned: { [id]: 1 }, refillAt: null }),
    )
  }, ULTRA_ID)
  await page.goto('/')
  await page.getByRole('button', { name: 'DEBATE', exact: true }).click()
  await page.getByText('Maya Graf', { exact: true }).click()

  const modeAnchor = await page
    .getByTestId('debate-card-glow-anchor')
    .boundingBox()
  const fullGlow = await page
    .getByTestId('fixed-card-glow')
    .locator(':scope > div')
    .boundingBox()
  const firstModeButton = await page
    .getByRole('button', { name: /SINGLE RANDOM DEBATE/ })
    .boundingBox()
  expect(modeAnchor).not.toBeNull()
  expect(modeAnchor?.width).toBe(110)
  expect(fullGlow?.width ?? 0).toBeGreaterThan((modeAnchor?.width ?? 0) * 1.5)
  await expect(page.getByText('CHOOSE DEBATE MODE', { exact: true })).toHaveCount(0)
  expect(
    (modeAnchor?.y ?? 0) + (modeAnchor?.height ?? 0),
  ).toBeLessThanOrEqual(
    firstModeButton?.y ?? 0,
  )
  await page.setViewportSize({ width: 360, height: 900 })
  expect(
    (await page.getByTestId('debate-card-glow-anchor').boundingBox())?.width,
  ).toBe(130)
  expect(
    await page.evaluate(() => {
      const layer = document.querySelector('[data-card-glow-layer="backdrop"]')
      const root = document.querySelector('#root')
      return Boolean(
        layer &&
          root &&
          layer.compareDocumentPosition(root) &
            Node.DOCUMENT_POSITION_FOLLOWING,
      )
    }),
  ).toBe(true)

  await page.getByRole('button', { name: /SINGLE RANDOM DEBATE/ }).click()
  await page.waitForTimeout(350)
  const anchors = page.getByTestId('debate-card-glow-anchor')
  await expect(anchors).toHaveCount(2)
  const [leftAnchor, rightAnchor, vs, poll, leftLabel, rightLabel] =
    await Promise.all([
      anchors.nth(0).boundingBox(),
      anchors.nth(1).boundingBox(),
      page.getByTestId('debate-vs').boundingBox(),
      page.getByTestId('debate-poll').boundingBox(),
      page.getByTestId('debate-card-label-player').boundingBox(),
      page.getByTestId('debate-card-label-opponent').boundingBox(),
    ])
  expect(
    (leftAnchor?.x ?? 0) + (leftAnchor?.width ?? 0),
  ).toBeLessThanOrEqual(
    vs?.x ?? 0,
  )
  expect((vs?.x ?? 0) + (vs?.width ?? 0)).toBeLessThanOrEqual(
    rightAnchor?.x ?? 0,
  )
  expect((poll?.y ?? 0) + (poll?.height ?? 0)).toBeLessThanOrEqual(
    leftLabel?.y ?? 0,
  )
  expect((leftLabel?.y ?? 0) + (leftLabel?.height ?? 0)).toBeLessThanOrEqual(
    leftAnchor?.y ?? 0,
  )
  expect((rightLabel?.y ?? 0) + (rightLabel?.height ?? 0)).toBeLessThanOrEqual(
    rightAnchor?.y ?? 0,
  )
  expect(leftAnchor?.x ?? -1).toBeGreaterThanOrEqual(0)
  expect(
    (rightAnchor?.x ?? 0) + (rightAnchor?.width ?? 0),
  ).toBeLessThanOrEqual(
    360,
  )
})

test('campaign choice stays beneath the cards and is reachable on a short phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 667 })
  await page.addInitScript(
    ({ playerId, opponentId }) => {
      localStorage.setItem('bundeshaus-disclaimer-v1', 'acknowledged')
      localStorage.setItem('bundeshaus-language-v1', 'en')
      localStorage.setItem(
        'bundeshaus-pack-v1',
        JSON.stringify({
          packs: 10,
          owned: { [playerId]: 1 },
          refillAt: null,
          campaign: {
            version: 1,
            id: 'glow-choice',
            playerId,
            stageIndex: 0,
            phase: 'awaiting-choice',
            unbankedPacks: 1,
            duel: {
              version: 1,
              playerId,
              opponentId,
              phase: 'settled',
              poll: {
                firmPlayer: 51,
                ratherPlayer: 0,
                undecided: 49,
                ratherOpponent: 0,
                firmOpponent: 0,
              },
              playerAction: 'attack',
              oppAction: 'attack',
              lastTurn: {
                pollBefore: {
                  firmPlayer: 0,
                  ratherPlayer: 0,
                  undecided: 100,
                  ratherOpponent: 0,
                  firmOpponent: 0,
                },
                poll: {
                  firmPlayer: 51,
                  ratherPlayer: 0,
                  undecided: 49,
                  ratherOpponent: 0,
                  firmOpponent: 0,
                },
                playerAction: 'attack',
                oppAction: 'attack',
              },
              turn: 1,
              winner: { winner: 'player', majority: true },
            },
          },
        }),
      )
    },
    { playerId: ULTRA_ID, opponentId: COMMON_OPPONENT_ID },
  )
  await page.goto('/')
  await page.getByRole('button', { name: 'DEBATE', exact: true }).click()

  const [card, title, reward] = await Promise.all([
    page.getByTestId('debate-card-player').boundingBox(),
    page.getByText('YOU WON!', { exact: true }).boundingBox(),
    page.getByText('1 PACKS READY TO BANK', { exact: true }).boundingBox(),
  ])
  expect(title?.y ?? 0).toBeGreaterThanOrEqual(
    (card?.y ?? 0) + (card?.height ?? 0),
  )
  expect((title?.y ?? 0) + (title?.height ?? 0)).toBeLessThanOrEqual(
    reward?.y ?? 0,
  )
  await expect(page.getByTestId('debate-poll')).toBeVisible()
  await expect(page.getByTestId('debate-card-opponent')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeHidden()
  await expect(page.getByRole('contentinfo')).toBeHidden()

  const continueButton = page.getByRole('button', { name: 'KEEP GOING', exact: true })
  await continueButton.scrollIntoViewIfNeeded()
  await expect(continueButton).toBeInViewport()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360)
})

test('the losing card stays opaque while its own glow is dimmed', async ({
  page,
}) => {
  test.setTimeout(30_000)
  await page.addInitScript((id: number) => {
    localStorage.setItem('bundeshaus-disclaimer-v1', 'acknowledged')
    localStorage.setItem('bundeshaus-language-v1', 'en')
    localStorage.setItem(
      'bundeshaus-pack-v1',
      JSON.stringify({ packs: 10, owned: { [id]: 1 }, refillAt: null }),
    )
    Math.random = () => 0
  }, ULTRA_ID)
  await page.goto('/')
  await page.getByRole('button', { name: 'DEBATE', exact: true }).click()
  await page.getByText('Maya Graf', { exact: true }).click()
  await page.getByRole('button', { name: /SINGLE RANDOM DEBATE/ }).click()

  const attack = page.getByRole('button', { name: 'ATTACK', exact: true })
  const outcome = page.getByText(/YOU (?:WON!|LOST)/)
  for (let turn = 0; turn < 5; turn++) {
    await expect(attack.or(outcome)).toBeVisible({ timeout: 5_000 })
    if (await outcome.isVisible()) break
    await attack.click()
  }
  await expect(outcome).toBeVisible({ timeout: 5_000 })

  const playerWon = await page.getByText('YOU WON!').isVisible()
  const loserIndex = playerWon ? 1 : 0
  const loser = page.getByTestId(`debate-card-${playerWon ? 'opponent' : 'player'}`)
  const surface = loser.getByTestId('scaled-card-surface')
  const glow = page.getByTestId('fixed-card-glow').nth(loserIndex)

  await expect(loser).toHaveCSS('opacity', '1')
  await expect(surface).not.toHaveCSS('filter', 'none')
  await expect(glow).toHaveCSS('opacity', '0.22')
})
