import { security_validator } from '../utils/validation.js'
import { memory_monitor } from '../utils/memory_monitor.js'
import { TwitterImporter } from './importers/twitter_importer.js'
import { TwilogImporter } from './importers/twilog_importer.js'
import { BlueskyImporter } from './importers/bluesky_importer.js'
import { MastodonImporter } from './importers/mastodon_importer.js'
import { BackupImporter } from './importers/backup_importer.js'

/**
 * インポート処理サービス
 * マルチSNS対応の統一インポートインターフェース
 */
export class ImportService {
  constructor() {
    this.BATCH_SIZE = 500  // バッチ処理サイズ
    this.PROGRESS_UPDATE_INTERVAL = 100  // 進捗更新間隔（ミリ秒）

    // インポーターのマップ
    this.importers = {
      twitter: new TwitterImporter(),
      twilog: new TwilogImporter(),
      bluesky: new BlueskyImporter(),
      mastodon: new MastodonImporter(),
      backup: new BackupImporter()
    }
  }


  /**
   * マルチSNSデータをインポート
   * @param {string} sns_type - SNS種別（'twitter' | 'bluesky' | 'mastodon' | 'twilog'）
   * @param {File} file - インポートファイル
   * @param {Object} options - オプション（progress_callback, twilog_usernameなど）
   * @returns {Promise<ImportResult>} インポート結果
   */
  async import_sns_data(sns_type, file, options = {}) {
    console.log('[ImportService] import_sns_data called for:', sns_type, 'with options:', options)
    const importer = this.get_importer(sns_type)

    if (!importer) {
      throw new Error(`サポートされていないSNS種別: ${sns_type}`)
    }

    // import_data_with_diffメソッドを使用（重複チェック付き）
    // optionsをそのまま渡す（progress_callback, twitter_username, twilog_usernameなど全て含む）
    console.log('[ImportService] Calling import_data_with_diff with all options')
    return await importer.import_data_with_diff(file, options)
  }

  /**
   * SNS種別を自動判定してインポート
   * @param {File} file - インポートファイル
   * @param {Function} progress_callback - 進捗コールバック
   * @returns {Promise<ImportResult>} インポート結果
   */
  async import_with_auto_detect(file, progress_callback = null) {
    const sns_type = this.detect_sns_type(file)

    if (!sns_type) {
      throw new Error('ファイル形式を認識できませんでした。SNS種別を選択してください。')
    }

    return await this.import_sns_data(sns_type, file, progress_callback)
  }

  /**
   * ファイルからSNS種別を自動判定
   * @param {File} file - 判定するファイル
   * @returns {string|null} SNS種別
   */
  detect_sns_type(file) {
    const filename = file.name.toLowerCase()

    // バックアップファイルの判定
    if (filename.endsWith('.ndjson.gz') || filename.endsWith('.ndjson')) {
      return 'backup'
    }

    // ファイル名から判定
    if (filename === 'tweets.js' || filename.includes('twitter')) {
      return 'twitter'
    } else if (filename.endsWith('.car') || filename.includes('bluesky')) {
      return 'bluesky'
    } else if (filename === 'outbox.json' || filename.includes('mastodon')) {
      return 'mastodon'
    } else if (filename.endsWith('.csv') || filename.includes('twilog')) {
      return 'twilog'
    }

    // 拡張子から判定
    if (filename.endsWith('.js')) {
      return 'twitter'  // .jsファイルは通常Twitter
    }

    return null
  }

  /**
   * インポーターを取得
   * @param {string} sns_type - SNS種別
   * @returns {BaseImporter|null} インポーターインスタンス
   */
  get_importer(sns_type) {
    return this.importers[sns_type] || null
  }

  /**
   * サポートされているSNS一覧を取得
   * @returns {Array<Object>} SNS情報の配列
   */
  get_supported_sns_list() {
    return Object.keys(this.importers)
      .filter(sns_type => sns_type !== 'backup')  // backupを除外
      .map(sns_type => {
        const importer = this.importers[sns_type]
        return {
          type: sns_type,
          display_name: importer.get_sns_display_name(),
          supported_formats: importer.get_valid_extensions(),
          instructions: importer.get_import_instructions()
        }
      })
  }

