/**
 * Kompletní rozpis MS 2026 — 104 zápasů
 * Časy jsou v SELČ (UTC+2), datum v ISO formátu
 * stage: 'group' | 'R32' | 'R16' | 'QF' | 'SF' | '3rd' | 'F'
 */
export const MATCHES = [
  // ========== SKUPINA A ==========
  { id: 'A1', date: '2026-06-11', kickoff: '21:00', home: 'Mexiko', away: 'Jižní Afrika', group: 'A', stage: 'group', city: 'Mexico City' },
  { id: 'A2', date: '2026-06-12', kickoff: '04:00', home: 'Jižní Korea', away: 'Česko', group: 'A', stage: 'group', city: 'Zapopan' },
  { id: 'A3', date: '2026-06-18', kickoff: '18:00', home: 'Česko', away: 'Jižní Afrika', group: 'A', stage: 'group', city: 'Atlanta' },
  { id: 'A4', date: '2026-06-19', kickoff: '05:00', home: 'Mexiko', away: 'Jižní Korea', group: 'A', stage: 'group', city: 'Zapopan' },
  { id: 'A5', date: '2026-06-25', kickoff: '03:00', home: 'Česko', away: 'Mexiko', group: 'A', stage: 'group', city: 'Mexico City' },
  { id: 'A6', date: '2026-06-25', kickoff: '03:00', home: 'Jižní Afrika', away: 'Jižní Korea', group: 'A', stage: 'group', city: 'Guadalupe' },

  // ========== SKUPINA B ==========
  { id: 'B1', date: '2026-06-12', kickoff: '21:00', home: 'Kanada', away: 'Bosna', group: 'B', stage: 'group', city: 'Toronto' },
  { id: 'B2', date: '2026-06-13', kickoff: '21:00', home: 'Katar', away: 'Švýcarsko', group: 'B', stage: 'group', city: 'Santa Clara' },
  { id: 'B3', date: '2026-06-18', kickoff: '21:00', home: 'Švýcarsko', away: 'Bosna', group: 'B', stage: 'group', city: 'Inglewood' },
  { id: 'B4', date: '2026-06-19', kickoff: '00:00', home: 'Kanada', away: 'Katar', group: 'B', stage: 'group', city: 'Vancouver' },
  { id: 'B5', date: '2026-06-24', kickoff: '21:00', home: 'Švýcarsko', away: 'Kanada', group: 'B', stage: 'group', city: 'Vancouver' },
  { id: 'B6', date: '2026-06-24', kickoff: '21:00', home: 'Bosna', away: 'Katar', group: 'B', stage: 'group', city: 'Seattle' },

  // ========== SKUPINA C ==========
  { id: 'C1', date: '2026-06-14', kickoff: '00:00', home: 'Brazílie', away: 'Maroko', group: 'C', stage: 'group', city: 'East Rutherford' },
  { id: 'C2', date: '2026-06-14', kickoff: '03:00', home: 'Haiti', away: 'Skotsko', group: 'C', stage: 'group', city: 'Foxborough' },
  { id: 'C3', date: '2026-06-20', kickoff: '00:00', home: 'Skotsko', away: 'Maroko', group: 'C', stage: 'group', city: 'Foxborough' },
  { id: 'C4', date: '2026-06-20', kickoff: '03:00', home: 'Brazílie', away: 'Haiti', group: 'C', stage: 'group', city: 'Philadelphia' },
  { id: 'C5', date: '2026-06-25', kickoff: '00:00', home: 'Skotsko', away: 'Brazílie', group: 'C', stage: 'group', city: 'Miami' },
  { id: 'C6', date: '2026-06-25', kickoff: '00:00', home: 'Maroko', away: 'Haiti', group: 'C', stage: 'group', city: 'Atlanta' },

  // ========== SKUPINA D ==========
  { id: 'D1', date: '2026-06-13', kickoff: '03:00', home: 'USA', away: 'Paraguay', group: 'D', stage: 'group', city: 'Inglewood' },
  { id: 'D2', date: '2026-06-14', kickoff: '06:00', home: 'Austrálie', away: 'Turecko', group: 'D', stage: 'group', city: 'Vancouver' },
  { id: 'D3', date: '2026-06-19', kickoff: '21:00', home: 'USA', away: 'Austrálie', group: 'D', stage: 'group', city: 'Seattle' },
  { id: 'D4', date: '2026-06-20', kickoff: '06:00', home: 'Turecko', away: 'Paraguay', group: 'D', stage: 'group', city: 'Santa Clara' },
  { id: 'D5', date: '2026-06-26', kickoff: '04:00', home: 'Turecko', away: 'USA', group: 'D', stage: 'group', city: 'Inglewood' },
  { id: 'D6', date: '2026-06-26', kickoff: '04:00', home: 'Paraguay', away: 'Austrálie', group: 'D', stage: 'group', city: 'Santa Clara' },

  // ========== SKUPINA E ==========
  { id: 'E1', date: '2026-06-14', kickoff: '19:00', home: 'Německo', away: 'Curaçao', group: 'E', stage: 'group', city: 'Houston' },
  { id: 'E2', date: '2026-06-15', kickoff: '01:00', home: 'Pobřeží slonoviny', away: 'Ekvádor', group: 'E', stage: 'group', city: 'Philadelphia' },
  { id: 'E3', date: '2026-06-20', kickoff: '22:00', home: 'Německo', away: 'Pobřeží slonoviny', group: 'E', stage: 'group', city: 'Toronto' },
  { id: 'E4', date: '2026-06-21', kickoff: '02:00', home: 'Ekvádor', away: 'Curaçao', group: 'E', stage: 'group', city: 'Kansas City' },
  { id: 'E5', date: '2026-06-25', kickoff: '22:00', home: 'Ekvádor', away: 'Německo', group: 'E', stage: 'group', city: 'East Rutherford' },
  { id: 'E6', date: '2026-06-25', kickoff: '22:00', home: 'Curaçao', away: 'Pobřeží slonoviny', group: 'E', stage: 'group', city: 'Philadelphia' },

  // ========== SKUPINA F ==========
  { id: 'F1', date: '2026-06-14', kickoff: '22:00', home: 'Nizozemsko', away: 'Japonsko', group: 'F', stage: 'group', city: 'Arlington' },
  { id: 'F2', date: '2026-06-15', kickoff: '06:00', home: 'Švédsko', away: 'Tunisko', group: 'F', stage: 'group', city: 'Guadalupe' },
  { id: 'F3', date: '2026-06-20', kickoff: '19:00', home: 'Nizozemsko', away: 'Švédsko', group: 'F', stage: 'group', city: 'Houston' },
  { id: 'F4', date: '2026-06-21', kickoff: '06:00', home: 'Tunisko', away: 'Japonsko', group: 'F', stage: 'group', city: 'Guadalupe' },
  { id: 'F5', date: '2026-06-26', kickoff: '01:00', home: 'Japonsko', away: 'Švédsko', group: 'F', stage: 'group', city: 'Arlington' },
  { id: 'F6', date: '2026-06-26', kickoff: '01:00', home: 'Tunisko', away: 'Nizozemsko', group: 'F', stage: 'group', city: 'Kansas City' },

  // ========== SKUPINA G ==========
  { id: 'G1', date: '2026-06-16', kickoff: '00:00', home: 'Belgie', away: 'Egypt', group: 'G', stage: 'group', city: 'Seattle' },
  { id: 'G2', date: '2026-06-16', kickoff: '06:00', home: 'Írán', away: 'Nový Zéland', group: 'G', stage: 'group', city: 'Inglewood' },
  { id: 'G3', date: '2026-06-21', kickoff: '21:00', home: 'Belgie', away: 'Írán', group: 'G', stage: 'group', city: 'Inglewood' },
  { id: 'G4', date: '2026-06-22', kickoff: '03:00', home: 'Nový Zéland', away: 'Egypt', group: 'G', stage: 'group', city: 'Vancouver' },
  { id: 'G5', date: '2026-06-27', kickoff: '05:00', home: 'Egypt', away: 'Írán', group: 'G', stage: 'group', city: 'Seattle' },
  { id: 'G6', date: '2026-06-27', kickoff: '05:00', home: 'Nový Zéland', away: 'Belgie', group: 'G', stage: 'group', city: 'Vancouver' },

  // ========== SKUPINA H ==========
  { id: 'H1', date: '2026-06-15', kickoff: '19:00', home: 'Španělsko', away: 'Kapverdy', group: 'H', stage: 'group', city: 'Atlanta' },
  { id: 'H2', date: '2026-06-16', kickoff: '00:00', home: 'Saúdská Arábie', away: 'Uruguay', group: 'H', stage: 'group', city: 'Miami' },
  { id: 'H3', date: '2026-06-21', kickoff: '18:00', home: 'Španělsko', away: 'Saúdská Arábie', group: 'H', stage: 'group', city: 'Atlanta' },
  { id: 'H4', date: '2026-06-22', kickoff: '00:00', home: 'Uruguay', away: 'Kapverdy', group: 'H', stage: 'group', city: 'Miami' },
  { id: 'H5', date: '2026-06-27', kickoff: '02:00', home: 'Kapverdy', away: 'Saúdská Arábie', group: 'H', stage: 'group', city: 'Houston' },
  { id: 'H6', date: '2026-06-27', kickoff: '02:00', home: 'Uruguay', away: 'Španělsko', group: 'H', stage: 'group', city: 'Zapopan' },

  // ========== SKUPINA I ==========
  { id: 'I1', date: '2026-06-16', kickoff: '21:00', home: 'Francie', away: 'Senegal', group: 'I', stage: 'group', city: 'East Rutherford' },
  { id: 'I2', date: '2026-06-17', kickoff: '00:00', home: 'Irák', away: 'Norsko', group: 'I', stage: 'group', city: 'Foxborough' },
  { id: 'I3', date: '2026-06-22', kickoff: '23:00', home: 'Francie', away: 'Irák', group: 'I', stage: 'group', city: 'Philadelphia' },
  { id: 'I4', date: '2026-06-23', kickoff: '02:00', home: 'Norsko', away: 'Senegal', group: 'I', stage: 'group', city: 'East Rutherford' },
  { id: 'I5', date: '2026-06-26', kickoff: '21:00', home: 'Norsko', away: 'Francie', group: 'I', stage: 'group', city: 'Foxborough' },
  { id: 'I6', date: '2026-06-26', kickoff: '21:00', home: 'Senegal', away: 'Irák', group: 'I', stage: 'group', city: 'Toronto' },

  // ========== SKUPINA J ==========
  { id: 'J1', date: '2026-06-17', kickoff: '03:00', home: 'Argentina', away: 'Alžírsko', group: 'J', stage: 'group', city: 'Kansas City' },
  { id: 'J2', date: '2026-06-17', kickoff: '06:00', home: 'Rakousko', away: 'Jordánsko', group: 'J', stage: 'group', city: 'Santa Clara' },
  { id: 'J3', date: '2026-06-22', kickoff: '19:00', home: 'Argentina', away: 'Rakousko', group: 'J', stage: 'group', city: 'Arlington' },
  { id: 'J4', date: '2026-06-23', kickoff: '06:00', home: 'Jordánsko', away: 'Alžírsko', group: 'J', stage: 'group', city: 'Santa Clara' },
  { id: 'J5', date: '2026-06-28', kickoff: '04:00', home: 'Alžírsko', away: 'Rakousko', group: 'J', stage: 'group', city: 'Kansas City' },
  { id: 'J6', date: '2026-06-28', kickoff: '04:00', home: 'Jordánsko', away: 'Argentina', group: 'J', stage: 'group', city: 'Arlington' },

  // ========== SKUPINA K ==========
  { id: 'K1', date: '2026-06-17', kickoff: '19:00', home: 'Portugalsko', away: 'DR Kongo', group: 'K', stage: 'group', city: 'Houston' },
  { id: 'K2', date: '2026-06-18', kickoff: '04:00', home: 'Uzbekistán', away: 'Kolumbie', group: 'K', stage: 'group', city: 'Mexico City' },
  { id: 'K3', date: '2026-06-23', kickoff: '19:00', home: 'Portugalsko', away: 'Uzbekistán', group: 'K', stage: 'group', city: 'Houston' },
  { id: 'K4', date: '2026-06-24', kickoff: '04:00', home: 'Kolumbie', away: 'DR Kongo', group: 'K', stage: 'group', city: 'Zapopan' },
  { id: 'K5', date: '2026-06-28', kickoff: '01:30', home: 'Kolumbie', away: 'Portugalsko', group: 'K', stage: 'group', city: 'Miami' },
  { id: 'K6', date: '2026-06-28', kickoff: '01:30', home: 'DR Kongo', away: 'Uzbekistán', group: 'K', stage: 'group', city: 'Atlanta' },

  // ========== SKUPINA L ==========
  { id: 'L1', date: '2026-06-17', kickoff: '22:00', home: 'Anglie', away: 'Chorvatsko', group: 'L', stage: 'group', city: 'Arlington' },
  { id: 'L2', date: '2026-06-18', kickoff: '01:00', home: 'Ghana', away: 'Panama', group: 'L', stage: 'group', city: 'Toronto' },
  { id: 'L3', date: '2026-06-23', kickoff: '22:00', home: 'Anglie', away: 'Ghana', group: 'L', stage: 'group', city: 'Foxborough' },
  { id: 'L4', date: '2026-06-24', kickoff: '01:00', home: 'Panama', away: 'Chorvatsko', group: 'L', stage: 'group', city: 'Toronto' },
  { id: 'L5', date: '2026-06-27', kickoff: '23:00', home: 'Panama', away: 'Anglie', group: 'L', stage: 'group', city: 'East Rutherford' },
  { id: 'L6', date: '2026-06-27', kickoff: '23:00', home: 'Chorvatsko', away: 'Ghana', group: 'L', stage: 'group', city: 'Philadelphia' },

  // ========== ROUND OF 32 ==========
  { id: 'R32-1',  date: '2026-06-28', kickoff: '18:00', home: '2. sk. A', away: '2. sk. B', group: null, stage: 'R32', city: 'Inglewood' },
  { id: 'R32-2',  date: '2026-06-29', kickoff: '19:00', home: '1. sk. C', away: '2. sk. F', group: null, stage: 'R32', city: 'Houston' },
  { id: 'R32-3',  date: '2026-06-29', kickoff: '22:30', home: '1. sk. E', away: '3. sk. A/B/C/D/F', group: null, stage: 'R32', city: 'Foxborough' },
  { id: 'R32-4',  date: '2026-06-30', kickoff: '03:00', home: '1. sk. F', away: '2. sk. C', group: null, stage: 'R32', city: 'Guadalupe' },
  { id: 'R32-5',  date: '2026-06-30', kickoff: '19:00', home: '2. sk. E', away: '2. sk. I', group: null, stage: 'R32', city: 'Arlington' },
  { id: 'R32-6',  date: '2026-06-30', kickoff: '23:00', home: '1. sk. I', away: '3. sk. C/D/F/G/H', group: null, stage: 'R32', city: 'East Rutherford' },
  { id: 'R32-7',  date: '2026-07-01', kickoff: '03:00', home: '1. sk. A', away: '3. sk. C/E/F/H/I', group: null, stage: 'R32', city: 'Mexico City' },
  { id: 'R32-8',  date: '2026-07-01', kickoff: '18:00', home: '1. sk. L', away: '3. sk. E/H/I/J/K', group: null, stage: 'R32', city: 'Atlanta' },
  { id: 'R32-9',  date: '2026-07-01', kickoff: '22:00', home: '1. sk. G', away: '3. sk. A/E/H/I/J', group: null, stage: 'R32', city: 'Seattle' },
  { id: 'R32-10', date: '2026-07-02', kickoff: '02:00', home: '1. sk. D', away: '3. sk. B/E/F/I/J', group: null, stage: 'R32', city: 'Santa Clara' },
  { id: 'R32-11', date: '2026-07-02', kickoff: '21:00', home: '1. sk. H', away: '2. sk. J', group: null, stage: 'R32', city: 'Inglewood' },
  { id: 'R32-12', date: '2026-07-03', kickoff: '01:00', home: '2. sk. K', away: '2. sk. L', group: null, stage: 'R32', city: 'Toronto' },
  { id: 'R32-13', date: '2026-07-03', kickoff: '05:00', home: '1. sk. B', away: '3. sk. E/F/G/I/J', group: null, stage: 'R32', city: 'Vancouver' },
  { id: 'R32-14', date: '2026-07-03', kickoff: '20:00', home: '2. sk. D', away: '2. sk. G', group: null, stage: 'R32', city: 'Arlington' },
  { id: 'R32-15', date: '2026-07-04', kickoff: '00:00', home: '1. sk. J', away: '2. sk. H', group: null, stage: 'R32', city: 'Miami' },
  { id: 'R32-16', date: '2026-07-04', kickoff: '03:30', home: '1. sk. K', away: '3. sk. D/E/I/J/L', group: null, stage: 'R32', city: 'Kansas City' },

  // ========== ROUND OF 16 ==========
  { id: 'R16-1', date: '2026-07-04', kickoff: '19:00', home: 'Vítěz R32-1', away: 'Vítěz R32-2', group: null, stage: 'R16', city: 'Houston' },
  { id: 'R16-2', date: '2026-07-04', kickoff: '23:00', home: 'Vítěz R32-3', away: 'Vítěz R32-4', group: null, stage: 'R16', city: 'Philadelphia' },
  { id: 'R16-3', date: '2026-07-05', kickoff: '22:00', home: 'Vítěz R32-5', away: 'Vítěz R32-6', group: null, stage: 'R16', city: 'East Rutherford' },
  { id: 'R16-4', date: '2026-07-06', kickoff: '02:00', home: 'Vítěz R32-7', away: 'Vítěz R32-8', group: null, stage: 'R16', city: 'Mexico City' },
  { id: 'R16-5', date: '2026-07-06', kickoff: '21:00', home: 'Vítěz R32-9', away: 'Vítěz R32-10', group: null, stage: 'R16', city: 'Arlington' },
  { id: 'R16-6', date: '2026-07-06', kickoff: '23:00', home: 'Vítěz R32-11', away: 'Vítěz R32-12', group: null, stage: 'R16', city: 'Seattle' },
  { id: 'R16-7', date: '2026-07-07', kickoff: '18:00', home: 'Vítěz R32-13', away: 'Vítěz R32-14', group: null, stage: 'R16', city: 'Atlanta' },
  { id: 'R16-8', date: '2026-07-07', kickoff: '22:00', home: 'Vítěz R32-15', away: 'Vítěz R32-16', group: null, stage: 'R16', city: 'Vancouver' },

  // ========== ČTVRTFINÁLE ==========
  { id: 'QF-1', date: '2026-07-09', kickoff: '22:00', home: 'Vítěz R16-1', away: 'Vítěz R16-2', group: null, stage: 'QF', city: 'Foxborough' },
  { id: 'QF-2', date: '2026-07-10', kickoff: '21:00', home: 'Vítěz R16-3', away: 'Vítěz R16-4', group: null, stage: 'QF', city: 'Inglewood' },
  { id: 'QF-3', date: '2026-07-11', kickoff: '23:00', home: 'Vítěz R16-5', away: 'Vítěz R16-6', group: null, stage: 'QF', city: 'Miami' },
  { id: 'QF-4', date: '2026-07-12', kickoff: '03:00', home: 'Vítěz R16-7', away: 'Vítěz R16-8', group: null, stage: 'QF', city: 'Kansas City' },

  // ========== SEMIFINÁLE ==========
  { id: 'SF-1', date: '2026-07-14', kickoff: '21:00', home: 'Vítěz QF-1', away: 'Vítěz QF-2', group: null, stage: 'SF', city: 'Arlington' },
  { id: 'SF-2', date: '2026-07-15', kickoff: '21:00', home: 'Vítěz QF-3', away: 'Vítěz QF-4', group: null, stage: 'SF', city: 'Atlanta' },

  // ========== O 3. MÍSTO ==========
  { id: '3RD', date: '2026-07-18', kickoff: '23:00', home: 'Poražený SF-1', away: 'Poražený SF-2', group: null, stage: '3rd', city: 'Miami' },

  // ========== FINÁLE ==========
  { id: 'F', date: '2026-07-19', kickoff: '21:00', home: 'Vítěz SF-1', away: 'Vítěz SF-2', group: null, stage: 'F', city: 'East Rutherford' },
]

