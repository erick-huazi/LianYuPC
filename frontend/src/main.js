import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import './styles/theme.scss'
import './styles/global.scss'
import './styles/app-shell.scss'

document.documentElement.classList.add('dark')

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

// 通知 Electron 主进程当前登录状态（已登录用户在启动时恢复 session）
const storedToken = localStorage.getItem('lianyu-token')
if (window.electronAPI?.setLoginState) {
  window.electronAPI.setLoginState(!!storedToken)
}

app.mount('#app')
