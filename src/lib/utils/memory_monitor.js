/**
 * メモリ監視機能
 * 大量データ処理時のメモリ使用量を監視し、適切な警告を行う
 */
export class MemoryMonitor {
  constructor() {
    this.threshold_warning = 0.8  // 警告閾値: 80%
    this.threshold_critical = 0.9 // 危険閾値: 90%
  }

  /**
   * 現在のメモリ使用状況を取得
   * @returns {MemoryInfo} メモリ情報
   */
  check_memory_usage() {
    if ('memory' in performance) {
      const memory = performance.memory
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024), // MB
        usage_rate: memory.usedJSHeapSize / memory.jsHeapSizeLimit
      }
    }
    // メモリ情報が取得できない場合のデフォルト値
    return { used: 0, total: 0, limit: 0, usage_rate: 0 }
  }

  /**
   * メモリ使用率が警告レベルを超えているかチェック
   * @returns {boolean} 警告レベルを超えている場合true
   */
  is_memory_pressure() {
    const memory = this.check_memory_usage()
    return memory.usage_rate > this.threshold_warning
  }

  /**
   * メモリ使用率が危険レベルを超えているかチェック
   * @returns {boolean} 危険レベルを超えている場合true
   */
  is_memory_critical() {
    const memory = this.check_memory_usage()
    return memory.usage_rate > this.threshold_critical
  }

  /**
   * メモリ使用状況のレポートを生成
   * @returns {MemoryReport} メモリレポート
   */
  get_memory_report() {
    const memory = this.check_memory_usage()
    const status = this.get_memory_status(memory.usage_rate)
    
    return {
      ...memory,
      status: status,
      message: this.get_status_message(status, memory)
    }
  }

  /**
   * メモリ使用率に基づいてステータスを判定
   * @param {number} usage_rate - メモリ使用率
   * @returns {string} ステータス（'normal', 'warning', 'critical'）
   */
  get_memory_status(usage_rate) {
    if (usage_rate > this.threshold_critical) {
      return 'critical'
    } else if (usage_rate > this.threshold_warning) {
      return 'warning'
    }
    return 'normal'
  }

  /**
   * ステータスに応じたメッセージを生成
   * @param {string} status - メモリステータス
   * @param {MemoryInfo} memory - メモリ情報
   * @returns {string} ステータスメッセージ
   */
  get_status_message(status, memory) {
    const percentage = Math.round(memory.usage_rate * 100)
    
    switch (status) {
      case 'critical':
        return `危険: メモリ使用率が${percentage}%に達しています。処理を中断することを推奨します。`
      case 'warning':
        return `警告: メモリ使用率が${percentage}%です。大量データの処理にご注意ください。`
      default:
        return `正常: メモリ使用率は${percentage}%です。`
    }
  }

  /**
   * ガベージコレクションを促す（可能な場合）
   * @returns {Promise<void>}
   */
  async force_garbage_collection() {
    // Chrome の --expose-gc フラグが有効な場合のみ動作
    if (typeof global !== 'undefined' && global.gc) {
      global.gc()

    }
    
    // GCを促進するための待機
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  /**
   * 推定ファイルサイズに対してメモリが十分かチェック
   * @param {number} estimated_size - 推定ファイルサイズ（バイト）
   * @returns {boolean} 処理可能な場合true
   */
  check_memory_availability(estimated_size) {
    if ('memory' in performance) {
      const memory = performance.memory
      const available_memory = memory.jsHeapSizeLimit - memory.usedJSHeapSize
      
      // 処理に必要なメモリの2倍の余裕を確保
      const required_memory = estimated_size * 2
      
      if (available_memory < required_memory) {

        return false
      }
      
      return true
    }
    
    // メモリ情報が取得できない場合は警告のみ

    return true
  }

  /**
   * 定期的なメモリ監視を開始
   * @param {Function} callback - メモリ状態変化時のコールバック
   * @param {number} interval - 監視間隔（ミリ秒）
   * @returns {Function} 監視停止関数
   */
  start_monitoring(callback, interval = 5000) {
    let last_status = 'normal'
    
    const monitor_id = setInterval(() => {
      const report = this.get_memory_report()
      
      // ステータスが変化した場合のみコールバックを呼ぶ
      if (report.status !== last_status) {
        last_status = report.status
        callback(report)
      }
    }, interval)
    
    // 監視停止関数を返す
    return () => clearInterval(monitor_id)
  }
}

// シングルトンインスタンスをエクスポート
export const memory_monitor = new MemoryMonitor()