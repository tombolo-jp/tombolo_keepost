/**
 * セキュリティバリデーター
 * ファイルの検証とセキュリティチェックを行う
 */
export class SecurityValidator {
  constructor() {
    // ファイルサイズ制限
    this.MAX_JS_SIZE = 500 * 1024 * 1024        // 500MB
    this.MAX_CAR_SIZE = 1024 * 1024 * 1024      // 1GB (Bluesky)
    this.MAX_JSON_SIZE = 500 * 1024 * 1024      // 500MB (Mastodon)
    
    // ツイート数制限
    this.MAX_TWEETS = 200000  // 20万ツイート
    
    // 許可されるファイル拡張子
    this.ALLOWED_EXTENSIONS = ['.js', '.car', '.json']
    
    // ファイル種別ごとのエラーメッセージ
    this.FILE_TYPE_MESSAGES = {
      '.js': 'tweets.jsファイルを選択してください',
      '.car': 'Blueskyのエクスポートファイル(.car)を選択してください',
      '.json': 'Mastodonのエクスポートファイル(outbox.json)を選択してください'
    }
  }

  /**
   * ファイルの妥当性を検証
   * @param {File} file - 検証対象ファイル
   * @returns {ValidationResult} 検証結果
   */
  validate_file(file) {
    try {
      // ファイル名と拡張子のチェック
      const extension_result = this.validate_file_extension(file)
      if (!extension_result.valid) {
        return extension_result
      }

      // ファイルサイズのチェック
      const size_result = this.validate_file_size(file)
      if (!size_result.valid) {
        return size_result
      }

      // ファイル名の安全性チェック
      const name_result = this.validate_file_name(file)
      if (!name_result.valid) {
        return name_result
      }

      return {
        valid: true,
        message: 'ファイルの検証に成功しました'
      }
    } catch (error) {
      return {
        valid: false,
        message: `検証エラー: ${error.message}`
      }
    }
  }

  /**
   * ファイル拡張子を検証
   * @param {File} file - 検証対象ファイル
   * @returns {ValidationResult} 検証結果
   */
  validate_file_extension(file) {
    const file_name = file.name.toLowerCase()
    const has_valid_extension = this.ALLOWED_EXTENSIONS.some(ext => 
      file_name.endsWith(ext)
    )

    if (!has_valid_extension) {
      const allowed_types = this.ALLOWED_EXTENSIONS.map(ext => 
        this.FILE_TYPE_MESSAGES[ext] || ext
      ).join('、または')
      
      return {
        valid: false,
        message: `対応していないファイル形式です。${allowed_types}。`
      }
    }

    // SNS別の追加検証
    if (file_name.endsWith('.js')) {
      // Twitterエクスポートファイルかチェック
      if (!file_name.includes('tweet')) {
        return {
          valid: false,
          message: `選択されたファイルはTwitterエクスポートデータではない可能性があります。`
        }
      }
    } else if (file_name.endsWith('.json')) {
      // Mastodonファイルかチェック（outbox.jsonを期待）
      if (!file_name.includes('outbox')) {
        return {
          valid: false,
          message: `Mastodonのエクスポートファイルはoutbox.jsonである必要があります。`
        }
      }
    }
    // .carファイルの場合は特別な検証は不要（Blueskyは.car形式のみ）

    return { valid: true }
  }

  /**
   * ファイルサイズを検証
   * @param {File} file - 検証対象ファイル
   * @returns {ValidationResult} 検証結果
   */
  validate_file_size(file) {
    const file_name = file.name.toLowerCase()
    let max_size = 0
    let file_type = ''

    if (file_name.endsWith('.js')) {
      max_size = this.MAX_JS_SIZE
      file_type = 'JavaScript'
    } else if (file_name.endsWith('.car')) {
      max_size = this.MAX_CAR_SIZE
      file_type = 'CAR'
    } else if (file_name.endsWith('.json')) {
      max_size = this.MAX_JSON_SIZE
      file_type = 'JSON'
    }

    if (max_size > 0 && file.size > max_size) {
      const size_mb = (max_size / 1024 / 1024).toFixed(0)
      return {
        valid: false,
        message: `${file_type}ファイルサイズが制限（${size_mb}MB）を超えています。`
      }
    }

    return { valid: true }
  }

