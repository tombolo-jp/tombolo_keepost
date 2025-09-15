import { db } from '../db/database.js'
import { migration_progress } from '../stores/migration_store.js'
import { memory_monitor } from '../utils/memory_monitor.js'

export class MigrationService {
  constructor() {
    this.is_migrating = false
    this.start_time = null
    this.processed_items = 0
    this.total_items = 0
  }
  
  /**
   * マイグレーションが必要かチェック
   */
  async check_migration_needed() {
    const stored_version = localStorage.getItem('db_version')
    const current_version = await db.verno
    return stored_version && parseInt(stored_version) < current_version
  }
  
  /**
   * マイグレーション進捗の監視を開始
   */
  async monitor_migration() {
    this.is_migrating = true
    this.start_time = Date.now()
    
    // Dexie.jsのマイグレーションフックを設定
    db.on('ready', () => {
      this.on_migration_complete()
    })
    
    // 進捗更新の定期的な取得
    this.progress_interval = setInterval(() => {
      this.update_progress()
    }, 500)
  }
  
  /**
   * 進捗状態の更新
   */
  async update_progress() {
    const elapsed = Date.now() - this.start_time
    const percentage = this.calculate_percentage()
    const estimated_time = this.calculate_estimated_time(elapsed, percentage)
    
    migration_progress.update({
      percentage,
      current_step: this.get_current_step(),
      estimated_time,
      processed_count: this.processed_items,
      total_count: this.total_items
    })
    
    // メモリ使用量の監視
    const memory_usage = await memory_monitor.get_usage()
    if (memory_usage > 0.8) {
      console.warn('High memory usage during migration:', memory_usage)
    }
  }
  
  /**
   * マイグレーション完了処理
   */
  on_migration_complete() {
    clearInterval(this.progress_interval)
    this.is_migrating = false
    localStorage.setItem('db_version', db.verno.toString())
    
    migration_progress.update({
      percentage: 100,
      current_step: '完了しました',
      estimated_time: '',
      processed_count: this.total_items,
      total_count: this.total_items
    })
  }
  
  /**
   * エラー処理
   */
  on_migration_error(error) {
    clearInterval(this.progress_interval)
    this.is_migrating = false
    
    console.error('Migration failed:', error)
    
    migration_progress.update({
      percentage: 0,
      current_step: 'エラーが発生しました',
      error: error.message
    })
  }
  
  /**
   * 進捗率の計算
   */
  calculate_percentage() {
    if (this.total_items === 0) return 0
    return Math.min(100, (this.processed_items / this.total_items) * 100)
  }
  
  /**
   * 推定残り時間の計算
   */
  calculate_estimated_time(elapsed, percentage) {
    if (percentage === 0) return ''
    
    const total_time = elapsed / (percentage / 100)
    const remaining = total_time - elapsed
    
    if (remaining < 1000) return '1秒未満'
    if (remaining < 60000) return `${Math.ceil(remaining / 1000)}秒`
    if (remaining < 3600000) return `${Math.ceil(remaining / 60000)}分`
    return `${Math.ceil(remaining / 3600000)}時間`
  }
  
  /**
   * 現在の処理ステップを取得
   */
  get_current_step() {
    // Dexie.jsのマイグレーション状態に基づいて返す
    if (this.processed_items < this.total_items * 0.3) {
      return 'データベーススキーマを更新中...'
    } else if (this.processed_items < this.total_items * 0.7) {
      return 'データを変換中...'
    } else if (this.processed_items < this.total_items * 0.9) {
      return 'インデックスを再構築中...'
    } else {
      return '最終処理中...'
    }
  }
}

export const migration_service = new MigrationService()