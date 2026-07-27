import { isSupabaseConfigured } from '../lib/supabase'
import { useMealStore } from './meals'
import { useScheduleStore } from './schedule'
import { useUserPreferencesStore } from './userPreferences'

export async function initializeStores() {
  if (!isSupabaseConfigured) return

  const mealStore = useMealStore()
  const scheduleStore = useScheduleStore()
  const userPreferencesStore = useUserPreferencesStore()

  await Promise.all([
    mealStore.loadMeals(),
    scheduleStore.loadSchedule(),
    userPreferencesStore.loadPreferences(),
  ])
}
