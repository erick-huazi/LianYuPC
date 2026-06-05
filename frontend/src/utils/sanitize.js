import DOMPurify from 'dompurify'

const ALLOWED_TAGS = ['strong', 'em', 'b', 'i', 'u', 'span', 'br']
const ALLOWED_ATTRS = ['class']

export function sanitizeHtml(dirty) {
  if (!dirty) return ''
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTRS,
  })
}

export function sanitizeTextToHtml(text) {
  if (!text) return ''
  const escaped = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  return sanitizeHtml(escaped)
}
