import type {
  Bubble,
  CountryDefinition,
  CountryId,
  CountryState,
  GameState,
  MajorNews,
  SkillDefinition,
} from './types'
import { weightedAverage } from './simulation'

const milestoneThresholds = [1, 25, 50, 75] as const
const fatThresholds = [15, 35, 60] as const
const awarenessThresholds = [20, 45, 70] as const
const researchThresholds = [25, 50, 75] as const

const policyLabels = {
  watch: '監視',
  rationing: '節食令',
  warding: '浄化護符',
} as const

const citizenNews = {
  hidden: [
    '見た目は細いままなのに、検診だけがこっそり裏切る。体脂だけが、昨日より少し多い。',
    '鏡の中ではいつも通り。けれど階段を上がるたび、胸より先に腹の奥が重くなる。',
    '衣の寸法は同じでも、身体の内側にだけ甘い重みが住みつき始めている。',
  ],
  early: [
    '「ちょっと柔らかくなった？」と笑い合う声が、街のあちこちで聞こえるようになった。',
    '仕立屋には、腰回りをほんの一指ぶん緩める注文が増えている。',
    '座った時だけ、下腹に小さな丸みが現れる者が増えてきた。',
  ],
  visible: [
    '市場では、ベルト穴をひとつ外へ移す仕草が珍しくなくなってきた。',
    '踊りの輪では、頬や太ももに増えた柔らかさを気にする娘たちの姿が目立つ。',
    '酒場の椅子がきしむ音と、満腹のため息が、以前より少し長く残る。',
  ],
  heavy: [
    '国中で歩みがゆるみ、昼寝と甘味の時間がすっかり暮らしに溶け込んだ。',
    '仕立屋は大きめの服ばかり縫い、昔の寸法帳が役に立たなくなり始めている。',
    '腹を支えて笑う人々の姿が、もはや特別なものではなくなった。',
  ],
}

const cureNews = [
  '各国の賢者が、欲求そのものを祓う瘦身術式の共同研究を始めた。',
  'ルミナスの白塔で、体脂の異常増加を追う魔導検査が公開された。',
  '研究者たちは「これはただの飽食ではない」と声明を出した。',
  '都市部では検診と節食指導が強化され、異変の輪郭が少しずつ掴まれ始めた。',
]

const suspicionNews = [
  '各地で、甘味の流行と身体変化の関係を疑う声が上がっている。',
  '魔導医たちは「見えない肥満」の急増に警戒を強めている。',
  '一部の新聞が、衣装流行の裏にある体型変化を特集し始めた。',
]

const countryChainEvents: Record<CountryId, Array<{ id: string; condition: (s: CountryState) => boolean; text: string; major?: MajorNews }>> = {
  aurelia: [
    {
      id: 'aurelia:chain:atelier',
      condition: (s) => s.actualFat >= 24,
      text: '【アウレリア】王都の仕立屋通りで、ドレスの脇をそっと広げる依頼が増えた。',
    },
    {
      id: 'aurelia:chain:ball',
      condition: (s) => s.visibleFat >= 35,
      text: '【アウレリア】舞踏会では、以前より柔らかな輪郭の令嬢たちが注目を集めている。',
    },
  ],
  marchelle: [
    {
      id: 'marchelle:chain:stall',
      condition: (s) => s.infection >= 28,
      text: '【マルシェル】新作の蜜菓子屋台に長蛇の列。港の朝は、すっかり甘い匂いになった。',
    },
    {
      id: 'marchelle:chain:nap',
      condition: (s) => s.actualFat >= 42,
      text: '【マルシェル】昼休みを長く取る商人が増え、午後の競りが少し遅れ始めている。',
    },
  ],
  luminas: [
    {
      id: 'luminas:chain:record',
      condition: (s) => s.awareness >= 22,
      text: '【ルミナス】白塔の記録官が、細身のまま体脂だけ増す症例を別冊にまとめ始めた。',
    },
    {
      id: 'luminas:chain:edict',
      condition: (s) => s.awareness >= 55,
      text: '【ルミナス】大司教が節制布告を発令。食卓の祈りが、少しだけ長くなった。',
    },
  ],
  grau: [
    {
      id: 'grau:chain:festival',
      condition: (s) => s.infection >= 24,
      text: '【グラウ】収穫祭の鍋がいつもより早く空き、村の娘たちが笑いながらおかわりを並べた。',
    },
    {
      id: 'grau:chain:rest',
      condition: (s) => s.actualFat >= 48,
      text: '【グラウ】畑の午後休みが少し長くなり、納屋の影で満腹の寝息が増えている。',
    },
  ],
  eldina: [
    {
      id: 'eldina:chain:mirror',
      condition: (s) => s.actualFat >= 22,
      text: '【エルディナ】幻影の衣はまだ細いまま。けれど枝渡りの足音だけが重くなってきた。',
    },
    {
      id: 'eldina:chain:mirror-tree',
      condition: (s) => s.awareness >= 42,
      text: '【エルディナ】鏡樹の前で、幻術を解いた若者たちが静かに息を呑んだ。',
    },
  ],
  valk: [
    {
      id: 'valk:chain:training',
      condition: (s) => s.actualFat >= 26,
      text: '【ヴァルク】朝練の列に、いつもより早く座り込む者が増え始めた。',
    },
    {
      id: 'valk:chain:hunt',
      condition: (s) => s.visibleFat >= 38,
      text: '【ヴァルク】狩りのあと、焚き火へ戻る足取りが以前よりゆっくりになった。',
    },
  ],
  feiria: [
    {
      id: 'feiria:chain:tea',
      condition: (s) => s.infection >= 18,
      text: '【フェイリア】午後のお茶会で、羽を休める時間がほんの少し長くなった。',
    },
    {
      id: 'feiria:chain:gate',
      condition: (s) => s.awareness >= 36,
      text: '【フェイリア】花粉の門が半分だけ閉じられ、外の蜜菓子に検査印が求められた。',
    },
  ],
}

