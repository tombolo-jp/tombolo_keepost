import { BaseImporter } from './base_importer.js'
import { create_post_from_raw_data } from '../../models/post.js'
import { security_validator } from '../../utils/validation.js'

/**
 * Twitter専用インポーター
 * tweets.jsファイルのインポートを処理
 */
export class TwitterImporter extends BaseImporter {
  constructor() {
    super('twitter')
  }

  /**
   * tweets.jsファイルをインポート
   * @param {File} file - tweets.jsファイル
   * @param {Function} progress_callback - 進捗コールバック
   * @returns {Promise<ImportResult>} インポート結果
   */
  async import_data(file, filter_callback = null, progress_callback = null) {
    try {
      // ファイル検証
      const validation_result = this.validate_file(file)
      if (!validation_result.valid) {
        throw new Error(validation_result.message)
      }

      // ファイル内容を読み込み
      const content = await this.read_file_content(file, progress_callback)

      // tweets.jsの内容を解析
      this.report_progress(progress_callback, {
        step: 'parsing',
        progress: 0,
        message: 'ツイートデータを解析しています...'
      })

      const raw_tweets = await this.parse_tweet_data(content)
      
      if (!raw_tweets || raw_tweets.length === 0) {
        throw new Error('有効なツイートデータが見つかりませんでした')
      }

      // ツイート数の検証
      const count_validation = security_validator.validate_tweet_count(raw_tweets.length)
      if (!count_validation.valid) {
        throw new Error(count_validation.message)
      }

      this.report_progress(progress_callback, {
        step: 'parsed',
        progress: 100,
        message: `${raw_tweets.length.toLocaleString()}件のツイートを検出しました`
      })

      // バッチ処理でポストを変換
      const posts = await this.process_posts_in_batches(
        raw_tweets,
        async (batch) => {
          const transformed = await this.transform_posts_batch(batch, null)
          // フィルターコールバックがある場合は適用
          if (filter_callback) {
            const filtered = await filter_callback(transformed)
            return filtered || []
          }
          return transformed
        },
        progress_callback
      )

      return this.create_import_result(true, posts ? posts.length : 0, posts || [])

    } catch (error) {

      return this.create_error_result(error)
    }
  }

  /**
   * tweets.jsからツイートデータを解析
   * @param {string} content - tweets.jsの内容
   * @returns {Promise<Array>} ツイートの配列
   */
  async parse_tweet_data(content) {
    try {
      // データ形式の検出
      const is_javascript_format = /window\.YTD\.tweets\.part\d+\s*=/.test(content)
      
      if (is_javascript_format) {
        // JavaScript形式の解析
        return await this.parse_javascript_format(content)
      } else {
        // JSON形式として試行（フォールバック）
        return await this.parse_json_format(content)
      }
      
    } catch (error) {

      // ユーザーフレンドリーなエラーメッセージ
      let user_message = 'ツイートデータを読み込めませんでした。'
      
      if (error.message.includes('有効なツイートデータが見つかりませんでした')) {
        user_message = 'TwitterからエクスポートしたZipファイル内のdata/tweets.jsファイルを使用してください。'
      } else if (error.message.includes('JSON解析エラー')) {
        user_message = 'ファイルの形式が正しくありません。Twitterのエクスポートデータを使用してください。'
      } else if (error.message.includes('有効なツイートを抽出できませんでした')) {
        user_message = 'ツイートデータが含まれていないか、ファイルが破損している可能性があります。'
      }
      
      throw new Error(user_message)
    }
  }

  /**
   * JavaScript形式のツイートデータを解析
   * @param {string} content - JavaScript形式のtweets.jsの内容
   * @returns {Promise<Array>} ツイートの配列
   */
  async parse_javascript_format(content) {
    // window.YTD.tweets.part0 = の位置を探す
    const start_pattern = /window\.YTD\.tweets\.part\d+\s*=\s*/g
    const start_match = start_pattern.exec(content)
    
    if (!start_match) {
      throw new Error('有効なツイートデータが見つかりませんでした')
    }
    
    // "= " の後からファイルの最後までを取得
    const start_pos = start_match.index + start_match[0].length
    let json_str = content.substring(start_pos).trim()
    
    // 末尾のセミコロンを除去（存在する場合）
    if (json_str.endsWith(';')) {
      json_str = json_str.slice(0, -1).trim()
    }
    
    try {
      // JSONとして解析
      const tweets_data = JSON.parse(json_str)
      
      if (!Array.isArray(tweets_data)) {
        throw new Error('ツイートデータが配列形式ではありません')
      }
      
      // ツイートオブジェクトを抽出
      const tweets = tweets_data.map(item => item.tweet || item)

      // メモリ安全性チェック
      await this.check_memory_safety()
      
      return tweets
      
    } catch (parse_error) {

      throw new Error('有効なツイートを抽出できませんでした')
    }
  }

