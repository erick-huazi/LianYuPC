<template>
  <div class="memory-page stagger-container">
    <header class="page-header">
      <h1 class="page-title">{{ t('memory.title') }}</h1>
      <p class="page-desc">{{ t('memory.desc') }}</p>
    </header>

    <div class="filter-row stagger-item">
      <el-select
        v-model="filterCharId"
        :placeholder="t('memory.allCharacters')"
        clearable
        class="filter-select"
        @change="onFilterChange"
      >
        <el-option
          v-for="c in charactersStore.list"
          :key="c.id"
          :label="c.name"
          :value="c.id"
        />
      </el-select>
      <el-button :icon="RefreshRight" @click="fetchMemories" :loading="loading">{{ t('memory.refresh') }}</el-button>
      <el-button type="danger" plain :icon="Delete" :disabled="memories.length === 0" @click="confirmClearMemories">
        {{ filterCharId ? '清空该角色记忆' : '清空全部记忆' }}
      </el-button>
    </div>

    <section class="recall-section glass stagger-item">
      <div class="recall-header">
        <div>
          <h2>最近命中</h2>
          <p>展示记忆在回复中被调用的时间与路径；不会保存原始提问。</p>
        </div>
        <div class="recall-actions">
          <el-button text :icon="RefreshRight" :loading="recallLoading" @click="fetchRecalls">刷新</el-button>
          <el-button text :icon="Delete" :disabled="recalls.length === 0" @click="confirmClearRecalls">清空</el-button>
        </div>
      </div>
      <div v-if="recallLoading" class="recall-empty">加载中...</div>
      <div v-else-if="recalls.length === 0" class="recall-empty">暂无命中记录</div>
      <div v-else class="recall-list">
        <div v-for="item in recalls" :key="item.id" class="recall-row">
          <div class="recall-meta">
            <span class="recall-route">{{ routeLabel(item.route) }}</span>
            <span>{{ item.backend }}</span>
            <span>{{ formatDate(item.createdAt) }}</span>
          </div>
          <div class="recall-summary">
            {{ item.summaries?.length ? item.summaries.join(' · ') : `命中 ${item.hitCount || 0} 条记忆` }}
          </div>
        </div>
      </div>
    </section>

    <div v-if="loading" class="loading-state">
      <el-icon class="is-loading" :size="24"><Loading /></el-icon>
      <span>{{ t('common.loading') }}</span>
    </div>

    <div v-else-if="memories.length === 0" class="empty-state glass stagger-item">
      <div class="empty-icon">
        <el-icon :size="40"><Collection /></el-icon>
      </div>
      <h3>{{ t('memory.empty') }}</h3>
      <p>{{ t('memory.emptyDesc') }}</p>
    </div>

    <div v-else class="memory-groups">
      <div
        v-for="group in groupedMemories"
        :key="group.charId"
        class="memory-group glass stagger-item"
      >
        <div class="group-header">
          <div class="group-char-info">
            <div class="group-char-avatar">
              <img v-if="group.avatarUrl" :src="resolveMediaUrl(group.avatarUrl)" />
              <el-icon v-else :size="16"><User /></el-icon>
            </div>
            <span class="group-char-name">{{ group.charName }}</span>
            <span class="group-count">{{ t('memory.count', { count: group.items.length }) }}</span>
          </div>
        </div>

        <div class="group-items">
          <div
            v-for="(mem, idx) in group.items"
            :key="mem.id"
            class="memory-card"
            :style="{ animationDelay: `${idx * 0.03}s` }"
          >
            <div class="mem-header">
              <span class="mem-time">{{ formatDate(mem.createdAt) }}</span>
            </div>

            <div class="mem-summary">{{ mem.summary }}</div>

            <div v-if="mem.sourceMsgIds && mem.sourceMsgIds.length" class="mem-sources">
              <el-button text size="small" @click="toggleSources(mem.id)">
                <el-icon :size="14"><component :is="expandedId === mem.id ? ArrowDown : ArrowRight" /></el-icon>
                {{ expandedId === mem.id ? t('memory.collapseSources') : t('memory.viewSources', { count: mem.sourceMsgIds.length }) }}
              </el-button>

              <div v-if="expandedId === mem.id" class="source-messages">
                <div v-if="sourceLoading" class="source-loading">{{ t('common.loading') }}</div>
                <div
                  v-for="s in sourceMessages"
                  :key="s.id"
                  class="source-msg"
                  :class="`role-${s.role}`"
                >
                  <span class="source-role">{{ s.role === 'user' ? t('memory.roleUser') : t('memory.roleAssistant') }}</span>
                  <span class="source-time">{{ formatTime(s.createdAt) }}</span>
                  <p class="source-content">{{ s.content }}</p>
                </div>
              </div>
            </div>

            <div class="mem-footer">
              <el-button text :icon="Delete" size="small" class="btn-delete" @click="confirmDeleteMem(mem)">
                {{ t('common.delete') }}
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCharactersStore } from '@/stores/characters'
import {
  listMemories,
  getMemory,
  deleteMemory,
  clearMemories,
  listMemoryRecalls,
  clearMemoryRecalls
} from '@/api/memory'
import { Loading, Collection, ArrowDown, ArrowRight, RefreshRight, Delete, User } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { resolveMediaUrl } from '@/utils/media'
import { formatSmartTime } from '@/utils/feedTime'

