/**
 * Read every page using a stable unique key. An API may enforce a smaller row
 * limit than requested, so only an empty page proves that traversal is complete.
 * Failed or non-advancing pages must never become a successful partial snapshot.
 */
export async function readKeysetPages<T>(
  readPage: (after: string | undefined) => Promise<T[]>,
  keyOf: (row: T) => string,
): Promise<T[]> {
  const rows: T[] = []
  const cursors = new Set<string>()
  let after: string | undefined
  for (;;) {
    const page = await readPage(after)
    if (page.length === 0) return rows
    const next = keyOf(page[page.length - 1]!)
    if (!next || cursors.has(next)) throw new Error("Inventory pagination did not advance.")
    cursors.add(next)
    rows.push(...page)
    after = next
  }
}

/** Bounds each database response; this is a page size, never an inventory cap. */
export const inventoryPageSize = 250
