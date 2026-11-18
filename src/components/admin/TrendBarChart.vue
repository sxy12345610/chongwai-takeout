<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: {
    type: Array,
    default: () => [],
  },
  valueKey: {
    type: String,
    default: 'value',
  },
  formatter: {
    type: Function,
    default: null,
  },
  color: {
    type: String,
    default: 'linear-gradient(180deg, #2878C8, #1769AA)',
  },
  emptyText: {
    type: String,
    default: '最近 7 天暂无数据',
  },
})

const values = computed(() =>
  props.data.map((item) => Number(item[props.valueKey]) || 0),
)

const maxValue = computed(() => Math.max(...values.value, 0))

const hasData = computed(() => values.value.some((value) => value > 0))

function heightOf(value) {
  if (!maxValue.value || value <= 0) return 0
  return Math.max(6, Math.round((value / maxValue.value) * 100))
}

function display(value) {
  if (!props.formatter) return value
  return props.formatter(value)
}
</script>

<template>
  <div v-if="hasData" class="trend-chart">
    <div
      v-for="item in data"
      :key="item.label"
      class="trend-chart__item"
    >
      <span class="trend-chart__value">
        {{ display(item[valueKey]) }}
      </span>
      <span class="trend-chart__track">
        <span
          class="trend-chart__fill"
          :style="{ height: `${heightOf(item[valueKey])}%`, background: color }"
        ></span>
      </span>
      <span class="trend-chart__label">{{ item.label }}</span>
    </div>
  </div>

  <div v-else class="trend-chart__empty">
    <p>{{ emptyText }}</p>
    <small>产生订单后这里会自动生成趋势图</small>
  </div>
</template>

<style scoped>
.trend-chart {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 178px;
  padding-top: 6px;
}

.trend-chart__item {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  min-width: 0;
  height: 100%;
  justify-content: flex-end;
}

.trend-chart__value {
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}

.trend-chart__track {
  position: relative;
  display: flex;
  align-items: flex-end;
  width: 100%;
  max-width: 40px;
  height: 118px;
  overflow: hidden;
  border-radius: 9px;
  background-color: #eff5fb;
}

.trend-chart__fill {
  width: 100%;
  border-radius: 9px;
  transition: height 0.35s ease;
}

.trend-chart__label {
  color: var(--text-secondary);
  font-size: 9.5px;
  white-space: nowrap;
}

.trend-chart__empty {
  display: grid;
  place-items: center;
  gap: 4px;
  min-height: 178px;
  border: 1px dashed #dce8f4;
  border-radius: 14px;
  background-color: #fbfdff;
  color: var(--text-secondary);
  text-align: center;
}

.trend-chart__empty p {
  font-size: 12px;
  font-weight: 600;
}

.trend-chart__empty small {
  font-size: 10px;
  opacity: 0.8;
}
</style>
