const OPEN_PARENS = new Set(['（', '('])
const CLOSE_PARENS = new Set(['）', ')'])

/** @returns {{ start: number, end: number }[]} */
export function findParenthesisRanges(text) {
  if (!text) return []
  const ranges = []
  const stack = []
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (OPEN_PARENS.has(ch)) {
      stack.push(i)
    } else if (CLOSE_PARENS.has(ch) && stack.length) {
      const start = stack.pop()
      ranges.push({ start, end: i })
    }
  }
  return ranges.sort((a, b) => a.start - b.start)
}

export function isInsideParentheses(text, index) {
  if (!text || index <= 0) return false
  let depth = 0
  for (let i = 0; i < index; i += 1) {
    const ch = text[i]
    if (OPEN_PARENS.has(ch)) depth += 1
    else if (CLOSE_PARENS.has(ch) && depth > 0) depth -= 1
  }
  return depth > 0
}

export function parseInnerThoughtSegments(text) {
  if (text == null || text === '') return []
  const ranges = findParenthesisRanges(text)
  if (!ranges.length) return [{ type: 'speech', text }]

  const segments = []
  let lastIndex = 0
  for (const { start, end } of ranges) {
    if (start > lastIndex) {
      const speech = text.slice(lastIndex, start)
      if (speech) segments.push({ type: 'speech', text: speech })
    }
    segments.push({ type: 'inner', text: text.slice(start, end + 1) })
    lastIndex = end + 1
  }
  if (lastIndex < text.length) {
    const speech = text.slice(lastIndex)
    if (speech) segments.push({ type: 'speech', text: speech })
  }
  return segments.length ? segments : [{ type: 'speech', text }]
}

export function hasInnerThoughtMarkers(text) {
  return findParenthesisRanges(text).length > 0
}

export function stripInnerThoughts(text, showInnerThoughts = true) {
  if (showInnerThoughts || text == null) {
    return text == null || text === '' ? '' : text
  }
  const ranges = findParenthesisRanges(text).sort((a, b) => b.start - a.start)
  let result = text
  for (const { start, end } of ranges) {
    result = result.slice(0, start) + result.slice(end + 1)
  }
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