export function resolveDayTransitions(
  previous: GameState,
  next: GameState,
  countries: CountryDefinition[],
  skills: SkillDefinition[],
): GameState {
  const bubbles = [...next.bubbles]
  const log = [...next.log]
  const claimedMilestones = [...next.claimedMilestones]
  const seenEventIds = [...next.seenEventIds]
  const majorNewsQueue = [...next.majorNewsQueue]
  let unlockedSkillIds = [...next.unlockedSkillIds]

  countries.forEach((country) => {
    const before = previous.countries[country.id]
    const after = next.countries[country.id]

    milestoneThresholds.forEach((threshold) => {
      const milestoneId = `${country.id}:infection:${threshold}`
      if (before.infection < threshold && after.infection >= threshold && !claimedMilestones.includes(milestoneId)) {
        bubbles.push(
          createBubble(
            country.id,
            country.x,
            country.y,
            threshold === 1 ? 3 : threshold === 25 ? 2 : threshold === 50 ? 3 : 4,
            'milestone',
            threshold === 1 ? `${country.name} へ侵入` : `${country.name} ${threshold}% 浸透`,
            threshold === 1
              ? '新たな国へ肥満魔瘴が根を下ろした。'
              : `${country.name} の平均ウエストがさらに押し広げられている。`,
          ),
        )
        claimedMilestones.push(milestoneId)
        log.unshift(
          threshold === 1
            ? `${country.name} に肥満魔瘴が侵入した。`
            : `${country.name} の浸透率が ${threshold}% を超えた。`,
        )
      }
    })

    fatThresholds.forEach((threshold) => {
      const fatId = `${country.id}:fat:${threshold}`
      if (before.actualFat < threshold && after.actualFat >= threshold && !seenEventIds.includes(fatId)) {
        seenEventIds.push(fatId)
        const line =
          threshold === 15
            ? `${country.name} で隠れ肥満が目立ち始めた。`
            : threshold === 35
              ? `${country.name} で太り始めの丸みが日常の風景になりつつある。`
              : `${country.name} では、目に見える肥満化が社会全体へ広がっている。`
        log.unshift(line)
      }
    })

    awarenessThresholds.forEach((threshold) => {
      const awarenessId = `${country.id}:awareness:${threshold}`
      if (before.awareness < threshold && after.awareness >= threshold && !seenEventIds.includes(awarenessId)) {
        seenEventIds.push(awarenessId)
        const line =
          threshold === 20
            ? `${country.name} の魔導医が、体脂の異常増加を疑い始めた。`
            : threshold === 45
              ? `${country.name} が公的に異変を認め、節食と検診を呼びかけた。`
              : `${country.name} は肥満魔瘴を国家危機として扱い始めた。`
        log.unshift(line)
      }
    })

    if (before.policy !== after.policy && after.policy !== 'none') {
      const policyEventId = `${country.id}:policy:${after.policy}`
      if (!seenEventIds.includes(policyEventId)) {
        seenEventIds.push(policyEventId)
        log.unshift(`${country.name} が対策「${policyLabels[after.policy]}」を開始した。`)
      }
    }

    countryChainEvents[country.id].forEach((entry) => {
      if (entry.condition(after) && !seenEventIds.includes(entry.id)) {
        seenEventIds.push(entry.id)
        log.unshift(entry.text)
        if (entry.major) majorNewsQueue.push(entry.major)
      }
    })
  })

  researchThresholds.forEach((threshold) => {
    const milestoneId = `research:${threshold}`
    if (previous.researchProgress < threshold && next.researchProgress >= threshold && !claimedMilestones.includes(milestoneId)) {
      const target = countries.reduce((best, country) =>
        next.countries[country.id].awareness > next.countries[best.id].awareness ? country : best,
      )
      bubbles.push(
        createBubble(
          target.id,
          target.x,
          target.y,
          2,
          'sabotage',
          `研究妨害の機会 ${threshold}%`,
          '瘦身魔法の研究線に綻びが生まれた。押せば進捗を削れる。',
        ),
      )
      claimedMilestones.push(milestoneId)
      log.unshift(`瘦身魔法の研究が ${threshold}% に到達。妨害の余地が生まれた。`)
    }
  })

  const worldInfection = weightedAverage(countries, next.countries, 'infection')
  const worldActualFat = weightedAverage(countries, next.countries, 'actualFat')
  const worldVisibleFat = weightedAverage(countries, next.countries, 'visibleFat')
  const worldAwareness = weightedAverage(countries, next.countries, 'awareness')
  const worldEvents: Array<[string, boolean, string, MajorNews?]> = [
    ['world:infection:10', worldInfection >= 10, '各地で甘い流行が芽吹き始めた。'],
    [
      'world:infection:40',
      worldInfection >= 40,
      '肥満魔瘴は大陸規模の流行へ育った。',
      {
        id: 'major:continental-spread',
        title: '大陸規模の甘い流行',
        body: '一国の流行では済まされなくなった。菓子、倦怠、密かな体脂の増加――それぞれ別々に見えた兆候が、同じ魔瘴の糸で結ばれている。',
        tone: 'story',
      },
    ],
    ['world:infection:75', worldInfection >= 75, 'ほぼ全土で、甘い堕落が日常の底へ染み込んでいる。'],
    ['world:fat:20', worldActualFat >= 20, '太り始めの兆候が、各地の日常へ混じり始めた。'],
    [
      'world:fat:45',
      worldActualFat >= 45,
      '世界は内側からかなり深く鈍っている。',
      {
        id: 'major:hidden-obesity',
        title: '隠れ肥満、世界的に急増',
        body: '見た目はまだ変わらないのに、数字だけが先に丸くなっていく。魔導医たちはついに「見えない肥満」という言葉を使い始めた。',
        tone: 'warning',
      },
    ],
    [
      'world:fat:65',
      worldActualFat >= 65,
      '大陸の身体つきそのものが、以前とは別物になりつつある。',
      {
        id: 'major:late-collapse',
        title: '諸国で生活機能の鈍化',
        body: '朝の鐘は遅れ、午後の街は静かになり、夜の食卓だけが長くなる。世界はまだ立っている。けれど、もう以前の速さでは動けない。',
        tone: 'danger',
      },
    ],
    [
      'world:visible:25',
      worldVisibleFat >= 25,
      '新聞が「急増する腹囲」を一面で扱い始めた。',
      {
        id: 'major:visible-change',
        title: '新聞一面「急増する腹囲」',
        body: '頬、腰、太もも、下腹。街のあちこちで、同じような変化が同時に進んでいる。人々はようやく、これは個人差ではないと気づき始めた。',
        tone: 'warning',
      },
    ],
    ['world:awareness:35', worldAwareness >= 35, '各国は肥満魔瘴を共通の脅威として認識し始めた。'],
  ]

  worldEvents.forEach(([id, condition, message, major]) => {
    if (condition && !seenEventIds.includes(id)) {
      seenEventIds.push(id)
      log.unshift(message)
      if (major) majorNewsQueue.push(major)
    }
  })

  if (!previous.researchStarted && next.researchStarted && !seenEventIds.includes('major:research-start')) {
    seenEventIds.push('major:research-start')
    majorNewsQueue.push({
      id: 'major:research-start',
      title: '瘦身魔法《リデュース》、共同研究開始',
      body: 'ルミナスを中心に、各国の賢者が手を結んだ。完成すれば、あなたの甘い侵攻はここで終わる。',
      tone: 'danger',
    })
  }

  const mutation = tryNaturalMutation(next, skills, seenEventIds)
  if (mutation) {
    unlockedSkillIds = [...unlockedSkillIds, mutation.id]
    log.unshift(`自然変異により「${mutation.name}」が勝手に発現した。`)
    if (!seenEventIds.includes(`mutation:${mutation.id}:${next.day}`)) {
      seenEventIds.push(`mutation:${mutation.id}:${next.day}`)
    }
  }

  appendPeriodicNews(next.day, next, countries, log, seenEventIds)

  return {
    ...next,
    bubbles,
    claimedMilestones,
    seenEventIds,
    log: log.slice(0, 18),
    unlockedSkillIds,
    majorNewsQueue,
  }
}

