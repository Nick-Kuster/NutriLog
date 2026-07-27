<script setup>
import { AlertTriangle, Trash2, X } from 'lucide-vue-next'

defineProps({
  mealName: { type: String, required: true },
  isDeleting: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

defineEmits(['cancel', 'confirm'])
</script>

<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="!isDeleting && $emit('cancel')">
      <div class="modal-card confirm-delete-modal" role="dialog" aria-modal="true" :aria-label="`Delete ${mealName}`">
        <header class="confirm-delete-header">
          <span class="confirm-delete-icon" aria-hidden="true">
            <AlertTriangle :size="22" />
          </span>
          <button class="icon-action" type="button" aria-label="Cancel delete" :disabled="isDeleting" @click="$emit('cancel')">
            <X :size="18" />
          </button>
        </header>

        <div class="confirm-delete-body">
          <p class="eyebrow">Delete meal</p>
          <h3>{{ mealName }}</h3>
          <p>This removes the meal from your library and any scheduled days. This cannot be undone.</p>
          <p v-if="error" class="form-error">{{ error }}</p>
        </div>

        <footer class="modal-footer confirm-delete-actions">
          <button class="secondary-action" type="button" :disabled="isDeleting" @click="$emit('cancel')">Cancel</button>
          <button class="secondary-action danger-action" type="button" :disabled="isDeleting" @click="$emit('confirm')">
            <Trash2 :size="18" /> {{ isDeleting ? 'Deleting...' : 'Delete' }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>
