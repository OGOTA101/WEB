import { initializeApp } from 'firebase/app'
import { addDoc, collection, getDocs, getFirestore, limit, orderBy, query, serverTimestamp } from 'firebase/firestore'

const firebaseApp = initializeApp({
  projectId: 'eraser-survivor-2026',
  appId: '1:38068851321:web:fa4f147c20dcff5dd7baa8',
  storageBucket: 'eraser-survivor-2026.firebasestorage.app',
  apiKey: 'AIzaSyD_OTIGAcQKr7kpMZ7Ccw61n5gUsDb9AWA',
  authDomain: 'eraser-survivor-2026.firebaseapp.com',
  messagingSenderId: '38068851321',
})

const db = getFirestore(firebaseApp)
const PLAYER_NAME_KEY = 'eraser-survivor-player-name'
const SESSION_ID_KEY = 'eraser-survivor-session-id'
const REFERRAL_MARKER_PREFIX = 'eraser-survivor-referral-recorded-'

export type LeaderboardEntry = {
  name: string
  score: number
  kills: number
  level: number
  timeSeconds: number
  build: string
  createdAt: number
}

export type ScorePayload = Omit<LeaderboardEntry, 'createdAt'>

export function sanitizePlayerName(value: string) {
  const trimmed = value.replace(/\s+/g, ' ').trim()
  const sliced = trimmed.slice(0, 16)
  return sliced || randomPlayerName()
}

export function loadPlayerName() {
  const stored = localStorage.getItem(PLAYER_NAME_KEY)
  if (stored) return sanitizePlayerName(stored)
  const fresh = randomPlayerName()
  localStorage.setItem(PLAYER_NAME_KEY, fresh)
  return fresh
}

export function savePlayerName(value: string) {
  const name = sanitizePlayerName(value)
  localStorage.setItem(PLAYER_NAME_KEY, name)
  return name
}

export async function submitScore(payload: ScorePayload) {
  await addDoc(collection(db, 'leaderboard'), {
    name: sanitizePlayerName(payload.name),
    score: Math.max(0, Math.floor(payload.score)),
    kills: Math.max(0, Math.floor(payload.kills)),
    level: Math.max(1, Math.floor(payload.level)),
    timeSeconds: Math.max(0, Math.floor(payload.timeSeconds)),
    build: sanitizeBuild(payload.build),
    sessionId: loadSessionId(),
    createdAt: serverTimestamp(),
  })
}

export async function recordReferralVisit(source: 'x' | 'line' | 'share') {
  const markerKey = `${REFERRAL_MARKER_PREFIX}${source}`
  try {
    if (localStorage.getItem(markerKey) === '1') return
    await addDoc(collection(db, 'referrals'), {
      source,
      sessionId: loadSessionId(),
      createdAt: serverTimestamp(),
    })
    localStorage.setItem(markerKey, '1')
  } catch {
    // Referral tracking is optional and must never interrupt the game.
  }
}

export async function fetchLeaderboard(count = 30) {
  const rankingQuery = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(Math.max(1, Math.min(50, Math.floor(count)))))
  const snapshot = await getDocs(rankingQuery)
  return snapshot.docs.map((entry) => {
    const data = entry.data()
    const createdAt = typeof data.createdAt?.toMillis === 'function' ? data.createdAt.toMillis() : Date.now()
    return {
      name: typeof data.name === 'string' ? data.name : 'けしごむ',
      score: typeof data.score === 'number' ? data.score : 0,
      kills: typeof data.kills === 'number' ? data.kills : 0,
      level: typeof data.level === 'number' ? data.level : 1,
      timeSeconds: typeof data.timeSeconds === 'number' ? data.timeSeconds : 0,
      build: typeof data.build === 'string' ? sanitizeBuild(data.build) : '',
      createdAt,
    } satisfies LeaderboardEntry
  })
}

function sanitizeBuild(value: string) {
  return value.replace(/\s+/g, ' ').trim().slice(0, 80)
}

function loadSessionId() {
  const stored = localStorage.getItem(SESSION_ID_KEY)
  if (stored) return stored
  const fresh = `eraser-${Math.random().toString(36).slice(2, 12)}`
  localStorage.setItem(SESSION_ID_KEY, fresh)
  return fresh
}

function randomPlayerName() {
  return `けし${Math.floor(1000 + Math.random() * 9000)}`
}
