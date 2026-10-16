import type { BodyPart, CountryDefinition, CountryState } from './types'

const bodyWeights: Record<BodyPart, number> = {
  abdomen: 0.34,
  hips: 0.22,
  thighs: 0.2,
  face: 0.14,
  arms: 0.1,
}

export function calculateCountryMetrics(country: CountryDefinition, state: CountryState) {
  const { abdomen, hips, thighs, face, arms } = state.bodyParts
  const weightGain = state.actualFat * 0.23
  const waistGain = state.actualFat * 0.08 + abdomen * 0.22 + hips * 0.03
  const bustGain = state.actualFat * 0.04 + arms * 0.04 + face * 0.01
  const hipGain = state.actualFat * 0.06 + hips * 0.18 + thighs * 0.06
  const bodyFatGain = state.actualFat * 0.23
  const bodyVisibility = Object.entries(state.bodyParts).reduce(
    (sum, [part, value]) => sum + value * bodyWeights[part as BodyPart],
    0,
  )
  const hiddenObesity = Math.max(0, state.actualFat - bodyVisibility * 0.78)
  const visibleRatio = state.actualFat <= 0 ? 0 : Math.min(100, (state.visibleFat / state.actualFat) * 100)

  return {
    height: country.bodyProfile.height,
    weight: country.bodyProfile.weight + weightGain,
    bust: country.bodyProfile.bust + bustGain,
    waist: country.bodyProfile.waist + waistGain,
    hips: country.bodyProfile.hips + hipGain,
    bodyFat: country.bodyProfile.bodyFat + bodyFatGain,
    hiddenObesity,
    visibleRatio,
    waistGain,
    bodyVisibility,
    bodyParts: state.bodyParts,
  }
}

export function getBodyPartLabel(part: BodyPart) {
  switch (part) {
    case 'abdomen':
      return '腹部'
    case 'hips':
      return '腰回り'
    case 'thighs':
      return '太もも'
    case 'face':
      return '頬'
    case 'arms':
      return '二の腕'
  }
}
