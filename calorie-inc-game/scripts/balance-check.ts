import countries from '../src/data.countries.json'
import skills from '../src/data.skills.json'
import { aggregateEffects, simulateDay, weightedAverage } from '../src/simulation'
import type { CountryDefinition, GameState, SkillDefinition } from '../src/types'

const countryList = countries as CountryDefinition[]
const skillList = skills as SkillDefinition[]
const baseCountries = Object.fromEntries(
  countryList.map((country) => [country.id, { id: country.id, infection: 0, actualFat: 0, visibleFat: 0, awareness: 0, policy: 'none' }]),
) as GameState['countries']
let state: GameState = {
  status: 'running',
  day: 1,
  mp: 999,
  speed: 1,
  selectedCountryId: 'marchelle',
  startedIn: 'marchelle',
  researchStarted: false,
  researchProgress: 0,
  countries: { ...baseCountries, marchelle: { id: 'marchelle', infection: 6, actualFat: 2, visibleFat: 0.5, awareness: 0, policy: 'none' } },
  unlockedSkillIds: [
    'SPR-01','SPR-02','SPR-09','SPR-10','MAN-01','MAN-02','MAN-05','MAN-06','CON-01','CON-02','COR-01','COR-02','COR-11'
  ],
  bubbles: [],
  log: [],
  seenEventIds: [],
  claimedMilestones: [],
}
const unlocked = skillList.filter((skill) => state.unlockedSkillIds.includes(skill.id))
const effects = aggregateEffects(unlocked)
for (let i = 0; i < 500; i += 1) {
  state = simulateDay(state, countryList, effects)
  if (state.status !== 'running') break
}
console.log({
  day: state.day,
  status: state.status,
  researchStarted: state.researchStarted,
  researchProgress: state.researchProgress.toFixed(1),
  infection: weightedAverage(countryList, state.countries, 'infection').toFixed(1),
  actualFat: weightedAverage(countryList, state.countries, 'actualFat').toFixed(1),
  visibleFat: weightedAverage(countryList, state.countries, 'visibleFat').toFixed(1),
  awareness: weightedAverage(countryList, state.countries, 'awareness').toFixed(1),
})
