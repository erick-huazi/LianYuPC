import http from './index'
import { storeToken, clearTokenStorage } from '@/utils/secureToken'
import { getElectronAPI } from '@/utils/electron'
import { getElectronLoginExtras } from '@/utils/clientAttestation'

export function getCaptcha() {
  return http.get('/auth/captcha', { skipGlobalError: true })
}

export async function register(data) {
  const electronAPI = getElectronAPI()
  let session = null
  if (electronAPI?.getAuthSession) {
    session = await electronAPI.getAuthSession()
  }
  const extras = await getElectronLoginExtras(session?.deviceId)
  return http.post('/auth/register', { ...data, ...extras.body }, { headers: extras.headers })
}

export async function login(data) {
  const electronAPI = getElectronAPI()
  let session = null
  if (electronAPI?.getAuthSession) {
    session = await electronAPI.getAuthSession()
  }
  const extras = await getElectronLoginExtras(session?.deviceId)
  const result = await http.post('/auth/login', { ...data, ...extras.body }, { headers: extras.headers })
  if (result?.token) {
    await storeToken(result.token)
  }
  return result
}

export async function logout() {
  try { await http.post('/auth/logout') } catch { /* ignore */ }
  clearTokenStorage()
}

export function getProfile(config = {}) {
  return http.get('/auth/me', config)
}

export function updateProfile(data) {
  return http.put('/auth/me', data)
}

export function uploadProfileAvatar(file) {
  const formData = new FormData()
  formData.append('file', file)
  return http.post('/auth/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function changePassword(data) {
  return http.put('/auth/me/password', data)
}
