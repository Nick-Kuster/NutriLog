<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { CalendarDays, FileJson, Home, LogOut, Menu, Settings, ShoppingCart, X } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'

defineProps({
  activeTab: { type: String, required: true },
})

const router = useRouter()
const authStore = useAuthStore()

const isMenuOpen = ref(false)

function goHome() {
  router.push({ name: 'meals' })
  isMenuOpen.value = false
}

function goToRoute(name) {
  router.push({ name })
  isMenuOpen.value = false
}

function closeMenu() {
  isMenuOpen.value = false
}

function signOut() {
  authStore.signOut()
  isMenuOpen.value = false
}
</script>

<template>
  <header class="mobile-header">
    <button class="mobile-header-button" type="button" aria-label="Home" @click="goHome">
      <Home :size="20" />
    </button>
    <span class="mobile-brand">NutriLog</span>
    <div class="mobile-header-actions">
      <button
        class="mobile-header-button"
        :class="{ active: activeTab === 'settings' }"
        type="button"
        aria-label="Settings"
        @click="goToRoute('settings')"
      >
        <Settings :size="18" />
      </button>
      <button class="mobile-header-button" type="button" aria-label="Menu" @click="isMenuOpen = !isMenuOpen">
        <Menu :size="20" />
      </button>
    </div>
  </header>

  <Teleport to="body">
    <div v-if="isMenuOpen" class="mobile-menu-overlay" @click.self="closeMenu">
      <nav class="mobile-menu" aria-label="Primary">
        <div class="mobile-menu-header">
          <span>Menu</span>
          <button class="mobile-header-button" type="button" aria-label="Close menu" @click="closeMenu">
            <X :size="18" />
          </button>
        </div>
        <button class="nav-item" :class="{ active: activeTab === 'schedule' }" type="button" @click="goToRoute('schedule')">
          <CalendarDays :size="18" /> Schedule
        </button>
        <button class="nav-item" :class="{ active: activeTab === 'grocery' }" type="button" @click="goToRoute('grocery')">
          <ShoppingCart :size="18" /> Grocery List
        </button>
        <button class="nav-item" :class="{ active: activeTab === 'tools' }" type="button" @click="goToRoute('tools')">
          <FileJson :size="18" /> Import/Export
        </button>
        <button v-if="authStore.isSupabaseConfigured" class="nav-item sign-out-button" type="button" :disabled="authStore.isLoading" @click="signOut">
          <LogOut :size="18" /> Sign out
        </button>
      </nav>
    </div>
  </Teleport>
</template>
