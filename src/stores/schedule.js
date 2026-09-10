import { defineStore } from 'pinia'
import { requireSupabaseUser, supabase } from '../lib/supabase'

export const useScheduleStore = defineStore('schedule', {
  state: () => ({
    schedule: [],
    isLoading: false,
    error: '',
  }),
  getters: {
    scheduledMeals: (state) => state.schedule,
  },
  actions: {
    async setScheduledMealCompleted(date, mealId, completed) {
      const matches = (item) => item.date === date && String(item.mealId) === String(mealId)
      if (!this.schedule.some(matches)) throw new Error('Scheduled meal not found.')
      if (supabase) {
        const user = await requireSupabaseUser()
        const { data, error } = await supabase.from('scheduled_meals')
          .update({ is_completed: completed })
          .eq('user_id', user.id).eq('scheduled_date', date).eq('meal_id', mealId)
          .select('id').single()
        if (error || !data) throw new Error(error?.message || 'Could not save completion.')
      }
      this.schedule = this.schedule.map((item) => matches(item) ? { ...item, isCompleted: completed } : item)
    },
    async loadSchedule() {
      if (!supabase) return

      this.isLoading = true
      this.error = ''

      try {
        await requireSupabaseUser()
        const { data, error } = await supabase
          .from('scheduled_meals')
          .select('*')
          .order('scheduled_date')
          .order('sort_order')

        if (error) throw error
        this.schedule = (data ?? []).map(mapScheduleFromRow)
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Could not load schedule.'
        throw error
      } finally {
        this.isLoading = false
      }
    },
    async replaceSchedule(schedule) {
      this.schedule = normalizeScheduleOrder(schedule)
      if (!supabase) return

      const user = await requireSupabaseUser()
      const { error: schemaError } = await supabase.from('scheduled_meals').select('is_completed').limit(0)
      if (schemaError) throw new Error('Apply the scheduled meal completion migration before changing the schedule. ' + schemaError.message)
      const { error: deleteError } = await supabase.from('scheduled_meals').delete().eq('user_id', user.id)
      if (deleteError) throw deleteError

      if (!this.schedule.length) return

      const { error } = await supabase
        .from('scheduled_meals')
        .insert(this.schedule.filter((item) => item.mealId).map((item) => mapScheduleToRow(item, user.id)))

      if (error) throw error
    },
    removeMealFromSchedule(mealId) {
      this.schedule = normalizeScheduleOrder(this.schedule.filter((item) => String(item.mealId) !== String(mealId)))
    },
    async scheduleMeal(date, mealId, isCompleted = false) {
      const order = this.schedule.filter((item) => item.date === date).length
      const localItem = { date, mealId, order, isCompleted: isCompleted === true }
      this.schedule = normalizeScheduleOrder([...this.schedule, localItem])

      if (!supabase) return localItem

      const user = await requireSupabaseUser()
      const { data, error } = await supabase
        .from('scheduled_meals')
        .insert(mapScheduleToRow(localItem, user.id))
        .select()
        .single()

      if (error) throw error
      const savedItem = mapScheduleFromRow(data)
      this.schedule = normalizeScheduleOrder(this.schedule.map((item) => (
        item.date === date && String(item.mealId) === String(mealId) ? savedItem : item
      )))
      return savedItem
    },
    async updateScheduledMeal(date, mealId, nextDate) {
      const matchedSchedule = this.schedule.some((item) => item.date === date && String(item.mealId) === String(mealId))
      const schedule = matchedSchedule
        ? this.schedule.map((item) => (item.date === date && String(item.mealId) === String(mealId) ? { ...item, date: nextDate } : item))
        : [...this.schedule, { date: nextDate, mealId, order: this.schedule.filter((item) => item.date === nextDate).length }]

      this.schedule = normalizeScheduleOrder(schedule)

      if (!supabase) return

      const user = await requireSupabaseUser()
      const nextOrder = this.schedule.find((item) => item.date === nextDate && String(item.mealId) === String(mealId))?.order ?? 0
      const { data: existingRows, error: findError } = await supabase
        .from('scheduled_meals')
        .select('id')
        .eq('user_id', user.id)
        .eq('meal_id', mealId)
        .eq('scheduled_date', date)

      if (findError) throw findError

      if (existingRows?.length) {
        const { error } = await supabase
          .from('scheduled_meals')
          .update({ scheduled_date: nextDate, sort_order: nextOrder })
          .eq('id', existingRows[0].id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('scheduled_meals')
          .insert({ user_id: user.id, meal_id: mealId, scheduled_date: nextDate, sort_order: nextOrder })

        if (error) throw error
      }
    },
    async moveScheduledMeal(date, mealId, nextDate, nextIndex) {
      const movingItem = this.schedule.find((item) => item.date === date && String(item.mealId) === String(mealId))
      if (!movingItem) return

      const remainingSchedule = this.schedule.filter((item) => !(item.date === date && String(item.mealId) === String(mealId)))
      const targetDayItems = remainingSchedule
        .filter((item) => item.date === nextDate)
        .sort(compareScheduleItems)
      const insertIndex = Math.min(Math.max(Number(nextIndex) || 0, 0), targetDayItems.length)
      const nextTargetDayItems = [
        ...targetDayItems.slice(0, insertIndex),
        { ...movingItem, date: nextDate },
        ...targetDayItems.slice(insertIndex),
      ]

      this.schedule = normalizeScheduleOrder([
        ...remainingSchedule.filter((item) => item.date !== nextDate),
        ...nextTargetDayItems,
      ])

      if (!supabase) return

      await this.replaceSchedule(this.schedule)
    },
  },
})

function compareScheduleItems(first, second) {
  return first.date.localeCompare(second.date)
    || ((first.order ?? 0) - (second.order ?? 0))
    || String(first.mealId).localeCompare(String(second.mealId))
}

function normalizeScheduleOrder(schedule) {
  const byDate = schedule.reduce((groups, item) => ({
    ...groups,
    [item.date]: [...(groups[item.date] ?? []), item],
  }), {})

  return Object.entries(byDate)
    .flatMap(([date, items]) => items
      .sort(compareScheduleItems)
      .map((item, order) => ({ ...item, date, order })))
    .sort(compareScheduleItems)
}

function mapScheduleFromRow(row) {
  return {
    id: row.id,
    date: row.scheduled_date,
    mealId: row.meal_id,
    order: row.sort_order ?? 0,
    isCompleted: row.is_completed === true,
  }
}

function mapScheduleToRow(item, userId) {
  return {
    ...(item.id ? { id: item.id } : {}),
    user_id: userId,
    meal_id: item.mealId,
    scheduled_date: item.date,
    sort_order: item.order ?? 0,
    is_completed: item.isCompleted === true,
  }
}
