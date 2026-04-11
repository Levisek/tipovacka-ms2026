import { MATCHES } from '../config/schedule.js'
import * as store from './matchStore.js'
import { POLLING_INTERVAL_MS, CEST_OFFSET_HOURS } from '../config/constants.js'

// football-data.org free tier (10 req/min)
const API_BASE = 'https://api.football-data.org/v4'
const API_KEY = 'db35374c3fe748069840d3f664bfda3c'

let pollingInterval = null

/**
 * Mapování anglických názvů z API na české názvy v našem systému
 */
const NAME_MAP = {
  'Mexico': 'Mexiko', 'Korea Republic': 'Jižní Korea', 'South Africa': 'Jižní Afrika',
  'Czech Republic': 'Česko', 'Czechia': 'Česko',
  'Canada': 'Kanada', 'Switzerland': 'Švýcarsko', 'Qatar': 'Katar',
  'Bosnia and Herzegovina': 'Bosna', 'Bosnia-Herzegovina': 'Bosna',
  'Brazil': 'Brazílie', 'Morocco': 'Maroko', 'Scotland': 'Skotsko',
  'United States': 'USA', 'USA': 'USA',
  'Australia': 'Austrálie', 'Turkey': 'Turecko', 'Türkiye': 'Turecko',
  'Germany': 'Německo', 'Ivory Coast': 'Pobřeží slonoviny', "Côte d'Ivoire": 'Pobřeží slonoviny',
  'Ecuador': 'Ekvádor', 'Curaçao': 'Curaçao',
  'Netherlands': 'Nizozemsko', 'Sweden': 'Švédsko', 'Tunisia': 'Tunisko', 'Japan': 'Japonsko',
  'Belgium': 'Belgie', 'Egypt': 'Egypt', 'Iran': 'Írán', 'New Zealand': 'Nový Zéland',
  'Spain': 'Španělsko', 'Cape Verde': 'Kapverdy', 'Saudi Arabia': 'Saúdská Arábie', 'Uruguay': 'Uruguay',
  'France': 'Francie', 'Senegal': 'Senegal', 'Iraq': 'Irák', 'Norway': 'Norsko',
  'Argentina': 'Argentina', 'Algeria': 'Alžírsko', 'Austria': 'Rakousko', 'Jordan': 'Jordánsko',
  'Portugal': 'Portugalsko', 'DR Congo': 'DR Kongo', 'Uzbekistan': 'Uzbekistán', 'Colombia': 'Kolumbie',
  'England': 'Anglie', 'Croatia': 'Chorvatsko', 'Ghana': 'Ghana', 'Panama': 'Panama',
  'Haiti': 'Haiti',
}

function mapName(apiName) {
  return NAME_MAP[apiName] || apiName
}

/**
 * Najdi náš zápas odpovídající API zápasu (podle týmů a data)
 */
function findMatch(apiHome, apiAway, apiDate) {
  const home = mapName(apiHome)
  const away = mapName(apiAway)
  // Hledej v skupinových zápasech
  return MATCHES.find(m =>
    m.home === home && m.away === away
  ) || MATCHES.find(m =>
    // Zkus i opačné pořadí
    m.home === away && m.away === home
  )
}

/**
 * Stáhne kompletní rozpis (datum, kickoff, týmy) z API
 * a aktualizuje matchStore přes bulkUpdateSchedule
 */
