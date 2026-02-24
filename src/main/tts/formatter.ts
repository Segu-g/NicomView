export function formatTtsText(
  template: string,
  data: Record<string, unknown>
): string | null {
  const result = template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = data[key]
    return value != null ? String(value) : ''
  })

  // All placeholders resolved to empty → treat as nothing to say
  if (!result.trim()) return null

  return result
}
