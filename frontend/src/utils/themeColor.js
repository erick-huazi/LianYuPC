/** Warm accent — buttons, links, highlights */
export const DEFAULT_ACCENT = '#F4A6B5'

/** Cool background seed — page / sidebar / cards */
export const DEFAULT_BACKGROUND = '#7A9EC4'

export const DEFAULT_BACKGROUNDS = {
  deepest: '#0E1218',
  primary: '#121820',
  secondary: '#171E28',
  surface: '#1E2732',
  elevated: '#252F3C'
}

/** Combined quick themes */
export const THEME_PRESETS = [
  { name: '粉恋星夜', bg: '#7A9EC4', accent: '#F4A6B5' },
  { name: '薰衣草暖', bg: '#8B7EC8', accent: '#E8A0B4' },
  { name: '薄荷暖阳', bg: '#6B9090', accent: '#FFB088' },
  { name: '深海珊瑚', bg: '#5B7A9E', accent: '#FF9A7A' },
  { name: '冷灰杏粉', bg: '#8899AA', accent: '#F4C4A0' },
  { name: '墨青玫瑰', bg: '#4A6670', accent: '#F4A6B5' }
]

/** Cool — background tint */
export const BG_PRESETS = [
  { name: '纯白', color: '#FFFFFF' },
  { name: '星夜蓝', color: '#7A9EC4' },
  { name: '深紫蓝', color: '#8B7EC8' },
  { name: '墨青', color: '#6B9090' },
  { name: '深海', color: '#5B7A9E' },
  { name: '冷灰', color: '#8899AA' },
  { name: '靛蓝', color: '#6B7EC4' }
]

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

