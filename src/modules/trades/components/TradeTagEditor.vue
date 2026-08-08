<script setup lang="ts">
import { computed, ref, watch } from 'vue'

export type TradeMistakeTag =
  | 'fomo'
  | 'overtrade'
  | 'early-entry'
  | 'late-entry'
  | 'early-exit'
  | 'late-exit'
  | 'moved-stop'
  | 'oversized-risk'
  | 'ignored-trend'
  | 'ignored-news'
  | 'revenge-trade'
  | 'no-confirmation'

interface MistakeOption {
  value: TradeMistakeTag
  label: string
  description: string
}

const props = withDefaults(
  defineProps<{
    modelValue?: TradeMistakeTag[]
    customTags?: string[]
  }>(),
  {
    modelValue: () => [],
    customTags: () => [],
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: TradeMistakeTag[]]
  'update:customTags': [value: string[]]
}>()

const selectedTags = ref<TradeMistakeTag[]>([
  ...props.modelValue,
])

const localCustomTags = ref<string[]>([
  ...props.customTags,
])

const newCustomTag = ref('')

const options: MistakeOption[] = [
  {
    value: 'fomo',
    label: 'FOMO 追價',
    description: '害怕錯過行情，在不理想的位置追進。',
  },
  {
    value: 'overtrade',
    label: '過度交易',
    description: '交易次數超出原本計畫或限制。',
  },
  {
    value: 'early-entry',
    label: '過早進場',
    description: '結構或訊號尚未完成就提前進場。',
  },
  {
    value: 'late-entry',
    label: '太晚進場',
    description: '錯過理想位置後仍勉強追進。',
  },
  {
    value: 'early-exit',
    label: '過早離場',
    description: '尚未到達原定目標就因情緒提前出場。',
  },
  {
    value: 'late-exit',
    label: '太晚離場',
    description: '應該離場時沒有執行，造成獲利回吐。',
  },
  {
    value: 'moved-stop',
    label: '移動停損',
    description: '為避免認賠而把停損往不利方向移動。',
  },
  {
    value: 'oversized-risk',
    label: '風險過大',
    description: '單筆交易風險超出原定限制。',
  },
  {
    value: 'ignored-trend',
    label: '忽略趨勢',
    description: '進場方向與高週期趨勢或結構相反。',
  },
  {
    value: 'ignored-news',
    label: '忽略新聞',
    description: '在重大經濟事件前後建立交易。',
  },
  {
    value: 'revenge-trade',
    label: '報復交易',
    description: '虧損後急著追回損失而再次進場。',
  },
  {
    value: 'no-confirmation',
    label: '沒有確認',
    description: '沒有等待低週期結構或進場訊號。',
  },
]

const selectedCount = computed(
  () =>
    selectedTags.value.length +
    localCustomTags.value.length,
)

const isSelected = (
  value: TradeMistakeTag,
): boolean => {
  return selectedTags.value.includes(value)
}

const toggleTag = (
  value: TradeMistakeTag,
): void => {
  if (isSelected(value)) {
    selectedTags.value =
      selectedTags.value.filter(
        item => item !== value,
      )
  }
  else {
    selectedTags.value = [
      ...selectedTags.value,
      value,
    ]
  }

  emit(
    'update:modelValue',
    [...selectedTags.value],
  )
}

const addCustomTag = (): void => {
  const value = newCustomTag.value.trim()

  if (!value) {
    return
  }

  const alreadyExists =
    localCustomTags.value.some(
      tag =>
        tag.toLowerCase() ===
        value.toLowerCase(),
    )

  if (alreadyExists) {
    newCustomTag.value = ''
    return
  }

  localCustomTags.value = [
    ...localCustomTags.value,
    value,
  ]

  emit(
    'update:customTags',
    [...localCustomTags.value],
  )

  newCustomTag.value = ''
}

const removeCustomTag = (
  tag: string,
): void => {
  localCustomTags.value =
    localCustomTags.value.filter(
      item => item !== tag,
    )

  emit(
    'update:customTags',
    [...localCustomTags.value],
  )
}

const clearAll = (): void => {
  selectedTags.value = []
  localCustomTags.value = []

  emit('update:modelValue', [])
  emit('update:customTags', [])
}

watch(
  () => props.modelValue,
  value => {
    selectedTags.value = [...value]
  },
)

watch(
  () => props.customTags,
  value => {
    localCustomTags.value = [...value]
  },
)
</script>

<template>
  <section
    class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
  >
    <header
      class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
    >
      <div>
        <h3 class="text-lg font-semibold text-zinc-100">
          交易錯誤標籤
        </h3>

        <p class="mt-1 text-sm leading-6 text-zinc-500">
          標記這筆交易出現的執行問題，方便後續統計重複錯誤。
        </p>
      </div>

      <div
        class="rounded-full border border-zinc-700 bg-zinc-950/60 px-3 py-1 text-xs text-zinc-400"
      >
        已選擇 {{ selectedCount }} 項
      </div>
    </header>

    <div class="mt-5 grid gap-3 md:grid-cols-2">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="rounded-2xl border p-4 text-left transition"
        :class="
          isSelected(option.value)
            ? 'border-rose-500/40 bg-rose-500/10'
            : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-700'
        "
        @click="toggleTag(option.value)"
      >
        <div class="flex items-start gap-3">
          <div
            class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs"
            :class="
              isSelected(option.value)
                ? 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                : 'border-zinc-700 text-transparent'
            "
          >
            ✓
          </div>

          <div>
            <p
              class="font-medium"
              :class="
                isSelected(option.value)
                  ? 'text-rose-300'
                  : 'text-zinc-300'
              "
            >
              {{ option.label }}
            </p>

            <p class="mt-1 text-sm leading-6 text-zinc-600">
              {{ option.description }}
            </p>
          </div>
        </div>
      </button>
    </div>

    <div
      class="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4"
    >
      <p class="text-sm font-medium text-zinc-300">
        自訂標籤
      </p>

      <form
        class="mt-3 flex flex-col gap-3 sm:flex-row"
        @submit.prevent="addCustomTag"
      >
        <input
          v-model="newCustomTag"
          type="text"
          maxlength="30"
          placeholder="例如：沒有等待 15M 收線"
          class="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-rose-500/40"
        />

        <button
          type="submit"
          :disabled="!newCustomTag.trim()"
          class="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-300 transition hover:border-rose-400/40 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-zinc-900 disabled:text-zinc-600"
        >
          新增標籤
        </button>
      </form>

      <div
        v-if="localCustomTags.length"
        class="mt-4 flex flex-wrap gap-2"
      >
        <span
          v-for="tag in localCustomTags"
          :key="tag"
          class="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-300"
        >
          {{ tag }}

          <button
            type="button"
            class="text-violet-300/60 transition hover:text-rose-300"
            :aria-label="`移除 ${tag}`"
            @click="removeCustomTag(tag)"
          >
            ×
          </button>
        </span>
      </div>
    </div>

    <button
      v-if="selectedCount > 0"
      type="button"
      class="mt-4 text-sm text-zinc-500 transition hover:text-rose-300"
      @click="clearAll"
    >
      清除全部錯誤標籤
    </button>
  </section>
</template>