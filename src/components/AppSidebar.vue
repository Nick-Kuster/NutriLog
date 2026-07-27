<script setup>
import { useRouter } from 'vue-router'
import { CalendarDays, FileJson, Salad, Settings, ShoppingCart } from 'lucide-vue-next'

defineProps({
  activeTab: { type: String, required: true },
})

const emit = defineEmits(['navigate'])
const router = useRouter()

function goToSettings() {
  router.push({ name: 'settings' })
  emit('navigate')
}
</script>

<template>
  <aside class="sidebar" aria-label="Meal overview">
    <div class="brand">
      <Salad :size="24" />
      <span>NutriLog</span>
      <button
        class="icon-action brand-settings-button"
        :class="{ active: activeTab === 'settings' }"
        type="button"
        aria-label="Settings"
        @click="goToSettings"
      >
        <Settings :size="16" />
      </button>
    </div>

    <nav class="nav" aria-label="Primary">
      <RouterLink class="nav-item" :class="{ active: activeTab === 'meals' }" :to="{ name: 'meals' }" @click="$emit('navigate')">
        <Salad :size="18" /> Meals
      </RouterLink>
      <RouterLink class="nav-item" :class="{ active: activeTab === 'schedule' }" :to="{ name: 'schedule' }" @click="$emit('navigate')">
        <CalendarDays :size="18" /> Schedule
      </RouterLink>
      <RouterLink class="nav-item" :class="{ active: activeTab === 'grocery' }" :to="{ name: 'grocery' }" @click="$emit('navigate')">
        <ShoppingCart :size="18" /> Grocery List
      </RouterLink>
      <RouterLink class="nav-item" :class="{ active: activeTab === 'tools' }" :to="{ name: 'tools' }" @click="$emit('navigate')">
        <FileJson :size="18" /> Import/Export
      </RouterLink>
    </nav>
  </aside>
</template>
