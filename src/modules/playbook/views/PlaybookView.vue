<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import EditPlaybookModal from '../components/EditPlaybookModal.vue'
import NewPlaybookModal from '../components/NewPlaybookModal.vue'
import PlaybookDetailModal from '../components/PlaybookDetailModal.vue'

import { usePlaybookStore } from '@/stores/usePlaybookStore'
import { useConfirmDialogStore } from '@/stores/useConfirmDialogStore'
import { useNotificationStore } from '@/stores/useNotificationStore'
import PlaybookPerformanceSummaryCard from '../components/PlaybookPerformanceSummaryCard.vue'
import SignalLibraryPanel from '../components/SignalLibraryPanel.vue'
import AppPagination from '@/components/AppPagination.vue'
import type {
  NewPlaybookInput,
  PlaybookDirection,
  PlaybookRecord,
  PlaybookStatus,
} from '@/types/playbook'

const playbookStore = usePlaybookStore()
const confirmDialog = useConfirmDialogStore()
const notificationStore = useNotificationStore()

const {
  sortedPlaybooks,
  statistics,
} = storeToRefs(playbookStore)

const isNewPlaybookModalOpen = ref(false)
const isDetailModalOpen = ref(false)
const isEditModalOpen = ref(false)

const selectedPlaybook = ref<PlaybookRecord | null>(null)

const selectedDirection = ref<
  'all' | PlaybookDirection
>('all')

const selectedStatus = ref<
  'all' | PlaybookStatus
>('all')

const searchKeyword = ref('')

type PlaybookViewMode = 'grid' | 'list'

const VIEW_MODE_STORAGE_KEY = 'hy-freedom-os:playbook-view-mode'
const viewMode = ref<PlaybookViewMode>(
  typeof window !== 'undefined' && window.localStorage.getItem(VIEW_MODE_STORAGE_KEY) === 'list'
    ? 'list'
    : 'grid',
)

watch(viewMode, value => {
  if (typeof window !== 'undefined') window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, value)
})

const filteredPlaybooks = computed(() => {
  const keyword = searchKeyword.value
    .trim()
    .toLowerCase()

  return sortedPlaybooks.value.filter(playbook => {
    const matchesDirection =
      selectedDirection.value === 'all' ||
      playbook.direction === selectedDirection.value ||
      playbook.direction === 'both'

    const matchesStatus =
      selectedStatus.value === 'all' ||
      playbook.status === selectedStatus.value

    const matchesKeyword =
      !keyword ||
      playbook.name.toLowerCase().includes(keyword) ||
      playbook.shortName.toLowerCase().includes(keyword) ||
      playbook.description.toLowerCase().includes(keyword)

    return (
      matchesDirection &&
      matchesStatus &&
      matchesKeyword
    )
  })
})

const playbookPage = ref(1)
const playbookPageSize = ref(6)
const playbookPageCount = computed(() => Math.max(1, Math.ceil(filteredPlaybooks.value.length / playbookPageSize.value)))
const paginatedPlaybooks = computed(() => {
  const start = (playbookPage.value - 1) * playbookPageSize.value
  return filteredPlaybooks.value.slice(start, start + playbookPageSize.value)
})

watch([searchKeyword, selectedDirection, selectedStatus], () => { playbookPage.value = 1 })
watch([() => filteredPlaybooks.value.length, playbookPageSize], () => {
  if (playbookPage.value > playbookPageCount.value) playbookPage.value = playbookPageCount.value
})

const directionLabel = (
  direction: PlaybookDirection,
): string => {
  const labels: Record<PlaybookDirection, string> = {
    buy: '多單策略',
    sell: '空單策略',
    both: '雙向策略',
  }

  return labels[direction]
}

const directionClasses = (
  direction: PlaybookDirection,
): string => {
  const classes: Record<PlaybookDirection, string> = {
    buy: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    sell: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
    both: 'border-sky-500/25 bg-sky-500/10 text-sky-300',
  }

  return classes[direction]
}

