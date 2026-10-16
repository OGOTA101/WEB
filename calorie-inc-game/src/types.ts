export type CountryId =
  | 'aurelia'
  | 'marchelle'
  | 'luminas'
  | 'grau'
  | 'eldina'
  | 'valk'
  | 'feiria'

export type SkillTree = 'spread' | 'manifestation' | 'corruption' | 'concealment'
export type Difficulty = 'story' | 'standard' | 'hard'
export type BodyPart = 'abdomen' | 'hips' | 'thighs' | 'face' | 'arms'

export type EffectSet = {
  spreadRate?: number
  actualFatPerDay?: number
  visibleFatPerDay?: number
  adjacentSpread?: number
  seaSpread?: number
  mpGain?: number
  fatGrowthOver40?: number
  acceptance?: number
  awarenessRate?: number
  visibleAwarenessRate?: number
  earlyVisibleAwarenessRate?: number
  visibleFatRate?: number
  concealment?: number
  researchSpeed?: number
  researchTriggerDelay?: number
  worldAwarenessRate?: number
  visibilityRisk?: number
  bodyPartGrowth?: Partial<Record<BodyPart, number>>
  tagSpread?: Record<string, number>
  tagActualFat?: Record<string, number>
  countrySpread?: Partial<Record<CountryId, number>>
  countryActualFat?: Partial<Record<CountryId, number>>
  countryAcceptance?: Partial<Record<CountryId, number>>
  countryConcealment?: Partial<Record<CountryId, number>>
  countryAwareness?: Partial<Record<CountryId, number>>
  countryResistance?: Partial<Record<CountryId, number>>
}

export type CountryDefinition = {
  id: CountryId
  name: string
  race: string
  role: string
  populationWeight: number
  researchWeight: number
  spreadEase: number
  concealEase: number
  detectionEase: number
  holdout: number
  x: number
  y: number
  connections: CountryId[]
  tags: string[]
  summary: string
  illustration: string
  leader: {
    name: string
    title: string
  }
  bodyProfile: {
    height: number
    weight: number
    bust: number
    waist: number
    hips: number
    bodyFat: number
  }
  leaderLines: {
    calm: string[]
    suspicious: string[]
    resisting: string[]
    corrupted: string[]
  }
}

export type SkillDefinition = {
  id: string
  name: string
  tree: SkillTree
  tier: number
  cost: number
  prerequisites: string[]
  effects: EffectSet
  description: string
  mutationWeight?: number
  devolvable?: boolean
}

export type CountryState = {
  id: CountryId
  infection: number
  actualFat: number
  visibleFat: number
  awareness: number
  policy: 'none' | 'watch' | 'rationing' | 'warding'
  bodyParts: Record<BodyPart, number>
}

export type Bubble = {
  id: string
  countryId: CountryId
  x: number
  y: number
  value: number
  kind: 'magic' | 'milestone' | 'sabotage'
  headline: string
  detail: string
}

export type MajorNews = {
  id: string
  title: string
  body: string
  tone: 'story' | 'warning' | 'danger' | 'victory'
}

export type HistoryPoint = {
  day: number
  infection: number
  actualFat: number
  visibleFat: number
  awareness: number
  research: number
}

export type GameStatus = 'setup' | 'running' | 'paused' | 'won' | 'lost'

export type GameState = {
  status: GameStatus
  difficulty: Difficulty
  day: number
  mp: number
  speed: 0.25 | 0.5 | 1 | 2 | 4
  selectedCountryId: CountryId | null
  startedIn: CountryId | null
  researchStarted: boolean
  researchProgress: number
  countries: Record<CountryId, CountryState>
  unlockedSkillIds: string[]
  bubbles: Bubble[]
  log: string[]
  seenEventIds: string[]
  claimedMilestones: string[]
  majorNewsQueue: MajorNews[]
  history: HistoryPoint[]
}
