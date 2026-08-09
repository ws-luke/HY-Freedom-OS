<script setup lang="ts">
import AppConfirmDialog from '@/components/AppConfirmDialog.vue'
import { useConfirmDialogStore } from '@/stores/useConfirmDialogStore'

const confirmStore = useConfirmDialogStore()
</script>

<template>
  <AppConfirmDialog
    :open="Boolean(confirmStore.activeRequest)"
    :title="confirmStore.activeRequest?.title ?? ''"
    :message="confirmStore.activeRequest?.message ?? ''"
    :confirm-label="confirmStore.activeRequest?.confirmLabel"
    :cancel-label="confirmStore.activeRequest?.cancelLabel"
    :tone="confirmStore.activeRequest?.tone"
    @confirm="confirmStore.confirm"
    @cancel="confirmStore.cancel"
  />
</template>
