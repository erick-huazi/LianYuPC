<template>
  <div class="city-mode-form">
    <el-form-item :label="t('cityMode.label')" :prop="cityModeProp">
      <el-radio-group v-model="cityModeModel" class="city-mode-form__radios">
        <el-radio value="real">{{ t('cityMode.real') }}</el-radio>
        <el-radio value="fictional">{{ t('cityMode.fictional') }}</el-radio>
      </el-radio-group>
      <div class="field-hint">{{ t('cityMode.hint') }}</div>
    </el-form-item>

    <el-form-item
      v-if="cityModeModel === 'real'"
      :label="t('cityMode.realCityLabel')"
      :prop="cityProp"
    >
      <el-input
        v-model="cityModel"
        :placeholder="t('cityMode.realCityPlaceholder')"
      />
      <div class="field-hint">{{ t('cityMode.realCityHint') }}</div>
    </el-form-item>

    <div v-else class="city-mode-form__fictional-note">
      {{ t('cityMode.fictionalNote') }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  cityMode: {
    type: String,
    default: 'real'
  },
  city: {
    type: String,
    default: ''
  },
  cityModeProp: {
    type: String,
    default: 'cityMode'
  },
  cityProp: {
    type: String,
    default: 'city'
  }
})

const emit = defineEmits(['update:cityMode', 'update:city'])

const { t } = useI18n()

const cityModeModel = computed({
  get: () => props.cityMode || 'real',
  set: (value) => emit('update:cityMode', value)
})

const cityModel = computed({
  get: () => props.city,
  set: (value) => emit('update:city', value)
})
</script>

<style lang="scss" scoped>
.city-mode-form__radios {
  display: flex;
  flex-wrap: wrap;
  gap: $space-4;
}

.city-mode-form__fictional-note {
  margin: 0 0 $space-4;
  padding: $space-3 $space-4;
  border-radius: $radius-md;
  background: rgba($color-pink-rgb, 0.06);
  border: 1px solid rgba($color-pink-rgb, 0.1);
  color: $color-text-secondary;
  font-size: $font-size-sm;
  line-height: $line-height-relaxed;
}

.field-hint {
  margin-top: $space-2;
  font-size: $font-size-xs;
  color: $color-text-muted;
  line-height: $line-height-relaxed;
}
</style>
