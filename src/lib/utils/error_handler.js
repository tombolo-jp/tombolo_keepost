/**
 * エラーハンドリングユーティリティ
 * 統一的なエラー処理を提供
 */

/**
 * エラー型定義
 */
export const ErrorType = {
  FILE_READ_ERROR: 'FILE_READ_ERROR',
  ZIP_EXTRACT_ERROR: 'ZIP_EXTRACT_ERROR',
  DATA_PARSE_ERROR: 'DATA_PARSE_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  MEMORY_ERROR: 'MEMORY_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
}

/**
 * KeePostエラークラス
 */
export class KeePostError extends Error {
  constructor(type, message, details = null) {
    super(message)
    this.name = 'KeePostError'
    this.type = type
    this.details = details
    this.timestamp = new Date().toISOString()
  }
}

/**
 * エラーハンドラー
 */
export class ErrorHandler {
  constructor() {
    this.error_listeners = []
    this.setup_global_handlers()
  }

  /**
   * グローバルエラーハンドラーをセットアップ
   */
  setup_global_handlers() {
    // 未処理のエラーをキャッチ
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.handle_error(new KeePostError(
          ErrorType.UNKNOWN_ERROR,
          event.message,
          {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        ))
      })

      // Promise拒否をキャッチ
      window.addEventListener('unhandledrejection', (event) => {
        this.handle_error(new KeePostError(
          ErrorType.UNKNOWN_ERROR,
          event.reason?.message || 'Promise rejected',
          { reason: event.reason }
        ))
      })
    }
  }

  /**
   * エラーリスナーを追加
   * @param {Function} listener - エラーリスナー
   * @returns {Function} 登録解除関数
   */
  add_listener(listener) {
    this.error_listeners.push(listener)
    return () => {
      this.error_listeners = this.error_listeners.filter(l => l !== listener)
    }
  }

  /**
   * エラーを処理
   * @param {Error} error - エラーオブジェクト
   */
  handle_error(error) {
    // KeePostErrorでない場合は変換
    if (!(error instanceof KeePostError)) {
      error = this.convert_to_keepost_error(error)
    }

    // コンソールに出力

    // リスナーに通知
    this.error_listeners.forEach(listener => {
      try {
        listener(error)
      } catch (e) {

      }
    })

    // ユーザー向けメッセージを返す
    return this.get_user_message(error)
  }

  /**
   * 通常のエラーをKeePostErrorに変換
   * @param {Error} error - エラーオブジェクト
   * @returns {KeePostError} KeePostError
   */
  convert_to_keepost_error(error) {
    const type = this.detect_error_type(error)
    const message = error.message || 'エラーが発生しました'

    return new KeePostError(type, message, {
      original_error: error,
      stack: error.stack
    })
  }

  /**
   * エラータイプを検出
   * @param {Error} error - エラーオブジェクト
   * @returns {string} エラータイプ
   */
  detect_error_type(error) {
    const message = error.message?.toLowerCase() || ''

    if (message.includes('file') || message.includes('read')) {
      return ErrorType.FILE_READ_ERROR
    }
    if (message.includes('zip') || message.includes('extract')) {
      return ErrorType.ZIP_EXTRACT_ERROR
    }
    if (message.includes('parse') || message.includes('json')) {
      return ErrorType.DATA_PARSE_ERROR
    }
    if (message.includes('valid')) {
      return ErrorType.VALIDATION_ERROR
    }
    if (message.includes('storage') || message.includes('indexeddb')) {
      return ErrorType.STORAGE_ERROR
    }
    if (message.includes('network') || message.includes('fetch')) {
      return ErrorType.NETWORK_ERROR
    }
    if (message.includes('memory') || message.includes('out of memory')) {
      return ErrorType.MEMORY_ERROR
    }

    return ErrorType.UNKNOWN_ERROR
  }

  /**
   * ユーザー向けメッセージを取得
   * @param {KeePostError} error - KeePostError
   * @returns {string} ユーザー向けメッセージ
   */
  get_user_message(error) {
    const messages = {
      [ErrorType.FILE_READ_ERROR]: 'ファイルの読み込みに失敗しました。ファイルが破損していないか確認してください。',
      [ErrorType.ZIP_EXTRACT_ERROR]: 'Zipファイルの展開に失敗しました。正しいTwitterエクスポートファイルか確認してください。',
      [ErrorType.DATA_PARSE_ERROR]: 'データの解析に失敗しました。ファイル形式が正しいか確認してください。',
      [ErrorType.VALIDATION_ERROR]: error.message, // バリデーションエラーはそのまま表示
      [ErrorType.STORAGE_ERROR]: 'データの保存に失敗しました。ブラウザのストレージ容量を確認してください。',
      [ErrorType.NETWORK_ERROR]: 'ネットワークエラーが発生しました。インターネット接続を確認してください。',
      [ErrorType.MEMORY_ERROR]: 'メモリ不足が発生しました。他のタブやアプリケーションを閉じてから再試行してください。',
      [ErrorType.UNKNOWN_ERROR]: '予期しないエラーが発生しました。しばらく待ってから再試行してください。'
    }

    return messages[error.type] || messages[ErrorType.UNKNOWN_ERROR]
  }

  /**
   * エラーレポートを生成
   * @param {KeePostError} error - KeePostError
   * @returns {Object} エラーレポート
   */
  generate_error_report(error) {
    return {
      timestamp: error.timestamp,
      type: error.type,
      message: error.message,
      user_message: this.get_user_message(error),
      details: error.details,
      browser: this.get_browser_info(),
      memory: this.get_memory_info()
    }
  }

  /**
   * ブラウザ情報を取得
   * @returns {Object} ブラウザ情報
   */
  get_browser_info() {
    if (typeof navigator === 'undefined') return {}

    return {
      user_agent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language
    }
  }

  /**
   * メモリ情報を取得
   * @returns {Object} メモリ情報
   */
  get_memory_info() {
    if (typeof performance === 'undefined' || !('memory' in performance)) {
      return {}
    }

    const memory = performance.memory
    return {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + ' MB',
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + ' MB',
      limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
    }
  }

  /**
   * エラーをリトライ可能か判定
   * @param {KeePostError} error - KeePostError
   * @returns {boolean} リトライ可能な場合true
   */
  is_retryable(error) {
    const retryable_types = [
      ErrorType.NETWORK_ERROR,
      ErrorType.STORAGE_ERROR
    ]

    return retryable_types.includes(error.type)
  }
}

// シングルトンインスタンスをエクスポート
export const error_handler = new ErrorHandler()
