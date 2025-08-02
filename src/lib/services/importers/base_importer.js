import { memory_monitor } from '../../utils/memory_monitor.js'
import { PostModel } from '../../models/post.js'
import { post_repository } from '../../repositories/post_repository.js'

/**
 * 全SNSインポーターの基底クラス
 * 共通のインポートロジックとインターフェースを提供
 */
export class BaseImporter {
  /**
   * コンストラクタ
   * @param {string} sns_type - SNS種別
   */
  constructor(sns_type) {
    this.sns_type = sns_type
    this.BATCH_SIZE = 500
    this.PROGRESS_UPDATE_INTERVAL = 100
  }

  /**
   * ファイルをインポート（サブクラスでオーバーライド必須）
   * @param {File} file - インポートファイル
   * @param {Function} progress_callback - 進捗コールバック
   * @returns {Promise<ImportResult>} インポート結果
   */
  async import_data(file, progress_callback = null) {
    throw new Error('import_dataメソッドは各インポーターで実装する必要があります')
  }

  // 差分インポート機能付きインポート
  async import_data_with_diff(file, progress_callback = null) {
    try {
      this.report_progress(progress_callback, {
        step: 'init',
        progress: 0,
        message: '重複チェックを準備しています...'
      });
      
      // 既存のポストIDを事前に取得
      const existing_ids = await post_repository.get_existing_post_ids(this.sns_type);
      
      // スキップ数を追跡
      let total_skipped = 0;
      
      // ファイルをインポート（サブクラスの実装を呼ぶ）
      const import_result = await this.import_data(file, async (posts_batch) => {
        // 重複チェックを適用
        const filter_result = await this.filter_duplicates(posts_batch, existing_ids);
        total_skipped += filter_result.skipped;
        
        if (filter_result.posts.length > 0) {
          // 新規ポストのみを返す
          return filter_result.posts;
        }
        return [];
      }, progress_callback);
      
      // インポート結果にスキップ数を追加
      if (import_result.success) {
        import_result.skipped_count = total_skipped;
        
        // 全件重複の場合のメッセージを調整
        if (import_result.post_count === 0 && total_skipped > 0) {
          import_result.message = `全${total_skipped.toLocaleString()}件が重複のためスキップされました`;

        } else if (total_skipped > 0) {

        }
      }
      
      return import_result;
    } catch (error) {

      return this.create_error_result(error);
    }
  }
  
  // 重複をフィルタリングするヘルパーメソッド
  async filter_duplicates(posts, existing_ids) {
    const filtered_posts = [];
    let skipped_count = 0;
    
    for (const post of posts) {
      const duplicate_key = this.generate_duplicate_key(post);
      
      if (!existing_ids.has(duplicate_key)) {
        filtered_posts.push(post);
        // 新しいIDをセットに追加（次のバッチでの重複を防ぐ）
        existing_ids.add(duplicate_key);
      } else {
        skipped_count++;
      }
    }
    
    if (skipped_count > 0) {

    }
    
    return {
      posts: filtered_posts,
      skipped: skipped_count
    };
  }
  
  // SNS固有の重複キー生成
  generate_duplicate_key(post) {
    // サブクラスでオーバーライドすることを想定
    // デフォルトは統一IDを使用
    if (post.id) {
      return `${this.sns_type}_${post.id}`;
    }
    if (post.original_id) {
      return `${this.sns_type}_${post.original_id}`;
    }
    // フォールバック: コンテンツとタイムスタンプのハッシュ
    const content_hash = this.hash_string(`${post.content || ''}${post.created_at || ''}`);
    return `${this.sns_type}_${content_hash}`;
  }
  
