import { defineStore } from 'pinia'
import { requireSupabaseUser, supabase } from '../lib/supabase'
import { useScheduleStore } from './schedule'

export const useMealStore = defineStore('meals', {
  state: () => ({
    meals: [],
    importedMealIdMap: {},
    isLoading: false,
    error: '',
  }),
  getters: {
    mealById: (state) => (mealId) => state.meals.find((meal) => String(meal.id) === String(mealId)),
    completedMeals: (state) => state.meals.filter((meal) => meal.status === 'completed'),
  },
  actions: {
    async loadMeals() {
      if (!supabase) return

      this.isLoading = true
      this.error = ''

      try {
        await requireSupabaseUser()
        const [mealsResult, ingredientsResult] = await Promise.all([
          supabase.from('meals').select('*').order('created_at'),
          supabase.from('meal_ingredients').select('*').order('sort_order'),
        ])

        const error = mealsResult.error || ingredientsResult.error
        if (error) throw error

        const ingredientsByMealId = groupBy(ingredientsResult.data ?? [], 'meal_id')

        this.meals = (mealsResult.data ?? []).map((meal) => mapMealFromRow(
          meal,
          ingredientsByMealId[meal.id] ?? [],
        ))
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Could not load meals.'
        throw error
      } finally {
        this.isLoading = false
      }
    },
    async replaceMeals(meals) {
      const importedMealIdMap = Object.fromEntries(meals.map((meal) => [String(meal.id), meal.id]))
      this.importedMealIdMap = importedMealIdMap
      this.meals = meals
      if (!supabase) return importedMealIdMap

      const user = await requireSupabaseUser()
      const { error } = await supabase.from('meals').delete().eq('user_id', user.id)
      if (error) throw error

      const savedMeals = []
      for (const meal of meals) {
        const savedMeal = await this.saveMealTree(meal)
        importedMealIdMap[String(meal.id)] = savedMeal.id
        savedMeals.push(savedMeal)
      }
      this.importedMealIdMap = importedMealIdMap
      this.meals = savedMeals
      return importedMealIdMap
    },
    async importMeals(meals) {
      const importedMealIdMap = Object.fromEntries(meals.map((meal) => [String(meal.id), meal.id]))
      const savedMeals = []

      for (const meal of meals) {
        const savedMeal = await this.saveMealTree(meal)
        importedMealIdMap[String(meal.id)] = savedMeal.id
        savedMeals.push(savedMeal)
      }

      this.importedMealIdMap = importedMealIdMap
      this.meals = [...this.meals, ...savedMeals]
      return importedMealIdMap
    },
    async addMeal(meal) {
      const savedMeal = await this.saveMealTree(meal)
      this.meals = [...this.meals, savedMeal]
      return savedMeal
    },
    async deleteMeal(mealId) {
      const scheduleStore = useScheduleStore()
      const resolvedMealId = typeof mealId === 'object' ? mealId?.id : mealId
      if (!resolvedMealId) return false

      const previousMeals = [...this.meals]
      const previousSchedule = [...scheduleStore.schedule]
      this.meals = this.meals.filter((item) => String(item.id) !== String(resolvedMealId))
      scheduleStore.removeMealFromSchedule(resolvedMealId)

      if (!supabase) return true

      try {
        const user = await requireSupabaseUser()
        const { data: deletedRows, error } = await supabase
          .from('meals')
          .delete()
          .eq('user_id', user.id)
          .eq('id', resolvedMealId)
          .select('id')

        if (error) throw error
        if (!deletedRows?.length) throw new Error('No meal was deleted. The meal may not belong to the signed-in user, or it may already be gone.')

        await Promise.all([
          this.loadMeals(),
          scheduleStore.loadSchedule(),
        ])
        return true
      } catch (error) {
        this.meals = previousMeals
        scheduleStore.schedule = previousSchedule
        throw error
      }
    },
    async deleteMeals(mealIds) {
      const scheduleStore = useScheduleStore()
      const resolvedIds = mealIds
        .map((mealId) => (typeof mealId === 'object' ? mealId?.id : mealId))
        .filter(Boolean)
      if (!resolvedIds.length) return true

      const idSet = new Set(resolvedIds.map(String))
      const previousMeals = [...this.meals]
      const previousSchedule = [...scheduleStore.schedule]
      this.meals = this.meals.filter((item) => !idSet.has(String(item.id)))
      for (const mealId of resolvedIds) {
        scheduleStore.removeMealFromSchedule(mealId)
      }

      if (!supabase) return true

      try {
        const user = await requireSupabaseUser()
        const { data: deletedRows, error } = await supabase
          .from('meals')
          .delete()
          .eq('user_id', user.id)
          .in('id', resolvedIds)
          .select('id')

        if (error) throw error
        if (!deletedRows?.length) throw new Error('No meals were deleted. They may not belong to the signed-in user, or may already be gone.')

        await Promise.all([
          this.loadMeals(),
          scheduleStore.loadSchedule(),
        ])
        return true
      } catch (error) {
        this.meals = previousMeals
        scheduleStore.schedule = previousSchedule
        throw error
      }
    },
    async updateMeal(mealId, updates) {
      const index = this.meals.findIndex((item) => String(item.id) === String(mealId))
      if (index === -1) return null

      const updatedMeal = { ...this.meals[index], ...updates, id: this.meals[index].id }
      const savedMeal = await this.saveMealTree(updatedMeal)
      this.meals = [
        ...this.meals.slice(0, index),
        savedMeal,
        ...this.meals.slice(index + 1),
      ]
      return savedMeal
    },
    async setMealCompleted(mealId, completed) {
      const meal = this.meals.find((item) => String(item.id) === String(mealId))
      if (!meal) return

      meal.status = completed ? 'completed' : 'planned'
      if (!supabase) return

      const { error } = await supabase
        .from('meals')
        .update({ status: meal.status })
        .eq('id', meal.id)

      if (error) throw error
    },
    async saveMealTree(meal) {
      if (!supabase) return meal

      const user = await requireSupabaseUser()
      const existingId = isUuid(meal.id) ? meal.id : undefined
      const { data: savedMealRow, error: mealError } = await supabase
        .from('meals')
        .upsert(mapMealToRow(meal, user.id, existingId))
        .select()
        .single()

      if (mealError) throw mealError

      const { error: deleteIngredientsError } = await supabase
        .from('meal_ingredients')
        .delete()
        .eq('meal_id', savedMealRow.id)

      if (deleteIngredientsError) throw deleteIngredientsError

      const savedIngredients = []
      for (const [ingredientIndex, ingredient] of (meal.ingredients ?? []).entries()) {
        const { data: savedIngredientRow, error: ingredientError } = await supabase
          .from('meal_ingredients')
          .insert(mapIngredientToRow(ingredient, savedMealRow.id, user.id, ingredientIndex))
          .select()
          .single()

        if (ingredientError) throw ingredientError
        savedIngredients.push(mapIngredientFromRow(savedIngredientRow))
      }

      return { ...mapMealBaseFromRow(savedMealRow), ingredients: savedIngredients }
    },
  },
})

