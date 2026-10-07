/**
 * Makes user input safe to embed in a PostgREST `.or()` filter string such as
 * `name.ilike.%${value}%,tag.ilike.%${value}%`.
 *
 * Commas, parentheses, quotes and backslashes are PostgREST filter syntax:
 * left in, input like `x%,cost_price.gt.500` adds conditions of its own
 * (probing hidden columns, or matching rows the query never meant to). They
 * carry no meaning in a product search or a color name, so they're removed.
 */
export function sanitizeFilterValue(value, maxLength = 100) {
  return String(value ?? "")
    .replace(/[,()"\\]/g, " ")
    .trim()
    .slice(0, maxLength);
}
