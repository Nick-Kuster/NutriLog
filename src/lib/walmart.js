export function walmartItemId(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || !['walmart.com', 'www.walmart.com'].includes(url.hostname)) return ''
    return url.pathname.match(/^\/ip\/(?:[^/]+\/)?(\d+)\/?$/)?.[1] ?? ''
  } catch {
    return ''
  }
}

export function walmartCartUrl(products) {
  const quantities = new Map()
  for (const { url, quantity } of products) {
    const id = walmartItemId(url)
    if (!id || !Number.isSafeInteger(Number(quantity)) || Number(quantity) < 1) return ''
    quantities.set(id, (quantities.get(id) ?? 0) + Number(quantity))
  }
  if (!quantities.size) return ''
  const url = new URL('https://www.walmart.com/sc/cart/addToCart')
  url.searchParams.set('items', [...quantities].map(([id, quantity]) => `${id}_${quantity}`).join(','))
  return url.toString()
}

export function walmartReviewRows(items, previous = []) {
  const byKey = new Map(previous.map((row) => [row.reviewKey, row]))
  return items.map((item) => {
    const existing = byKey.get(item.reviewKey)
    return {
      ...item,
      url: existing && existing.url !== (existing.walmartUrl || '') ? existing.url : item.walmartUrl || '',
      packages: existing?.packages ?? 1,
      selected: existing?.selected ?? true,
    }
  })
}

export function walmartReviewState(rows) {
  const selected = rows.filter((row) => row.selected)
  const missing = selected.filter((row) => !walmartItemId(row.url))
  const matched = selected.filter((row) => walmartItemId(row.url))
  const invalidCounts = matched.filter((row) => !Number.isSafeInteger(Number(row.packages)) || Number(row.packages) < 1)
  return {
    selected, missing, matched, invalidCounts,
    url: walmartCartUrl(matched.map((row) => ({ url: row.url, quantity: row.packages }))),
  }
}