function tryNaturalMutation(state: GameState, skills: SkillDefinition[], seenEventIds: string[]) {
  if (state.day < 12 || state.day % 13 !== 0) return null
  const eligible = skills.filter(
    (skill) =>
      (skill.mutationWeight ?? 0) > 0 &&
      !state.unlockedSkillIds.includes(skill.id) &&
      skill.prerequisites.every((id) => state.unlockedSkillIds.includes(id)),
  )
  if (eligible.length === 0) return null
  const mutationChance = state.difficulty === 'story' ? 0.16 : state.difficulty === 'hard' ? 0.3 : 0.23
  if (Math.random() > mutationChance) return null
  const total = eligible.reduce((sum, skill) => sum + (skill.mutationWeight ?? 0), 0)
  let roll = Math.random() * total
  for (const skill of eligible) {
    roll -= skill.mutationWeight ?? 0
    if (roll <= 0 && !seenEventIds.includes(`mutation-lock:${skill.id}`)) return skill
  }
  return eligible[0] ?? null
}

function appendPeriodicNews(
  day: number,
  state: GameState,
  countries: CountryDefinition[],
  log: string[],
  seenEventIds: string[],
) {
  if (day % 6 === 0) {
    const focus = getFocusCountry(countries, state.countries)
    const stage = getCountryStage(state.countries[focus.id])
    const newsId = `periodic:citizen:${day}`
    if (!seenEventIds.includes(newsId)) {
      seenEventIds.push(newsId)
      const pool =
        stage === 'hidden'
          ? citizenNews.hidden
          : stage === 'early'
            ? citizenNews.early
            : stage === 'visible'
              ? citizenNews.visible
              : citizenNews.heavy
      log.unshift(`【${focus.name}】${pickByDay(pool, day)}`)
    }
  }

  if (day % 9 === 0) {
    const focus = getLeaderFocusCountry(countries, state.countries, day)
    const lineId = `periodic:leader:${day}`
    if (!seenEventIds.includes(lineId)) {
      seenEventIds.push(lineId)
      const stance = getLeaderStance(state.countries[focus.id])
      log.unshift(`【${focus.leader.title} ${focus.leader.name}】${pickByDay(focus.leaderLines[stance], day)}`)
    }
  }

  if (day % 11 === 0) {
    const reportId = `periodic:world:${day}`
    if (!seenEventIds.includes(reportId)) {
      seenEventIds.push(reportId)
      const worldAwareness = weightedAverage(countries, state.countries, 'awareness')
      const pool = state.researchStarted || worldAwareness >= 28 ? cureNews : suspicionNews
      log.unshift(`【世界報】${pickByDay(pool, day)}`)
    }
  }
}

