<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  page: number
  pageSize: number
  total: number
  pageSizes?: number[]
}>(), {
  pageSizes: () => [10, 20, 50],
})

const emit = defineEmits<{
  'update:page': [value: number]
  'update:pageSize': [value: number]
}>()

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const start = computed(() => props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1)
const end = computed(() => Math.min(props.total, props.page * props.pageSize))
const shouldShow = computed(() => props.total > Math.min(...props.pageSizes))

const visiblePages = computed(() => {
  const total = pageCount.value
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1)

  const first = Math.min(Math.max(props.page - 2, 1), total - 4)
  return Array.from({ length: 5 }, (_, index) => first + index)
})

const goTo = (page: number): void => {
  emit('update:page', Math.min(Math.max(page, 1), pageCount.value))
}

const changePageSize = (event: Event): void => {
  const value = Number((event.target as HTMLSelectElement).value)
  emit('update:pageSize', value)
  emit('update:page', 1)
}
</script>

<template>
  <nav
    v-if="shouldShow"
    class="flex flex-col gap-4 border-t border-zinc-800 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
    aria-label="分頁導覽"
  >
    <div class="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
      <span>顯示 {{ start }}–{{ end }}，共 {{ total }} 筆</span>
      <label class="flex items-center gap-2">
        每頁
        <select
          :value="pageSize"
          class="rounded-lg border border-zinc-700 bg-zinc-950/70 px-2 py-1.5 text-xs text-zinc-300 outline-none focus:border-sky-500/40"
          @change="changePageSize"
        >
          <option v-for="size in pageSizes" :key="size" :value="size">
            {{ size }} 筆
          </option>
        </select>
      </label>
    </div>

    <div class="flex items-center gap-1.5">
      <button
        type="button"
        class="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-35"
        :disabled="page <= 1"
        @click="goTo(page - 1)"
      >
        上一頁
      </button>

      <button
        v-for="pageNumber in visiblePages"
        :key="pageNumber"
        type="button"
        class="grid h-8 min-w-8 place-items-center rounded-lg border px-2 text-xs font-medium transition"
        :class="pageNumber === page
          ? 'border-sky-500/35 bg-sky-500/10 text-sky-300'
          : 'border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-200'"
        :aria-current="pageNumber === page ? 'page' : undefined"
        @click="goTo(pageNumber)"
      >
        {{ pageNumber }}
      </button>

      <button
        type="button"
        class="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-35"
        :disabled="page >= pageCount"
        @click="goTo(page + 1)"
      >
        下一頁
      </button>
    </div>
  </nav>
</template>
