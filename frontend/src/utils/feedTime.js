/**
 * Relative / friendly timestamps for social feed surfaces.
 */
export function formatFeedTime(iso, t) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso

  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) {
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return t ? t('feed.yesterday', { time }) : `Yesterday ${time}`
  }

  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatFeedDateLabel(iso, t) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso

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
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toDateString()
}
