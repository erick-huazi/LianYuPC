const FULL_WIDTH_PARENS = /（[^（）]*）/g
const HALF_WIDTH_PARENS = /\([^()]*\)/g
const INNER_THOUGHT_PATTERN = /（[^（）]*）|\([^()]*\)/g

export function parseInnerThoughtSegments(text) {
  if (text == null || text === '') return []
  const segments = []
  let lastIndex = 0
  const re = new RegExp(INNER_THOUGHT_PATTERN.source, 'g')
  let match = re.exec(text)
  while (match) {
    if (match.index > lastIndex) {
      const speech = text.slice(lastIndex, match.index)
      if (speech) segments.push({ type: 'speech', text: speech })
    }
    segments.push({ type: 'inner', text: match[0] })
    lastIndex = re.lastIndex
    match = re.exec(text)
  }
  if (lastIndex < text.length) {
    const speech = text.slice(lastIndex)
    if (speech) segments.push({ type: 'speech', text: speech })
  }
  return segments.length ? segments : [{ type: 'speech', text }]
}

export function hasInnerThoughtMarkers(text) {
  if (!text) return false
  return new RegExp(INNER_THOUGHT_PATTERN.source).test(text)
}

export function stripInnerThoughts(text, showInnerThoughts = true) {
  if (showInnerThoughts || text == null) {
    return text == null || text === '' ? '' : text
  }
  let result = text
  result = result.replace(FULL_WIDTH_PARENS, '')
  result = result.replace(HALF_WIDTH_PARENS, '')
  return result.replace(/\s{2,}/g, ' ').trim()
}

export function resolveShowInnerThoughts(settings) {
  if (!settings || settings.showInnerThoughts === undefined || settings.showInnerThoughts === null) {
    return true
  }
  return settings.showInnerThoughts !== false && settings.showInnerThoughts !== 'false'
}

export function displayAssistantContent(content, showInnerThoughts = true) {
  return stripInnerThoughts(content, showInnerThoughts)
}
