import { normalizeGroceryKey } from './groceryAggregation.js'

// Ownership belongs to the imported shopping week, not to the saved recipe.
export function importedOwnedGroceries(data, weekStartsOn) {
  const meals = new Map(data.meals.map((meal) => [String(meal.id), meal]))
  const weeks = new Map()
  for (const entry of data.schedule) {
    if (entry.mealId === null || entry.mealId === undefined) continue
    const meal = meals.get(String(entry.mealId))
    if (!meal) continue
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) throw new Error('Schedule dates must use YYYY-MM-DD.')
    const date = new Date(`${entry.date}T12:00:00Z`)
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== entry.date) throw new Error('Invalid schedule date.')
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() - weekStartsOn + 7) % 7)
    const week = date.toISOString().slice(0, 10)
    if (!weeks.has(week)) weeks.set(week, new Map())
    const items = weeks.get(week)
    for (const ingredient of meal.ingredients ?? []) {
      const key = `${normalizeGroceryKey(ingredient.name)}|${normalizeGroceryKey(ingredient.unit)}`
      items.set(key, (items.get(key) ?? true) && ingredient.alreadyOwned === true)
    }
  }
  return [...weeks].flatMap(([weekStart, items]) => [...items]
    .filter(([, owned]) => owned)
    .map(([itemKey]) => ({ weekStart, itemKey })))
}
