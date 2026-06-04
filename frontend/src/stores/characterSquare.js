import { defineStore } from 'pinia'
import { ref } from 'vue'
import { addCharacterFromSquare, listCharacterSquareTemplates } from '@/api/characterSquare'
import { useCharactersStore } from '@/stores/characters'

const STALE_MS = 120_000

function cacheKey(page, tag) {
  return `${page}|${tag || ''}`
}

export const useCharacterSquareStore = defineStore('characterSquare', () => {
  const pages = ref({})
  const loading = ref(false)

  function invalidateAll() {
    pages.value = {}
  }

  function getCached(page, tag) {
    const entry = pages.value[cacheKey(page, tag)]
    if (!entry) return null
    if (Date.now() - entry.fetchedAt > STALE_MS) {
      return null
    }
    return entry
  }

  async function fetchTemplates({ page = 1, size = 12, tag = '', force = false } = {}) {
    const key = cacheKey(page, tag)
    if (!force) {
      const hit = getCached(page, tag)
      if (hit) {
        return hit
      }
    }

    loading.value = true
    try {
      const data = await listCharacterSquareTemplates({
        page,
        size,
        tag: tag || undefined
      })
      const entry = {
        records: data?.records || [],
        total: data?.total ?? 0,
        tags: data?.tags || [],
        page: data?.page ?? page,
        fetchedAt: Date.now()
      }
      pages.value = { ...pages.value, [key]: entry }
      return entry
    } finally {
      loading.value = false
    }
  }

  async function addTemplate(templateId, { city } = {}) {
    const created = await addCharacterFromSquare(templateId, { city })
    invalidateAll()
    useCharactersStore().invalidate()
    return created
  }

  function markAddedInCache(templateId, characterId) {
    const next = { ...pages.value }
    for (const key of Object.keys(next)) {
      const entry = next[key]
      if (!entry?.records?.length) continue
      next[key] = {
        ...entry,
        records: entry.records.map(item =>
          item.id === templateId
            ? { ...item, added: true, addedCharacterId: characterId ?? item.addedCharacterId }
            : item
        )
      }
    }
    pages.value = next
  }

  return {
    pages,
    loading,
    invalidateAll,
    fetchTemplates,
    addTemplate,
    markAddedInCache
  }
})
