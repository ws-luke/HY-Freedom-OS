<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { supabase } from '@/services/cloud/supabase.client'

const props = defineProps<{
  dataUrl?: string | null
  storagePath?: string | null
  alt: string
}>()

const source = ref('')
const failed = ref(false)
let objectUrl: string | null = null
let requestId = 0

const load = async (): Promise<void> => {
  const current = ++requestId
  if (objectUrl) URL.revokeObjectURL(objectUrl)
  objectUrl = null
  failed.value = false

  if (props.dataUrl) {
    source.value = props.dataUrl
    return
  }
  source.value = ''
  if (!props.storagePath || !supabase) return

  const { data, error } = await supabase.storage.from('trade-screenshots').download(props.storagePath)
  if (current !== requestId) return
  if (error) {
    failed.value = true
    return
  }
  objectUrl = URL.createObjectURL(data)
  source.value = objectUrl
}

watch([() => props.dataUrl, () => props.storagePath], () => { void load() }, { immediate: true })
onBeforeUnmount(() => {
  requestId += 1
  if (objectUrl) URL.revokeObjectURL(objectUrl)
})
</script>

<template>
  <img v-if="source" :src="source" :alt="alt" class="h-full w-full object-cover" loading="lazy">
  <div v-else class="flex min-h-40 items-center justify-center bg-zinc-900 text-sm text-zinc-600">
    {{ failed ? '截圖無法讀取或分享已失效' : '沒有截圖' }}
  </div>
</template>
