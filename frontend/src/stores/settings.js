import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { setUiLocale } from '@/i18n'
import {
  DEFAULT_MODEL_LANGUAGE,
  DEFAULT_UI_LANGUAGE,
  STORAGE_MODEL_LANGUAGE,
  STORAGE_UI_LANGUAGE,
  normalizeLanguage
} from '@/constants/language'
import {
  DEFAULT_ACCENT,
  applyAppearance,
  normalizeHex
} from '@/utils/themeColor'

const STORAGE_SIDEBAR = 'lianyu-sidebar'
const STORAGE_THEME = 'lianyu-theme'
const STORAGE_ACCENT = 'lianyu-accent-color'
const STORAGE_BG = 'lianyu-bg-color'
const STORAGE_CHAT_BG = 'lianyu-character-chat-bg'

function loadChatBackgrounds() {
  try {
    const raw = localStorage.getItem(STORAGE_CHAT_BG)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function loadAppearanceMode() {
  const saved = localStorage.getItem(STORAGE_THEME)
  if (saved === 'light' || saved === 'dark') return saved
  return 'dark'
}

function loadAccentColor() {
  const savedAccent = normalizeHex(localStorage.getItem(STORAGE_ACCENT))
  if (savedAccent) return savedAccent
  localStorage.removeItem(STORAGE_BG)
  return DEFAULT_ACCENT
}

export const useSettingsStore = defineStore('settings', () => {
  const sidebarCollapsed = ref(localStorage.getItem(STORAGE_SIDEBAR) === 'collapsed')
  const theme = ref(loadAppearanceMode())
  const accentColor = ref(loadAccentColor())

  const uiLanguage = ref(
    normalizeLanguage(localStorage.getItem(STORAGE_UI_LANGUAGE), DEFAULT_UI_LANGUAGE)
  )
  const modelOutputLanguage = ref(
    normalizeLanguage(localStorage.getItem(STORAGE_MODEL_LANGUAGE), DEFAULT_MODEL_LANGUAGE)
  )
  const chatBackgroundByCharacter = ref(loadChatBackgrounds())

  watch(sidebarCollapsed, val => {
    localStorage.setItem(STORAGE_SIDEBAR, val ? 'collapsed' : 'expanded')
  })

  function persistAndApply() {
    const accent = normalizeHex(accentColor.value)
    if (!accent) return
    localStorage.setItem(STORAGE_ACCENT, accent)
    applyAppearance(theme.value, accent)
  }

  watch(theme, val => {
    localStorage.setItem(STORAGE_THEME, val)
    persistAndApply()
  })

  watch(accentColor, persistAndApply)

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setAppearanceMode(mode) {
    theme.value = mode === 'light' ? 'light' : 'dark'
  }

  function toggleAppearanceMode() {
    setAppearanceMode(theme.value === 'dark' ? 'light' : 'dark')
  }

  function setAccentColor(color) {
    const normalized = normalizeHex(color)
    if (normalized) accentColor.value = normalized
  }

  function resetAppearance() {
    theme.value = 'dark'
    accentColor.value = DEFAULT_ACCENT
    localStorage.removeItem(STORAGE_ACCENT)
    localStorage.removeItem(STORAGE_BG)
    applyAppearance('dark', DEFAULT_ACCENT)
  }

  function initAppearance() {
    applyAppearance(theme.value, accentColor.value)
  }

  function initLanguage() {
    const ui = normalizeLanguage(localStorage.getItem(STORAGE_UI_LANGUAGE), DEFAULT_UI_LANGUAGE)
    const model = normalizeLanguage(
      localStorage.getItem(STORAGE_MODEL_LANGUAGE),
      DEFAULT_MODEL_LANGUAGE
    )
    uiLanguage.value = ui
    modelOutputLanguage.value = model
    setUiLocale(ui)
  }

  function setUiLanguage(lang) {
    const normalized = normalizeLanguage(lang)
    uiLanguage.value = normalized
    localStorage.setItem(STORAGE_UI_LANGUAGE, normalized)
    setUiLocale(normalized)
  }

  function setModelOutputLanguage(lang) {
    const normalized = normalizeLanguage(lang)
    modelOutputLanguage.value = normalized
    localStorage.setItem(STORAGE_MODEL_LANGUAGE, normalized)
  }

  function persistChatBackgrounds() {
    localStorage.setItem(STORAGE_CHAT_BG, JSON.stringify(chatBackgroundByCharacter.value))
  }

  function getChatBackground(characterId) {
    if (characterId == null || characterId === '') return ''
    return chatBackgroundByCharacter.value[String(characterId)] || ''
  }

  function setChatBackground(characterId, key) {
    if (characterId == null || characterId === '') return
    const map = { ...chatBackgroundByCharacter.value }
    if (key) {
      map[String(characterId)] = key
    } else {
      delete map[String(characterId)]
    }
    chatBackgroundByCharacter.value = map
    persistChatBackgrounds()
  }

  return {
    sidebarCollapsed,
    theme,
    accentColor,
    uiLanguage,
    modelOutputLanguage,
    toggleSidebar,
    setAppearanceMode,
    toggleAppearanceMode,
    setAccentColor,
    resetAppearance,
    initAppearance,
    initLanguage,
    setUiLanguage,
    setModelOutputLanguage,
    getChatBackground,
    setChatBackground,
    /** @deprecated use resetAppearance */
    resetAccentColor: resetAppearance,
    /** @deprecated use initAppearance */
    initTheme: initAppearance
  }
})
