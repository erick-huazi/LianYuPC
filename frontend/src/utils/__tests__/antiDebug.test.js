import { describe, expect, it } from 'vitest'
import { exceedsDebuggerPauseThreshold } from '../antiDebug'

describe('anti-debug pause detection', () => {
  it('does not treat ordinary startup stalls as debugger pauses', () => {
    expect(exceedsDebuggerPauseThreshold(500)).toBe(false)
    expect(exceedsDebuggerPauseThreshold(1500)).toBe(false)
  })

  it('detects a sustained pause at the debugger statement', () => {
    expect(exceedsDebuggerPauseThreshold(1501)).toBe(true)
  })
})
