/**
 * 与后端 {@code AssistantReplySplitter} 一致：按换行拆成多条气泡。
 */
const SENTENCE_SPLIT_MIN_CHARS = 40
const CJK_SENTENCE_BOUNDARY = /(?<=[。！？!?])(?=[^。！？!?\s])/u
const EN_SENTENCE_BOUNDARY = /(?<=[.!?])\s+/

function splitWithPattern(text, pattern) {
  const parts = text.split(pattern).map(s => s.trim()).filter(Boolean)
  return parts.length ? parts : [text.trim()]
}

function splitBySentenceBoundary(text) {
  const cjk = splitWithPattern(text, CJK_SENTENCE_BOUNDARY)
  if (cjk.length > 1) return cjk
  const en = splitWithPattern(text, EN_SENTENCE_BOUNDARY)
  if (en.length > 1) return en
  return [text.trim()]
}

export function splitAssistantReply(fullContent, maxRepliesPerTurn = 3) {
  if (!fullContent || !String(fullContent).trim()) {
    return []
  }
  const normalized = String(fullContent).replace(/\r\n/g, '\n').trim()
  let pieces = normalized
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
  if (pieces.length === 0) {
    pieces = [normalized]
  }

  if (pieces.length === 1 && pieces[0].length >= SENTENCE_SPLIT_MIN_CHARS) {
    const sentencePieces = splitBySentenceBoundary(pieces[0])
    if (sentencePieces.length > 1) {
      pieces = sentencePieces
    }
  }

  const limit = Math.max(1, Number(maxRepliesPerTurn) || 3)
  if (pieces.length > limit) {
    const head = pieces.slice(0, limit - 1)
    const tail = pieces.slice(limit - 1).join('\n').trim()
    return [...head, tail]
  }
  return pieces
}

export function resolveMaxRepliesPerTurn(character) {
  const settings = character?.settings
  if (!settings || typeof settings !== 'object') {
    return 3
  }
  const nested = settings.chatBehavior
  if (nested && typeof nested === 'object' && nested.maxRepliesPerTurn != null) {
    const n = Number(nested.maxRepliesPerTurn)
    if (Number.isFinite(n)) return Math.min(5, Math.max(1, n))
  }
  if (settings.maxRepliesPerTurn != null) {
    const n = Number(settings.maxRepliesPerTurn)
    if (Number.isFinite(n)) return Math.min(5, Math.max(1, n))
  }
  return 3
}
