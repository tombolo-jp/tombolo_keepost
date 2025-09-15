import { post_repository } from '../repositories/post_repository.js'
import { keep_repository } from '../repositories/keep_repository.js'
import { import_service } from './import_service.js'
import { memory_monitor } from '../utils/memory_monitor.js'

/**
 * ストレージサービス
 * マルチSNS対応の統一データ管理
 */
export class StorageService {
  constructor() {
    this.BATCH_SIZE = 500  // バッチ保存サイズ
  }

  /**
   * ポストを保存（バッチ処理対応）
   * @param {Array<Post>} posts - ポストの配列
   * @param {string} sns_type - SNS種別
   * @param {Function} progress_callback - 進捗コールバック
   * @returns {Promise<void>}
   */
  async save_posts(posts, sns_type, progress_callback = null) {
    try {
      if (!posts || posts.length === 0) {
        throw new Error('保存するポストがありません')
      }

      // データベースを初期化
      await post_repository.ensure_initialized()

      // バッチ処理で保存
      const total = posts.length
      let processed = 0
      
      for (let i = 0; i < total; i += this.BATCH_SIZE) {
        const batch = posts.slice(i, i + this.BATCH_SIZE)
        await post_repository.save_posts(batch, sns_type)
        
        processed += batch.length
        
        if (progress_callback) {
          const progress = Math.round((processed / total) * 100)
          progress_callback({
            step: 'saving',
            progress: progress,
            message: `保存中... ${processed.toLocaleString()} / ${total.toLocaleString()} 件`,
            processed: processed,
            total: total
          })
        }
        
        // UI応答性を保つ
        await new Promise(resolve => setTimeout(resolve, 50))
        
        // メモリチェック
        if (processed % 5000 === 0) {
          await memory_monitor.check_memory_usage()
        }
      }

      // 保存完了
      if (progress_callback) {
        progress_callback({
          step: 'completed',
          progress: 100,
          message: `すべての${sns_type}ポストを保存しました`
        })
      }

    } catch (error) {

      throw new Error(`ポストの保存に失敗しました: ${error.message}`)
    }
  }

  /**
   * インポートから保存までの一連の処理
   * @param {string} sns_type - SNS種別
   * @param {File} file - インポートファイル
   * @param {Function} progress_callback - 進捗コールバック
   * @param {string} twilog_username - Twilogインポート時のユーザー名
   * @returns {Promise<ImportResult>} インポート結果
   */
  async import_and_save(sns_type, file, progress_callback = null, twilog_username = null, twitter_username = null, mastodon_account = null, bluesky_account = null) {
    try {
      // マルチSNSインポート
      const options = { progress_callback }
      if (twilog_username) {
        options.twilog_username = twilog_username
      }
      if (twitter_username) {
        options.twitter_username = twitter_username
      }
      if (mastodon_account) {
        options.mastodon_account = mastodon_account
      }
      if (bluesky_account) {
        options.bluesky_account = bluesky_account
      }
      const import_result = await import_service.import_sns_data(sns_type, file, options)

      if (!import_result.success) {
        throw new Error(import_result.message || 'インポートに失敗しました')
      }

      // ポストを保存（新規ポストがある場合のみ）
      if (import_result.posts && import_result.posts.length > 0) {
        await this.save_posts(import_result.posts, sns_type, progress_callback)
      } else {
        // 全件重複の場合は保存をスキップ

        if (progress_callback) {
          progress_callback({
            step: 'completed',
            progress: 100,
            message: `既存のポストとの重複のため新規保存はありませんでした`
          })
        }
      }

      // ストレージ情報を取得
      const storage_info = await this.get_storage_info()

      // インポート履歴を保存
      await this.save_import_history({
        sns_type: sns_type,
        file_name: file.name,
        post_count: import_result.post_count,
        file_size: file.size,
        success: true
      })

      return {
        ...import_result,
        storage_info: storage_info
      }

    } catch (error) {

      // 失敗履歴も保存
      await this.save_import_history({
        sns_type: sns_type,
        file_name: file.name,
        post_count: 0,
        file_size: file.size,
        success: false,
        error: error.message
      })
      
      throw error
    }
  }

  /**
   * すべてのデータをクリア
   * @returns {Promise<void>}
   */
  async clear_all_data() {
    try {
      await post_repository.clear_all_data()
      await keep_repository.clear_all_keeps()

    } catch (error) {

      throw new Error('データのクリアに失敗しました')
    }
  }

  /**
   * KEEPデータのみを削除
   */
  async clear_keep_data() {
    try {
      await keep_repository.clear_all_keeps()

    } catch (error) {

      throw new Error('KEEPデータの削除に失敗しました')
    }
  }

