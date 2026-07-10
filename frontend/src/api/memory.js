import http from './index'

export function listMemories(characterId) {
  return http.get('/memory', { params: characterId ? { characterId } : {} })
}

export function getMemory(id) {
  return http.get(`/memory/${id}`)
}

export function deleteMemory(id) {
  return http.delete(`/memory/${id}`)
}

export function clearMemories(characterId) {
  return http.delete('/memory', { params: characterId ? { characterId } : {} })
}

export function listMemoryRecalls(characterId, { page = 1, size = 30 } = {}) {
  return http.get('/memory/recalls', {
    params: { ...(characterId ? { characterId } : {}), page, size }
  })
}

export function clearMemoryRecalls(characterId) {
  return http.delete('/memory/recalls', { params: characterId ? { characterId } : {} })
}
