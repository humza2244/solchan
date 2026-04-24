/**
 * Auto-moderator middleware for CoinTalk
 * Detects and blocks common crypto scam patterns
 */

const SCAM_PATTERNS = [
  // Wallet/airdrop scams
  /send\s+(sol|eth|btc|usdt|usdc)\s+to/i,
  /free\s+airdrop/i,
  /claim\s+your\s+(free|bonus)/i,
  /connect\s+wallet\s+to\s+claim/i,
  /guaranteed\s+(profit|return|gains)/i,
  /double\s+your\s+(crypto|sol|eth|btc)/i,
  
  // Phishing
  /verify\s+your\s+wallet/i,
  /wallet\s+validation\s+required/i,
  /enter\s+your\s+(seed|private\s+key|mnemonic)/i,
  
  // Pump schemes
  /100x\s+guaranteed/i,
  /can't\s+lose\s+money/i,
  /insider\s+(info|tip|knowledge)/i,
]

// Known scam domain patterns
const SCAM_DOMAINS = [
  'solana-airdrop', 'free-crypto', 'claim-rewards',
  'wallet-verify', 'dexscreener-promo', 'raydium-bonus',
]

export const autoModerator = (req, res, next) => {
  const content = req.body.content || ''
  const subject = req.body.subject || ''
  const text = `${subject} ${content}`.toLowerCase()
  
  // Check scam patterns
  for (const pattern of SCAM_PATTERNS) {
    if (pattern.test(text)) {
      console.warn(`[AutoMod] Blocked scam post from ${req.ip}: matched "${pattern}"`)
      return res.status(403).json({ 
        error: 'Your post was blocked by auto-moderation. It contains content that matches known scam patterns.' 
      })
    }
  }
  
  // Check scam domains
  for (const domain of SCAM_DOMAINS) {
    if (text.includes(domain)) {
      console.warn(`[AutoMod] Blocked scam domain from ${req.ip}: "${domain}"`)
      return res.status(403).json({ 
        error: 'Your post was blocked. It contains a link to a known scam domain.' 
      })
    }
  }
  
  next()
}

export default autoModerator