  /**
   * Twitter/Twilog投稿データのみを削除
   */
  async clear_twitter_posts() {
    try {
      await post_repository.clear_posts_by_sns('twitter')

    } catch (error) {

      throw new Error('Twitter/Twilog投稿データの削除に失敗しました')
    }
  }

  /**
   * Mastodon投稿データのみを削除
   */
  async clear_mastodon_posts() {
    try {
      await post_repository.clear_posts_by_sns('mastodon')

    } catch (error) {

      throw new Error('Mastodon投稿データの削除に失敗しました')
    }
  }

  /**
   * Bluesky投稿データのみを削除
   */
  async clear_bluesky_posts() {
    try {
      await post_repository.clear_posts_by_sns('bluesky')

    } catch (error) {

      throw new Error('Bluesky投稿データの削除に失敗しました')
    }
  }

  /**
   * ストレージ情報を取得
   * @returns {Promise<StorageInfo>} ストレージ情報
   */
  async get_storage_info() {
    try {
      const post_count = await post_repository.get_post_count()
      const keep_count = await keep_repository.get_keep_count()
      const memory_info = memory_monitor.check_memory_usage()
      
      // データが完全に0件の場合は使用容量も0を返す
      if (post_count === 0 && keep_count === 0) {
        return {
          usage: 0,
          quota: 0,
          percentage: 0,
          post_count: 0,
          keep_count: 0,
          memory: memory_info,
          used_mb: 0,
          quota_mb: 0
        }
      }
      
      // データがある場合は実際のストレージ情報を取得
      const storage_info = await post_repository.get_storage_info()

      return {
        ...storage_info,
        post_count: post_count,
        keep_count: keep_count,
        memory: memory_info,
        used_mb: Math.round(storage_info.usage / 1024 / 1024),
        quota_mb: Math.round(storage_info.quota / 1024 / 1024)
      }
    } catch (error) {

      return {
        usage: 0,
        quota: 0,
        percentage: 0,
        post_count: 0,
        keep_count: 0,
        memory: { used: 0, total: 0, limit: 0, usage_rate: 0 },
        used_mb: 0,
        quota_mb: 0
      }
    }
  }

  /**
   * インポート履歴を保存
   * @param {ImportHistory} history - インポート履歴
   * @returns {Promise<void>}
   */
  async save_import_history(history) {
    try {
      // 既存の履歴を取得
      let histories = await post_repository.get_setting('import_histories') || []
      
      // 新しい履歴を追加（最新10件のみ保持）
      histories.unshift({
        ...history,
        imported_at: new Date().toISOString()
      })
      histories = histories.slice(0, 10)
      
      // 保存
      await post_repository.save_setting('import_histories', histories)
      
    } catch (error) {

      // 履歴保存の失敗は致命的ではないのでエラーを投げない
    }
  }

  /**
   * インポート履歴を取得
   * @returns {Promise<ImportHistory[]>} インポート履歴
   */
  async get_import_history() {
    try {
      return await post_repository.get_setting('import_histories') || []
    } catch (error) {

      return []
    }
  }

  /**
   * 最後のインポート情報を取得
   * @returns {Promise<ImportHistory|null>} 最後のインポート情報
   */
  async get_last_import() {
    try {
      const histories = await this.get_import_history()
      return histories.length > 0 ? histories[0] : null
    } catch (error) {
      return null
    }
  }

  /**
   * データの整合性をチェック
   * @returns {Promise<IntegrityCheck>} 整合性チェック結果
   */
  async check_data_integrity() {
    try {
      const post_count = await post_repository.get_post_count()
      const stats = await post_repository.get_post_stats()
      const storage_info = await this.get_storage_info()

      return {
        is_valid: post_count > 0,
        post_count: post_count,
        date_range: stats.date_range,
        storage_usage: storage_info.percentage,
        issues: []
      }
    } catch (error) {
      return {
        is_valid: false,
        post_count: 0,
        date_range: null,
        storage_usage: 0,
        issues: ['データベースへのアクセスに失敗しました']
      }
    }
  }

  /**
   * SNS別インポート情報を取得
   * @returns {Promise<Object>} SNS別情報
   */
  async get_sns_import_info() {
    try {
      const sns_stats = await post_repository.get_sns_stats()
      const histories = await this.get_import_history()
      
      const sns_info = {}
      
      // SNS別に情報を集計
      for (const [sns_type, count] of Object.entries(sns_stats)) {
        const sns_histories = histories.filter(h => h.sns_type === sns_type)
        sns_info[sns_type] = {
          post_count: count,
          last_import: sns_histories[0] || null,
          import_count: sns_histories.length
        }
      }
      
      return sns_info
    } catch (error) {

      return {}
    }
  }
}

// シングルトンインスタンスをエクスポート
export const storage_service = new StorageService()