const statusLabel = (
  status: PlaybookStatus,
): string => {
  const labels: Record<PlaybookStatus, string> = {
    active: '正式使用',
    testing: '測試中',
    paused: '暫停使用',
  }

  return labels[status]
}

const statusClasses = (
  status: PlaybookStatus,
): string => {
  const classes: Record<PlaybookStatus, string> = {
    active:
      'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    testing:
      'border-amber-500/25 bg-amber-500/10 text-amber-300',
    paused:
      'border-zinc-700 bg-zinc-800/70 text-zinc-400',
  }

  return classes[status]
}

const winRate = (
  playbook: PlaybookRecord,
): number => {
  if (playbook.totalTrades === 0) {
    return 0
  }

  return Math.round(
    (playbook.wins / playbook.totalTrades) * 100,
  )
}

const openNewPlaybookModal = (): void => {
  isNewPlaybookModalOpen.value = true
}

const closeNewPlaybookModal = (): void => {
  isNewPlaybookModalOpen.value = false
}

const openPlaybookDetail = (
  playbook: PlaybookRecord,
): void => {
  selectedPlaybook.value = playbook
  isDetailModalOpen.value = true
}

const closePlaybookDetail = (): void => {
  isDetailModalOpen.value = false
  selectedPlaybook.value = null
}

const openEditPlaybook = (
  playbook: PlaybookRecord,
): void => {
  selectedPlaybook.value = playbook
  isDetailModalOpen.value = false
  isEditModalOpen.value = true
}

const closeEditPlaybook = (): void => {
  isEditModalOpen.value = false
  selectedPlaybook.value = null
}

const addPlaybook = (
  input: NewPlaybookInput,
): void => {
  const playbook =
    playbookStore.addPlaybook(input)

  notificationStore.addNotification({
    type: 'success',
    title: '策略已建立',
    message: `「${playbook.name}」已加入策略庫。`,
    route: '/playbook',
  })
}

const updatePlaybook = (
  playbookId: string,
  updates: Partial<PlaybookRecord>,
): void => {
  playbookStore.updatePlaybook(
    playbookId,
    updates,
  )

  selectedPlaybook.value =
    playbookStore.getPlaybookById(playbookId)
  
  notificationStore.addNotification({
    type: 'info',
    title: '策略已更新',
    message: `「${selectedPlaybook.value?.name ?? '交易策略'}」已更新。`,
    route: '/playbook',
  })
}

const removePlaybook = async (
  playbookId: string,
  playbookName: string,
): Promise<void> => {
  const confirmed = await confirmDialog.ask({
    title: `刪除「${playbookName}」？`,
    message: '這個交易策略將從策略庫移除，此操作無法復原。',
    confirmLabel: '確認刪除',
    tone: 'danger',
  })

  if (!confirmed) {
    return
  }

  playbookStore.removePlaybook(playbookId)

  notificationStore.addNotification({
    type: 'warning',
    title: '策略已刪除',
    message: `「${playbookName}」已移除。`,
    route: '/playbook',
  })

  if (selectedPlaybook.value?.id === playbookId) {
    isDetailModalOpen.value = false
    isEditModalOpen.value = false
    selectedPlaybook.value = null
  }
}

const togglePlaybookStatus = (
  playbook: PlaybookRecord,
): void => {
  const nextStatus: PlaybookStatus =
    playbook.status === 'active'
      ? 'paused'
      : 'active'

  playbookStore.setPlaybookStatus(
    playbook.id,
    nextStatus,
  )

  notificationStore.addNotification({
  type:
    nextStatus === 'active'
      ? 'success'
      : 'warning',
  title:
    nextStatus === 'active'
      ? '策略已啟用'
      : '策略已暫停',
  message: `「${playbook.name}」目前狀態：${
    nextStatus === 'active'
      ? '正式使用'
      : '暫停使用'
  }`,
  route: '/playbook',
})

  selectedPlaybook.value =
    playbookStore.getPlaybookById(playbook.id)
}

const clearFilters = (): void => {
  selectedDirection.value = 'all'
  selectedStatus.value = 'all'
  searchKeyword.value = ''
}
</script>

