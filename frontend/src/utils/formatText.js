import DOMPurify from 'dompurify'

/**
 * Format inline text: **bold**, *italic*, ~~spoiler~~, `code`
 */
const formatInlineText = (text, keyPrefix = '') => {
  if (!text) return [text]

  // Split by formatting patterns
  const parts = []
  let remaining = text

  // Process formatting patterns
  const patterns = [
    { regex: /\*\*(.+?)\*\*/g, className: 'fmt-bold', tag: 'strong' },
    { regex: /\*(.+?)\*/g, className: 'fmt-italic', tag: 'em' },
    { regex: /~~(.+?)~~/g, className: 'fmt-spoiler', tag: 'span' },
    { regex: /`(.+?)`/g, className: 'fmt-code', tag: 'code' },
  ]

  // Simple approach: process the whole text through regex replacement
  let result = remaining
  let elements = []
  let lastIndex = 0

  // Regex that matches all formatting patterns
  const combinedRegex = /(\*\*(.+?)\*\*|\*(.+?)\*|~~(.+?)~~|`(.+?)`)/g
  let match

  while ((match = combinedRegex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      elements.push(text.slice(lastIndex, match.index))
    }

    const fullMatch = match[0]
    if (fullMatch.startsWith('**')) {
      elements.push({ type: 'bold', content: match[2], key: `${keyPrefix}-b-${match.index}` })
    } else if (fullMatch.startsWith('~~')) {
      elements.push({ type: 'spoiler', content: match[4], key: `${keyPrefix}-s-${match.index}` })
    } else if (fullMatch.startsWith('`')) {
      elements.push({ type: 'code', content: match[5], key: `${keyPrefix}-c-${match.index}` })
    } else if (fullMatch.startsWith('*')) {
      elements.push({ type: 'italic', content: match[3], key: `${keyPrefix}-i-${match.index}` })
    }

    lastIndex = match.index + fullMatch.length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    elements.push(text.slice(lastIndex))
  }

  if (elements.length === 0) return [text]
  return elements
}

export default formatInlineText
