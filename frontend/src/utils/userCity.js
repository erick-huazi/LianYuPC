const STORAGE_KEY = 'lianyu-user-city'

export function getSavedUserCity() {
  try {
    return localStorage.getItem(STORAGE_KEY)?.trim() || ''
  } catch {
    return ''
  }
}

export function saveUserCity(city) {
  const trimmed = city?.trim()
  if (!trimmed) return
  try {
    localStorage.setItem(STORAGE_KEY, trimmed)
  } catch {
    /* ignore quota */
  }
}
