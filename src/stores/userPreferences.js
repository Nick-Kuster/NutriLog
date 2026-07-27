import { defineStore } from 'pinia'
import { requireSupabaseUser, supabase } from '../lib/supabase'

export const useUserPreferencesStore = defineStore('userPreferences', {
  state: () => ({
    weekStartsOn: 0,
    groceryShoppingDay: null,
    isLoading: false,
    error: '',
  }),
  actions: {
    async loadPreferences() {
      if (!supabase) return

      this.isLoading = true
      this.error = ''

      try {
        const user = await requireSupabaseUser()
        const { data, error } = await supabase
          .from('nutrilog_user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (error) throw error

        if (!data) {
          await this.persistPreferences()
          return
        }

        this.weekStartsOn = data.week_starts_on
        this.groceryShoppingDay = data.grocery_shopping_day ?? null
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Could not load preferences.'
        throw error
      } finally {
        this.isLoading = false
      }
    },
    async persistPreferences() {
      if (!supabase) return

      const user = await requireSupabaseUser()
      const { error } = await supabase
        .from('nutrilog_user_preferences')
        .upsert({
          user_id: user.id,
          week_starts_on: this.weekStartsOn,
          grocery_shopping_day: this.groceryShoppingDay,
        })

      if (error) throw error
    },
    setWeekStartsOn(day) {
      this.weekStartsOn = Math.min(6, Math.max(0, Math.round(Number(day) || 0)))
      this.persistPreferences()
    },
    setGroceryShoppingDay(day) {
      this.groceryShoppingDay = day === null || day === undefined || day === ''
        ? null
        : Math.min(6, Math.max(0, Math.round(Number(day))))
      this.persistPreferences()
    },
  },
})