  /**
   * インポート手順を取得
   * @param {string} sns_type - SNS種別
   * @returns {Object} インポート手順情報
   */
  get_import_instructions(sns_type) {
    const importer = this.get_importer(sns_type)

    if (!importer) {
      throw new Error(`サポートされていないSNS種別: ${sns_type}`)
    }

    return importer.get_import_instructions()
  }

  /**
   * tweets.jsファイルを直接インポート（後方互換性のため維持）
   * @param {File} file - tweets.jsファイル
   * @param {Function} progress_callback - 進捗コールバック
   * @returns {Promise<ImportResult>} インポート結果
   */
  async import_tweets_file(file, progress_callback = null) {
    // 新しいアーキテクチャを使用
    return await this.import_sns_data('twitter', file, progress_callback)
  }

  /**
   * tweets.jsの内容を処理
   * @param {string} content - tweets.jsの内容
   * @param {Function} progress_callback - 進捗コールバック
   * @returns {Promise<ImportResult>} インポート結果
   */
  async process_tweets_content(content, progress_callback) {
    try {
      if (progress_callback) {
        progress_callback({
          step: 'parsing',
          progress: 0,
          message: 'ツイートデータを解析しています...'
        })
      }

      // ツイートデータを抽出
      const tweets = await this.parse_tweet_data(content)

      if (!tweets || tweets.length === 0) {
        throw new Error('有効なツイートデータが見つかりませんでした')
      }

      // ツイート数の検証
      const count_validation = security_validator.validate_tweet_count(tweets.length)
      if (!count_validation.valid) {
        throw new Error(count_validation.message)
      }

      if (progress_callback) {
        progress_callback({
          step: 'parsed',
          progress: 100,
          message: `${tweets.length.toLocaleString()}件のツイートを検出しました`
        })
      }

      return {
        success: true,
        tweet_count: tweets.length,
        tweets: tweets,
        message: `${tweets.length.toLocaleString()}件のツイートをインポートしました`
      }

    } catch (error) {

      throw new Error(`ツイートデータの処理に失敗しました: ${error.message}`)
    }
  }

  // ============== 既存のparse_tweet_dataメソッドのバックアップ ==============
  // /**
  //  * tweets.jsからツイートデータを解析
  //  * @param {string} content - tweets.jsの内容
  //  * @returns {Promise<Tweet[]>} ツイートの配列
  //  */
  // async parse_tweet_data_old(content) {
  //   try {
  //     // window.YTD.tweets.part0 = [ ... ] の形式を解析
  //     const tweet_regex = /window\.YTD\.tweets\.part\d+\s*=\s*(\[[\s\S]*?\]);?$/gm
  //     const matches = [...content.matchAll(tweet_regex)]
  //
  //     if (matches.length === 0) {
  //       throw new Error('ツイートデータの形式が認識できません')
  //     }
  //
  //     let all_tweets = []
  //
  //     // 各パートを処理
  //     for (const match of matches) {
  //       try {
  //         // JSONとして解析
  //         const tweets_data = JSON.parse(match[1])
  //
  //         // ツイートオブジェクトを抽出
  //         const tweets = tweets_data.map(item => {
  //           const tweet = item.tweet || item
  //           return this.transform_tweet(tweet)
  //         })
  //
  //         all_tweets = all_tweets.concat(tweets)
  //
  //         // メモリチェック
  //         await memory_monitor.check_memory_usage()
  //
  //       } catch (parse_error) {
  //         console.warn('パート解析エラー:', parse_error)
  //         // 一部のパートが失敗しても続行
  //       }
  //     }
  //
  //     return all_tweets
  //
  //   } catch (error) {
  //     console.error('ツイート解析エラー:', error)
  //     throw new Error('ツイートデータの解析に失敗しました')
  //   }
  // }
  // ============== バックアップ終了 ==============

