import http from './index'

export function listCharacters(options = {}) {
  return http.get('/character', {
    skipGlobalError: options.silent === true
  })
}

export function getCharacter(id) {
  return http.get(`/character/${id}`)
}

export function createCharacter(data) {
  return http.post('/character', data)
}

export function updateCharacter(id, data) {
  return http.put(`/character/${id}`, data)
}

export function deleteCharacter(id) {
  return http.delete(`/character/${id}`)
}

export function uploadAvatar(id, file) {
  const formData = new FormData()
  formData.append('file', file)
  return http.post(`/character/${id}/avatar`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function uploadChatBackground(id, file) {
  const formData = new FormData()
  formData.append('file', file)
  return http.post(`/character/${id}/chat-background`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export function generateCharacter(data) {
  return http.post('/character/generate', data, { timeout: 120000 })
}

export function importCharacterCard(file, { cityMode = 'real', city = '' } = {}) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('cityMode', cityMode)
  if (city) formData.append('city', city)
  return http.post('/character/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000
  })
}

export function exportCharacterCard(id, format = 'png') {
  return http.get(`/character/${id}/export`, {
    params: { format },
    responseType: 'blob',
    useRendererAdapter: true,
    timeout: 120000
  })
}
