import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const HEADER_CLIENT = 'X-LianYu-Client'
const HEADER_DEVICE = 'X-LianYu-Device-Id'
const HEADER_TIMESTAMP = 'X-LianYu-Timestamp'
const HEADER_NONCE = 'X-LianYu-Nonce'
const HEADER_SIGNATURE = 'X-LianYu-Signature'

let cachedMeta = null

function loadBuildMeta() {
  if (cachedMeta) return cachedMeta
  const candidates = [
    path.join(__dirname, 'client-build.json'),
    path.join(__dirname, '..', 'build', 'client-build.json'),
  ]
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
      if (parsed?.version && parsed?.buildId) {
        cachedMeta = parsed
        return cachedMeta
      }
    } catch {
      // try next
    }
  }
  cachedMeta = { version: '0.0.0', buildId: 'dev' }
  return cachedMeta
}

export function getClientAttestMeta() {
  const meta = loadBuildMeta()
  return {
    version: meta.version,
    buildId: meta.buildId,
    clientHeader: getClientHeaderValue(),
  }
}

export function getClientHeaderValue() {
  const meta = loadBuildMeta()
  return `electron/${meta.version}/${meta.buildId}`
}

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text || '', 'utf8').digest('hex')
}

function hmacSha256Hex(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex')
}

function canonicalString(method, apiPath, timestamp, nonce, bodyHash) {
  return `${method.toUpperCase()}\n${apiPath}\n${timestamp}\n${nonce}\n${bodyHash}`
}

export function signAuthenticatedRequest({ deviceId, deviceSecret, method, apiPath, bodyText = '' }) {
  if (!deviceId || !deviceSecret) return null
  const timestamp = Math.floor(Date.now() / 1000)
  const nonce = crypto.randomBytes(16).toString('hex')
  const bodyHash = sha256Hex(bodyText)
  const signature = hmacSha256Hex(
    deviceSecret,
    canonicalString(method, apiPath, timestamp, nonce, bodyHash),
  )
  return {
    [HEADER_CLIENT]: getClientHeaderValue(),
    [HEADER_DEVICE]: deviceId,
    [HEADER_TIMESTAMP]: String(timestamp),
    [HEADER_NONCE]: nonce,
    [HEADER_SIGNATURE]: signature,
  }
}

export function loginClientHeaders() {
  return { [HEADER_CLIENT]: getClientHeaderValue() }
}

export function loginClientBodyExtras(deviceId) {
  const meta = loadBuildMeta()
  return {
    deviceId: deviceId || undefined,
    clientBuildId: meta.buildId,
  }
}

export { HEADER_CLIENT, HEADER_DEVICE }
