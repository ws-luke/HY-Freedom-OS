<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'
import { useRouter } from 'vue-router'

interface CommandItem {
  title: string
  description: string
  route: string
  keywords: string[]
}

const router = useRouter()

const open = ref(false)
const keyword = ref('')
const selectedIndex = ref(0)
const searchInput = ref<HTMLInputElement | null>(
  null,
)

const commands: CommandItem[] = [
  {
    title: '任務總控台',
    description: '查看今日交易狀態與重要摘要。',
    route: '/',
    keywords: ['首頁', 'dashboard', 'mission'],
  },
  {
    title: '盤前規劃',
    description: '設定趨勢、區域與今日交易計畫。',
    route: '/planning',
    keywords: ['計畫', '趨勢', '支撐', '壓力'],
  },
  {
    title: '經濟日曆',
    description: '查看重大經濟事件與新聞風險。',
    route: '/economic-calendar',
    keywords: ['新聞', '數據', 'calendar'],
  },
  {
    title: '交易紀錄',
    description: '新增、搜尋與管理交易。',
    route: '/trades',
    keywords: ['新增交易', 'journal', 'trade'],
  },
  {
    title: '交易分析',
    description: '查看績效、勝率與策略統計。',
    route: '/trade-analytics',
    keywords: ['analytics', '勝率', '績效'],
  },
  {
    title: '交易風控',
    description: '查看今日風控狀態與剩餘額度。',
    route: '/trading-risk',
    keywords: ['risk', '停損', '限制'],
  },
  {
    title: '交易策略庫',
    description: '管理 Playbook 與策略表現。',
    route: '/playbook',
    keywords: ['策略', 'playbook', 'setup'],
  },
  {
    title: '復盤與檢討',
    description: '完成交易復盤與紀律檢查。',
    route: '/review',
    keywords: ['復盤', '錯誤', 'review'],
  },
  {
    title: 'AI 教練',
    description: '查看每日評分與改善建議。',
    route: '/ai-coach',
    keywords: ['ai', '教練', '報告'],
  },
  {
    title: '帳戶管理',
    description: '查看交易帳戶與資金狀態。',
    route: '/accounts',
    keywords: ['帳戶', 'account'],
  },
  {
    title: '資金管理',
    description: '查看投資與資金配置。',
    route: '/investment',
    keywords: ['投資', '資金', 'investment'],
  },
  {
    title: '工具箱',
    description: '開啟交易計算與實用工具。',
    route: '/tools',
    keywords: ['工具', '計算', 'tools'],
  },
  {
    title: '設定中心',
    description: '管理風控、資料與系統設定。',
    route: '/settings',
    keywords: ['設定', '備份', 'settings'],
  },
]

const filteredCommands = computed(() => {
  const value = keyword.value
    .trim()
    .toLowerCase()

  if (!value) {
    return commands
  }

  return commands.filter(command => {
    const content = [
      command.title,
      command.description,
      ...command.keywords,
    ]
      .join(' ')
      .toLowerCase()

    return content.includes(value)
  })
})

const closePalette = (): void => {
  open.value = false
  keyword.value = ''
  selectedIndex.value = 0
}

const openPalette = (): void => {
  open.value = true
}

const executeCommand = async (
  command: CommandItem,
): Promise<void> => {
  closePalette()
  await router.push(command.route)
}

const handleKeydown = (
  event: KeyboardEvent,
): void => {
  if (
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === 'k'
  ) {
    event.preventDefault()

    if (open.value) {
      closePalette()
    }
    else {
      openPalette()
    }

    return
  }

  if (!open.value) {
    return
  }

  if (event.key === 'Escape') {
    closePalette()
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()

    selectedIndex.value = Math.min(
      selectedIndex.value + 1,
      filteredCommands.value.length - 1,
    )

    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()

    selectedIndex.value = Math.max(
      selectedIndex.value - 1,
      0,
    )

    return
  }

  if (event.key === 'Enter') {
    const command =
      filteredCommands.value[
        selectedIndex.value
      ]

    if (command) {
      void executeCommand(command)
    }
  }
}

watch(open, value => {
  if (!value) {
    return
  }

  window.setTimeout(() => {
    searchInput.value?.focus()
  })
})

watch(filteredCommands, () => {
  selectedIndex.value = 0
})

onMounted(() => {
  window.addEventListener(
    'keydown',
    handleKeydown,
  )
})

onBeforeUnmount(() => {
  window.removeEventListener(
    'keydown',
    handleKeydown,
  )
})
</script>

<template>
  <button
    type="button"
    class="hidden h-10 items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 text-sm text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-200 md:flex"
    aria-label="開啟快速搜尋"
    @click="openPalette"
  >
    <span>快速搜尋</span>

    <kbd
      class="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-xs text-zinc-500"
    >
      Ctrl K
    </kbd>
  </button>

  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-[100] flex items-start justify-center bg-black/75 p-4 pt-[12vh] backdrop-blur-sm"
        @click.self="closePalette"
      >
        <section
          class="w-full max-w-2xl overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/70"
        >
          <div
            class="flex items-center gap-3 border-b border-zinc-800 p-4"
          >
            <span class="text-zinc-500">
              🔎
            </span>

            <input
              ref="searchInput"
              v-model="keyword"
              type="search"
              placeholder="搜尋頁面或功能……"
              class="min-w-0 flex-1 bg-transparent text-base text-zinc-100 outline-none placeholder:text-zinc-600"
            />

            <kbd
              class="rounded-lg border border-zinc-800 px-2 py-1 text-xs text-zinc-600"
            >
              ESC
            </kbd>
          </div>

          <div
            v-if="filteredCommands.length"
            class="max-h-[420px] overflow-y-auto p-2"
          >
            <button
              v-for="(command, index) in filteredCommands"
              :key="command.route"
              type="button"
              class="flex w-full items-center justify-between gap-4 rounded-2xl px-4 py-3 text-left transition"
              :class="
                selectedIndex === index
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:bg-zinc-900'
              "
              @mouseenter="selectedIndex = index"
              @click="executeCommand(command)"
            >
              <span class="min-w-0">
                <span
                  class="block font-medium"
                >
                  {{ command.title }}
                </span>

                <span
                  class="mt-1 block truncate text-sm text-zinc-600"
                >
                  {{ command.description }}
                </span>
              </span>

              <span
                class="shrink-0 text-zinc-600"
              >
                →
              </span>
            </button>
          </div>

          <div
            v-else
            class="p-10 text-center text-sm text-zinc-500"
          >
            找不到符合的功能。
          </div>

          <footer
            class="flex items-center gap-4 border-t border-zinc-800 px-4 py-3 text-xs text-zinc-600"
          >
            <span>↑ ↓ 選擇</span>
            <span>Enter 開啟</span>
            <span>Esc 關閉</span>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>