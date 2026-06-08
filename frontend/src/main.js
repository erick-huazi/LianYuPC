import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import { initAntiDebug } from './utils/antiDebug'
import { bootstrapAuth } from './auth/bootstrap'
import './styles/theme.scss'
import './styles/global.scss'
import './styles/app-shell.scss'

const isElectronRuntime = typeof window !== 'undefined' && (
  window.electronAPI?.isElectron === true
  || /Electron/i.test(window.navigator.userAgent)
)
if (isElectronRuntime) {
  document.documentElement.classList.add('is-electron')
}

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(i18n)
app.use(router)
app.use(ElementPlus, { size: 'default' })

import { useSettingsStore } from '@/stores/settings'
const settingsStore = useSettingsStore(pinia)
settingsStore.initLanguage()
settingsStore.initTheme()

// 反调试（生产环境 Electron 专用）
initAntiDebug()

;(async () => {
  await bootstrapAuth(pinia)
  app.mount('#app')
})()
