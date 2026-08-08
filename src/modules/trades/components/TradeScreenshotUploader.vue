<script setup lang="ts">
import { computed, ref } from 'vue'
import { onBeforeUnmount, watch } from 'vue'
import { resolveCloudMediaUrl } from '@/services/cloud/cloud-storage.service'
import { optimizeScreenshotFile } from '@/services/screenshot-optimization.service'

type ScreenshotType = 'before' | 'after'

interface ScreenshotData {
  type: ScreenshotType
  name: string
  dataUrl: string
}

const props = defineProps<{
  type: ScreenshotType
  imageUrl?: string
  storagePath?: string | null
}>()

const emit = defineEmits<{
  change: [screenshot: ScreenshotData]
  remove: [type: ScreenshotType]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const localImageUrl = ref(props.imageUrl ?? '')
const errorMessage = ref('')
const optimizationMessage = ref('')
let objectUrl: string | null = null
let resolveId = 0

const releaseObjectUrl = (): void => {
  if (objectUrl) URL.revokeObjectURL(objectUrl)
  objectUrl = null
}

const resolvePreview = async (): Promise<void> => {
  const current = ++resolveId
  releaseObjectUrl()
  errorMessage.value = ''

  if (props.imageUrl) {
    localImageUrl.value = props.imageUrl
    return
  }

  localImageUrl.value = ''
  if (!props.storagePath) return

  try {
    const url = await resolveCloudMediaUrl(props.storagePath)
    if (current !== resolveId) {
      URL.revokeObjectURL(url)
      return
    }
    objectUrl = url
    localImageUrl.value = url
  }
  catch {
    if (current === resolveId) errorMessage.value = 'Cloud 截圖暫時無法讀取；重新連線後可再試。'
  }
}

watch(
  [() => props.imageUrl, () => props.storagePath],
  () => { void resolvePreview() },
  { immediate: true },
)

onBeforeUnmount(() => {
  resolveId += 1
  releaseObjectUrl()
})

const title = computed(() =>
  props.type === 'before'
    ? '交易前截圖'
    : '交易後截圖',
)

const description = computed(() =>
  props.type === 'before'
    ? '上傳進場前的 TradingView 圖表，保留原始分析與進場位置。'
    : '上傳離場後的 TradingView 圖表，記錄價格後續走勢與出場位置。',
)

const buttonText = computed(() =>
  localImageUrl.value
    ? '更換截圖'
    : '選擇截圖',
)

const openFilePicker = (): void => {
  errorMessage.value = ''
  fileInput.value?.click()
}

const handleFileChange = async (
  event: Event,
): Promise<void> => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  const allowedTypes = [
    'image/png',
    'image/jpeg',
    'image/webp',
  ]

  if (!allowedTypes.includes(file.type)) {
    errorMessage.value =
      '只支援 PNG、JPG、JPEG 或 WebP 圖片。'

    input.value = ''
    return
  }

  const maximumSize = 5 * 1024 * 1024

  if (file.size > maximumSize) {
    errorMessage.value =
      '圖片大小不能超過 5 MB。'

    input.value = ''
    return
  }

  try {
    const optimized = await optimizeScreenshotFile(file)
    releaseObjectUrl()
    localImageUrl.value = optimized.dataUrl
    optimizationMessage.value = optimized.optimized
      ? `已最佳化 ${(optimized.originalBytes / 1024 / 1024).toFixed(1)} MB → ${(optimized.storedBytes / 1024).toFixed(0)} KB`
      : ''

    emit('change', {
      type: props.type,
      name: optimized.name,
      dataUrl: optimized.dataUrl,
    })
  }
  catch {
    errorMessage.value = '讀取圖片失敗。'
  }
  input.value = ''
}

const removeImage = (): void => {
  releaseObjectUrl()
  localImageUrl.value = ''
  errorMessage.value = ''
  optimizationMessage.value = ''

  emit('remove', props.type)
}
</script>

<template>
  <section
    class="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5"
  >
    <header>
      <h3 class="text-lg font-semibold text-zinc-100">
        {{ title }}
      </h3>

      <p class="mt-2 text-sm leading-6 text-zinc-500">
        {{ description }}
      </p>
    </header>

    <input
      ref="fileInput"
      type="file"
      accept="image/png,image/jpeg,image/webp"
      class="hidden"
      @change="handleFileChange"
    />

    <div
      v-if="localImageUrl"
      class="mt-5 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950"
    >
      <img
        :src="localImageUrl"
        :alt="title"
        class="max-h-[520px] w-full object-contain"
      />

      <div
        class="flex flex-col gap-3 border-t border-zinc-800 p-4 sm:flex-row sm:justify-end"
      >
        <button
          type="button"
          class="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-400 transition hover:border-sky-500/30 hover:text-sky-300"
          @click="openFilePicker"
        >
          更換截圖
        </button>

        <button
          type="button"
          class="rounded-xl border border-rose-500/20 px-4 py-2.5 text-sm text-rose-300 transition hover:border-rose-500/40 hover:bg-rose-500/10"
          @click="removeImage"
        >
          移除截圖
        </button>
      </div>
    </div>

    <button
      v-else
      type="button"
      class="mt-5 flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-950/50 p-8 text-center transition hover:border-amber-500/40 hover:bg-amber-500/5"
      @click="openFilePicker"
    >
      <span
        class="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-2xl text-amber-300"
      >
        ＋
      </span>

      <span class="mt-4 font-medium text-zinc-300">
        {{ buttonText }}
      </span>

      <span class="mt-2 text-sm text-zinc-600">
        支援 PNG、JPG、JPEG、WebP，最大 5 MB
      </span>
    </button>

    <p
      v-if="errorMessage"
      class="mt-3 text-sm text-rose-300"
    >
      {{ errorMessage }}
    </p>

    <p v-if="optimizationMessage" class="mt-3 text-xs text-emerald-300/70">
      {{ optimizationMessage }} · Cloud Media Optimizer
    </p>
  </section>
</template>
