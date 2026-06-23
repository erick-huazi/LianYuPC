/** Warm accent — buttons, links, highlights */
export const DEFAULT_ACCENT = '#F4A6B5'

/** @deprecated background seed no longer user-configurable */
export const DEFAULT_BACKGROUND = '#7A9EC4'

export const DEFAULT_BACKGROUNDS = {
  deepest: '#0E1218',
  primary: '#121820',
  secondary: '#171E28',
  surface: '#1E2732',
  elevated: '#252F3C'
}

export const LIGHT_BACKGROUNDS = {
  deepest: '#FFFFFF',
  primary: '#F7F7F9',
  secondary: '#ECECEE',
  surface: '#E0E0E3',
  elevated: '#D4D4D8'
}

/** Warm — button / accent */
export const ACCENT_PRESETS = [
  { name: '粉恋', color: '#F4A6B5' },
  { name: '蜜桃', color: '#FFB088' },
  { name: '玫瑰金', color: '#E8A0B4' },
  { name: '珊瑚', color: '#FF9A7A' },
  { name: '暖阳', color: '#FFC085' },
  { name: '杏色', color: '#F4C4A0' }
]

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

export function normalizeHex(input) {
  if (!input || typeof input !== 'string') return null
  let hex = input.trim()
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null
  return hex.toUpperCase()
}

export function hexToRgb(hex) {
  const normalized = normalizeHex(hex)
  if (!normalized) return null
  const n = parseInt(normalized.slice(1), 16)
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255
  }
}

function rgbToHex(r, g, b) {
  const toHex = v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

export function rgbToHsl(r, g, b) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      default:
        h = ((r - g) / d + 4) / 6
    }
  }
  return { h: h * 360, s, l }
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360
  let r, g, b

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  return { r: r * 255, g: g * 255, b: b * 255 }
}

export function hslToHex(h, s, l) {
  const { r, g, b } = hslToRgb(h, s, l)
  return rgbToHex(r, g, b)
}

export function mixHex(hex, target, amount) {
  const rgb = hexToRgb(hex)
  if (!rgb) return DEFAULT_ACCENT
  const t = hexToRgb(target)
  if (!t) return hex
  const a = clamp(amount, -1, 1)
  return rgbToHex(
    rgb.r + (t.r - rgb.r) * a,
    rgb.g + (t.g - rgb.g) * a,
    rgb.b + (t.b - rgb.b) * a
  )
}

export function accentVariants(hex) {
  const base = normalizeHex(hex) || DEFAULT_ACCENT
  return {
    primary: base,
    light: mixHex(base, '#FFFFFF', 0.35),
    dark: mixHex(base, '#000000', 0.22),
    muted: mixHex(base, '#000000', 0.55)
  }
}

function buildDarkBackgroundPalette() {
  const backgrounds = { ...DEFAULT_BACKGROUNDS }
  const surfaceRgb = hexToRgb(backgrounds.surface)
  const glass = surfaceRgb
    ? `rgba(${surfaceRgb.r}, ${surfaceRgb.g}, ${surfaceRgb.b}, 0.75)`
    : 'rgba(30, 39, 50, 0.75)'
  const text = {
    primary: '#E8EDF2',
    secondary: '#A8B4C0',
    muted: '#728090',
    inverse: '#FFFFFF'
  }
  return {
    backgrounds,
    glass,
    glassStrong: glass,
    text,
    bgRgb: surfaceRgb ? `${surfaceRgb.r}, ${surfaceRgb.g}, ${surfaceRgb.b}` : '30, 39, 50'
  }
}

function buildLightBackgroundPalette() {
  const backgrounds = { ...LIGHT_BACKGROUNDS }
  const surfaceRgb = hexToRgb(backgrounds.surface)
  const glass = 'rgba(255, 255, 255, 0.92)'
  const glassStrong = 'rgba(255, 255, 255, 0.96)'
  const text = {
    primary: '#1A1A1E',
    secondary: '#4A4A52',
    muted: '#8A8A96',
    inverse: '#FFFFFF'
  }
  return {
    backgrounds,
    glass,
    glassStrong,
    text,
    bgRgb: surfaceRgb ? `${surfaceRgb.r}, ${surfaceRgb.g}, ${surfaceRgb.b}` : '224, 224, 227'
  }
}

function resolveAppearanceMode(modeOrBg) {
  if (modeOrBg === 'light' || modeOrBg === 'dark') {
    return modeOrBg
  }
  if (normalizeHex(modeOrBg)) {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    }
    return 'dark'
  }
  return 'dark'
}

/** Background stack + text from appearance mode (legacy bg hex arg is ignored) */
export function buildBackgroundPalette(modeOrBg = 'dark') {
  const mode = resolveAppearanceMode(modeOrBg)
  return mode === 'light' ? buildLightBackgroundPalette() : buildDarkBackgroundPalette()
}