const { t, locale } = useI18n()
const charactersStore = useCharactersStore()
const memories = ref([])
const loading = ref(true)
const filterCharId = ref(null)
const expandedId = ref(null)
const sourceLoading = ref(false)
const sourceMessages = ref([])
const recalls = ref([])
const recallLoading = ref(false)

const groupedMemories = computed(() => {
  const groups = new Map()
  for (const mem of memories.value) {
    const charId = mem.characterId
    if (!groups.has(charId)) {
      const char = charactersStore.list.find(c => c.id === charId)
      groups.set(charId, {
        charId,
        charName: mem.characterName || char?.name || t('memory.roleIndex', { id: charId }),
        avatarUrl: char?.avatarUrl || null,
        items: []
      })
    }
    groups.get(charId).items.push(mem)
  }
  return Array.from(groups.values())
})

onMounted(async () => {
  await charactersStore.fetchList().catch(() => [])
  await Promise.all([fetchMemories(), fetchRecalls()])
})

async function onFilterChange() {
  await Promise.all([fetchMemories(), fetchRecalls()])
}

async function fetchMemories() {
  loading.value = true
  try {
    memories.value = await listMemories(filterCharId.value || undefined) || []
  } catch {} finally {
    loading.value = false
  }
}

async function fetchRecalls() {
  recallLoading.value = true
  try {
    recalls.value = await listMemoryRecalls(filterCharId.value || undefined) || []
  } catch {
    recalls.value = []
  } finally {
    recallLoading.value = false
  }
}

function getCharName(charId) {
  const mem = memories.value.find(m => m.characterId === charId)
  return mem?.characterName || charactersStore.list.find(c => c.id === charId)?.name || t('memory.roleIndex', { id: charId })
}

async function toggleSources(memId) {
  if (expandedId.value === memId) {
    expandedId.value = null
    sourceMessages.value = []
    return
  }
  expandedId.value = memId
  sourceLoading.value = true
  try {
    const detail = await getMemory(memId)
    sourceMessages.value = detail.sourceMessages || []
  } catch {
    sourceMessages.value = []
  } finally {
    sourceLoading.value = false
  }
}

async function confirmDeleteMem(mem) {
  try {
    await ElMessageBox.confirm(t('memory.deleteConfirmMessage'), t('memory.deleteConfirmTitle'), {
      type: 'warning', confirmButtonText: t('common.delete'), cancelButtonText: t('common.cancel')
    })
    await deleteMemory(mem.id)
    memories.value = memories.value.filter(m => m.id !== mem.id)
    ElMessage.success(t('memory.deleted'))
  } catch {}
}

async function confirmClearMemories() {
  const scope = filterCharId.value ? '当前角色' : '全部角色'
  try {
    await ElMessageBox.confirm(
      `确定清空${scope}的长期记忆和命中记录吗？聊天消息不会被删除。`,
      '清空长期记忆',
      { type: 'warning', confirmButtonText: '清空', cancelButtonText: '取消' }
    )
    const result = await clearMemories(filterCharId.value || undefined)
    memories.value = []
    recalls.value = []
    ElMessage.success(`已清空 ${result?.deleted || 0} 条记忆`)
  } catch {}
}

async function confirmClearRecalls() {
  try {
    await ElMessageBox.confirm('确定清空当前筛选范围内的记忆命中记录吗？', '清空命中记录', {
      type: 'warning', confirmButtonText: '清空', cancelButtonText: '取消'
    })
    await clearMemoryRecalls(filterCharId.value || undefined)
    recalls.value = []
    ElMessage.success('命中记录已清空')
  } catch {}
}

function routeLabel(route) {
  if (route === 'PROFILE') return '回复前注入'
  if (route === 'SEMANTIC_CACHE') return '语义缓存'
  return '语义检索'
}

function formatDate(ts) {
  return formatSmartTime(ts, { t, locale: locale.value })
}

function formatTime(ts) {
  return formatSmartTime(ts, { t, locale: locale.value })
}
</script>

<style lang="scss" scoped>
.memory-page {
  max-width: $narrow-page-max;
}

.page-header {
  margin-bottom: $space-6;
  animation: fadeSlideUp 0.5s ease both;
}

.page-title {
  font-size: $font-size-2xl;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
  margin-bottom: $space-2;
}

