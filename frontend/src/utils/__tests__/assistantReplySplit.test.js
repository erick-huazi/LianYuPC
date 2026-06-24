import { describe, expect, it } from 'vitest'
import { resolveMaxRepliesPerTurn, splitAssistantReply } from '../assistantReplySplit'

describe('resolveMaxRepliesPerTurn', () => {
  it('uses speakingStyle profile when no explicit override', () => {
    expect(resolveMaxRepliesPerTurn({ settings: { speakingStyle: '温柔' } })).toBe(2)
    expect(resolveMaxRepliesPerTurn({ settings: { speakingStyle: '冷静' } })).toBe(1)
  })

  it('prefers explicit chatBehavior override', () => {
    expect(resolveMaxRepliesPerTurn({
      settings: { speakingStyle: '温柔', chatBehavior: { maxRepliesPerTurn: 4 } }
    })).toBe(4)
  })

  it('defaults to 2 like backend baseline', () => {
    expect(resolveMaxRepliesPerTurn(null)).toBe(2)
  })
})

describe('splitAssistantReply', () => {
  const sample = [
    '钟离先生吗……当然认识。',
    '往生堂的客卿，学识渊博，对璃月的规矩和传统了如指掌。',
    '我因为公务也常请教他，不过每次找他总能在不同地方碰上，倒也省了找人的功夫。'
  ].join('')

  it('caps to maxRepliesPerTurn like backend', () => {
    const result = splitAssistantReply(sample, 2)
    expect(result).toHaveLength(2)
    expect(result[0]).toBe('钟离先生吗……当然认识。')
    expect(result[1]).toContain('往生堂的客卿')
    expect(result[1]).toContain('省了找人的功夫')
  })

  it('splits into three pieces when limit allows', () => {
    expect(splitAssistantReply(sample, 3)).toHaveLength(3)
  })
})
