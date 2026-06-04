/**
 * 与后端 {@code AssistantReplySplitter} 一致：按换行拆成多条气泡。
 */
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