.page-desc {
  font-size: $font-size-sm;
  color: $color-text-muted;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: $space-3;
  margin-bottom: $space-6;
  animation: fadeSlideUp 0.5s 0.04s ease both;
}

.filter-select {
  width: min(200px, 55vw);
}

.recall-section {
  margin-bottom: $space-6;
  padding: $space-4 $space-5;
  border-radius: $radius-lg;
}

.recall-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: $space-4;

  h2 { margin: 0 0 $space-1; font-size: $font-size-base; color: $color-text-primary; }
  p { margin: 0; font-size: $font-size-xs; color: $color-text-muted; }
}

.recall-actions { display: flex; flex-shrink: 0; }
.recall-list { margin-top: $space-3; border-top: 1px solid rgba($color-pink-rgb, 0.06); }
.recall-row { padding: $space-3 0; border-bottom: 1px solid rgba($color-pink-rgb, 0.05); }
.recall-row:last-child { border-bottom: 0; }
.recall-meta { display: flex; flex-wrap: wrap; gap: $space-2; font-size: 11px; color: $color-text-muted; }
.recall-route { color: $color-pink-primary; font-weight: $font-weight-semibold; }
.recall-summary { margin-top: $space-1; font-size: $font-size-sm; color: $color-text-secondary; line-height: 1.6; }
.recall-empty { padding: $space-5 0 $space-2; text-align: center; font-size: $font-size-sm; color: $color-text-muted; }

@media (max-width: 640px) {
  .recall-header { flex-direction: column; }
  .recall-actions { width: 100%; justify-content: flex-end; }
}

.loading-state, .empty-state {
  text-align: center;
  padding: $space-16 $space-6;
  color: $color-text-muted;
}

.empty-icon {
  width: 80px; height: 80px;
  border-radius: $radius-xl;
  background: rgba($color-pink-rgb, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto $space-6;
  color: $color-pink-primary;
}

.empty-state h3 { color: $color-text-primary; margin-bottom: $space-2; }
.empty-state p { font-size: $font-size-sm; }

.memory-groups {
  display: flex;
  flex-direction: column;
  gap: $space-6;
}

.memory-group {
  border-radius: $radius-xl;
  padding: 0;
  overflow: hidden;
  animation: fadeSlideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) both;
}

.group-header {
  padding: $space-4 $space-6;
  border-bottom: 1px solid rgba($color-pink-rgb, 0.06);
  background: rgba($color-pink-rgb, 0.03);
}

.group-char-info {
  display: flex;
  align-items: center;
  gap: $space-3;
}

.group-char-avatar {
  width: 32px; height: 32px;
  border-radius: 50%;
  overflow: hidden;
  background: rgba($color-pink-rgb, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: $color-pink-primary;
  flex-shrink: 0;

  img { width: 100%; height: 100%; object-fit: cover; }
}

.group-char-name {
  font-size: $font-size-sm;
  font-weight: $font-weight-semibold;
  color: $color-text-primary;
}

.group-count {
  font-size: $font-size-xs;
  color: $color-text-muted;
  margin-left: auto;
}

.group-items {
  display: flex;
  flex-direction: column;
}

.memory-card {
  padding: $space-4 $space-6;
  border-bottom: 1px solid rgba($color-pink-rgb, 0.04);
  animation: fadeSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) both;
  transition: background $transition-fast;

  &:last-child { border-bottom: none; }

  &:hover {
    background: rgba($color-pink-rgb, 0.02);
  }
}

.mem-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $space-2;
}

.mem-time {
  font-size: 11px;
  color: $color-text-muted;
  opacity: 0.5;
}

.mem-summary {
  font-size: $font-size-sm;
  color: $color-text-primary;
  line-height: 1.7;
}

.mem-sources {
  margin-top: $space-3;
  padding-top: $space-3;
  border-top: 1px solid rgba($color-pink-rgb, 0.06);
}

.source-messages {
  margin-top: $space-3;
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.source-loading {
  font-size: $font-size-sm;
  color: $color-text-muted;
  text-align: center;
  padding: $space-3;
}

.source-msg {
  padding: $space-2 $space-3;
  border-radius: $radius-md;
  background: rgba($color-bg-secondary, 0.4);
  border-left: 3px solid transparent;

  &.role-user { border-left-color: rgba($color-pink-rgb, 0.5); }
  &.role-assistant { border-left-color: rgba($color-pink-light, 0.4); }
}

.source-role {
  font-size: 11px;
  font-weight: $font-weight-semibold;
  color: $color-text-secondary;
  margin-right: $space-2;
}

.source-time {
  font-size: 11px;
  color: $color-text-muted;
  opacity: 0.5;
}

.source-content {
  font-size: $font-size-sm;
  color: $color-text-secondary;
  margin-top: 2px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.mem-footer {
  margin-top: $space-2;
  display: flex;
  justify-content: flex-end;

  .btn-delete:hover { color: $color-error !important; }
}
</style>
