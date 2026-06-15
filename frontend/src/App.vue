<template>
  <el-config-provider :locale="elementLocale">
    <div
      v-if="showElectronCaptionDrag"
      class="electron-caption-drag"
      aria-hidden="true"
    />
    <router-view v-slot="{ Component, route }">
      <transition :name="pageTransitionName" :mode="pageTransitionMode">
        <component :is="Component" :key="viewKey(route)" />
      </transition>
    </router-view>
  </el-config-provider>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useSettingsStore } from '@/stores/settings'
import { isElectronRuntime } from '@/utils/runtime'
import { getElectronAPI } from '@/utils/electron'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import ja from 'element-plus/es/locale/lang/ja'
import en from 'element-plus/es/locale/lang/en'

const userStore = useUserStore()
const settingsStore = useSettingsStore()
const route = useRoute()

const elementLocaleMap = { zh: zhCn, ja, en }
const elementLocale = computed(() => elementLocaleMap[settingsStore.uiLanguage] || zhCn)

/** Electron file:// 下禁用路由过渡，避免 out-in 中间态黑屏 */
const isElectron = isElectronRuntime()
const isLauncherSurface = computed(() => route.name === 'Launcher' || route.name === 'LauncherPick')
const usesAppHeader = computed(() => route.path.startsWith('/app') || route.path.startsWith('/quick'))
const pageTransitionName = computed(() => (isElectron ? '' : 'page'))
const pageTransitionMode = computed(() => (isElectron ? undefined : 'out-in'))
/** 主界面由 AppHeader 充当标题栏；仅营销/登录页保留顶部拖拽条 */
const showElectronCaptionDrag = computed(() => isElectron && !isLauncherSurface.value && !usesAppHeader.value)

function syncElectronCaptionClass(enabled) {
  document.body.classList.toggle('electron-app', !!enabled)
}

function viewKey(route) {
  if (route?.name === 'Chat' || route?.name === 'QuickChat') {
    return `ChatPage-${route.params.id || ''}`
  }
  return route.path
}

function applyCaptionMetrics(metrics) {
  if (!metrics) return
  const { height, controlsWidth } = metrics
  if (height) {
    document.documentElement.style.setProperty('--electron-caption-height', `${height}px`)
  }
  if (controlsWidth) {
    document.documentElement.style.setProperty('--electron-caption-controls-width', `${controlsWidth}px`)
  }
}

onMounted(async () => {
  if (isElectron) {
    syncElectronCaptionClass(!isLauncherSurface.value)
    const api = getElectronAPI()
    const metrics = (await api?.getCaptionMetrics?.()) || {}
    if (!metrics.height) {
      const height = await api?.getCaptionBarHeight?.()
      if (height) metrics.height = height
    }
    applyCaptionMetrics(metrics)
    api?.onCaptionMetrics?.(applyCaptionMetrics)
  }

  if (userStore.isLoggedIn && !userStore.userId) {
    try {
      await userStore.fetchProfile()
    } catch {
      await userStore.clearAuth({ keepUsername: true })
    }
  }
})

watch(isLauncherSurface, (launcher) => {
  if (!isElectron) return
  syncElectronCaptionClass(!launcher)
})
</script>
