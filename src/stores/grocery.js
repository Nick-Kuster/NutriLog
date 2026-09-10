import { defineStore } from 'pinia'
import { requireSupabaseUser, supabase } from '../lib/supabase'

export const useGroceryStore = defineStore('grocery', {
  state: () => ({
    weekStart: '',
    extraItems: [],
    checkedKeys: {},
    localCheckedWeeks: {},
    isLoading: false,
    error: '',
  }),
  actions: {
    async applyImportedOwnership(items) {
      if (!items.length) return
      if (supabase) {
        const user = await requireSupabaseUser()
        const { error } = await supabase.from('grocery_checkoffs').upsert(
          items.map(({ weekStart, itemKey }) => ({ user_id: user.id, week_start: weekStart, item_key: itemKey, is_checked: true })),
          { onConflict: 'user_id,week_start,item_key', ignoreDuplicates: true },
        )
        if (error) throw error
        if (this.weekStart) await this.loadWeek(this.weekStart)
        return
      }
      for (const { weekStart, itemKey } of items) {
        const checked = this.localCheckedWeeks[weekStart] ?? {}
        this.localCheckedWeeks[weekStart] = { ...checked, [itemKey]: checked[itemKey] ?? true }
      }
      this.checkedKeys = this.localCheckedWeeks[this.weekStart] ?? {}
    },
    async loadWeek(weekStart) {
      this.weekStart = weekStart

      if (!supabase) {
        this.extraItems = []
        this.checkedKeys = this.localCheckedWeeks[weekStart] ?? {}
        return
      }

      this.isLoading = true
      this.error = ''

      try {
        const user = await requireSupabaseUser()
        const [extraItemsResult, checkoffsResult] = await Promise.all([
          supabase.from('grocery_extra_items').select('*').eq('user_id', user.id).eq('week_start', weekStart).order('created_at'),
          supabase.from('grocery_checkoffs').select('*').eq('user_id', user.id).eq('week_start', weekStart),
        ])

        const error = extraItemsResult.error || checkoffsResult.error
        if (error) throw error

        this.extraItems = (extraItemsResult.data ?? []).map(mapExtraItemFromRow)
        this.checkedKeys = Object.fromEntries(
          (checkoffsResult.data ?? []).map((row) => [row.item_key, row.is_checked]),
        )
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Could not load grocery list.'
        throw error
      } finally {
        this.isLoading = false
      }
    },
    isChecked(itemKey) {
      return Boolean(this.checkedKeys[itemKey])
    },
    async setChecked(itemKey, checked) {
      this.checkedKeys = { ...this.checkedKeys, [itemKey]: checked }
      if (!supabase) {
        this.localCheckedWeeks[this.weekStart] = this.checkedKeys
        return
      }

      const user = await requireSupabaseUser()

      {
        const { error } = await supabase
          .from('grocery_checkoffs')
          .upsert(
            { user_id: user.id, week_start: this.weekStart, item_key: itemKey, is_checked: checked },
            { onConflict: 'user_id,week_start,item_key' },
          )

        if (error) throw error
        return
      }

    },
    async addExtraItem(item) {
      const localItem = {
        id: `local-${Date.now()}`,
        name: item.name,
        quantity: item.quantity ?? 1,
        unit: item.unit ?? '',
        category: item.category ?? 'Other',
        isChecked: false,
      }

      if (!supabase) {
        this.extraItems = [...this.extraItems, localItem]
        return localItem
      }

      const user = await requireSupabaseUser()
      const { data, error } = await supabase
        .from('grocery_extra_items')
        .insert({
          user_id: user.id,
          week_start: this.weekStart,
          name: item.name,
          quantity: item.quantity ?? 1,
          unit: item.unit ?? '',
          category: item.category ?? 'Other',
        })
        .select()
        .single()

      if (error) throw error

      const savedItem = mapExtraItemFromRow(data)
      this.extraItems = [...this.extraItems, savedItem]
      return savedItem
    },
    async setExtraItemChecked(itemId, checked) {
      this.extraItems = this.extraItems.map((item) => (
        String(item.id) === String(itemId) ? { ...item, isChecked: checked } : item
      ))

      if (!supabase) return

      const { error } = await supabase
        .from('grocery_extra_items')
        .update({ is_checked: checked })
        .eq('id', itemId)

      if (error) throw error
    },
    async removeExtraItem(itemId) {
      this.extraItems = this.extraItems.filter((item) => String(item.id) !== String(itemId))

      if (!supabase) return

      const { error } = await supabase
        .from('grocery_extra_items')
        .delete()
        .eq('id', itemId)

      if (error) throw error
    },
  },
})

function mapExtraItemFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    quantity: Number(row.quantity ?? 1),
    unit: row.unit ?? '',
    category: row.category ?? 'Other',
    isChecked: Boolean(row.is_checked),
  }
}
