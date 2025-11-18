// Validation utilities

export const validateThread = (data) => {
  const errors = []

  if (!data.content || data.content.trim().length === 0) {
    errors.push('Content is required')
  }

  if (data.content && data.content.length > 10000) {
    errors.push('Content must be less than 10000 characters')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export const validateReply = (data) => {
  const errors = []

  if (!data.content || data.content.trim().length === 0) {
    errors.push('Content is required')
  }

  if (data.content && data.content.length > 10000) {
    errors.push('Content must be less than 10000 characters')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