  // 簡易ハッシュ関数
  hash_string(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 生データを統一スキーマに変換（サブクラスでオーバーライド必須）
   * @param {Object} raw_data - SNS固有の生データ
   * @returns {Object} 統一スキーマのデータ
   */
  transform_to_unified_schema(raw_data) {
    throw new Error('transform_to_unified_schemaメソッドは各インポーターで実装する必要があります')
  }

  /**
   * ファイルの妥当性を検証
   * @param {File} file - 検証するファイル
   * @returns {Object} 検証結果
   */
  validate_file(file) {
    const result = {
      valid: true,
      message: ''
    }

    // ファイルサイズチェック（最大500MB）
    const max_size = 500 * 1024 * 1024
    if (file.size > max_size) {
      result.valid = false
      result.message = 'ファイルサイズが大きすぎます（最大500MB）'
      return result
    }

    // ファイル名チェック
    const valid_extensions = this.get_valid_extensions()
    const file_extension = file.name.split('.').pop().toLowerCase()
    
    if (!valid_extensions.includes(file_extension)) {
      result.valid = false
      result.message = `無効なファイル形式です。対応形式: ${valid_extensions.join(', ')}`
      return result
    }

    return result
  }

  /**
   * 有効なファイル拡張子を取得（サブクラスでオーバーライド可能）
   * @returns {Array<string>} 拡張子の配列
   */
  get_valid_extensions() {
    return ['json', 'js']
  }

  /**
   * インポート手順を取得（サブクラスでオーバーライド推奨）
   * @returns {Object} インポート手順情報
   */
  get_import_instructions() {
    return {
      steps: [
        `${this.get_sns_display_name()}からデータをエクスポート`,
        'ダウンロードしたファイルを選択',
        'インポートを実行'
      ],
      file_info: {
        format: this.get_valid_extensions().join(', '),
        location: 'エクスポートファイル'
      }
    }
  }

  /**
   * SNSの表示名を取得
   * @returns {string} 表示名
   */
  get_sns_display_name() {
    const display_names = {
      twitter: 'Twitter',
      bluesky: 'Bluesky', 
      mastodon: 'Mastodon'
    }
    
    return display_names[this.sns_type] || this.sns_type
  }

  /**
   * 進捗を報告
   * @param {Function} callback - 進捗コールバック
   * @param {Object} progress - 進捗情報
   */
  report_progress(callback, progress) {
    if (callback && typeof callback === 'function') {
      callback(progress)
    }
  }

  /**
   * ポストの配列をバッチ処理
   * @param {Array} posts - ポストの配列
   * @param {Function} process_batch - バッチ処理関数
   * @param {Function} progress_callback - 進捗コールバック
   * @returns {Promise<void>}
   */
  async process_posts_in_batches(posts, process_batch, progress_callback = null) {
    const total = posts.length
    let processed = 0
    const all_processed_posts = []
    
    for (let i = 0; i < total; i += this.BATCH_SIZE) {
      const batch = posts.slice(i, i + this.BATCH_SIZE)
      
      // バッチを処理
      const processed_batch = await process_batch(batch)
      
      // 処理結果を収集
      if (processed_batch && processed_batch.length > 0) {
        all_processed_posts.push(...processed_batch)
      }
      
      processed += batch.length
      
      // 進捗更新
      if (progress_callback) {
        const progress = Math.round((processed / total) * 100)
        this.report_progress(progress_callback, {
          step: 'processing',
          progress: progress,
          message: `処理中... ${processed.toLocaleString()} / ${total.toLocaleString()} 件`,
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
    
    return all_processed_posts
  }

  /**
   * 生データの配列を統一スキーマに変換
   * @param {Array} raw_posts - 生データの配列
   * @param {Function} progress_callback - 進捗コールバック
   * @returns {Promise<Array<PostModel>>} PostModelの配列
   */
  async transform_posts_batch(raw_posts, progress_callback = null) {
    const transformed_posts = []
    const total = raw_posts.length
    let processed = 0
    let errors = 0

    this.report_progress(progress_callback, {
      step: 'transforming',
      progress: 0,
      message: 'データを変換しています...'
    })

    for (const raw_post of raw_posts) {
      try {
        const unified_data = this.transform_to_unified_schema(raw_post)
        const post_model = new PostModel(unified_data)
        
        // バリデーション
        const validation = post_model.validate()
        if (validation.valid) {
          transformed_posts.push(post_model)
        } else {

          errors++
        }
      } catch (error) {

        errors++
      }

      processed++
      
      // 定期的に進捗を報告
      if (processed % this.PROGRESS_UPDATE_INTERVAL === 0 || processed === total) {
        const progress = Math.round((processed / total) * 100)
        this.report_progress(progress_callback, {
          step: 'transforming',
          progress: progress,
          message: `変換中... ${processed.toLocaleString()} / ${total.toLocaleString()} 件`,
          processed: processed,
          total: total
        })
        
        // UI応答性を保つ
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    }

    if (errors > 0) {

    }

    return transformed_posts
  }

  /**
   * ファイル内容を読み込み
   * @param {File} file - 読み込むファイル
   * @param {Function} progress_callback - 進捗コールバック
   * @returns {Promise<string>} ファイル内容
   */
  async read_file_content(file, progress_callback = null) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      this.report_progress(progress_callback, {
        step: 'reading',
        progress: 0,
        message: 'ファイルを読み込んでいます...'
      })

      reader.onload = (event) => {
        this.report_progress(progress_callback, {
          step: 'reading',
          progress: 100,
          message: 'ファイルの読み込みが完了しました'
        })
        resolve(event.target.result)
      }

      reader.onerror = () => {
        reject(new Error('ファイルの読み込みに失敗しました'))
      }

      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          this.report_progress(progress_callback, {
            step: 'reading',
            progress: progress,
            message: `読み込み中... ${progress}%`
          })
        }
      }

      reader.readAsText(file)
    })
  }

  /**
   * インポート結果を生成
   * @param {boolean} success - 成功フラグ
   * @param {number} post_count - ポスト数
   * @param {Array<PostModel>} posts - ポストの配列
   * @param {string} message - メッセージ
   * @returns {Object} インポート結果
   */
  create_import_result(success, post_count, posts = [], message = '') {
    return {
      success,
      post_count,
      posts,
      message: message || `${post_count.toLocaleString()}件のポストをインポートしました`,
      sns_type: this.sns_type,
      imported_at: new Date().toISOString(),
      skipped_count: 0  // デフォルト値
    }
  }

  /**
   * エラー結果を生成
   * @param {Error} error - エラーオブジェクト
   * @returns {Object} エラー結果
   */
  create_error_result(error) {
    return {
      success: false,
      post_count: 0,
      posts: [],
      message: error.message || 'インポートに失敗しました',
      sns_type: this.sns_type,
      error: error
    }
  }

  /**
   * データ破損チェック
   * @param {Object} data - チェックするデータ
   * @returns {boolean} 破損していない場合true
   */
  check_data_integrity(data) {
    // 基本的なチェック（サブクラスで拡張可能）
    if (!data) return false
    if (typeof data !== 'object') return false
    
    return true
  }

  /**
   * メモリ使用量をチェックして警告
   * @returns {Promise<boolean>} 続行可能な場合true
   */
  async check_memory_safety() {
    const memory_status = await memory_monitor.check_memory_usage()
    
    if (memory_status.status === 'critical') {
      throw new Error('メモリ不足: インポートを中止してください')
    }
    
    return memory_status.status !== 'warning'
  }
}