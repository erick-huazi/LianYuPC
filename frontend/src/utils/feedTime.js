import { dateLocaleForUi } from '@/utils/dateLocale'

/**
 * API returns LocalDateTime without offset (Asia/Shanghai business time).
 */
export function parseFeedDateTime(iso) {
  if (!iso) return null
  const raw = String(iso).trim()
  if (!raw) return null
  if (/[zZ]$/.test(raw) || /[+-]\d{2}:\d{2}$/.test(raw)) {
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(`${raw}+08:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function resolveDate(input) {
  if (input == null || input === '') return null
  if (typeof input === 'number') {
    const d = new Date(input)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return parseFeedDateTime(input) ?? (() => {
    const d = new Date(input)
    return Number.isNaN(d.getTime()) ? null : d
  })()
}

function formatClock(d, locale) {
  const loc = dateLocaleForUi(locale) || 'zh-CN'
  return d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit', hour12: false })
}

/**
 * WeChat-style timestamps: today HH:mm, yesterday 昨天 HH:mm, older M月D日 HH:mm.
 */
export function formatSmartTime(input, { t, locale } = {}) {
  const d = resolveDate(input)
  if (!d) return typeof input === 'string' ? input : ''

  const now = new Date()
  const time = formatClock(d, locale)

  if (d.toDateString() === now.toDateString()) {
    return time
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) {
    return t ? t('feed.yesterday', { time }) : `昨天 ${time}`
  }

  const month = d.getMonth() + 1
  const day = d.getDate()
  if (t) {
    return t('feed.dateTime', { month, day, time })
  }

  const loc = dateLocaleForUi(locale) || 'zh-CN'
  if (loc.startsWith('zh')) {
    return `${month}月${day}日 ${time}`
  }
  return d.toLocaleString(loc, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/**
 * Relative / friendly timestamps for social feed surfaces.
 */
export function formatFeedTime(iso, t, locale) {
  return formatSmartTime(iso, { t, locale })
}

export function formatFeedDateLabel(iso, t) {
  const d = parseFeedDateTime(iso)
  if (!d) return iso || ''

  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return t ? t('feed.today') : 'Today'
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) {
    return t ? t('feed.yesterdayLabel') : 'Yesterday'
  }

  return d.toLocaleDateString([], { month: 'long', day: 'numeric', weekday: 'short' })
}

export function feedDateKey(iso) {
  const d = parseFeedDateTime(iso)
  if (!d) return iso || ''
  return d.toDateString()
}
