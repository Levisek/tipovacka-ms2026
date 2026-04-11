/**
 * Centrální konstanty pro celou aplikaci.
 * Tady je single source of truth — kdyby se cokoli změnilo, mění se na jednom místě.
 */

// ===== APP / BRAND =====
export const APP_BRAND_NAME = 'Pískové doly'
export const APP_SUBTITLE = 'Tipovačka MS 2026'

// ===== ADMIN =====
export const ADMIN_PIN = 'AdminjeBuh7'
export const ADMIN_SESSION_KEY = 'ms2026_admin_auth'

// ===== INPUT LIMITS =====
export const MAX_SCORE = 20

// ===== TIME / INTERVALY =====
export const DEADLINE_MINUTES_BEFORE_MATCH = 90  // 1,5 hodiny před prvním zápasem dne
export const URGENT_THRESHOLD_MS = 3600000        // 1 hodina (kdy banner zčervená)
export const COUNTDOWN_UPDATE_INTERVAL_MS = 1000  // odpočet refresh každou sekundu
export const POLLING_INTERVAL_MS = 120000         // API polling výsledků každé 2 minuty (free tier limit)
export const CEST_OFFSET_HOURS = 2                // SELČ je UTC+2

// ===== LOCALSTORAGE KEYS =====
export const STORAGE_KEYS = {
  PLAYER: 'ms2026_player',
  RESULTS: 'ms2026_results',
  ADMIN_AUTH: 'ms2026_admin_auth',
  STANDINGS_SNAPSHOT: 'ms2026_standings_snapshot',
  SCHEDULE_OVERRIDE: 'ms2026_schedule_override',
}
