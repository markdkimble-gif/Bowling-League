const STORAGE_PREFIX = 'hbm_';

function getKey(key) {
  return STORAGE_PREFIX + key;
}

export function loadData(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(getKey(key));
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function saveData(key, value) {
  try {
    localStorage.setItem(getKey(key), JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export function removeData(key) {
  localStorage.removeItem(getKey(key));
}

// Scores storage: keyed by season + week
export function getScoresKey(season, week) {
  return `scores_${season}_w${week}`;
}

// Availability storage: keyed by season
export function getAvailabilityKey(season) {
  return `availability_${season}`;
}

// Standings storage: keyed by season
export function getStandingsKey(season) {
  return `standings_${season}`;
}

// Import storage: keyed by season + player
export function getImportKey(season, playerId) {
  return `import_${season}_p${playerId}`;
}
