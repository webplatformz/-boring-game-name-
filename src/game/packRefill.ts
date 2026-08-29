export interface PackRefillRules {
  maxPacks: number
  intervalMs: number
}

export interface PackRefillState {
  packs: number
  refillAt: number | null
}

export function reconcilePackRefill(
  packs: number,
  refillAt: number | null,
  now: number,
  rules: PackRefillRules,
): PackRefillState {
  if (packs >= rules.maxPacks) return { packs, refillAt: null }
  if (refillAt === null) {
    return { packs, refillAt: now + rules.intervalMs }
  }
  if (now < refillAt) return { packs, refillAt }

  const elapsedIntervals =
    Math.floor((now - refillAt) / rules.intervalMs) + 1
  const granted = Math.min(rules.maxPacks - packs, elapsedIntervals)
  const nextPacks = packs + granted
  return {
    packs: nextPacks,
    refillAt:
      nextPacks < rules.maxPacks
        ? refillAt + granted * rules.intervalMs
        : null,
  }
}