/**
 * Mapování fází na české názvy
 */
export const STAGE_NAMES = {
  group: 'Základní skupiny',
  R32: 'Osmifinále',
  R16: 'Čtvrtfinále', // Round of 16 = šestnáctifinále, ale v kontextu MS je to "čtvrtfinále" protože R32 je "osmifinále"
  QF: 'Čtvrtfinále',
  SF: 'Semifinále',
  '3rd': 'O 3. místo',
  F: 'Finále',
}

// Oprava: R16 je vlastně "šestnáctifinále" / v tradičním pojetí:
// R32 = Round of 32 (32 týmů) → "Třicetdvojfinále" (nově v MS 2026)
// R16 = Round of 16 → "Osmifinále" (klasicky)
// Ale protože MS 2026 má poprvé R32, názvy se posunuly.
// Pro přehlednost:
STAGE_NAMES.R32 = '1/16 finále'
STAGE_NAMES.R16 = 'Osmifinále'

/**
 * Vrátí zápasy pro daný den
 */
export function getMatchesByDate(dateStr) {
  return MATCHES.filter(m => m.date === dateStr)
}

/**
 * Vrátí zápasy pro danou skupinu
 */
export function getMatchesByGroup(group) {
  return MATCHES.filter(m => m.group === group)
}

/**
 * Vrátí zápasy pro danou fázi
 */
export function getMatchesByStage(stage) {
  return MATCHES.filter(m => m.stage === stage)
}

/**
 * Vrátí zápas podle ID
 */
export function getMatchById(id) {
  return MATCHES.find(m => m.id === id)
}

/**
 * Vrátí všechny unikátní hrací dny seřazené
 */
export function getMatchDays() {
  return [...new Set(MATCHES.map(m => m.date))].sort()
}
