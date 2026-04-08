// hCaptcha server-side verification middleware
// Uses hCaptcha (free, privacy-focused alternative to reCAPTCHA)

const HCAPTCHA_SECRET = process.env.HCAPTCHA_SECRET || '0x0000000000000000000000000000000000000000'
const HCAPTCHA_VERIFY_URL = 'https://hcaptcha.com/siteverify'

// In development, if no secret is configured, skip verification
const isDev = process.env.NODE_ENV !== 'production' && HCAPTCHA_SECRET === '0x0000000000000000000000000000000000000000'

/**
 * Middleware to verify hCaptcha token.
 * Expects `captchaToken` in the request body.
 * In dev mode without a configured secret, captcha is skipped.
 */
export const verifyCaptcha = async (req, res, next) => {
  // Skip in development if no real secret configured
  if (isDev) {
    return next()
  }

  const { captchaToken } = req.body

  if (!captchaToken) {
    return res.status(400).json({ error: 'Captcha verification required' })
  }

  try {
    const params = new URLSearchParams()
    params.append('secret', HCAPTCHA_SECRET)
    params.append('response', captchaToken)

    const response = await fetch(HCAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    })

    const data = await response.json()

    if (data.success) {
      return next()
    } else {
      console.error('hCaptcha verification failed:', data)
      return res.status(400).json({ error: 'Captcha verification failed. Please try again.' })
    }
  } catch (error) {
    console.error('hCaptcha verification error:', error.message)
    // In case of network error, allow through (fail-open for UX)
    return next()
  }
}

export default verifyCaptcha