function getFocusCountry(countries: CountryDefinition[], states: Record<CountryId, CountryState>) {
  return [...countries].sort((a, b) => {
    const scoreA = states[a.id].actualFat * 1.2 + states[a.id].visibleFat + states[a.id].infection * 0.2
    const scoreB = states[b.id].actualFat * 1.2 + states[b.id].visibleFat + states[b.id].infection * 0.2
    return scoreB - scoreA
  })[0]
}

function getLeaderFocusCountry(
  countries: CountryDefinition[],
  states: Record<CountryId, CountryState>,
  day: number,
) {
  const sorted = [...countries].sort((a, b) => {
    const scoreA = states[a.id].awareness * 1.3 + states[a.id].actualFat + states[a.id].infection * 0.25
    const scoreB = states[b.id].awareness * 1.3 + states[b.id].actualFat + states[b.id].infection * 0.25
    return scoreB - scoreA
  })
  return sorted[day % Math.min(3, sorted.length)]
}

function getCountryStage(state: CountryState) {
  if (state.actualFat < 18) return 'hidden'
  if (state.visibleFat < 18) return 'early'
  if (state.actualFat < 55) return 'visible'
  return 'heavy'
}

function getLeaderStance(state: CountryState): keyof CountryDefinition['leaderLines'] {
  if (state.awareness >= 55) return 'resisting'
  if (state.actualFat >= 52 && state.awareness < 35) return 'corrupted'
  if (state.awareness >= 20) return 'suspicious'
  return 'calm'
}

function pickByDay<T>(items: T[], day: number) {
  return items[day % items.length]
}

export function createBubble(
  countryId: CountryId,
  x: number,
  y: number,
  value: number,
  kind: Bubble['kind'],
  headline = '魔力の泡',
  detail = '魔瘴の流れから魔力を回収できる。',
): Bubble {
  return {
    id: crypto.randomUUID(),
    countryId,
    x: x + (Math.random() * 8 - 4),
    y: y + (Math.random() * 8 - 4),
    value,
    kind,
    headline,
    detail,
  }
}
