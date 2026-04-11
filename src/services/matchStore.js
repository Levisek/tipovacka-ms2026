/**
 * Centrální store pro výsledky zápasů.
 * Drží aktuální stav všech zápasů (z API / ručně zadané).
 * Všechny views čtou odsud, ne přímo z config/schedule.js.
 */
import { MATCHES } from '../config/schedule.js'

// Klonuj výchozí data
const matchMap = new Map()
MATCHES.forEach(m => matchMap.set(m.id, { ...m, homeScore: null, awayScore: null, status: 'scheduled' }))

// Načti uložené výsledky z localStorage
const STORAGE_KEY = 'ms2026_results'
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  for (const [id, result] of Object.entries(saved)) {
    if (matchMap.has(id)) {
      Object.assign(matchMap.get(id), result)
    }
  }
} catch (e) {}

// Listenery na změny
const listeners = new Set()

/**
 * Vrátí zápas podle ID (se živými daty)
 */
export function getMatch(id) {
  return matchMap.get(id) || null
}

/**
 * Vrátí všechny zápasy
 */
export function getAllMatches() {
  return [...matchMap.values()]
}

/**
 * Vrátí zápasy dané fáze
 */
export function getMatchesByStage(stage) {
  return getAllMatches().filter(m => m.stage === stage)
}

/**
 * Vrátí zápasy dané skupiny
 */
export function getMatchesByGroup(group) {
  return getAllMatches().filter(m => m.group === group)
}

/**
 * Vrátí zápasy daného dne
 */
export function getMatchesByDate(dateStr) {
  return getAllMatches().filter(m => m.date === dateStr)
}

/**
 * Vrátí unikátní hrací dny
 */
export function getMatchDays() {
  return [...new Set(getAllMatches().map(m => m.date))].sort()
}

/**
 * Aktualizuje výsledek zápasu
 */
export function updateResult(id, homeScore, awayScore, status = 'finished') {
  const match = matchMap.get(id)
  if (!match) return
  match.homeScore = homeScore
  match.awayScore = awayScore
  match.status = status
  persist()
  notify()
}

/**
 * Hromadná aktualizace z API dat
 */
export function bulkUpdate(updates) {
  let changed = false
  for (const u of updates) {
    const match = matchMap.get(u.id)
    if (!match) continue
    if (match.homeScore !== u.homeScore || match.awayScore !== u.awayScore || match.status !== u.status) {
      match.homeScore = u.homeScore
      match.awayScore = u.awayScore
      match.status = u.status
      changed = true
    }
  }
  if (changed) {
    persist()
    notify()
  }
}

/**
 * Hromadná aktualizace rozpisu (datum, kickoff, týmy) z API
 */
const SCHEDULE_OVERRIDE_KEY = 'ms2026_schedule_override'

// Aplikuj overrides ze localStorage při startu
try {
  const overrides = JSON.parse(localStorage.getItem(SCHEDULE_OVERRIDE_KEY) || '{}')
  for (const [id, ov] of Object.entries(overrides)) {
    if (matchMap.has(id)) {
      Object.assign(matchMap.get(id), ov)
    }
  }
} catch (e) {}

export function bulkUpdateSchedule(updates) {
  const overrides = JSON.parse(localStorage.getItem(SCHEDULE_OVERRIDE_KEY) || '{}')
  let changed = 0
  for (const u of updates) {
    const match = matchMap.get(u.id)
    if (!match) continue
    const ov = {}
    if (u.date && u.date !== match.date) { match.date = u.date; ov.date = u.date }
    if (u.kickoff && u.kickoff !== match.kickoff) { match.kickoff = u.kickoff; ov.kickoff = u.kickoff }
    if (u.home && u.home !== match.home) { match.home = u.home; ov.home = u.home }
    if (u.away && u.away !== match.away) { match.away = u.away; ov.away = u.away }
    if (Object.keys(ov).length > 0) {
      overrides[u.id] = { ...(overrides[u.id] || {}), ...ov }
      changed++
    }
  }
  if (changed > 0) {
    localStorage.setItem(SCHEDULE_OVERRIDE_KEY, JSON.stringify(overrides))
    notify()
  }
  return changed
}

/**
 * Přidej listener na změny
 */
export function onChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function persist() {
  const data = {}
  for (const [id, m] of matchMap) {
    if (m.homeScore !== null) {
      data[id] = { homeScore: m.homeScore, awayScore: m.awayScore, status: m.status }
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function notify() {
  listeners.forEach(fn => fn())
}
