import { expect, test } from '@playwright/test'

test('requires acknowledgement on the first visit and remembers it', ({ page }) => {
  const disclaimer = page.getByRole('dialog', { name: 'About this project' })

  return page.goto('/')
    .then(() => expect(disclaimer).toBeVisible())
    .then(() => expect(disclaimer).toContainText('educational and experimental purposes'))
    .then(() => expect(disclaimer).toContainText('publicly available data'))
    .then(() => expect(disclaimer).toContainText('do not measure a person’s worth'))
    .then(() => expect(disclaimer).toContainText('incomplete, outdated, or wrong'))
    .then(() => page.getByRole('button', { name: 'I UNDERSTAND — CONTINUE' }).click())
    .then(() => expect(disclaimer).toBeHidden())
    .then(() => page.reload())
    .then(() => expect(disclaimer).toBeHidden())
})

test('opens the disclaimer page from the footer and methodology page', ({ page }) => {
  return page.addInitScript(() => {
    localStorage.setItem('bundeshaus-disclaimer-v1', 'acknowledged')
  })
    .then(() => page.goto('/'))
    .then(() => page.getByRole('link', { name: 'PROJECT DISCLAIMER →' }).click())
    .then(() => expect(page).toHaveURL(/#disclaimer$/))
    .then(() => expect(page.getByRole('heading', { name: 'About this project' })).toBeVisible())
    .then(() => expect(page.getByText('Parlamentsdienste der Bundesversammlung, Bern')).toBeVisible())
    .then(() => expect(page.getByText('ch-parliament-l52-2026-08-14')).toBeVisible())
    .then(() => expect(page.getByText('DERIVATION, NOT ALTERATION')).toBeVisible())
    .then(() => expect(page.getByText(/Official source values remain unchanged/)).toBeVisible())
    .then(() => page.getByRole('link', { name: /SWISS PARLIAMENT DATA/ }).click())
    .then(() => expect(page).toHaveURL(/#methodology$/))
    .then(() => expect(page.getByText('Parlamentsdienste der Bundesversammlung, Bern')).toBeVisible())
    .then(() => expect(page.getByText('2026-08-14', { exact: true })).toBeVisible())
    .then(() => page.getByRole('link', { name: 'PROJECT DISCLAIMER →' }).click())
    .then(() => expect(page).toHaveURL(/#disclaimer$/))
})
