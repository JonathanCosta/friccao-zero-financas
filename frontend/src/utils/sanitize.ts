export function sanitizeLabel(text: string): string {
  if (!text) return ''
  return text.replace(/<[^>]*>/g, '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c] || c))
}