<template>
  <div class="space-y-6 pb-10">
    <section
      class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl shadow-black/10"
    >
      <div
        class="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"
      >
        <div>
          <h1 class="text-3xl font-bold text-zinc-100">
            Playbook v2 · 策略與訊號庫
          </h1>

          <p class="mt-2 text-sm leading-6 text-zinc-400">
            整理每一種進場型態的條件、禁止情況與歷史表現。
          </p>
        </div>

        <button
          type="button"
          class="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-3 text-sm font-medium text-amber-300 transition hover:border-amber-400/50 hover:bg-amber-500/15"
          @click="openNewPlaybookModal"
        >
          ＋ 新增策略
        </button>
      </div>
    </section>

    <PlaybookPerformanceSummaryCard />

    <SignalLibraryPanel />
    
    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
      >
        <p class="text-sm text-zinc-500">
          策略總數
        </p>

        <p class="mt-3 text-3xl font-semibold text-zinc-100">
          {{ statistics.totalPlaybooks }}
        </p>
      </section>

      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
      >
        <p class="text-sm text-zinc-500">
          正式使用
        </p>

        <p class="mt-3 text-3xl font-semibold text-emerald-300">
          {{ statistics.activePlaybooks }}
        </p>
      </section>

      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
      >
        <p class="text-sm text-zinc-500">
          整體勝率
        </p>

        <p class="mt-3 text-3xl font-semibold text-sky-300">
          {{ statistics.overallWinRate }}%
        </p>
      </section>

      <section
        class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
      >
        <p class="text-sm text-zinc-500">
          平均報酬倍數
        </p>

        <p class="mt-3 text-3xl font-semibold text-amber-300">
          {{ statistics.averageR.toFixed(2) }}R
        </p>
      </section>
    </div>

    <section
      class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
    >
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm font-medium text-zinc-200">策略顯示方式</p>
          <p class="mt-1 text-xs text-zinc-500">共 {{ filteredPlaybooks.length }} 個符合條件的策略</p>
        </div>

        <div class="inline-flex w-fit rounded-xl border border-zinc-700 bg-zinc-950/50 p-1">
          <button
            type="button"
            class="rounded-lg px-3 py-2 text-xs font-medium transition"
            :class="viewMode === 'grid' ? 'bg-amber-500/15 text-amber-300' : 'text-zinc-500 hover:text-zinc-200'"
            @click="viewMode = 'grid'"
          >
            ▦ 卡片模式
          </button>
          <button
            type="button"
            class="rounded-lg px-3 py-2 text-xs font-medium transition"
            :class="viewMode === 'list' ? 'bg-sky-500/15 text-sky-300' : 'text-zinc-500 hover:text-zinc-200'"
            @click="viewMode = 'list'"
          >
            ☰ 清單模式
          </button>
        </div>
      </div>

      <div class="grid gap-3 lg:grid-cols-3">
        <input
          v-model="searchKeyword"
          type="search"
          placeholder="搜尋策略名稱或說明"
          class="rounded-2xl border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-amber-500/40"
        />

        <select
          v-model="selectedDirection"
          class="rounded-2xl border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-300 outline-none focus:border-amber-500/40"
        >
          <option value="all">
            全部方向
          </option>

          <option value="buy">
            多單策略
          </option>

          <option value="sell">
            空單策略
          </option>

          <option value="both">
            雙向策略
          </option>
        </select>

        <select
          v-model="selectedStatus"
          class="rounded-2xl border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-300 outline-none focus:border-amber-500/40"
        >
          <option value="all">
            全部狀態
          </option>

          <option value="active">
            正式使用
          </option>

          <option value="testing">
            測試中
          </option>

          <option value="paused">
            暫停使用
          </option>
        </select>
      </div>
    </section>

    <div
      v-if="filteredPlaybooks.length && viewMode === 'grid'"
      class="grid gap-6 xl:grid-cols-2"
    >
      <article
        v-for="playbook in paginatedPlaybooks"
        :key="playbook.id"
        class="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70 shadow-xl shadow-black/10 transition hover:border-zinc-700"
      >
        <header class="border-b border-zinc-800 p-6">
          <div
            class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-2xl font-semibold text-zinc-100">
                  {{ playbook.name }}
                </h2>

                <span
                  class="rounded-full border px-2.5 py-1 text-xs font-medium"
                  :class="directionClasses(playbook.direction)"
                >
                  {{ directionLabel(playbook.direction) }}
                </span>

                <span
                  class="rounded-full border px-2.5 py-1 text-xs font-medium"
                  :class="statusClasses(playbook.status)"
                >
                  {{ statusLabel(playbook.status) }}
                </span>
              </div>

              <p class="mt-3 text-sm leading-7 text-zinc-400">
                {{ playbook.description }}
              </p>
            </div>

            <div
              class="shrink-0 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-center"
            >
              <p class="text-xs text-zinc-500">
                評級
              </p>

              <p class="mt-1 text-amber-300">
                {{ '★'.repeat(playbook.rating) }}
              </p>
            </div>
          </div>
        </header>

        <div class="space-y-5 p-6">
          <div class="grid grid-cols-3 gap-3">
            <div
              class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
            >
              <p class="text-xs text-zinc-500">
                交易筆數
              </p>

              <p class="mt-2 text-xl font-semibold text-zinc-100">
                {{ playbook.totalTrades }}
              </p>
            </div>

            <div
              class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
            >
              <p class="text-xs text-zinc-500">
                勝率
              </p>

              <p class="mt-2 text-xl font-semibold text-emerald-300">
                {{ winRate(playbook) }}%
              </p>
            </div>

            <div
              class="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
            >
              <p class="text-xs text-zinc-500">
                平均報酬
              </p>

              <p class="mt-2 text-xl font-semibold text-amber-300">
                {{ playbook.averageR.toFixed(2) }}R
              </p>
            </div>
          </div>

          <section>
            <h3 class="font-semibold text-emerald-300">
              進場必要條件
            </h3>

            <div class="mt-3 space-y-2">
              <div
                v-for="condition in playbook.entryConditions"
                :key="condition"
                class="flex items-start gap-3 rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-3"
              >
                <span class="mt-0.5 text-emerald-300">
                  ✓
                </span>

                <p class="text-sm leading-6 text-zinc-300">
                  {{ condition }}
                </p>
              </div>
            </div>
          </section>

          <section>
            <h3 class="font-semibold text-rose-300">
              禁止交易條件
            </h3>

            <div class="mt-3 space-y-2">
              <div
                v-for="condition in playbook.avoidConditions"
                :key="condition"
                class="flex items-start gap-3 rounded-xl border border-rose-500/10 bg-rose-500/5 p-3"
              >
                <span class="mt-0.5 text-rose-300">
                  ×
                </span>

                <p class="text-sm leading-6 text-zinc-300">
                  {{ condition }}
                </p>
              </div>
            </div>
          </section>

          <footer
            class="flex flex-wrap justify-end gap-3 border-t border-zinc-800 pt-5"
          >
            <button
              type="button"
              class="rounded-xl border border-rose-500/20 px-4 py-2 text-sm text-rose-300 transition hover:border-rose-500/40 hover:bg-rose-500/10"
              @click="
                removePlaybook(
                  playbook.id,
                  playbook.name,
                )
              "
            >
              刪除
            </button>

            <button
              type="button"
              class="rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
              @click="togglePlaybookStatus(playbook)"
            >
              {{
                playbook.status === 'active'
                  ? '暫停使用'
                  : '恢復使用'
              }}
            </button>

            <button
              type="button"
              class="rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-300 transition hover:border-sky-400/40 hover:bg-sky-500/15"
              @click="openEditPlaybook(playbook)"
            >
              編輯策略
            </button>

            <button
              type="button"
              class="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300 transition hover:border-amber-400/40 hover:bg-amber-500/15"
              @click="openPlaybookDetail(playbook)"
            >
              查看完整策略
            </button>
          </footer>
        </div>
      </article>
    </div>

    <div
      v-if="filteredPlaybooks.length && viewMode === 'list'"
      class="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70 shadow-xl shadow-black/10"
    >
      <article
        v-for="playbook in paginatedPlaybooks"
        :key="playbook.id"
        class="border-b border-zinc-800 p-5 transition last:border-b-0 hover:bg-zinc-800/25"
      >
        <div class="flex flex-col gap-5 xl:flex-row xl:items-center">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-lg font-semibold text-zinc-100">{{ playbook.name }}</h2>
              <span class="rounded-full border px-2.5 py-1 text-xs font-medium" :class="directionClasses(playbook.direction)">
                {{ directionLabel(playbook.direction) }}
              </span>
              <span class="rounded-full border px-2.5 py-1 text-xs font-medium" :class="statusClasses(playbook.status)">
                {{ statusLabel(playbook.status) }}
              </span>
            </div>
            <p class="mt-2 line-clamp-2 text-sm leading-6 text-zinc-500">{{ playbook.description }}</p>
          </div>

          <div class="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[430px]">
            <div class="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
              <p class="text-[10px] text-zinc-500">評級</p>
              <p class="mt-1 text-xs text-amber-300">{{ '★'.repeat(playbook.rating) }}</p>
            </div>
            <div class="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
              <p class="text-[10px] text-zinc-500">交易筆數</p>
              <p class="mt-1 text-sm font-semibold text-zinc-200">{{ playbook.totalTrades }}</p>
            </div>
            <div class="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
              <p class="text-[10px] text-zinc-500">勝率</p>
              <p class="mt-1 text-sm font-semibold text-emerald-300">{{ winRate(playbook) }}%</p>
            </div>
            <div class="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
              <p class="text-[10px] text-zinc-500">平均報酬</p>
              <p class="mt-1 text-sm font-semibold text-amber-300">{{ playbook.averageR.toFixed(2) }}R</p>
            </div>
          </div>

          <div class="flex shrink-0 flex-wrap gap-2 xl:w-[250px] xl:justify-end">
            <button
              type="button"
              class="rounded-xl border border-zinc-700 px-3 py-2 text-xs text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
              @click="togglePlaybookStatus(playbook)"
            >
              {{ playbook.status === 'active' ? '暫停' : '啟用' }}
            </button>
            <button
              type="button"
              class="rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-300 transition hover:bg-sky-500/15"
              @click="openEditPlaybook(playbook)"
            >
              編輯
            </button>
            <button
              type="button"
              class="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-300 transition hover:bg-amber-500/15"
              @click="openPlaybookDetail(playbook)"
            >
              查看策略
            </button>
          </div>
        </div>
      </article>
    </div>

    <section
      v-if="filteredPlaybooks.length > 6"
      class="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/70 shadow-xl shadow-black/10"
    >
      <AppPagination
        v-model:page="playbookPage"
        v-model:page-size="playbookPageSize"
        :total="filteredPlaybooks.length"
        :page-sizes="[6, 12, 24]"
      />
    </section>

    <section
      v-if="!filteredPlaybooks.length"
      class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-12 text-center"
    >
      <p class="text-zinc-400">
        沒有符合目前篩選條件的交易策略。
      </p>

      <button
        type="button"
        class="mt-4 text-sm font-medium text-amber-300"
        @click="clearFilters"
      >
        清除篩選條件
      </button>
    </section>

    <NewPlaybookModal
      :open="isNewPlaybookModalOpen"
      @close="closeNewPlaybookModal"
      @submit="addPlaybook"
    />

    <PlaybookDetailModal
      :open="isDetailModalOpen"
      :playbook="selectedPlaybook"
      @close="closePlaybookDetail"
      @remove="removePlaybook"
      @toggle-status="togglePlaybookStatus"
    />

    <EditPlaybookModal
      :open="isEditModalOpen"
      :playbook="selectedPlaybook"
      @close="closeEditPlaybook"
      @submit="updatePlaybook"
    />
  </div>
</template>
