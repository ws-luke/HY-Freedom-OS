<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

import { resolveCloudMediaUrl } from '@/services/cloud/cloud-storage.service'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  dataUrl?: string | null
  storagePath?: string | null
  alt?: string
}>()

const source = ref('')
const failed = ref(false)
let objectUrl: string | null = null
let requestId = 0

const releaseObjectUrl = (): void => {
  if (objectUrl) URL.revokeObjectURL(objectUrl)
  objectUrl = null
}

const resolve = async (): Promise<void> => {
  const currentRequest = ++requestId
  releaseObjectUrl()
  failed.value = false

  if (props.dataUrl) {
    source.value = props.dataUrl
    return
  }

  source.value = ''
  if (!props.storagePath) return

  try {
    const url = await resolveCloudMediaUrl(props.storagePath)
    if (currentRequest !== requestId) {
      URL.revokeObjectURL(url)
      return
    }
    objectUrl = url
    source.value = url
  }
  catch {
    if (currentRequest === requestId) failed.value = true
  }
}

watch(
  [() => props.dataUrl, () => props.storagePath],
  () => { void resolve() },
  { immediate: true },
)

onBeforeUnmount(() => {
  requestId += 1
  releaseObjectUrl()
})
</script>

<template>
  <img
    v-if="source"
    :src="source"
    :alt="alt ?? ''"
    v-bind="$attrs"
  />
  <div
    v-else
    v-bind="$attrs"
    class="flex items-center justify-center bg-zinc-950/70 text-center text-xs text-zinc-600"
  >
    {{ failed ? '圖片暫時無法讀取' : '正在讀取圖片…' }}
  </div>
</template>
