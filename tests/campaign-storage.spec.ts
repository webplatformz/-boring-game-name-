import { expect, test, type Page } from '@playwright/test'

const SAVE_KEY = 'bundeshaus-pack-v1'
const PLAYER_ID = 4053
const COMMON_OPPONENT_ID = 4296

const emptyCampaignRecord = () => ({
  campaignsStarted: 0,
  campaignsBanked: 0,
  campaignsLost: 0,
  campaignsAbandoned: 0,
  campaignsCompleted: 0,
  packsAwarded: 0,
  stageWins: {
    common: 0,
    uncommon: 0,
    rare: 0,
    ultra: 0,
    legend: 0,
    mythic: 0,
  },
  stageLosses: {
    common: 0,
    uncommon: 0,
    rare: 0,
    ultra: 0,
    legend: 0,
    mythic: 0,
  },
  bankExits: {
    common: 0,
    uncommon: 0,
    rare: 0,
    ultra: 0,
    legend: 0,
  },
})

const freshCampaign = () => ({
  version: 1,
  id: 'campaign-test',
  playerId: PLAYER_ID,
  stageIndex: 0,
  phase: 'in-duel',
  unbankedPacks: 0,
  duel: {
    version: 1,
    playerId: PLAYER_ID,
    opponentId: COMMON_OPPONENT_ID,
    phase: 'awaiting-action',
    poll: {
      firmPlayer: 0,
      ratherPlayer: 12,
      undecided: 88,
      ratherOpponent: 0,
      firmOpponent: 0,
    },
    playerAction: null,
    oppAction: null,
    lastTurn: null,
    turn: 1,
    winner: null,
  },
})

async function openWithSave(page: Page, save: Record<string, unknown>) {
  await page.addInitScript(
    ({ key, save }) => {
      localStorage.setItem('bundeshaus-disclaimer-v1', 'acknowledged')
      localStorage.setItem('bundeshaus-language-v1', 'en')
      localStorage.setItem(
        'bundeshaus-achievements-v1',
        JSON.stringify({ unlocked: { 'first-pull': Date.now() } }),
      )
      localStorage.setItem(key, JSON.stringify(save))
    },
    { key: SAVE_KEY, save },
  )
  await page.goto('/')
}

async function readSave(page: Page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  }, SAVE_KEY)
}

test('legacy saves receive campaign defaults', async ({ page }) => {
  await openWithSave(page, {
    packs: 10,
    owned: {},
    cardsRevealed: 0,
    packsOpened: 0,
    regularPacksOpened: 0,
    refillAt: null,
  })

  const save = await readSave(page)
  expect(save.campaign).toBeNull()
  expect(save.debateExhaustion).toEqual({})
  expect(save.campaignRecord).toEqual(emptyCampaignRecord())
})

test('malformed campaigns and expired exhaustion are discarded as units', async ({
  page,
}) => {
  const future = Date.now() + 60_000
  await openWithSave(page, {
    packs: 10,
    owned: { [PLAYER_ID]: 1 },
    cardsRevealed: 0,
    packsOpened: 0,
    regularPacksOpened: 0,
    refillAt: null,
    campaign: { ...freshCampaign(), unbankedPacks: 99 },
    debateExhaustion: {
      [PLAYER_ID]: { count: 2, resetAt: Date.now() - 1 },
      [COMMON_OPPONENT_ID]: { count: 1, resetAt: future },
    },
    campaignRecord: {
      ...emptyCampaignRecord(),
      campaignsStarted: -1,
      stageWins: { common: 3.5 },
    },
  })

  const save = await readSave(page)
  expect(save.campaign).toBeNull()
  expect(save.debateExhaustion).toEqual({
    [COMMON_OPPONENT_ID]: { count: 1, resetAt: future },
  })
  expect(save.campaignRecord.campaignsStarted).toBe(0)
  expect(save.campaignRecord.stageWins).toEqual(
    emptyCampaignRecord().stageWins,
  )
})

test('unrelated pack completion preserves campaign state', async ({ page }) => {
  const campaign = freshCampaign()
  const campaignRecord = {
    ...emptyCampaignRecord(),
    campaignsStarted: 1,
  }
  const resetAt = Date.now() + 60_000
  const debateExhaustion = {
    [COMMON_OPPONENT_ID]: { count: 1, resetAt },
  }
  await openWithSave(page, {
    packs: 10,
    owned: { [PLAYER_ID]: 1 },
    cardsRevealed: 0,
    packsOpened: 0,
    regularPacksOpened: 0,
    refillAt: null,
    campaign,
    debateExhaustion,
    campaignRecord,
  })

  await page.getByRole('button', { name: 'Rip open a pack' }).click()
  await expect(page.getByText('CARD 1 / 5')).toBeVisible({ timeout: 3_000 })
  await page.getByRole('button', { name: 'SKIP ALL →' }).click()

  const save = await readSave(page)
  expect(save.campaign).toEqual(campaign)
  expect(save.debateExhaustion).toEqual(debateExhaustion)
  expect(save.campaignRecord).toEqual(campaignRecord)
})

test('the Trade screen excludes the copy reserved by an active campaign', async ({
  page,
}) => {
  await openWithSave(page, {
    packs: 10,
    owned: { [PLAYER_ID]: 5 },
    cardsRevealed: 0,
    packsOpened: 0,
    regularPacksOpened: 0,
    refillAt: null,
    campaign: freshCampaign(),
  })

  await page.getByRole('button', { name: 'TRADE', exact: true }).click()
  await page.getByRole('button', { name: 'LEGENDARY', exact: true }).click()

  await expect(page.getByText('4 avail', { exact: true })).toBeVisible()
})
