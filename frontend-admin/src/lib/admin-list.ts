export function normalizeSearchQuery(value: string): string {
  return value.trim().toLowerCase()
}

export function matchesSearchQuery(query: string, ...fields: Array<string | null | undefined>): boolean {
  const normalized = normalizeSearchQuery(query)
  if (!normalized) return true
  return fields.some((field) => (field ?? '').toLowerCase().includes(normalized))
}

export function sortByString<T>(
  items: T[],
  getValue: (item: T) => string,
  direction: 'asc' | 'desc' = 'asc',
): T[] {
  const factor = direction === 'asc' ? 1 : -1
  return [...items].sort(
    (left, right) => getValue(left).localeCompare(getValue(right), 'vi') * factor,
  )
}

export function sortByNumber<T>(
  items: T[],
  getValue: (item: T) => number,
  direction: 'asc' | 'desc' = 'desc',
): T[] {
  const factor = direction === 'asc' ? 1 : -1
  return [...items].sort((left, right) => (getValue(left) - getValue(right)) * factor)
}