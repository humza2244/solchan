// HTML sanitization utilities for XSS prevention

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - The string to escape
 * @returns {string} - The escaped string
 */
export const escapeHtml = (str) => {
  if (!str || typeof str !== 'string') return str
  
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/**
 * Sanitize user input - trims and escapes HTML
 * @param {string} str - The string to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string|null} - The sanitized string or null
 */
export const sanitizeInput = (str, maxLength = 5000) => {
  if (!str || typeof str !== 'string') return null
  
  const trimmed = str.trim()
  if (trimmed.length === 0) return null
  if (trimmed.length > maxLength) return trimmed.substring(0, maxLength)
  
  return trimmed
}

/**
 * Sanitize a display name / author field
 * @param {string} name - The name to sanitize
 * @returns {string} - The sanitized name, defaults to 'Anonymous'
 */
export const sanitizeAuthor = (name) => {
  if (!name || typeof name !== 'string') return 'Anonymous'
  
  const trimmed = name.trim()
  if (trimmed.length === 0) return 'Anonymous'
  if (trimmed.length > 50) return trimmed.substring(0, 50)
  
  return escapeHtml(trimmed)
}

export default {
  escapeHtml,
  sanitizeInput,
  sanitizeAuthor,
}
