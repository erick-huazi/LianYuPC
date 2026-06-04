<template>
  <span class="emotion-badge" :class="emotionClass" :title="statusText">
    <span class="emotion-icon">{{ emotionIcon }}</span>
    <span class="emotion-label">{{ currentEmotion }}</span>
    <span v-if="statusText" class="emotion-status">{{ statusText }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentEmotion: { type: String, default: '平静' },
  emotionIntensity: { type: Number, default: 50 },
  statusText: { type: String, default: '' }
})

const emotionIcon = computed(() => {
  const map = {
    '开心': '😊', '难过': '😢', '想念': '💭', '吃醋': '😤',
    '生气': '😠', '撒娇': '🥺', '疲惫': '😴', '兴奋': '🤩',
    '平静': '😌', '担心': '😟'
  }
  return map[props.currentEmotion] || '😌'
})

const emotionClass = computed(() => {
  return `emotion--${props.currentEmotion}`
})
</script>

<style lang="scss" scoped>
.emotion-badge {
  display: inline-flex;
  align-items: center;
  gap: $space-1;
  padding: 2px 10px;
  border-radius: $radius-pill;
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;
  line-height: 1.6;
  white-space: nowrap;
  max-width: 100%;
  transition: all $transition-fast;

  &.emotion--开心 { background: rgba(255, 193, 7, 0.12); color: #ffc107; border: 1px solid rgba(255, 193, 7, 0.2); }
  &.emotion--难过 { background: rgba(100, 180, 255, 0.12); color: #64b4ff; border: 1px solid rgba(100, 180, 255, 0.2); }
  &.emotion--想念 { background: rgba(200, 160, 255, 0.12); color: #c8a0ff; border: 1px solid rgba(200, 160, 255, 0.2); }
  &.emotion--吃醋 { background: rgba(255, 140, 200, 0.12); color: #ff8cc8; border: 1px solid rgba(255, 140, 200, 0.2); }
  &.emotion--生气 { background: rgba(255, 100, 100, 0.12); color: #ff6464; border: 1px solid rgba(255, 100, 100, 0.2); }
  &.emotion--撒娇 { background: rgba(255, 180, 160, 0.12); color: #ffb4a0; border: 1px solid rgba(255, 180, 160, 0.2); }
  &.emotion--疲惫 { background: rgba(180, 180, 180, 0.12); color: #b4b4b4; border: 1px solid rgba(180, 180, 180, 0.2); }
  &.emotion--兴奋 { background: rgba(255, 220, 100, 0.12); color: #ffdc64; border: 1px solid rgba(255, 220, 100, 0.2); }
  &.emotion--平静 { background: rgba(160, 200, 180, 0.12); color: #a0c8b4; border: 1px solid rgba(160, 200, 180, 0.2); }
  &.emotion--担心 { background: rgba(255, 200, 140, 0.12); color: #ffc88c; border: 1px solid rgba(255, 200, 140, 0.2); }
}

.emotion-icon {
  font-size: 13px;
  line-height: 1;
}

.emotion-label {
  font-size: $font-size-xs;
}

.emotion-status {
  color: $color-text-muted;
  font-size: 11px;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-left: $space-1;
  padding-left: $space-1;
  border-left: 1px solid rgba($color-text-muted, 0.3);
}
</style>