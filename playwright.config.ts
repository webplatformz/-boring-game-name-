import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5175',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      // A viewport narrower than 700px keeps the app shell at its 430px phone
      // width while the window stays wider, so anything the shell clips is
      // clearly distinguishable from what the viewport itself would cut off.
      use: { ...devices['Desktop Chrome'], viewport: { width: 690, height: 900 } },
    },
  ],
  webServer: {
    // The dev server is served from `/`; the production build is based at the
    // GitHub Pages sub-path, which would make every route here a 404.
    command: 'npm run dev -- --port 5175 --strictPort',
    url: 'http://localhost:5175',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
