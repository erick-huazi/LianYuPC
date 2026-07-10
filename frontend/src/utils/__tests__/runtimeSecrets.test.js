import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { decodeRuntimeSecretsBuffer } from '../../../electron/runtimeSecrets.js'
import { packRuntimeSecrets } from '../../../scripts/pack-runtime-secrets.mjs'

const tempDirs = []

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

function roundTrip(overrides = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'amiweave-secrets-'))
  tempDirs.push(dir)
  const outPath = path.join(dir, 'runtime-secrets.bin')
  const version = '0.3.0-test'
  const buildId = 'test-build-id'

  packRuntimeSecrets({
    version,
    buildId,
    apiOrigin: 'https://amiweave.com/',
    certFingerprint: '',
    pinnedSpki: '',
    outPath,
    ...overrides,
  })

  return decodeRuntimeSecretsBuffer(fs.readFileSync(outPath), version, buildId)
}

describe('runtime certificate settings', () => {
  it('supports public CA validation without a certificate pin', () => {
    expect(roundTrip()).toEqual({
      apiOrigin: 'https://amiweave.com',
      certFingerprint: '',
      pinnedSpki: '',
    })
  })

  it('retains explicit pins for private deployments', () => {
    expect(roundTrip({ certFingerprint: 'AA:BB', pinnedSpki: 'sha256-value' })).toEqual({
      apiOrigin: 'https://amiweave.com',
      certFingerprint: 'AA:BB',
      pinnedSpki: 'sha256-value',
    })
  })
})
