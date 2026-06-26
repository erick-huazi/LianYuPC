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