export function buildAppearancePalette(modeOrBg, accentHex) {
  const mode = resolveAppearanceMode(modeOrBg)
  const bg = buildBackgroundPalette(mode)
  const accent = accentVariants(accentHex)
  return { ...bg, accent }
}

function applyCssVariables({ accent, backgrounds, glass, glassStrong, text, bgRgb }) {
  const root = document.documentElement
  const resolvedAccent = accentVariants(accent?.primary || DEFAULT_ACCENT)

  root.style.setProperty('--ly-bg-deepest', backgrounds.deepest)
  root.style.setProperty('--ly-bg-primary', backgrounds.primary)
  root.style.setProperty('--ly-bg-secondary', backgrounds.secondary)
  root.style.setProperty('--ly-bg-surface', backgrounds.surface)
  root.style.setProperty('--ly-bg-elevated', backgrounds.elevated)
  root.style.setProperty('--ly-bg-glass', glass)
  root.style.setProperty('--ly-bg-glass-strong', glassStrong)
  root.style.setProperty('--ly-bg-surface-rgb', bgRgb)
  root.style.setProperty('--ly-bg-seed', backgrounds.primary)

  root.style.setProperty('--ly-text-primary', text.primary)
  root.style.setProperty('--ly-text-secondary', text.secondary)
  root.style.setProperty('--ly-text-muted', text.muted)
  root.style.setProperty('--ly-text-inverse', text.inverse)

  const accentRgb = hexToRgb(resolvedAccent.primary) || hexToRgb(DEFAULT_ACCENT)
  if (!accentRgb) return

  const accentRgbStr = `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`

  root.style.setProperty('--ly-accent', resolvedAccent.primary)
  root.style.setProperty('--ly-accent-light', resolvedAccent.light)
  root.style.setProperty('--ly-accent-dark', resolvedAccent.dark)
  root.style.setProperty('--ly-accent-muted', resolvedAccent.muted)
  root.style.setProperty('--ly-accent-rgb', accentRgbStr)
  root.style.setProperty('--ly-accent-glow', `rgba(${accentRgbStr}, 0.2)`)

  root.style.setProperty('--el-color-primary', resolvedAccent.primary)
  root.style.setProperty('--el-color-primary-light-3', resolvedAccent.light)
  root.style.setProperty('--el-color-primary-light-5', `rgba(${accentRgbStr}, 0.5)`)
  root.style.setProperty('--el-color-primary-light-7', `rgba(${accentRgbStr}, 0.3)`)
  root.style.setProperty('--el-color-primary-light-8', `rgba(${accentRgbStr}, 0.2)`)
  root.style.setProperty('--el-color-primary-light-9', `rgba(${accentRgbStr}, 0.1)`)
  root.style.setProperty('--el-color-primary-dark-2', resolvedAccent.dark)

  root.style.setProperty('--el-bg-color', backgrounds.primary)
  root.style.setProperty('--el-bg-color-page', backgrounds.deepest)
  root.style.setProperty('--el-bg-color-overlay', backgrounds.surface)
  root.style.setProperty('--el-fill-color', backgrounds.secondary)
  root.style.setProperty('--el-fill-color-blank', backgrounds.primary)
  root.style.setProperty('--el-fill-color-light', backgrounds.surface)
  root.style.setProperty('--el-text-color-primary', text.primary)
  root.style.setProperty('--el-text-color-regular', text.secondary)
  root.style.setProperty('--el-text-color-secondary', text.muted)
  root.style.setProperty('--el-text-color-placeholder', text.muted)

  if (typeof document !== 'undefined' && document.body) {
    document.body.style.backgroundColor = backgrounds.deepest
    document.body.style.color = text.primary
  }
}

/** Apply appearance mode (dark/light) + accent; legacy applyTheme(bgHex, accent) still works */
export function applyAppearance(modeOrBg, accentHex) {
  const normalizedMode = resolveAppearanceMode(modeOrBg)
  const accent = normalizeHex(accentHex) || DEFAULT_ACCENT
  const palette = buildAppearancePalette(normalizedMode, accent)
  applyCssVariables(palette)
  const root = document.documentElement
  root.classList.toggle('dark', normalizedMode === 'dark')
  root.classList.toggle('light', normalizedMode === 'light')
  root.dataset.appearance = normalizedMode
  root.style.colorScheme = normalizedMode
  if (typeof document !== 'undefined') {
    const appRoot = document.getElementById('app')
    if (appRoot) {
      appRoot.style.backgroundColor = palette.backgrounds.primary
    }
  }
  return {
    mode: normalizedMode,
    accent: palette.accent.primary
  }
}

/** @deprecated use applyAppearance(mode, accent) */
export function applyTheme(_backgroundHex, accentHex) {
  return applyAppearance(
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    accentHex
  )
}

/** @deprecated use buildAppearancePalette(mode, accent) */
export function buildThemePalette(_backgroundHex, accentHex) {
  return buildAppearancePalette('dark', accentHex)
}

/** @deprecated use applyAppearance */
export function applyAccentColor(accentHex) {
  return applyAppearance('dark', accentHex).accent
}
