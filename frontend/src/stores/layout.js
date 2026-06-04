import { defineStore } from 'pinia'
import { ref } from 'vue'

/** 主壳层布局状态（群聊会话内调整内容区，不隐藏顶栏/底栏） */
export const useLayoutStore = defineStore('layout', () => {
  const groupChatSession = ref(false)

  function setGroupChatSession(active) {
    groupChatSession.value = !!active
  }

  return {
    groupChatSession,
    setGroupChatSession,
  }
})
