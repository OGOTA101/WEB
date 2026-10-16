import type { BodyPart, CountryDefinition, CountryId, EffectSet, GameState, SkillDefinition } from './types'

export function aggregateEffects(skills: SkillDefinition[]): EffectSet {
  return skills.reduce<EffectSet>((acc, skill) => {
    const effects = skill.effects
    const next: EffectSet = { ...acc }

    const additiveKeys = [
      'spreadRate',
      'actualFatPerDay',
      'visibleFatPerDay',
      'adjacentSpread',
      'seaSpread',
      'mpGain',
      'fatGrowthOver40',
      'acceptance',
      'awarenessRate',
      'visibleAwarenessRate',
      'earlyVisibleAwarenessRate',
      'visibleFatRate',
      'concealment',
      'researchSpeed',
      'researchTriggerDelay',
      'worldAwarenessRate',
      'visibilityRisk',
    ] as const

    additiveKeys.forEach((key) => {
      const value = effects[key]
      if (typeof value === 'number') {
        const previous = next[key]
        next[key] = ((typeof previous === 'number' ? previous : 0) + value) as EffectSet[typeof key]
      }
    })

    const mergeNested = <K extends keyof EffectSet>(key: K) => {
      const source = effects[key]
      if (!source || typeof source !== 'object') return
      const current = (next[key] as Record<string, number> | undefined) ?? {}
      next[key] = {
        ...current,
        ...Object.fromEntries(
          Object.entries(source as Record<string, number>).map(([entryKey, value]) => [
            entryKey,
            (current[entryKey] ?? 0) + value,
          ]),
        ),
      } as EffectSet[K]
    }

    ;[
      'bodyPartGrowth',
      'tagSpread',
      'tagActualFat',
      'countrySpread',
      'countryActualFat',
      'countryAcceptance',
      'countryConcealment',
      'countryAwareness',
      'countryResistance',
    ].forEach((key) => mergeNested(key as keyof EffectSet))

    return next
  }, {})
}

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value))

const getTagBonus = (tags: string[], record?: Record<string, number>) =>
  tags.reduce((sum, tag) => sum + (record?.[tag] ?? 0), 0)

const getDifficultyResearchMultiplier = (difficulty: GameState['difficulty']) => {
  switch (difficulty) {
    case 'story':
      return 0.82
    case 'hard':
      return 1.22
    default:
      return 1
  }
}

const getDifficultySpreadMultiplier = (difficulty: GameState['difficulty']) => {
  switch (difficulty) {
    case 'story':
      return 1.08
    case 'hard':
      return 0.94
    default:
      return 1
  }
}

const getPolicySpreadMultiplier = (policy: GameState['countries'][CountryId]['policy']) => {
  switch (policy) {
    case 'watch':
      return 0.95
    case 'rationing':
      return 0.82
    case 'warding':
      return 0.68
    default:
      return 1
  }
}

const getPolicyFatMultiplier = (policy: GameState['countries'][CountryId]['policy']) => {
  switch (policy) {
    case 'watch':
      return 0.96
    case 'rationing':
      return 0.84
    case 'warding':
      return 0.7
    default:
      return 1
  }
}

const getPolicyAwarenessBonus = (policy: GameState['countries'][CountryId]['policy']) => {
  switch (policy) {
    case 'watch':
      return 0.02
    case 'rationing':
      return 0.04
    case 'warding':
      return 0.06
    default:
      return 0
  }
}

const bodyAwarenessWeights: Record<BodyPart, number> = {
  abdomen: 0.07,
  hips: 0.045,
  thighs: 0.04,
  face: 0.065,
  arms: 0.035,
}