function groupBy(rows, key) {
  return rows.reduce((groups, row) => {
    const groupKey = row[key]
    return {
      ...groups,
      [groupKey]: [...(groups[groupKey] ?? []), row],
    }
  }, {})
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value))
}

function mapMealFromRow(meal, ingredientRows) {
  return {
    ...mapMealBaseFromRow(meal),
    ingredients: ingredientRows.map(mapIngredientFromRow),
  }
}

function mapMealBaseFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    mealType: row.meal_type,
    servings: Number(row.servings ?? 1),
    prepMinutes: Number(row.prep_minutes ?? 0),
    calories: row.calories === null || row.calories === undefined ? undefined : Number(row.calories),
    proteinG: row.protein_g === null || row.protein_g === undefined ? undefined : Number(row.protein_g),
    carbsG: row.carbs_g === null || row.carbs_g === undefined ? undefined : Number(row.carbs_g),
    fatG: row.fat_g === null || row.fat_g === undefined ? undefined : Number(row.fat_g),
    status: row.status,
    notes: row.notes ?? '',
    instructions: Array.isArray(row.instructions) ? row.instructions : [],
  }
}

function mapIngredientFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    quantity: Number(row.quantity ?? 1),
    unit: row.unit ?? '',
    category: row.category ?? 'Other',
  }
}

function mapMealToRow(meal, userId, existingId) {
  return {
    ...(existingId ? { id: existingId } : {}),
    user_id: userId,
    name: meal.name,
    meal_type: meal.mealType ?? 'Meal',
    servings: meal.servings ?? 1,
    prep_minutes: meal.prepMinutes ?? 0,
    calories: parseNullableNumber(meal.calories),
    protein_g: parseNullableNumber(meal.proteinG),
    carbs_g: parseNullableNumber(meal.carbsG),
    fat_g: parseNullableNumber(meal.fatG),
    status: meal.status ?? 'planned',
    notes: meal.notes ?? '',
    instructions: meal.instructions ?? [],
  }
}

function mapIngredientToRow(ingredient, mealId, userId, sortOrder) {
  return {
    meal_id: mealId,
    user_id: userId,
    name: ingredient.name,
    quantity: parseNullableNumber(ingredient.quantity) ?? 1,
    unit: ingredient.unit ?? '',
    category: ingredient.category ?? 'Other',
    sort_order: sortOrder,
  }
}

function parseNullableNumber(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  const match = String(value).match(/-?\d+(?:\.\d+)?/)
  if (!match) return null

  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : null
}
