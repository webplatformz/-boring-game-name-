import { expect, test } from '@playwright/test'

test.beforeEach(({ page }) => page.addInitScript(() => {
  localStorage.setItem('bundeshaus-disclaimer-v1', 'acknowledged')
  localStorage.setItem('bundeshaus-language-v1', 'en')
}))

test('permanent footer opens Privacy and Data Methodology pages', async ({ page }) => {
  await page.goto('/')
  const footer = page.getByRole('contentinfo', { name: 'Legal and data information' })
  await expect(footer).toBeVisible()

  await footer.getByRole('link', { name: 'PRIVACY' }).click()
  await expect(page).toHaveURL(/#privacy$/)
  await expect(page.getByRole('heading', { name: 'Privacy', exact: true })).toBeVisible()
  await expect(page.getByText('Lucas Schnüriger, Timo Spring')).toBeVisible()
  await expect(page.getByRole('link', { name: 'bundeshauspack@gmail.com', exact: true })).toBeVisible()
  await expect(page.getByText(/GitHub Pages hosts the static site/)).toBeVisible()
  await expect(page.getByText(/Configuration incomplete/)).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Profiling and automated decisions' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Correction or removal workflow' })).toBeVisible()

  await page.getByRole('contentinfo').getByRole('link', { name: 'DATA METHOD' }).click()
  await expect(page).toHaveURL(/#data-methodology$/)
  await expect(page.getByRole('heading', { name: 'How personal data becomes game data' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Data minimisation' })).toBeVisible()
  await expect(page.getByText('Parlamentsdienste der Bundesversammlung, Bern')).toBeVisible()
})

for (const language of [
  { code: 'de', title: 'Datenschutz', profiling: 'Profiling und automatisierte Entscheidungen', method: 'DATENMETHODIK' },
  { code: 'fr', title: 'Confidentialité', profiling: 'Profilage et décisions automatisées', method: 'MÉTHODE DES DONNÉES' },
  { code: 'it', title: 'Privacy', profiling: 'Profilazione e decisioni automatizzate', method: 'METODO DEI DATI' },
] as const) {
  test(`Privacy page follows the selected ${language.code} language`, async ({ page }) => {
    await page.addInitScript((code) => localStorage.setItem('bundeshaus-language-v1', code), language.code)
    await page.goto('/#privacy')
    await expect(page.getByRole('heading', { name: language.title, exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: language.profiling })).toBeVisible()
    await expect(page.getByRole('link', { name: language.method })).toBeVisible()
  })
}