function relativeLuminance(r, g, b) {
  const linear = [r, g, b].map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

/** 背景色即软件底色；浅色系直接铺色，深色系在选中色上叠层次 */
export function buildBackgroundPalette(bgSeedHex) {
  const seed = normalizeHex(bgSeedHex) || DEFAULT_BACKGROUND
  const rgb = hexToRgb(seed)
  if (!rgb) {
    return {
      backgrounds: { ...DEFAULT_BACKGROUNDS },
      glass: 'rgba(30, 39, 50, 0.75)',
      text: {
        primary: '#E8EDF2',
        secondary: '#A8B4C0',
        muted: '#728090',
        inverse: '#141A22'
      },
      bgRgb: '30, 39, 50',
      isLight: false
    }
  }

  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const isLight = relativeLuminance(rgb.r, rgb.g, rgb.b) > 0.58 || l >= 0.72

  let backgrounds
  let text
  let glass
  let bgRgb

  if (isLight) {
    backgrounds = {
      deepest: seed,
      primary: seed,
      secondary: mixHex(seed, '#000000', 0.035),
      surface: mixHex(seed, '#000000', 0.07),
      elevated: mixHex(seed, '#000000', 0.1)
    }

    const textHue = s < 0.08 ? 220 : h
    const textSat = clamp(s * 0.22 + 0.03, 0.03, 0.16)
    text = {
      primary: hslToHex(textHue, textSat, 0.16),
      secondary: hslToHex(textHue, textSat * 0.9, 0.34),
      muted: hslToHex(textHue, textSat * 0.75, 0.5),
      inverse: seed
    }

    const surfaceRgb = hexToRgb(backgrounds.surface) || rgb
    glass = `rgba(${surfaceRgb.r}, ${surfaceRgb.g}, ${surfaceRgb.b}, 0.88)`
    bgRgb = `${surfaceRgb.r}, ${surfaceRgb.g}, ${surfaceRgb.b}`
  } else {
    const primary = l > 0.34 ? mixHex(seed, '#000000', 0.18) : seed
    const primaryRgb = hexToRgb(primary) || rgb
    const { h: primaryHue, s: primarySat } = rgbToHsl(primaryRgb.r, primaryRgb.g, primaryRgb.b)
    const bgSat = clamp(primarySat * 0.55 + 0.06, 0.06, 0.32)

    backgrounds = {
      deepest: mixHex(primary, '#000000', 0.22),
      primary,
      secondary: mixHex(primary, '#FFFFFF', 0.05),
      surface: mixHex(primary, '#FFFFFF', 0.1),
      elevated: mixHex(primary, '#FFFFFF', 0.15)
    }

    const textSat = clamp(primarySat * 0.18 + 0.04, 0.04, 0.14)
    text = {
      primary: hslToHex(primaryHue, textSat, 0.92),
      secondary: hslToHex(primaryHue, textSat * 0.85, 0.7),
      muted: hslToHex(primaryHue, textSat * 0.7, 0.48),
      inverse: hslToHex(primaryHue, bgSat + 0.04, 0.12)
    }

    const surfaceRgb = hexToRgb(backgrounds.surface)
    glass = surfaceRgb
      ? `rgba(${surfaceRgb.r}, ${surfaceRgb.g}, ${surfaceRgb.b}, 0.75)`
      : 'rgba(30, 39, 50, 0.75)'
    bgRgb = surfaceRgb ? `${surfaceRgb.r}, ${surfaceRgb.g}, ${surfaceRgb.b}` : '30, 39, 50'
  }

  return {
    backgrounds,
    glass,
    text,
    bgRgb,
    isLight
  }
}

export function buildThemePalette(backgroundHex, accentHex) {
  const bg = buildBackgroundPalette(backgroundHex)
  const accent = accentVariants(accentHex)
  return { ...bg, accent }
}

function syncDocumentThemeMode(isLight) {
  const root = document.documentElement
  root.classList.toggle('ly-light-theme', isLight)
  root.classList.toggle('dark', !isLight)
}

/** Apply full theme: user background as app base + warm accent */
export function applyTheme(backgroundHex, accentHex) {
  const palette = buildThemePalette(backgroundHex, accentHex)
  const { accent, backgrounds, glass, text, bgRgb, isLight } = palette
  const accentRgb = hexToRgb(accent.primary)
  if (!accentRgb) return { background: DEFAULT_BACKGROUND, accent: DEFAULT_ACCENT }

  syncDocumentThemeMode(!!isLight)

  const root = document.documentElement
  const accentRgbStr = `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`

  root.style.setProperty('--ly-accent', accent.primary)
  root.style.setProperty('--ly-accent-light', accent.light)
  root.style.setProperty('--ly-accent-dark', accent.dark)
  root.style.setProperty('--ly-accent-muted', accent.muted)
  root.style.setProperty('--ly-accent-rgb', accentRgbStr)
  root.style.setProperty('--ly-accent-glow', `rgba(${accentRgbStr}, 0.2)`)

  root.style.setProperty('--ly-bg-deepest', backgrounds.deepest)
  root.style.setProperty('--ly-bg-primary', backgrounds.primary)
  root.style.setProperty('--ly-bg-secondary', backgrounds.secondary)
  root.style.setProperty('--ly-bg-surface', backgrounds.surface)
  root.style.setProperty('--ly-bg-elevated', backgrounds.elevated)
  root.style.setProperty('--ly-bg-glass', glass)
  root.style.setProperty('--ly-bg-glass-strong', glass)
  root.style.setProperty('--ly-bg-surface-rgb', bgRgb)
  root.style.setProperty('--ly-bg-seed', normalizeHex(backgroundHex) || DEFAULT_BACKGROUND)

  root.style.setProperty('--ly-text-primary', text.primary)
  root.style.setProperty('--ly-text-secondary', text.secondary)
  root.style.setProperty('--ly-text-muted', text.muted)
  root.style.setProperty('--ly-text-inverse', text.inverse)

  root.style.setProperty('--el-color-primary', accent.primary)
  root.style.setProperty('--el-color-primary-light-3', accent.light)
  root.style.setProperty('--el-color-primary-light-5', `rgba(${accentRgbStr}, 0.5)`)
  root.style.setProperty('--el-color-primary-light-7', `rgba(${accentRgbStr}, 0.3)`)
  root.style.setProperty('--el-color-primary-light-8', `rgba(${accentRgbStr}, 0.2)`)
  root.style.setProperty('--el-color-primary-light-9', `rgba(${accentRgbStr}, 0.1)`)
  root.style.setProperty('--el-color-primary-dark-2', accent.dark)

  root.style.setProperty('--el-bg-color', backgrounds.primary)
  root.style.setProperty('--el-bg-color-page', backgrounds.deepest)
  root.style.setProperty('--el-bg-color-overlay', backgrounds.surface)
  root.style.setProperty('--el-fill-color', backgrounds.secondary)
  root.style.setProperty('--el-fill-color-blank', backgrounds.primary)
  root.style.setProperty('--el-fill-color-light', backgrounds.surface)
  root.style.setProperty('--el-text-color-primary', text.primary)
  root.style.setProperty('--el-text-color-regular', text.secondary)
  root.style.setProperty('--el-text-color-secondary', text.muted)
  root.style.setProperty('--el-text-color-placeholder', accent.muted)

  return {
    background: normalizeHex(backgroundHex) || DEFAULT_BACKGROUND,
    accent: accent.primary
  }
}

/** @deprecated use applyTheme */
export function applyAccentColor(accentHex) {
  return applyTheme(DEFAULT_BACKGROUND, accentHex).accent
}
