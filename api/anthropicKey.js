// Shared Anthropic key loading. Netlify often stores values with wrapping
// quotes, a Bearer prefix, or trailing newlines when pasted from the UI.

export function readAnthropicApiKey() {
  let key = String(process.env.ANTHROPIC_API_KEY || '')
  key = key.replace(/^\uFEFF/, '').trim()
  key = key.replace(/^[\s"'\u201C\u201D\u2018\u2019]+|[\s"'\u201C\u201D\u2018\u2019]+$/g, '')
  if (/^bearer\s+/i.test(key)) key = key.replace(/^bearer\s+/i, '').trim()
  return key.replace(/[\u200B-\u200D\uFEFF]/g, '')
}

export function anthropicKeyConfigError(key) {
  if (!key) {
    return 'ANTHROPIC_API_KEY is not configured on the server.'
  }
  if (key.length < 20) {
    return 'ANTHROPIC_API_KEY looks truncated. Paste the full key from console.anthropic.com into Netlify, with no quotes.'
  }
  return null
}

export function anthropicAuthError(status, detail) {
  if (status !== 401 && status !== 403) return detail
  return 'Anthropic rejected the Netlify ANTHROPIC_API_KEY value (invalid key). The variable name is correct — replace the value with a new key from console.anthropic.com (starts with sk-ant-, no quotes), then restart netlify dev.'
}