export async function fetchSchedule() {
  if (!API_KEY) return { updated: 0, error: 'Chybí API klíč' }

  try {
    const res = await fetch(`${API_BASE}/competitions/WC/matches`, {
      headers: { 'X-Auth-Token': API_KEY }
    })
    if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`)
    const data = await res.json()

    // Skupinové zápasy: seřadit po skupině podle utcDate, mapovat na A1-A6 atd.
    const groupMap = {} // 'A' -> [match, match, ...]
    const koByStage = {} // 'LAST_32' -> [...]

    for (const m of data.matches) {
      if (m.stage === 'GROUP_STAGE') {
        const groupLetter = m.group?.replace('GROUP_', '')
        if (!groupLetter) continue
        if (!groupMap[groupLetter]) groupMap[groupLetter] = []
        groupMap[groupLetter].push(m)
      } else {
        if (!koByStage[m.stage]) koByStage[m.stage] = []
        koByStage[m.stage].push(m)
      }
    }

    const updates = []

    // Skupiny: A1-A6, B1-B6, ...
    for (const [letter, matches] of Object.entries(groupMap)) {
      matches.sort((a, b) => a.utcDate.localeCompare(b.utcDate))
      matches.forEach((m, i) => {
        const id = letter + (i + 1)
        const cest = utcToCest(m.utcDate)
        updates.push({
          id,
          date: cest.date,
          kickoff: cest.time,
          home: mapName(m.homeTeam?.name) || undefined,
          away: mapName(m.awayTeam?.name) || undefined,
        })
      })
    }

    // KO zápasy
    const stageMapping = {
      'LAST_32': 'R32',
      'LAST_16': 'R16',
      'QUARTER_FINALS': 'QF',
      'SEMI_FINALS': 'SF',
      'THIRD_PLACE': '3rd',
      'FINAL': 'F',
    }
    for (const [apiStage, prefix] of Object.entries(stageMapping)) {
      const matches = koByStage[apiStage] || []
      matches.sort((a, b) => a.utcDate.localeCompare(b.utcDate))
      matches.forEach((m, i) => {
        // 3rd a F mají jen jedno ID bez čísla
        const id = (apiStage === 'THIRD_PLACE' || apiStage === 'FINAL')
          ? prefix
          : `${prefix}-${i + 1}`
        const cest = utcToCest(m.utcDate)
        updates.push({
          id,
          date: cest.date,
          kickoff: cest.time,
          home: mapName(m.homeTeam?.name) || undefined,
          away: mapName(m.awayTeam?.name) || undefined,
        })
      })
    }

    const changed = store.bulkUpdateSchedule(updates)
    return { changed, total: updates.length }
  } catch (e) {
    console.error('API chyba (fetchSchedule):', e)
    return { changed: 0, error: e.message }
  }
}

/**
 * Převede UTC ISO string na CEST/CEST date+time string
 */
function utcToCest(utcIsoStr) {
  const utc = new Date(utcIsoStr)
  // Letní čas v ČR je UTC+2 (CEST). MS 2026 hraje v červnu/červenci → vždy CEST.
  const cest = new Date(utc.getTime() + CEST_OFFSET_HOURS * 3600000)
  const date = cest.toISOString().slice(0, 10)
  const time = cest.toISOString().slice(11, 16)
  return { date, time }
}

/**
 * Stáhne VŠECHNY zápasy MS z API a aktualizuje store
 */
export async function fetchAllResults() {
  if (!API_KEY) {
    console.warn('Chybí API klíč — zadej ho v src/services/resultService.js')
    return { updated: 0, error: 'Chybí API klíč' }
  }

  try {
    const res = await fetch(`${API_BASE}/competitions/WC/matches`, {
      headers: { 'X-Auth-Token': API_KEY }
    })
    if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`)
    const data = await res.json()

    const updates = []
    let matched = 0

    for (const apiMatch of data.matches) {
      const homeName = apiMatch.homeTeam?.name
      const awayName = apiMatch.awayTeam?.name
      if (!homeName || !awayName) continue

      const ourMatch = findMatch(homeName, awayName, apiMatch.utcDate?.slice(0, 10))
      if (!ourMatch) continue

      matched++

      let status = 'scheduled'
      if (apiMatch.status === 'FINISHED') status = 'finished'
      else if (apiMatch.status === 'IN_PLAY' || apiMatch.status === 'PAUSED') status = 'live'

      const homeScore = apiMatch.score?.fullTime?.home ?? null
      const awayScore = apiMatch.score?.fullTime?.away ?? null

      updates.push({
        id: ourMatch.id,
        homeScore,
        awayScore,
        status
      })
    }

    store.bulkUpdate(updates)

    return { updated: updates.filter(u => u.homeScore !== null).length, matched, total: data.matches.length }
  } catch (e) {
    console.error('API chyba:', e)
    return { updated: 0, error: e.message }
  }
}

/**
 * Stáhne jen dnešní výsledky (šetří API volání)
 */
export async function fetchTodayResults() {
  if (!API_KEY) return { updated: 0, error: 'Chybí API klíč' }

  try {
    const today = new Date().toISOString().slice(0, 10)
    const res = await fetch(`${API_BASE}/competitions/WC/matches?dateFrom=${today}&dateTo=${today}`, {
      headers: { 'X-Auth-Token': API_KEY }
    })
    if (!res.ok) throw new Error(`API ${res.status}`)
    const data = await res.json()

    const updates = []
    for (const apiMatch of data.matches) {
      const ourMatch = findMatch(apiMatch.homeTeam?.name, apiMatch.awayTeam?.name)
      if (!ourMatch) continue

      let status = 'scheduled'
      if (apiMatch.status === 'FINISHED') status = 'finished'
      else if (apiMatch.status === 'IN_PLAY' || apiMatch.status === 'PAUSED') status = 'live'

      updates.push({
        id: ourMatch.id,
        homeScore: apiMatch.score?.fullTime?.home ?? null,
        awayScore: apiMatch.score?.fullTime?.away ?? null,
        status
      })
    }

    store.bulkUpdate(updates)
    return { updated: updates.filter(u => u.homeScore !== null).length }
  } catch (e) {
    return { updated: 0, error: e.message }
  }
}

/**
 * Spustí polling výsledků (interval z constants.js)
 */
export function startPolling() {
  if (pollingInterval) return
  fetchTodayResults()
  pollingInterval = setInterval(fetchTodayResults, POLLING_INTERVAL_MS)
}

/**
 * Zastaví polling
 */
export function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

/**
 * Ruční zadání výsledku
 */
export function submitResult(matchId, homeScore, awayScore) {
  store.updateResult(matchId, homeScore, awayScore, 'finished')
}