  /**
   * JSON形式のツイートデータを解析
   * @param {string} content - JSON形式のtweets.jsの内容
   * @returns {Promise<Array>} ツイートの配列
   */
  async parse_json_format(content) {
    try {
      const tweets_data = JSON.parse(content)
      
      if (!Array.isArray(tweets_data)) {
        throw new Error('データが配列形式ではありません')
      }
      
      const tweets = tweets_data.map(item => item.tweet || item)
      
      return tweets
      
    } catch (error) {
      throw new Error(`JSON解析エラー: ${error.message}`)
    }
  }

  /**
   * Twitterの生データを統一スキーマに変換
   * @param {Object} raw_tweet - Twitterの生データ
   * @returns {Object} 統一スキーマのデータ
   */
  transform_to_unified_schema(raw_tweet) {
    try {
      // PostModelのファクトリ関数を使用
      const post = create_post_from_raw_data('twitter', raw_tweet)
      
      // 追加の処理（必要に応じて）
      // TwitterエクスポートにはユーザーのユーザーネームやIDが含まれていない場合があるため、
      // インポート時に設定できるようにする
      if (!post.author.username || post.author.username === 'unknown') {
        // 後でユーザーが設定できるようにプレースホルダーを設定
        post.author.username = 'twitter_user'
        post.author.name = 'Twitter User'
      }
      
      // URLの生成（ユーザー名が不明な場合は仮のURLを生成）
      if (!post.original_url) {
        post.original_url = `https://twitter.com/i/status/${raw_tweet.id_str || raw_tweet.id}`
      }
      
      // サニタイズ
      post.content = security_validator.sanitize_content(post.content)
      
      return post.to_db_object()
      
    } catch (error) {

      // 最小限の情報で返す
      return {
        id: `twitter_${raw_tweet.id_str || raw_tweet.id || Date.now()}`,
        original_id: raw_tweet.id_str || raw_tweet.id || Date.now().toString(),
        sns_type: 'twitter',
        created_at: this.parse_twitter_date(raw_tweet.created_at),
        content: 'エラー: ツイートの変換に失敗しました',
        author: {
          name: 'Twitter User',
          username: 'twitter_user',
          avatar_url: null
        },
        metrics: {
          likes: 0,
          shares: 0,
          replies: 0,
          views: null
        },
        language: 'ja',
        year_month: new Date().toISOString().substring(0, 7),
        media: [],
        urls: [],
        hashtags: [],
        mentions: [],
        sns_specific: {},
        is_kept: false,
        kept_at: null,
        original_url: null,
        imported_at: new Date().toISOString(),
        version: 2
      }
    }
  }

  /**
   * Twitter形式の日付をISO形式に変換
   * @param {string} twitter_date - Twitter形式の日付
   * @returns {string} ISO形式の日付
   */
  parse_twitter_date(twitter_date) {
    try {
      // "Wed Oct 10 20:19:24 +0000 2018" 形式をパース
      const date = new Date(twitter_date)
      if (isNaN(date.getTime())) {
        // フォールバック: 現在時刻
        return new Date().toISOString()
      }
      return date.toISOString()
    } catch (error) {
      return new Date().toISOString()
    }
  }

  /**
   * 有効なファイル拡張子を取得
   * @returns {Array<string>} 拡張子の配列
   */
  get_valid_extensions() {
    return ['js']
  }

  /**
   * インポート手順を取得
   * @returns {Object} インポート手順情報
   */
  get_import_instructions() {
    return {
      steps: [
        'Twitterの設定から「アカウント情報をダウンロード」を選択',
        'データのダウンロードをリクエスト（数時間〜数日かかる場合があります）',
        'ダウンロード完了通知が来たらZipファイルをダウンロード',
        'Zipファイルを解凍',
        'data/tweets.jsファイルを選択してインポート'
      ],
      file_info: {
        format: 'tweets.js',
        location: 'data/tweets.js',
        description: 'Twitterからエクスポートしたアーカイブ内のツイートデータファイル'
      },
      notes: [
        'Zipファイル自体ではなく、解凍後のtweets.jsファイルを選択してください',
        '大量のツイートがある場合、インポートに時間がかかることがあります',
        'ツイートに含まれるメディアファイルは別途保存が必要です'
      ]
    }
  }

  /**
   * データ破損チェック
   * @param {Object} tweet - チェックするツイートデータ
   * @returns {boolean} 破損していない場合true
   */
  check_data_integrity(tweet) {
    if (!super.check_data_integrity(tweet)) return false
    
    // Twitter固有のチェック
    if (!tweet.id && !tweet.id_str) return false
    if (!tweet.created_at) return false
    if (!tweet.text && !tweet.full_text) return false
    
    return true
  }
}