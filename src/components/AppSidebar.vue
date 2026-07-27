<script setup>
import { useRouter } from 'vue-router'
import { CalendarDays, FileJson, LogOut, Salad, Settings, ShoppingCart } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'

defineProps({
  activeTab: { type: String, required: true },
})

const router = useRouter()
const authStore = useAuthStore()

function goToSettings() {
  router.push({ name: 'settings' })
}

function signOut() {
  authStore.signOut()
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
      <RouterLink class="nav-item" :class="{ active: activeTab === 'meals' }" :to="{ name: 'meals' }">
        <Salad :size="18" /> Meals
      </RouterLink>
      <RouterLink class="nav-item" :class="{ active: activeTab === 'schedule' }" :to="{ name: 'schedule' }">
        <CalendarDays :size="18" /> Schedule
      </RouterLink>
      <RouterLink class="nav-item" :class="{ active: activeTab === 'grocery' }" :to="{ name: 'grocery' }">
        <ShoppingCart :size="18" /> Grocery List
      </RouterLink>
      <RouterLink class="nav-item" :class="{ active: activeTab === 'tools' }" :to="{ name: 'tools' }">
        <FileJson :size="18" /> Import/Export
      </RouterLink>
    </nav>

    <button v-if="authStore.isSupabaseConfigured" class="nav-item sign-out-button" type="button" :disabled="authStore.isLoading" @click="signOut">
      <LogOut :size="18" /> Sign out
    </button>
  </aside>
</template>
