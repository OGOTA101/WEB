import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import countriesJson from './data.countries.json'
import skillsJson from './data.skills.json'
import eventsJson from './data.events.json'
import worldMap from './assets/world-map.webp'
import demonPrincessIcon from './assets/demon-princess-icon.webp'
import aureliaScene from './assets/scenes/aurelia-scene.svg'
import marchelleScene from './assets/scenes/marchelle-scene.svg'
import luminasScene from './assets/scenes/luminas-scene.svg'
import grauScene from './assets/scenes/grau-scene.svg'
import eldinaScene from './assets/scenes/eldina-scene.svg'
import valkScene from './assets/scenes/valk-scene.svg'
import feiriaScene from './assets/scenes/feiria-scene.svg'
import { calculateCountryMetrics, getBodyPartLabel } from './body-metrics'
import { createBubble, resolveDayTransitions } from './game-events'
import { aggregateEffects, simulateDay, weightedAverage } from './simulation'
import type {
  BodyPart,
  Bubble,
  CountryDefinition,
  CountryId,
  CountryState,
  Difficulty,
  GameState,
  SkillDefinition,
  SkillTree,
} from './types'
import './App.css'

const countries = countriesJson as CountryDefinition[]
const skills = skillsJson as SkillDefinition[]
const events = eventsJson as { id: string; text: string }[]
const countryById = new Map(countries.map((country) => [country.id, country]))
const skillById = new Map(skills.map((skill) => [skill.id, skill]))
const skillTrees: { id: SkillTree; label: string }[] = [
  { id: 'spread', label: '流行' },
  { id: 'manifestation', label: '肉付き' },
  { id: 'corruption', label: '堕落' },
  { id: 'concealment', label: '偽装' },
]
const speedOptions: GameState['speed'][] = [0.25, 0.5, 1, 2, 4]
const difficultyOptions: Array<{ id: Difficulty; label: string; note: string }> = [
  { id: 'story', label: '物語', note: '研究が遅く、肥満化の広がりを味わいやすい。' },
  { id: 'standard', label: '標準', note: '今後の基準になる正規バランス。' },
  { id: 'hard', label: '難関', note: '発覚が早く、瘦身魔法も鋭い。' },
]
const sceneByCountry: Record<CountryId, string> = {
  aurelia: aureliaScene,
  marchelle: marchelleScene,
  luminas: luminasScene,
  grau: grauScene,
  eldina: eldinaScene,
  valk: valkScene,
  feiria: feiriaScene,
}

type DetailTab = 'overview' | 'metrics' | 'leader'

const initialCountryStates = Object.fromEntries(
  countries.map((country) => [
    country.id,
    {
      id: country.id,
      infection: 0,
      actualFat: 0,
      visibleFat: 0,
      awareness: 0,
      policy: 'none',
      bodyParts: { abdomen: 0, hips: 0, thighs: 0, face: 0, arms: 0 },
    },
  ]),
) as Record<CountryId, CountryState>

const initialState: GameState = {
  status: 'setup',
  difficulty: 'standard',
  day: 1,
  mp: 10,
  speed: 1,
  selectedCountryId: 'marchelle',
  startedIn: null,
  researchStarted: false,
  researchProgress: 0,
  countries: initialCountryStates,
  unlockedSkillIds: [],
  bubbles: [],
  log: [events[0].text],
  seenEventIds: [],
  claimedMilestones: [],
  majorNewsQueue: [],
  history: [],
}

