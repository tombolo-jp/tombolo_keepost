export class SNSAccountValidator {
  constructor() {
    this.full_to_half_map = {
      'Ａ': 'A', 'Ｂ': 'B', 'Ｃ': 'C', 'Ｄ': 'D', 'Ｅ': 'E', 'Ｆ': 'F', 'Ｇ': 'G', 'Ｈ': 'H', 'Ｉ': 'I', 'Ｊ': 'J',
      'Ｋ': 'K', 'Ｌ': 'L', 'Ｍ': 'M', 'Ｎ': 'N', 'Ｏ': 'O', 'Ｐ': 'P', 'Ｑ': 'Q', 'Ｒ': 'R', 'Ｓ': 'S', 'Ｔ': 'T',
      'Ｕ': 'U', 'Ｖ': 'V', 'Ｗ': 'W', 'Ｘ': 'X', 'Ｙ': 'Y', 'Ｚ': 'Z',
      'ａ': 'a', 'ｂ': 'b', 'ｃ': 'c', 'ｄ': 'd', 'ｅ': 'e', 'ｆ': 'f', 'ｇ': 'g', 'ｈ': 'h', 'ｉ': 'i', 'ｊ': 'j',
      'ｋ': 'k', 'ｌ': 'l', 'ｍ': 'm', 'ｎ': 'n', 'ｏ': 'o', 'ｐ': 'p', 'ｑ': 'q', 'ｒ': 'r', 'ｓ': 's', 'ｔ': 't',
      'ｕ': 'u', 'ｖ': 'v', 'ｗ': 'w', 'ｘ': 'x', 'ｙ': 'y', 'ｚ': 'z',
      '０': '0', '１': '1', '２': '2', '３': '3', '４': '4', '５': '5', '６': '6', '７': '7', '８': '8', '９': '9',
      '＿': '_', '．': '.', '－': '-', '＠': '@'
    }
  }

  to_half_width(str) {
    return str.split('').map(char => this.full_to_half_map[char] || char).join('')
  }

  normalize_twitter(username) {
    if (!username) return ''
    
    let normalized = this.to_half_width(username)
    
    normalized = normalized.replace(/[^a-zA-Z0-9_]/g, '')
    
    normalized = normalized.substring(0, 15)
    
    return normalized
  }

  validate_twitter(username) {
    if (!username) {
      return { valid: false, error: 'ユーザー名を入力してください' }
    }
    
    const normalized = this.normalize_twitter(username)
    
    if (normalized.length === 0) {
      return { valid: false, error: '有効な文字を入力してください' }
    }
    
    if (normalized.length > 15) {
      return { valid: false, error: 'ユーザー名は15文字以内で入力してください' }
    }
    
    return { valid: true, normalized: normalized }
  }

  normalize_twilog(username) {
    return this.normalize_twitter(username)
  }

  validate_twilog(username) {
    return this.validate_twitter(username)
  }

  normalize_bluesky(account) {
    if (!account) return ''
    
    let normalized = this.to_half_width(account)
    
    normalized = normalized.replace(/[^a-zA-Z0-9.-]/g, '')
    
    return normalized
  }

  validate_bluesky(account) {
    if (!account) {
      return { valid: false, error: 'アカウント名を入力してください' }
    }
    
    const normalized = this.normalize_bluesky(account)
    
    if (normalized.length === 0) {
      return { valid: false, error: '有効な文字を入力してください' }
    }
    
    const dot_count = (normalized.match(/\./g) || []).length
    if (dot_count < 2) {
      return { valid: false, error: 'アカウント名はドメイン形式（例: username.bsky.social）で入力してください' }
    }
    
    const parts = normalized.split('.')
    if (parts.some(part => part.length === 0)) {
      return { valid: false, error: 'ドメインの各部分が空になっています' }
    }
    
    if (!/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+$/.test(normalized)) {
      return { valid: false, error: '正しいドメイン形式で入力してください' }
    }
    
    return { valid: true, normalized: normalized }
  }

  normalize_mastodon(account) {
    if (!account) return ''
    
    let normalized = this.to_half_width(account)
    
    const at_index = normalized.indexOf('@')
    
    if (at_index === -1) {
      normalized = normalized.replace(/[^a-zA-Z0-9.-@]/g, '')
      return normalized
    }
    
    const username_part = normalized.substring(0, at_index)
    const domain_part = normalized.substring(at_index + 1)
    
    const cleaned_username = username_part.replace(/[^a-zA-Z0-9.-]/g, '')
    const cleaned_domain = domain_part.replace(/[^a-zA-Z0-9.-]/g, '')
    
    if (cleaned_domain) {
      return `${cleaned_username}@${cleaned_domain}`
    } else {
      return `${cleaned_username}@`
    }
  }

  validate_mastodon(account) {
    if (!account) {
      return { valid: false, error: 'アカウント名を入力してください' }
    }
    
    const normalized = this.normalize_mastodon(account)
    
    if (normalized.length === 0) {
      return { valid: false, error: '有効な文字を入力してください' }
    }
    
    if (!normalized.includes('@')) {
      return { valid: false, error: 'アカウント名@インスタンス名の形式で入力してください' }
    }
    
    const parts = normalized.split('@')
    if (parts.length !== 2) {
      return { valid: false, error: '@は1つだけ含めてください' }
    }
    
    const [username, domain] = parts
    
    if (username.length === 0) {
      return { valid: false, error: 'アカウント名が入力されていません' }
    }
    
    if (domain.length === 0) {
      return { valid: false, error: 'インスタンス名が入力されていません' }
    }
    
    if (!/^[a-zA-Z0-9.-]+$/.test(username)) {
      return { valid: false, error: 'アカウント名に無効な文字が含まれています' }
    }
    
    if (!/^[a-zA-Z0-9.-]+$/.test(domain)) {
      return { valid: false, error: 'インスタンス名に無効な文字が含まれています' }
    }
    
    if (!domain.includes('.')) {
      return { valid: false, error: 'インスタンス名はドメイン形式で入力してください' }
    }
    
    return { valid: true, normalized: normalized }
  }

  normalize(sns_type, account) {
    switch (sns_type) {
      case 'twitter':
        return this.normalize_twitter(account)
      case 'twilog':
        return this.normalize_twilog(account)
      case 'bluesky':
        return this.normalize_bluesky(account)
      case 'mastodon':
        return this.normalize_mastodon(account)
      default:
        return account
    }
  }

  validate(sns_type, account) {
    switch (sns_type) {
      case 'twitter':
        return this.validate_twitter(account)
      case 'twilog':
        return this.validate_twilog(account)
      case 'bluesky':
        return this.validate_bluesky(account)
      case 'mastodon':
        return this.validate_mastodon(account)
      default:
        return { valid: true, normalized: account }
    }
  }
}

export const sns_account_validator = new SNSAccountValidator()