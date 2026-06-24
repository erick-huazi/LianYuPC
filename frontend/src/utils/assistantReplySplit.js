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

function collectReplyPieces(fullContent) {
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
  return pieces
}

function capReplyPieces(pieces, limit) {
  const capped = Math.max(1, Number(limit) || 3)
  if (pieces.length <= capped) {
    return pieces
  }
  const head = pieces.slice(0, capped - 1)
  const tail = pieces.slice(capped - 1).join(' ').trim()
  return [...head, tail]
}

export function splitAssistantReply(fullContent, maxRepliesPerTurn = 3) {
  return capReplyPieces(collectReplyPieces(fullContent), maxRepliesPerTurn)
}

/** 展示层：按换行/句号拆成多条气泡，避免单条 DB 消息因 pre-wrap 露出多行 */
export function splitAssistantReplyForDisplay(fullContent) {
  return capReplyPieces(collectReplyPieces(fullContent), 5)
}

/** 与后端 {@code CharacterChatBehaviorResolver.StyleProfile} 默认条数一致 */
const SPEAKING_STYLE_MAX_REPLIES = {
  活泼: 3,
  元气: 3,
  温柔: 2,
  傲娇: 2,
  毒舌: 2,
  冷静: 1,
  成熟: 1,
  慵懒: 1
}

function clampMaxReplies(n) {
  return Math.min(5, Math.max(1, n))
}

export function resolveMaxRepliesPerTurn(character) {
  const settings = character?.settings
  if (settings && typeof settings === 'object') {
    const nested = settings.chatBehavior
    if (nested && typeof nested === 'object' && nested.maxRepliesPerTurn != null) {
      const n = Number(nested.maxRepliesPerTurn)
      if (Number.isFinite(n)) return clampMaxReplies(n)
    }
    if (settings.maxRepliesPerTurn != null) {
      const n = Number(settings.maxRepliesPerTurn)
      if (Number.isFinite(n)) return clampMaxReplies(n)
    }
    const style = String(settings.speakingStyle || '').trim()
    if (style && SPEAKING_STYLE_MAX_REPLIES[style] != null) {
      return SPEAKING_STYLE_MAX_REPLIES[style]
    }
  }
  return 2
}