function App() {
  const [game, setGame] = useState<GameState>(() => loadGame() ?? initialState)
  const [activeTree, setActiveTree] = useState<SkillTree>('spread')
  const [detailTab, setDetailTab] = useState<DetailTab>('overview')
  const [isSkillDialogOpen, setIsSkillDialogOpen] = useState(false)
  const [resumeAfterModal, setResumeAfterModal] = useState(false)

  const unlockedSkills = useMemo(
    () => skills.filter((skill) => game.unlockedSkillIds.includes(skill.id)),
    [game.unlockedSkillIds],
  )
  const effects = useMemo(() => aggregateEffects(unlockedSkills), [unlockedSkills])
  const selectedCountry = game.selectedCountryId ? countryById.get(game.selectedCountryId) ?? null : null
  const selectedCountryState = selectedCountry ? game.countries[selectedCountry.id] : null
  const worldInfection = weightedAverage(countries, game.countries, 'infection')
  const worldActualFat = weightedAverage(countries, game.countries, 'actualFat')
  const worldVisibleFat = weightedAverage(countries, game.countries, 'visibleFat')
  const worldAwareness = weightedAverage(countries, game.countries, 'awareness')
  const activeMajorNews = game.majorNewsQueue[0] ?? null
  const hasBlockingModal = isSkillDialogOpen || Boolean(activeMajorNews)

  useEffect(() => {
    if (game.status !== 'running' || activeMajorNews) return
    const timer = window.setInterval(() => {
      setGame((current) => {
        if (current.status !== 'running') return current
        const steps = Math.max(1, Math.round(current.speed))
        const shouldAdvance = current.speed < 1 ? Math.random() < current.speed : true
        if (!shouldAdvance) return current
        const next = Array.from({ length: steps }).reduce<GameState>(
          (workingState) => {
            const simulated = simulateDay(
              workingState,
              countries,
              aggregateEffects(skills.filter((skill) => workingState.unlockedSkillIds.includes(skill.id))),
            )
            return resolveDayTransitions(workingState, simulated, countries, skills)
          },
          current,
        )
        const nextLog = [...next.log]
        if (!current.researchStarted && next.researchStarted) {
          nextLog.unshift(events.find((event) => event.id === 'research-start')?.text ?? '研究が始まった。')
        }
        if (next.status === 'won') {
          nextLog.unshift(events.find((event) => event.id === 'win')?.text ?? '勝利。')
        }
        if (next.status === 'lost') {
          nextLog.unshift(events.find((event) => event.id === 'lose')?.text ?? '敗北。')
        }
        const shouldRecord = next.day % 5 === 0 && next.history[next.history.length - 1]?.day !== next.day
        const history = shouldRecord
          ? [
              ...next.history,
              {
                day: next.day,
                infection: weightedAverage(countries, next.countries, 'infection'),
                actualFat: weightedAverage(countries, next.countries, 'actualFat'),
                visibleFat: weightedAverage(countries, next.countries, 'visibleFat'),
                awareness: weightedAverage(countries, next.countries, 'awareness'),
                research: next.researchProgress,
              },
            ]
          : next.history
        return { ...next, history, log: nextLog.slice(0, 18) }
      })
    }, 700)
    return () => window.clearInterval(timer)
  }, [game.status, activeMajorNews])

  useEffect(() => {
    if (game.status !== 'running' || activeMajorNews) return
    const timer = window.setInterval(() => {
      setGame((current) => {
        if (current.status !== 'running') return current
        if (current.bubbles.length >= 5) return current
        const infected = countries.filter((country) => current.countries[country.id].infection > 2)
        if (infected.length === 0) return current
        const country = infected[Math.floor(Math.random() * infected.length)]
        const state = current.countries[country.id]
        const waistRise = calculateCountryMetrics(country, state).waist - country.bodyProfile.waist
        const bubble = createBubble(
          country.id,
          country.x,
          country.y,
          1 + Math.floor(Math.random() * 3),
          'magic',
          `${country.name} の魔力`,
          waistRise >= 1
            ? `平均ウエストが基準より +${waistRise.toFixed(1)}cm。変化から魔力が滲んでいる。`
            : '甘い流行が根を張り、魔力が滲み出している。',
        )
        return { ...current, bubbles: [...current.bubbles, bubble] }
      })
    }, Math.max(1200, 2600 / Math.max(game.speed, 0.5)))
    return () => window.clearInterval(timer)
  }, [game.status, game.speed, activeMajorNews])

  useEffect(() => {
    saveGame(game)
  }, [game])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault()
        if (hasBlockingModal) return
        setGame((current) => ({
          ...current,
          status: current.status === 'paused' ? 'running' : current.status === 'running' ? 'paused' : current.status,
        }))
      }
      if (['1', '2', '4'].includes(event.key)) {
        setGame((current) => ({ ...current, speed: Number(event.key) as GameState['speed'] }))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [hasBlockingModal])

  const startGame = (countryId: CountryId) => {
    setGame((current) => ({
      ...current,
      status: 'running',
      startedIn: countryId,
      selectedCountryId: countryId,
      countries: {
        ...current.countries,
        [countryId]: {
          ...current.countries[countryId],
          infection: 6,
          actualFat: 2,
          visibleFat: 0.5,
          policy: 'none',
          bodyParts: { abdomen: 1.2, hips: 0.6, thighs: 0.6, face: 0.3, arms: 0.2 },
        },
      },
      log: [`${countryById.get(countryId)?.name} で肥満魔瘴が芽吹いた。`, ...current.log],
    }))
  }

  const togglePause = () => {
    if (hasBlockingModal) return
    setGame((current) => ({
      ...current,
      status: current.status === 'paused' ? 'running' : current.status === 'running' ? 'paused' : current.status,
    }))
  }

  const pauseForModal = () => {
    setResumeAfterModal(game.status === 'running')
    if (game.status === 'running') {
      setGame((current) => ({ ...current, status: 'paused' }))
    }
  }

  const resumeFromModal = () => {
    if (resumeAfterModal) {
      setGame((current) => ({ ...current, status: current.status === 'paused' ? 'running' : current.status }))
    }
    setResumeAfterModal(false)
  }

  const openSkillDialog = () => {
    pauseForModal()
    setIsSkillDialogOpen(true)
  }

  const closeSkillDialog = () => {
    setIsSkillDialogOpen(false)
    resumeFromModal()
  }

  const dismissMajorNews = () => {
    setGame((current) => ({ ...current, majorNewsQueue: current.majorNewsQueue.slice(1) }))
  }

  const collectBubble = (bubble: Bubble) => {
    setGame((current) => {
      const gain = bubble.kind === 'sabotage' ? 0 : Math.round(bubble.value * (1 + (effects.mpGain ?? 0)))
      const researchProgress =
        bubble.kind === 'sabotage' ? Math.max(0, current.researchProgress - bubble.value * 2) : current.researchProgress
      const message =
        bubble.kind === 'sabotage'
          ? `研究妨害に成功。瘦身魔法 -${bubble.value * 2}%`
          : bubble.kind === 'milestone'
            ? `節目の魔力を回収 +${gain} MP`
            : `魔力の泡を回収 +${gain} MP`
      return {
        ...current,
        mp: current.mp + gain,
        researchProgress,
        bubbles: current.bubbles.filter((entry) => entry.id !== bubble.id),
        log: [message, ...current.log].slice(0, 18),
      }
    })
  }

  const setSpeed = (speed: GameState['speed']) => {
    setGame((current) => ({ ...current, speed }))
  }

  const setDifficulty = (difficulty: Difficulty) => {
    setGame((current) => ({ ...current, difficulty }))
  }

  const restartGame = () => {
    setGame(initialState)
    window.localStorage.removeItem(SAVE_KEY)
  }

  const buySkill = (skill: SkillDefinition) => {
    setGame((current) => {
      const canAfford = current.mp >= skill.cost
      const alreadyOwned = current.unlockedSkillIds.includes(skill.id)
      const hasRequirements = skill.prerequisites.every((id) => current.unlockedSkillIds.includes(id))
      if (!canAfford || alreadyOwned || !hasRequirements) return current
      return {
        ...current,
        mp: current.mp - skill.cost,
        unlockedSkillIds: [...current.unlockedSkillIds, skill.id],
        log: [`${skill.name} を進化させた。`, ...current.log].slice(0, 18),
      }
    })
  }

  const devolveSkill = (skill: SkillDefinition) => {
    setGame((current) => {
      const owned = current.unlockedSkillIds.includes(skill.id)
      const hasDependentOwned = skills.some(
        (candidate) =>
          current.unlockedSkillIds.includes(candidate.id) && candidate.prerequisites.includes(skill.id),
      )
      if (!owned || hasDependentOwned || skill.devolvable === false) return current
      const refund = Math.max(1, Math.floor(skill.cost * 0.4))
      return {
        ...current,
        mp: current.mp + refund,
        unlockedSkillIds: current.unlockedSkillIds.filter((id) => id !== skill.id),
        seenEventIds: [...current.seenEventIds, `mutation-lock:${skill.id}`],
        log: [`${skill.name} を退化させ、目立ちにくくした。 +${refund} MP`, ...current.log].slice(0, 18),
      }
    })
  }

  const visibleSkills = skills.filter((skill) => skill.tree === activeTree)
  const selectedMetrics =
    selectedCountry && selectedCountryState ? calculateCountryMetrics(selectedCountry, selectedCountryState) : null
  const leaderStance = selectedCountryState ? getLeaderStanceLabel(selectedCountryState) : null

  return (
    <main className="game-shell">
      <header className="topbar">
        <div className="brand">
          <img src={demonPrincessIcon} alt="" />
          <div>
            <h1>Calorie Inc.</h1>
            <p>魔王令嬢の甘き再侵攻</p>
          </div>
        </div>
        <div className="hud">
          <Stat label="日数" value={`${game.day}日`} />
          <Stat label="MP" value={game.mp.toFixed(0)} />
          <Stat label="浸透" value={`${worldInfection.toFixed(0)}%`} />
          <Stat label="実肥満" value={`${worldActualFat.toFixed(0)}%`} />
          <Stat label="表面肥満" value={`${worldVisibleFat.toFixed(0)}%`} />
          <Stat label="発覚" value={`${worldAwareness.toFixed(0)}%`} />
          <Stat label="瘦身魔法" value={`${game.researchProgress.toFixed(0)}%`} danger={game.researchStarted} />
        </div>
        <div className="top-actions">
          <div className="speed-group" aria-label="進行速度">
            {speedOptions.map((speed) => (
              <button key={speed} className={game.speed === speed ? 'active' : ''} onClick={() => setSpeed(speed)}>
                {speed}x
              </button>
            ))}
          </div>
          <button
            className="pause-button"
            onClick={togglePause}
            disabled={game.status === 'setup' || game.status === 'won' || game.status === 'lost' || hasBlockingModal}
          >
            {game.status === 'paused' ? '再開' : '停止'}
          </button>
        </div>
      </header>

      <section className="content-grid">
        <aside className="panel log-panel">
          <h2>世界の動き</h2>
          <ul>
            {game.log.map((entry, index) => (
              <li key={`${entry}-${index}`}>{entry}</li>
            ))}
          </ul>
        </aside>

        <section className="map-panel">
          <img src={worldMap} alt="世界地図" className="world-map" />
          <svg className="routes" viewBox="0 0 100 100" preserveAspectRatio="none">
            {countries.flatMap((country) =>
              country.connections
                .filter((targetId) => country.id < targetId)
                .map((targetId) => {
                  const target = countryById.get(targetId)!
                  const routeClass =
                    game.countries[country.id].policy === 'warding' || game.countries[target.id].policy === 'warding'
                      ? 'sealed'
                      : game.countries[country.id].policy !== 'none' || game.countries[target.id].policy !== 'none'
                        ? 'watched'
                        : ''
                  return (
                    <line
                      key={`${country.id}-${targetId}`}
                      className={routeClass}
                      x1={country.x}
                      y1={country.y}
                      x2={target.x}
                      y2={target.y}
                    />
                  )
                }),
            )}
          </svg>

          {countries.map((country) => {
            const state = game.countries[country.id]
            const heat = Math.max(state.infection, state.actualFat * 0.8)
            return (
              <div
                key={`${country.id}-heat`}
                className="country-heat"
                style={{
                  left: `${country.x}%`,
                  top: `${country.y}%`,
                  '--heat': `${heat / 100}`,
                } as CSSProperties}
              />
            )
          })}

          {countries.map((country) => {
            const state = game.countries[country.id]
            return (
              <button
                key={country.id}
                className={[
                  'country-node',
                  game.selectedCountryId === country.id ? 'selected' : '',
                  state.infection > 0 ? 'infected' : '',
                  state.awareness >= 25 ? 'alert' : '',
                ].join(' ')}
                style={{ left: `${country.x}%`, top: `${country.y}%` }}
                onClick={() => setGame((current) => ({ ...current, selectedCountryId: country.id }))}
              >
                <span>{country.name}</span>
                <small>{state.infection.toFixed(0)}%</small>
              </button>
            )
          })}

          {game.bubbles.map((bubble) => (
            <button
              key={bubble.id}
              className={`magic-bubble ${bubble.kind}`}
              style={{ left: `${bubble.x}%`, top: `${bubble.y}%` }}
              onClick={() => collectBubble(bubble)}
              aria-label={`${bubble.headline}を回収`}
            >
              +{bubble.value}
              <span className="bubble-tooltip">
                <strong>{bubble.headline}</strong>
                <small>{bubble.detail}</small>
              </span>
            </button>
          ))}

          {game.status === 'setup' && (
            <div className="start-overlay">
              <h2>開始国を選ぶ</h2>
              <p>最初の芽を、どこへ落としますか。</p>
              <div className="difficulty-row">
                {difficultyOptions.map((option) => (
                  <button
                    key={option.id}
                    className={game.difficulty === option.id ? 'active' : ''}
                    onClick={() => setDifficulty(option.id)}
                  >
                    <strong>{option.label}</strong>
                    <span>{option.note}</span>
                  </button>
                ))}
              </div>
              <div className="start-options">
                {countries.map((country) => (
                  <button key={country.id} onClick={() => startGame(country.id)}>
                    <strong>{country.name}</strong>
                    <span>{country.role}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(game.status === 'won' || game.status === 'lost') && (
            <ResultOverlay game={game} onRestart={restartGame} />
          )}
        </section>

        <aside className="panel detail-panel">
          <div className="detail-header">
            <h2>国の詳細</h2>
            {selectedCountry ? (
              <div className="detail-tabs">
                <button className={detailTab === 'overview' ? 'active' : ''} onClick={() => setDetailTab('overview')}>
                  概要
                </button>
                <button className={detailTab === 'metrics' ? 'active' : ''} onClick={() => setDetailTab('metrics')}>
                  体型
                </button>
                <button className={detailTab === 'leader' ? 'active' : ''} onClick={() => setDetailTab('leader')}>
                  指導者
                </button>
              </div>
            ) : null}
          </div>

          {selectedCountry && selectedCountryState && selectedMetrics ? (
            <>
              <img className="country-scene" src={sceneByCountry[selectedCountry.id]} alt="" />
              <div className="country-heading">
                <strong>{selectedCountry.name}</strong>
                <span>
                  {selectedCountry.race} / {selectedCountry.role}
                </span>
              </div>

              {detailTab === 'overview' ? (
                <>
                  <p>{selectedCountry.summary}</p>
                  <div className="country-traits">
                    <span>拡散 {selectedCountry.spreadEase}/5</span>
                    <span>偽装 {selectedCountry.concealEase}/5</span>
                    <span>発覚 {selectedCountry.detectionEase}/5</span>
                    <span>研究 {selectedCountry.researchWeight}</span>
                    <span>残存 {selectedCountry.holdout}/5</span>
                  </div>
                  <Meter label="浸透率" value={selectedCountryState.infection} />
                  <Meter label="実肥満度" value={selectedCountryState.actualFat} />
                  <Meter label="表面肥満度" value={selectedCountryState.visibleFat} />
                  <Meter label="発覚度" value={selectedCountryState.awareness} danger />
                </>
              ) : null}

              {detailTab === 'metrics' ? (
                <div className="metric-grid">
                  <Metric label="成人女性平均身長" value={`${selectedMetrics.height.toFixed(0)} cm`} />
                  <Metric label="平均体重" value={`${selectedMetrics.weight.toFixed(1)} kg`} />
                  <Metric label="平均B/W/H" value={`${selectedMetrics.bust.toFixed(1)} / ${selectedMetrics.waist.toFixed(1)} / ${selectedMetrics.hips.toFixed(1)} cm`} />
                  <Metric label="推定体脂肪率" value={`${selectedMetrics.bodyFat.toFixed(1)}%`} />
                  <Metric label="隠れ肥満率" value={`${selectedMetrics.hiddenObesity.toFixed(1)}%`} />
                  <Metric label="腹囲上昇" value={`+${selectedMetrics.waistGain.toFixed(1)} cm`} />
                  <div className="body-part-grid">
                    {(Object.keys(selectedMetrics.bodyParts) as BodyPart[]).map((part) => (
                      <Metric key={part} label={getBodyPartLabel(part)} value={`${selectedMetrics.bodyParts[part].toFixed(1)}%`} />
                    ))}
                  </div>
                </div>
              ) : null}

              {detailTab === 'leader' ? (
                <div className="leader-card">
                  <span>{selectedCountry.leader.title}</span>
                  <strong>{selectedCountry.leader.name}</strong>
                  <em>{leaderStance}</em>
                  <p>{getCurrentLeaderLine(selectedCountry, selectedCountryState, game.day)}</p>
                </div>
              ) : null}

              <div className={`policy-badge ${selectedCountryState.policy}`}>
                対策: {policyLabel(selectedCountryState.policy)}
              </div>
            </>
          ) : null}
        </aside>
      </section>

      <footer className="objective-strip panel">
        <strong>勝利条件</strong>
        <span>全7か国を95%以上へ浸透</span>
        <span>世界実肥満度 70%以上</span>
        <span>瘦身魔法完成前に達成</span>
        <div className="objective-actions">
          <button onClick={openSkillDialog} disabled={game.status === 'setup'}>
            進化を開く
          </button>
          <button onClick={restartGame}>最初から</button>
        </div>
      </footer>

      {isSkillDialogOpen ? (
        <div className="dialog-backdrop" role="presentation" onMouseDown={closeSkillDialog}>
          <section className="skill-dialog panel" role="dialog" aria-modal="true" aria-label="進化" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <strong>進化</strong>
                <span>開いている間、時間は止まります。自然変異で勝手に発現したものは、ここから退化できます。</span>
              </div>
              <button onClick={closeSkillDialog}>閉じる</button>
            </header>
            <div className="skill-tabs">
              {skillTrees.map((tree) => (
                <button key={tree.id} className={activeTree === tree.id ? 'active' : ''} onClick={() => setActiveTree(tree.id)}>
                  {tree.label}
                </button>
              ))}
            </div>
            <div className="skill-grid">
              {visibleSkills.map((skill) => {
                const owned = game.unlockedSkillIds.includes(skill.id)
                const unlocked = skill.prerequisites.every((id) => game.unlockedSkillIds.includes(id))
                const affordable = game.mp >= skill.cost
                const missingRequirements = skill.prerequisites
                  .filter((id) => !game.unlockedSkillIds.includes(id))
                  .map((id) => skillById.get(id)?.name)
                  .filter(Boolean)
                const hasDependentOwned = skills.some(
                  (candidate) => game.unlockedSkillIds.includes(candidate.id) && candidate.prerequisites.includes(skill.id),
                )
                return (
                  <article key={skill.id} className={`skill-card ${owned ? 'owned' : ''}`}>
                    <span>Tier {skill.tier}</span>
                    <strong>{skill.name}</strong>
                    <small>{skill.description}</small>
                    {!owned && missingRequirements.length > 0 ? (
                      <small className="requirements">前提: {missingRequirements.join(' / ')}</small>
                    ) : null}
                    <div className="skill-actions">
                      {!owned ? (
                        <button disabled={!unlocked || !affordable || game.status === 'setup'} onClick={() => buySkill(skill)}>
                          {skill.cost} MP
                        </button>
                      ) : (
                        <>
                          <em>取得済み</em>
                          <button disabled={hasDependentOwned || skill.devolvable === false} onClick={() => devolveSkill(skill)}>
                            退化
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        </div>
      ) : null}

      {activeMajorNews ? (
        <div className="dialog-backdrop" role="presentation">
          <section className={`major-news-dialog panel ${activeMajorNews.tone}`} role="dialog" aria-modal="true" aria-label="重大ニュース">
            <span>重大ニュース</span>
            <h2>{activeMajorNews.title}</h2>
            <p>{activeMajorNews.body}</p>
            <button onClick={dismissMajorNews}>続ける</button>
          </section>
        </div>
      ) : null}
    </main>
  )
}

const SAVE_KEY = 'calorie-inc-save-v1'

function saveGame(game: GameState) {
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(game))
}

function loadGame(): GameState | null {
  const raw = window.localStorage.getItem(SAVE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<GameState>
    if (!parsed.countries) return null
    return {
      ...initialState,
      ...parsed,
      difficulty: parsed.difficulty ?? 'standard',
      speed: parsed.speed ?? 1,
      seenEventIds: parsed.seenEventIds ?? [],
      claimedMilestones: parsed.claimedMilestones ?? [],
      majorNewsQueue: parsed.majorNewsQueue ?? [],
      history: parsed.history ?? [],
      countries: Object.fromEntries(
        countries.map((country) => [
          country.id,
          {
            ...initialCountryStates[country.id],
            ...parsed.countries?.[country.id],
            policy: parsed.countries?.[country.id]?.policy ?? 'none',
            bodyParts: {
              ...initialCountryStates[country.id].bodyParts,
              ...parsed.countries?.[country.id]?.bodyParts,
            },
          },
        ]),
      ) as Record<CountryId, CountryState>,
    }
  } catch {
    return null
  }
}

function policyLabel(policy: CountryState['policy']) {
  switch (policy) {
    case 'watch':
      return '監視'
    case 'rationing':
      return '節食令'
    case 'warding':
      return '浄化護符'
    default:
      return 'なし'
  }
}

function getLeaderStanceLabel(state: CountryState) {
  if (state.awareness >= 55) return '抵抗中'
  if (state.actualFat >= 52 && state.awareness < 35) return '甘く崩れつつある'
  if (state.awareness >= 20) return '警戒中'
  return '平静'
}

function getCurrentLeaderLine(country: CountryDefinition, state: CountryState, day: number) {
  const stance =
    state.awareness >= 55
      ? 'resisting'
      : state.actualFat >= 52 && state.awareness < 35
        ? 'corrupted'
        : state.awareness >= 20
          ? 'suspicious'
          : 'calm'
  return country.leaderLines[stance][day % country.leaderLines[stance].length]
}

function Stat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`stat ${danger ? 'danger' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Meter({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="meter-row">
      <div>
        <span>{label}</span>
        <strong>{value.toFixed(1)}%</strong>
      </div>
      <div className={`meter ${danger ? 'danger' : ''}`}>
        <i style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function ResultOverlay({ game, onRestart }: { game: GameState; onRestart: () => void }) {
  const history = game.history.length > 0 ? game.history : [{ day: game.day, infection: 0, actualFat: 0, visibleFat: 0, awareness: 0, research: 0 }]
  const maxDay = Math.max(...history.map((point) => point.day), 1)
  const toPolyline = (key: keyof (typeof history)[number]) =>
    history.map((point) => `${(point.day / maxDay) * 100},${100 - Number(point[key])}`).join(' ')
  return (
    <div className="result-overlay">
      <h2>{game.status === 'won' ? '再侵攻 成功' : '浄化 完了'}</h2>
      <p>{game.status === 'won' ? '世界は甘く鈍りきった。' : '瘦身魔法が完成してしまった。'}</p>
      <div className="result-summary">
        <span>{game.day}日目</span>
        <span>難易度: {game.difficulty}</span>
        <span>研究 {game.researchProgress.toFixed(0)}%</span>
      </div>
      <svg className="result-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline className="infection" points={toPolyline('infection')} />
        <polyline className="fat" points={toPolyline('actualFat')} />
        <polyline className="visible" points={toPolyline('visibleFat')} />
        <polyline className="research" points={toPolyline('research')} />
      </svg>
      <div className="chart-legend">
        <span>浸透</span>
        <span>実肥満</span>
        <span>表面肥満</span>
        <span>研究</span>
      </div>
      <button onClick={onRestart}>最初から</button>
    </div>
  )
}

export default App
