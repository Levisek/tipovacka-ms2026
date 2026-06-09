import * as store from './matchStore.js'
import { CEST_OFFSET_HOURS } from '../config/constants.js'

// Vždy přes PHP proxy na našem serveru (řeší CORS + drží API klíč SERVEROVĚ).
// API klíč NIKDY není v klientském buildu.
const API_PROXY = '/tipovacka/api/wc.php?path='

function apiUrl(path) {
  return API_PROXY + encodeURIComponent(path)
}

/**
 * Mapování anglických názvů z API na české názvy v našem systému
 */
const NAME_MAP = {
  'Mexico': 'Mexiko',
  'Korea Republic': 'Jižní Korea', 'South Korea': 'Jižní Korea',
  'South Africa': 'Jižní Afrika',
  'Czech Republic': 'Česko', 'Czechia': 'Česko',
  'Canada': 'Kanada', 'Switzerland': 'Švýcarsko', 'Qatar': 'Katar',
  'Bosnia and Herzegovina': 'Bosna', 'Bosnia-Herzegovina': 'Bosna',
  'Brazil': 'Brazílie', 'Morocco': 'Maroko', 'Scotland': 'Skotsko',
  'United States': 'USA', 'USA': 'USA',
  'Paraguay': 'Paraguay',
  'Australia': 'Austrálie', 'Turkey': 'Turecko', 'Türkiye': 'Turecko',
  'Germany': 'Německo', 'Ivory Coast': 'Pobřeží slonoviny', "Côte d'Ivoire": 'Pobřeží slonoviny',
  'Ecuador': 'Ekvádor', 'Curaçao': 'Curaçao',
  'Netherlands': 'Nizozemsko', 'Sweden': 'Švédsko', 'Tunisia': 'Tunisko', 'Japan': 'Japonsko',
  'Belgium': 'Belgie', 'Egypt': 'Egypt', 'Iran': 'Írán', 'New Zealand': 'Nový Zéland',
  'Spain': 'Španělsko',
  'Cape Verde': 'Kapverdy', 'Cape Verde Islands': 'Kapverdy',
  'Saudi Arabia': 'Saúdská Arábie', 'Uruguay': 'Uruguay',
  'France': 'Francie', 'Senegal': 'Senegal', 'Iraq': 'Irák', 'Norway': 'Norsko',
  'Argentina': 'Argentina', 'Algeria': 'Alžírsko', 'Austria': 'Rakousko', 'Jordan': 'Jordánsko',
  'Portugal': 'Portugalsko',
  'DR Congo': 'DR Kongo', 'Congo DR': 'DR Kongo',
  'Uzbekistan': 'Uzbekistán', 'Colombia': 'Kolumbie',
  'England': 'Anglie', 'Croatia': 'Chorvatsko', 'Ghana': 'Ghana', 'Panama': 'Panama',
  'Haiti': 'Haiti',
}

function mapName(apiName) {
  return NAME_MAP[apiName] || apiName
}

/**
 * Převede UTC ISO string na CEST date+time string
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
 * Stáhne kompletní rozpis (datum, kickoff, týmy) z API
 * a aktualizuje matchStore přes bulkUpdateSchedule.
 * Výsledky zápasů NEŘEŠÍ — ty plní serverový cron do Firestore.
 */
export async function fetchSchedule() {
  try {
    const res = await fetch(apiUrl('/competitions/WC/matches'))
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
      'THIRD_PLACE': '3RD',
      'FINAL': 'F',
    }
    for (const [apiStage, prefix] of Object.entries(stageMapping)) {
      const matches = koByStage[apiStage] || []
      matches.sort((a, b) => a.utcDate.localeCompare(b.utcDate))
      matches.forEach((m, i) => {
        // 3RD a F mají jen jedno ID bez čísla
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