  /**
   * ファイル名の安全性を検証
   * @param {File} file - 検証対象ファイル
   * @returns {ValidationResult} 検証結果
   */
  validate_file_name(file) {
    const dangerous_patterns = [
      /\.\./,          // ディレクトリトラバーサル
      /[<>:"|?*]/,     // 危険な文字
      /[\x00-\x1f]/    // 制御文字
    ]

    for (const pattern of dangerous_patterns) {
      if (pattern.test(file.name)) {
        return {
          valid: false,
          message: 'ファイル名に使用できない文字が含まれています。'
        }
      }
    }

    return { valid: true }
  }

  /**
   * メモリ使用量チェック（ファイルサイズベース）
   * @param {number} estimated_size - 推定ファイルサイズ（バイト）
   * @returns {ValidationResult} 検証結果
   */
  validate_memory_availability(estimated_size) {
    if ('memory' in performance) {
      const memory = performance.memory
      const available_memory = memory.jsHeapSizeLimit - memory.usedJSHeapSize
      
      // 処理に必要なメモリの2倍の余裕を確保
      const required_memory = estimated_size * 2
      
      if (available_memory < required_memory) {
        const required_mb = Math.round(required_memory / 1024 / 1024)
        const available_mb = Math.round(available_memory / 1024 / 1024)
        return {
          valid: false,
          message: `メモリ不足: 処理には約${required_mb}MBが必要ですが、利用可能なメモリは${available_mb}MBです。`
        }
      }
    }
    
    return { valid: true }
  }

  /**
   * ツイート数の妥当性を検証
   * @param {number} tweet_count - ツイート数
   * @returns {ValidationResult} 検証結果
   */
  validate_tweet_count(tweet_count) {
    if (tweet_count > this.MAX_TWEETS) {
      return {
        valid: false,
        message: `ツイート数が上限（${this.MAX_TWEETS.toLocaleString()}件）を超えています。`
      }
    }
    
    return { valid: true }
  }

  /**
   * コンテンツをサニタイズ（XSS対策）
   * @param {string} content - サニタイズ対象の文字列
   * @returns {string} サニタイズ済み文字列
   */
  sanitize_content(content) {
    if (typeof content !== 'string') {
      return ''
    }

    return content
      // スクリプトタグを除去
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      // javascriptスキームを除去
      .replace(/javascript:/gi, '')
      // イベントハンドラ属性を除去
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      // 危険なHTML要素を除去
      .replace(/<(iframe|object|embed|link|meta)[^>]*>/gi, '')
  }

  /**
   * JSONコンテンツの安全性を検証
   * @param {string} json_string - JSON文字列
   * @returns {ValidationResult} 検証結果
   */
  validate_json_content(json_string) {
    try {
      // JavaScriptコードが含まれていないかチェック
      if (json_string.includes('<script') || json_string.includes('javascript:')) {
        return {
          valid: false,
          message: '不正なスクリプトが含まれている可能性があります。'
        }
      }

      // 基本的なJSON構造の検証
      JSON.parse(json_string)
      
      return { valid: true }
    } catch (error) {
      return {
        valid: false,
        message: 'JSONデータの解析に失敗しました。'
      }
    }
  }

  /**
   * エラー情報からユーザー向けメッセージを生成
   * @param {Error} error - エラーオブジェクト
   * @returns {string} ユーザー向けメッセージ
   */
  get_user_friendly_error_message(error) {
    const error_messages = {
      'Failed to fetch': 'ファイルの読み込みに失敗しました。',
      'out of memory': 'メモリ不足が発生しました。より小さいファイルで試してください。',
      'Invalid ZIP': 'Zipファイルが破損している可能性があります。',
      'Permission denied': 'ファイルへのアクセス権限がありません。'
    }

    // エラーメッセージから該当するものを探す
    for (const [key, message] of Object.entries(error_messages)) {
      if (error.message.toLowerCase().includes(key.toLowerCase())) {
        return message
      }
    }

    // デフォルトメッセージ
    return '予期しないエラーが発生しました。'
  }

  /**
   * ファイル処理の進捗状況を検証
   * @param {number} processed - 処理済み件数
   * @param {number} total - 総件数
   * @returns {ValidationResult} 検証結果
   */
  validate_progress(processed, total) {
    if (processed < 0 || total < 0) {
      return {
        valid: false,
        message: '進捗情報が不正です。'
      }
    }

    if (processed > total) {
      return {
        valid: false,
        message: '処理済み件数が総件数を超えています。'
      }
    }

    return { valid: true }
  }
}

// シングルトンインスタンスをエクスポート
export const security_validator = new SecurityValidator()