/**
 * 修复 UTF-8 被误按 Latin-1 解码导致的乱码（如「女」→「å¥³」）。
 */
export function fixUtf8Mojibake(value) {
  if (!value || typeof value !== 'string') return value
  if (!/[\u00C0-\u00FF]/.test(value)) return value
  try {
    const bytes = Uint8Array.from(value, (c) => c.charCodeAt(0) & 0xff)
    const decoded = new TextDecoder('utf-8').decode(bytes)
    if (decoded && !decoded.includes('\uFFFD')) return decoded
  } catch {
    // ignore
  }
  return value
}
