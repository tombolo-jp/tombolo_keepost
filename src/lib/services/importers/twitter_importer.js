import { BaseImporter } from './base_importer.js'
import { PostModel, create_post_from_raw_data } from '../../models/post.js'
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
  async import_data(file, options = {}) {
    const { progress_callback = null, filter_callback = null, twitter_username = null } = options;
    
    console.log('[TwitterImporter] import_data called with options:', { twitter_username, hasFilterCallback: !!filter_callback })
    
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
      
      console.log('[TwitterImporter] Parsed tweets count:', raw_tweets?.length)
      
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

      // バッチ処理でポストを変換（twitter_usernameを渡す）
      console.log('[TwitterImporter] Starting batch processing with username:', twitter_username)
      const posts = await this.process_posts_in_batches(
        raw_tweets,
        async (batch) => {
          console.log('[TwitterImporter] Processing batch of size:', batch.length)
          const transformed = await this.transform_posts_batch_with_username(batch, twitter_username)
          console.log('[TwitterImporter] Transformed posts count:', transformed?.length)
          // フィルターコールバックがある場合は適用
          if (filter_callback) {
            const filtered = await filter_callback(transformed)
            console.log('[TwitterImporter] Filtered posts count:', filtered?.length)
            return filtered || []
          }
          return transformed
        },
        progress_callback
      )

      console.log('[TwitterImporter] Final posts count:', posts?.length)
      return this.create_import_result(true, posts ? posts.length : 0, posts || [])

    } catch (error) {
      console.error('[TwitterImporter] Error:', error)
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
   * バッチ処理でツイートを変換（ユーザー名付き）
   * @param {Array} raw_posts - 変換対象のツイート配列
   * @param {string|null} twitter_username - Twitterユーザー名
   * @returns {Promise<Array>} 変換されたポストモデルの配列
   */
  /**
   * バッチ処理でツイートを変換（ユーザー名付き）
   * @param {Array} raw_posts - 変換対象のツイート配列
   * @param {string|null} twitter_username - Twitterユーザー名
   * @returns {Promise<Array>} 変換されたポストモデルの配列
   */
  async transform_posts_batch_with_username(raw_posts, twitter_username = null) {
    console.log('[transform_posts_batch_with_username] Called with:', { 
      count: raw_posts.length, 
      username: twitter_username 
    })
    
    const transformed_posts = []
    let valid_count = 0
    let invalid_count = 0
    
    for (const raw_post of raw_posts) {
      try {
        const unified_data = this.transform_to_unified_schema(raw_post, twitter_username)
        console.log('[transform_posts_batch_with_username] Unified data sample:', {
          id: unified_data.id,
          author: unified_data.author,
          content_length: unified_data.content?.length
        })
        
        const post_model = new PostModel(unified_data)
        
        // バリデーション
        const validation = post_model.validate()
        console.log('[transform_posts_batch_with_username] Validation result:', validation)
        
        if (validation.valid) {
          transformed_posts.push(post_model)
          valid_count++
        } else {
          console.warn('[transform_posts_batch_with_username] Validation failed:', validation.errors)
          invalid_count++
        }
      } catch (error) {
        console.error('[transform_posts_batch_with_username] Error transforming post:', error)
        invalid_count++
      }
    }
    
    console.log('[transform_posts_batch_with_username] Results:', {
      total: raw_posts.length,
      valid: valid_count,
      invalid: invalid_count
    })
    
    return transformed_posts
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
  transform_to_unified_schema(raw_tweet, twitter_username = null) {
    console.log('[transform_to_unified_schema] Called with username:', twitter_username)
    console.log('[transform_to_unified_schema] Raw tweet sample:', {
      id: raw_tweet.id || raw_tweet.id_str,
      has_tweet: !!raw_tweet.tweet,
      has_retweeted_status: !!raw_tweet.retweeted_status,
      text_preview: (raw_tweet.full_text || raw_tweet.text || '')?.substring(0, 50)
    })
    
    try {
      // PostModelのファクトリ関数を使用
      const post = create_post_from_raw_data('twitter', raw_tweet)
      console.log('[transform_to_unified_schema] Post created from factory:', {
        id: post.id,
        author: post.author,
        content_preview: post.content?.substring(0, 50)
      })
      
      // RTパターンの検出
      const rt_pattern = /^RT @([a-zA-Z0-9_]+):/
      const full_text = post.content || ''
      const match = full_text.match(rt_pattern)
      const is_manual_retweet = !!match
      const original_author = match ? match[1] : null
      
      // リポスト判別（既存のretweeted_statusチェックとRTパターン検出を統合）
      const is_repost = !!raw_tweet.retweeted_status || is_manual_retweet
      
      console.log('[transform_to_unified_schema] RT detection:', {
        is_manual_retweet,
        original_author,
        is_repost
      })
      
      // ユーザー名の設定
      if (is_repost && original_author) {
        // 手動RTの場合、元の投稿者名を設定
        post.author.username = original_author
        post.author.name = original_author // nameも同じ値に設定
      } else if (is_repost && raw_tweet.retweeted_status) {
        // 公式リツイートの場合
        const rt_user = raw_tweet.retweeted_status.user
        if (rt_user) {
          post.author.username = rt_user.screen_name || 'twitter_user'
          post.author.name = rt_user.name || rt_user.screen_name || 'Twitter User'
        }
      } else if (twitter_username) {
        // 通常の投稿の場合、入力されたユーザー名を使用
        post.author.username = twitter_username
        // 自分のツイートの場合、raw_tweetにuser情報があれば使用、なければusernameを使用
        if (raw_tweet.user?.name) {
          post.author.name = raw_tweet.user.name
        } else {
          post.author.name = twitter_username // nameにもusernameと同じ値を設定
        }
      } else if (raw_tweet.user) {
        // raw_tweetにuser情報がある場合はそれを使用
        post.author.username = raw_tweet.user.screen_name || 'twitter_user'
        post.author.name = raw_tweet.user.name || raw_tweet.user.screen_name || 'Twitter User'
      } else if (!post.author.username || post.author.username === 'unknown') {
        // フォールバック：ユーザー名が設定されていない場合
        post.author.username = 'twitter_user'
        post.author.name = 'Twitter User'
      }
      
      // author.nameが未設定または「Twitter User」のままの場合、usernameを使用
      if (!post.author.name || post.author.name === 'unknown' || post.author.name === 'Twitter User') {
        if (post.author.username && post.author.username !== 'unknown' && post.author.username !== 'twitter_user') {
          post.author.name = post.author.username
        }
      }
      
      console.log('[transform_to_unified_schema] Final author:', post.author)
      
      // is_repostフラグの更新
      post.is_repost = is_repost
      
      // sns_specificに元の投稿者情報を保存（後方互換性のため）
      if (is_repost && original_author) {
        post.sns_specific.original_author = original_author
      }
      
      // URLの生成（ユーザー名が判明している場合は正確なURLを生成）
      if (!post.original_url) {
        if (post.author.username && post.author.username !== 'twitter_user') {
          post.original_url = `https://twitter.com/${post.author.username}/status/${raw_tweet.id_str || raw_tweet.id}`
        } else {
          post.original_url = `https://twitter.com/i/status/${raw_tweet.id_str || raw_tweet.id}`
        }
      }
      
      // サニタイズ
      post.content = security_validator.sanitize_content(post.content)
      
      const result = post.to_db_object()
      console.log('[transform_to_unified_schema] Final result:', {
        id: result.id,
        author: result.author,
        has_content: !!result.content
      })
      
      return result
      
    } catch (error) {
      console.error('[transform_to_unified_schema] Error:', error)
      // 最小限の情報で返す
      return {
        id: `twitter_${raw_tweet.id_str || raw_tweet.id || Date.now()}`,
        original_id: raw_tweet.id_str || raw_tweet.id || Date.now().toString(),
        sns_type: 'twitter',
        created_at: this.parse_twitter_date(raw_tweet.created_at),
        content: 'エラー: ツイートの変換に失敗しました',
        author: {
          name: twitter_username || 'Twitter User',
          username: twitter_username || 'twitter_user',
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