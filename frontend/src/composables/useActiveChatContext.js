import { ref } from 'vue'

/** 当前正在查看的单聊会话 ID（ChatPage 设置，用于抑制同会话的站内通知） */
export const activeChatConversationId = ref(null)

let refreshHandler = null

export function setActiveChatConversationId(id) {
  activeChatConversationId.value = id != null ? Number(id) : null
}

/** ChatPage 注册：收到同会话 proactive 通知时立即拉取消息 */
export function setActiveChatRefreshHandler(handler) {
  refreshHandler = typeof handler === 'function' ? handler : null
}

export function requestActiveChatRefresh(conversationId) {
  const activeId = activeChatConversationId.value
  if (activeId == null || conversationId == null) return
  if (activeId !== Number(conversationId)) return
  refreshHandler?.()
}