  /**
   * tweets.jsからツイートデータを解析（改善版）
   * @param {string} content - tweets.jsの内容
   * @returns {Promise<Tweet[]>} ツイートの配列
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
        user_message = 'TwitterからエクスポートしたZipファイルまたはtweets.jsファイルを使用してください。'
      } else if (error.message.includes('JSON解析エラー')) {
        user_message = 'ファイルの形式が正しくありません。TwitterのエクスポートデータまたはJSON形式のファイルを使用してください。'
      } else if (error.message.includes('有効なツイートを抽出できませんでした')) {
        user_message = 'ツイートデータが含まれていないか、ファイルが破損している可能性があります。'
      }

      throw new Error(user_message)
    }
  }

  /**
   * JavaScript形式のツイートデータを解析
   * @param {string} content - JavaScript形式のtweets.jsの内容
   * @returns {Promise<Tweet[]>} ツイートの配列
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
      const tweets = tweets_data.map(item => {
        const tweet = item.tweet || item
        return this.transform_tweet(tweet)
      })

      return tweets

    } catch (parse_error) {

      throw new Error('有効なツイートを抽出できませんでした')
    }
  }

  /**
   * JSON形式のツイートデータを解析
   * @param {string} content - JSON形式のtweets.jsの内容
   * @returns {Promise<Tweet[]>} ツイートの配列
   */
  async parse_json_format(content) {
    try {
      const tweets_data = JSON.parse(content)

      if (!Array.isArray(tweets_data)) {
        throw new Error('データが配列形式ではありません')
      }

      const tweets = tweets_data.map(item => {
        const tweet = item.tweet || item
        return this.transform_tweet(tweet)
      })

      return tweets

    } catch (error) {
      throw new Error(`JSON解析エラー: ${error.message}`)
    }
  }

  /**
   * ツイートデータを変換
   * @param {Object} raw_tweet - 生のツイートデータ
   * @returns {Tweet} 変換済みツイート
   */
  transform_tweet(raw_tweet) {
    try {
      // 基本情報
      const tweet = {
        id: raw_tweet.id_str || raw_tweet.id,
        created_at: this.parse_twitter_date(raw_tweet.created_at),
        full_text: raw_tweet.full_text || raw_tweet.text || '',
        favorite_count: parseInt(raw_tweet.favorite_count || 0),
        retweet_count: parseInt(raw_tweet.retweet_count || 0),
        lang: raw_tweet.lang || 'ja'
      }

      // エンティティ情報
      const entities = raw_tweet.entities || {}

      // メディア情報
      if (entities.media && entities.media.length > 0) {
        tweet.media = entities.media.map(m => ({
          url: m.url,
          type: m.type,
          display_url: m.display_url
        }))
      }

      // URL情報
      if (entities.urls && entities.urls.length > 0) {
        tweet.urls = entities.urls.map(u => ({
          url: u.url,
          expanded_url: u.expanded_url,
          display_url: u.display_url
        }))
      }

      // ハッシュタグ
      if (entities.hashtags && entities.hashtags.length > 0) {
        tweet.hashtags = entities.hashtags.map(h => h.text)
      }

      // メンション
      if (entities.user_mentions && entities.user_mentions.length > 0) {
        tweet.user_mentions = entities.user_mentions.map(m => ({
          screen_name: m.screen_name,
          name: m.name
        }))
      }

      // リプライ情報
      if (raw_tweet.in_reply_to_status_id_str) {
        tweet.reply_to = raw_tweet.in_reply_to_status_id_str
      }

      // テキストのサニタイズ
      tweet.full_text = security_validator.sanitize_content(tweet.full_text)

      return tweet

    } catch (error) {

      // 最小限の情報で返す
      return {
        id: raw_tweet.id_str || raw_tweet.id || Date.now().toString(),
        created_at: new Date().toISOString(),
        full_text: 'エラー: ツイートの変換に失敗しました',
        favorite_count: 0,
        retweet_count: 0,
        lang: 'ja'
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
   * バッチ処理でツイートを処理
   * @param {Tweet[]} tweets - ツイートの配列
   * @param {Function} process_batch - バッチ処理関数
   * @param {Function} progress_callback - 進捗コールバック
   * @returns {Promise<void>}
   */
  async process_tweets_in_batches(tweets, process_batch, progress_callback = null) {
    const total = tweets.length
    let processed = 0

    for (let i = 0; i < total; i += this.BATCH_SIZE) {
      const batch = tweets.slice(i, i + this.BATCH_SIZE)

      // バッチを処理
      await process_batch(batch)

      processed += batch.length

      // 進捗更新
      if (progress_callback) {
        const progress = Math.round((processed / total) * 100)
        progress_callback({
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
  }
}

// シングルトンインスタンスをエクスポート
export const import_service = new ImportService()