export function simulateDay(
  state: GameState,
  countries: CountryDefinition[],
  effects: EffectSet,
): GameState {
  const countryMap = new Map(countries.map((country) => [country.id, country]))
  const nextCountries = { ...state.countries }

  countries.forEach((country) => {
    const current = state.countries[country.id]
    const infectedNeighbors = country.connections
      .map((id) => state.countries[id])
      .filter((neighbor) => neighbor.infection > 0)

    const ownSpread =
      current.infection > 0
        ? 0.3 * (country.spreadEase / 3) * (1 + (effects.spreadRate ?? 0))
        : 0

    const neighborSpread = infectedNeighbors.reduce((sum, neighbor) => {
      const sourceCountry = countryMap.get(neighbor.id)
      const isSeaRoute = country.id === 'feiria' || sourceCountry?.id === 'feiria'
      const seaBonus = isSeaRoute ? effects.seaSpread ?? 0 : 0
      return sum + (neighbor.infection / 100) * (0.18 + (effects.adjacentSpread ?? 0) + seaBonus)
    }, 0)

    const tagSpread = getTagBonus(country.tags, effects.tagSpread)
    const countrySpread = effects.countrySpread?.[country.id] ?? 0
    const resistanceModifier = 1 - (effects.countryResistance?.[country.id] ?? 0)
    const infectionGain =
      (ownSpread + neighborSpread) *
      (1 + tagSpread + countrySpread) *
      getPolicySpreadMultiplier(current.policy) *
      resistanceModifier *
      getDifficultySpreadMultiplier(state.difficulty)

    const tagActualFat = getTagBonus(country.tags, effects.tagActualFat)
    const countryActualFat = effects.countryActualFat?.[country.id] ?? 0
    const actualBase = 0.06 + (effects.actualFatPerDay ?? 0) + tagActualFat + countryActualFat
    const fatGrowthBonus = current.actualFat >= 40 ? 1 + (effects.fatGrowthOver40 ?? 0) : 1
    const actualGain =
      (current.infection / 100) *
      actualBase *
      fatGrowthBonus *
      getPolicyFatMultiplier(current.policy) *
      resistanceModifier

    const nextBodyParts = { ...current.bodyParts }
    ;(Object.keys(nextBodyParts) as BodyPart[]).forEach((part) => {
      const naturalGrowth = actualGain * (part === 'abdomen' ? 0.7 : 0.35)
      const skillGrowth = (effects.bodyPartGrowth?.[part] ?? 0) * (current.infection / 100)
      nextBodyParts[part] = clamp(nextBodyParts[part] + naturalGrowth + skillGrowth)
    })

    const visibleFromParts =
      nextBodyParts.abdomen * 0.34 +
      nextBodyParts.hips * 0.22 +
      nextBodyParts.thighs * 0.2 +
      nextBodyParts.face * 0.14 +
      nextBodyParts.arms * 0.1
    const visibleBase = 0.03 + (effects.visibleFatPerDay ?? 0)
    const visibleRate = 1 + (effects.visibleFatRate ?? 0)
    const visibleGrowthCurve = 1 + Math.max(0, current.actualFat - 40) / 120
    const visibleGain =
      (current.actualFat / 100) * visibleBase * visibleRate * visibleGrowthCurve +
      Math.max(0, visibleFromParts - current.visibleFat) * 0.06

    const concealment =
      country.concealEase * 2 +
      (effects.concealment ?? 0) +
      (effects.countryConcealment?.[country.id] ?? 0)
    const acceptance =
      (effects.acceptance ?? 0) +
      (effects.countryAcceptance?.[country.id] ?? 0)
    const earlyVisibleModifier = current.visibleFat < 40 ? effects.earlyVisibleAwarenessRate ?? 0 : 0
    const bodyVisibilityContribution = (Object.entries(nextBodyParts) as Array<[BodyPart, number]>).reduce(
      (sum, [part, value]) => sum + value * bodyAwarenessWeights[part],
      0,
    )
    const visibleContribution = Math.max(
      0,
      current.visibleFat *
        0.025 *
        (1 + (effects.visibleAwarenessRate ?? 0) + earlyVisibleModifier) -
        acceptance * 0.03,
    )
    const awarenessGain = Math.max(
      0,
      (visibleContribution +
        bodyVisibilityContribution * 0.018 +
        current.actualFat * 0.008 +
        (effects.visibilityRisk ?? 0) +
        (country.detectionEase - 3) * 0.01 +
        (effects.awarenessRate ?? 0) +
        (effects.countryAwareness?.[country.id] ?? 0) -
        concealment * 0.01 +
        getPolicyAwarenessBonus(current.policy)) *
        (1 + (effects.worldAwarenessRate ?? 0)),
    )

    const nextPolicy =
      current.awareness >= 70
        ? 'warding'
        : current.awareness >= 45
          ? 'rationing'
          : current.awareness >= 25
            ? 'watch'
            : current.policy

    nextCountries[country.id] = {
      ...current,
      infection: clamp(current.infection + infectionGain),
      actualFat: clamp(current.actualFat + actualGain),
      visibleFat: clamp(Math.max(current.visibleFat + visibleGain, visibleFromParts * 0.72)),
      awareness: clamp(current.awareness + awarenessGain),
      policy: nextPolicy,
      bodyParts: nextBodyParts,
    }
  })

  const worldVisibleFat = weightedAverage(countries, nextCountries, 'visibleFat')
  const worldActualFat = weightedAverage(countries, nextCountries, 'actualFat')
  const awareResearchCountries = countries.filter(
    (country) => nextCountries[country.id].awareness >= 35 && country.researchWeight >= 16,
  ).length
  const researchThreshold = 60 + (effects.researchTriggerDelay ?? 0)
  const shouldStartResearch =
    state.researchStarted ||
    countries.some((country) => nextCountries[country.id].awareness >= researchThreshold) ||
    worldVisibleFat >= 25 ||
    worldActualFat >= 45 ||
    awareResearchCountries >= 2

  const totalResearchContribution = countries.reduce((sum, country) => {
    const current = nextCountries[country.id]
    if (current.awareness < 20) return sum
    return sum + country.researchWeight * (current.awareness / 100)
  }, 0)

  const researchGain = shouldStartResearch
    ? Math.max(0.02, totalResearchContribution / 180) *
      (1 + (effects.researchSpeed ?? 0)) *
      getDifficultyResearchMultiplier(state.difficulty)
    : 0

  const won =
    countries.every((country) => nextCountries[country.id].infection >= 95) &&
    weightedAverage(countries, nextCountries, 'actualFat') >= 70
  const lost = state.researchProgress + researchGain >= 100

  return {
    ...state,
    day: state.day + 1,
    researchStarted: shouldStartResearch,
    researchProgress: clamp(state.researchProgress + researchGain),
    countries: nextCountries,
    status: won ? 'won' : lost ? 'lost' : state.status,
  }
}

export function weightedAverage(
  countries: CountryDefinition[],
  states: GameState['countries'],
  key: keyof Pick<GameState['countries'][CountryId], 'infection' | 'actualFat' | 'visibleFat' | 'awareness'>,
) {
  const total = countries.reduce((sum, country) => sum + country.populationWeight, 0)
  return countries.reduce((sum, country) => sum + states[country.id][key] * country.populationWeight, 0) / total
}
