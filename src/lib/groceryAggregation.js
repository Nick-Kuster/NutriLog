export function normalizeGroceryKey(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function aggregateGroceryItems(meals) {
  const itemsByKey = {}

  for (const meal of meals) {
    for (const ingredient of meal.ingredients ?? []) {
      const itemKey = `${normalizeGroceryKey(ingredient.name)}|${normalizeGroceryKey(ingredient.unit)}`
      const existing = itemsByKey[itemKey]

      if (existing) {
        existing.quantity += ingredient.quantity ?? 0
        if (!existing.meals.includes(meal.name)) existing.meals.push(meal.name)
      } else {
        itemsByKey[itemKey] = {
          itemKey,
          name: ingredient.name,
          quantity: ingredient.quantity ?? 0,
          unit: ingredient.unit ?? '',
          category: ingredient.category || 'Other',
          meals: [meal.name],
        }
      }
    }
  }

  return Object.values(itemsByKey).sort((first, second) => first.name.localeCompare(second.name))
}

export function groupGroceryItemsByCategory(aggregatedItems, extraItems, categories) {
  const groups = Object.fromEntries(categories.map((category) => [category, { auto: [], extra: [] }]))

  for (const item of aggregatedItems) {
    const category = groups[item.category] ? item.category : 'Other'
    groups[category].auto.push(item)
  }

  for (const item of extraItems) {
    const category = groups[item.category] ? item.category : 'Other'
    groups[category].extra.push(item)
  }

  return categories
    .map((category) => ({ category, ...groups[category] }))
    .filter((group) => group.auto.length || group.extra.length)
}
