/**
 * Všech 48 týmů MS 2026 s ISO kódy vlajek a skupinami
 * flag = ISO 3166-1 alpha-2 kód (pro flagcdn.com)
 */
export const TEAMS = {
  // Skupina A
  'Mexiko':           { code: 'MEX', flag: 'mx', group: 'A' },
  'Jižní Korea':      { code: 'KOR', flag: 'kr', group: 'A' },
  'Jižní Afrika':     { code: 'RSA', flag: 'za', group: 'A' },
  'Česko':            { code: 'CZE', flag: 'cz', group: 'A' },

  // Skupina B
  'Kanada':           { code: 'CAN', flag: 'ca', group: 'B' },
  'Švýcarsko':        { code: 'SUI', flag: 'ch', group: 'B' },
  'Katar':            { code: 'QAT', flag: 'qa', group: 'B' },
  'Bosna':            { code: 'BIH', flag: 'ba', group: 'B' },

  // Skupina C
  'Brazílie':         { code: 'BRA', flag: 'br', group: 'C' },
  'Maroko':           { code: 'MAR', flag: 'ma', group: 'C' },
  'Haiti':            { code: 'HAI', flag: 'ht', group: 'C' },
  'Skotsko':          { code: 'SCO', flag: 'gb-sct', group: 'C' },

  // Skupina D
  'USA':              { code: 'USA', flag: 'us', group: 'D' },
  'Paraguay':         { code: 'PAR', flag: 'py', group: 'D' },
  'Austrálie':        { code: 'AUS', flag: 'au', group: 'D' },
  'Turecko':          { code: 'TUR', flag: 'tr', group: 'D' },

  // Skupina E
  'Německo':          { code: 'GER', flag: 'de', group: 'E' },
  'Pobřeží slonoviny': { code: 'CIV', flag: 'ci', group: 'E' },
  'Ekvádor':          { code: 'ECU', flag: 'ec', group: 'E' },
  'Curaçao':          { code: 'CUW', flag: 'cw', group: 'E' },

  // Skupina F
  'Nizozemsko':       { code: 'NED', flag: 'nl', group: 'F' },
  'Švédsko':          { code: 'SWE', flag: 'se', group: 'F' },
  'Tunisko':          { code: 'TUN', flag: 'tn', group: 'F' },
  'Japonsko':         { code: 'JPN', flag: 'jp', group: 'F' },

  // Skupina G
  'Belgie':           { code: 'BEL', flag: 'be', group: 'G' },
  'Egypt':            { code: 'EGY', flag: 'eg', group: 'G' },
  'Írán':             { code: 'IRN', flag: 'ir', group: 'G' },
  'Nový Zéland':      { code: 'NZL', flag: 'nz', group: 'G' },

  // Skupina H
  'Španělsko':        { code: 'ESP', flag: 'es', group: 'H' },
  'Kapverdy':         { code: 'CPV', flag: 'cv', group: 'H' },
  'Saúdská Arábie':   { code: 'KSA', flag: 'sa', group: 'H' },
  'Uruguay':          { code: 'URU', flag: 'uy', group: 'H' },

  // Skupina I
  'Francie':          { code: 'FRA', flag: 'fr', group: 'I' },
  'Senegal':          { code: 'SEN', flag: 'sn', group: 'I' },
  'Irák':             { code: 'IRQ', flag: 'iq', group: 'I' },
  'Norsko':           { code: 'NOR', flag: 'no', group: 'I' },

  // Skupina J
  'Argentina':        { code: 'ARG', flag: 'ar', group: 'J' },
  'Alžírsko':         { code: 'ALG', flag: 'dz', group: 'J' },
  'Rakousko':         { code: 'AUT', flag: 'at', group: 'J' },
  'Jordánsko':        { code: 'JOR', flag: 'jo', group: 'J' },

  // Skupina K
  'Portugalsko':      { code: 'POR', flag: 'pt', group: 'K' },
  'DR Kongo':         { code: 'COD', flag: 'cd', group: 'K' },
  'Uzbekistán':       { code: 'UZB', flag: 'uz', group: 'K' },
  'Kolumbie':         { code: 'COL', flag: 'co', group: 'K' },

  // Skupina L
  'Anglie':           { code: 'ENG', flag: 'gb-eng', group: 'L' },
  'Chorvatsko':       { code: 'CRO', flag: 'hr', group: 'L' },
  'Ghana':            { code: 'GHA', flag: 'gh', group: 'L' },
  'Panama':           { code: 'PAN', flag: 'pa', group: 'L' },
}

/**
 * Vrátí HTML <img> vlajky z CDN
 */
export function flagImg(flagCode, size = 24) {
  if (!flagCode) return '<span class="flag-placeholder"></span>'
  return `<img src="https://flagcdn.com/w40/${flagCode}.png" width="${size}" height="${Math.round(size * 0.75)}" alt="" class="flag-img" loading="lazy">`
}

/**
 * Vrátí seznam týmů ve skupině
 */
export function getTeamsByGroup(group) {
  return Object.entries(TEAMS)
    .filter(([, t]) => t.group === group)
    .map(([name, data]) => ({ name, ...data }))
}

/**
 * Vrátí data týmu podle názvu
 */
export function getTeam(name) {
  return TEAMS[name] || { code: '???', flag: '', group: null }
}

/**
 * Všechny skupiny
 */
export const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
