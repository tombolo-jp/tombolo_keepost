import { BaseImporter } from './base_importer.js'
import { create_post_from_raw_data } from '../../models/post.js'

/**
 * Mastodon専用インポーター
 * ActivityPub形式のoutbox.jsonファイルのインポートを処理
 */
export class MastodonImporter extends BaseImporter {
  constructor() {
    super('mastodon')
  }

  /**
   * Mastodonのoutbox.jsonファイルをインポート
   * @param {File} file - outbox.jsonファイル
   * @param {Function} progress_callback - 進捗コールバック
   * @returns {Promise<ImportResult>} インポート結果
   */
  async import_data(file, options = {}) {
    const { progress_callback = null, filter_callback = null, mastodon_account = null } = options;

    // Mastodonアカウント情報を保存
    if (mastodon_account) {
      this.mastodon_account = mastodon_account
    }

    try {
      // ファイル検証
      const validation_result = this.validate_file(file)
      if (!validation_result.valid) {
        throw new Error(validation_result.message)
      }

      // ファイル内容を読み込み
      const content = await this.read_file_content(file, progress_callback)

      // outbox.jsonの内容を解析
      this.report_progress(progress_callback, {
        step: 'parsing',
        progress: 0,
        message: 'Mastodonデータを解析しています...'
      })

      const raw_posts = await this.parse_mastodon_data(content)

      if (!raw_posts || raw_posts.length === 0) {
        throw new Error('有効な投稿データが見つかりませんでした')
      }

      this.report_progress(progress_callback, {
        step: 'parsed',
        progress: 100,
        message: `${raw_posts.length.toLocaleString()}件のポストを検出しました`
      })

      // バッチ処理でポストを変換
      const posts = await this.process_posts_in_batches(
        raw_posts,
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
   * outbox.jsonからMastodonデータを解析
   * @param {string} content - outbox.jsonの内容
   * @returns {Promise<Array>} 投稿の配列
   */
  async parse_mastodon_data(content) {
    try {
      const data = JSON.parse(content)

      // ActivityPub形式の検証
      if (!data.type || !data.type.includes('OrderedCollection')) {
        throw new Error('有効なActivityPub形式ではありません')
      }

      let items = []

      // OrderedCollectionまたはOrderedCollectionPageの処理
      if (data.orderedItems) {
        items = data.orderedItems
      } else if (data.first) {
        // ページング形式の場合
        if (typeof data.first === 'string') {
          throw new Error('ページング形式のエクスポートは現在サポートされていません。完全なoutbox.jsonをエクスポートしてください。')
        } else if (data.first.orderedItems) {
          items = data.first.orderedItems
        }
      }

      // アクティビティから実際の投稿を抽出
      const statuses = []

      for (const item of items) {
        // CreateアクティビティまたはAnnounceアクティビティをフィルタリング
        if (item.type === 'Create' && item.object) {
          // 通常の投稿
          const status = this.extract_status_from_activity(item)
          if (status) {
            statuses.push(status)
          }
        } else if (item.type === 'Announce' && item.object) {
          // ブースト（再共有）
          // ブーストされた投稿の情報も保存する場合
          const boost = this.extract_boost_from_activity(item)
          if (boost) {
            statuses.push(boost)
          }
        }
      }

      // メモリ安全性チェック
      await this.check_memory_safety()

      return statuses

    } catch (error) {

      throw new Error('Mastodonデータの解析に失敗しました')
    }
  }

  /**
   * アクティビティから投稿データを抽出
   * @param {Object} activity - Createアクティビティ
   * @returns {Object|null} 投稿データ
   */
  extract_status_from_activity(activity) {
    const object = activity.object

    if (!object || object.type !== 'Note') {
      return null
    }

    // ユーザー名を抽出
    const username = this.extract_username_from_actor(activity.actor)

    // デバッグ用ログ
    console.log('Processing status:', {
      id: object.id,
      url: object.url,
      actor: activity.actor,
      extracted_username: username
    })

    // Mastodon投稿データの構築
    const status = {
      id: object.id || activity.id,
      type: 'Note',
      created_at: object.published || activity.published,
      content: object.content || '',

      // アカウント情報（アクティビティから取得）
      account: {
        username: username,
        display_name: username, // 表示名もユーザー名を使用（outbox.jsonには表示名が含まれないため）
        url: activity.actor,
        avatar: null
      },

      // メトリクス（エクスポートには含まれない場合が多い）
      favourites_count: 0,
      reblogs_count: 0,
      replies_count: 0,

      // 言語
      language: object.contentMap ? Object.keys(object.contentMap)[0] : 'ja',

      // メディア添付
      media_attachments: object.attachment || [],

      // タグ
      tags: object.tag?.filter(t => t.type === 'Hashtag').map(t => ({
        name: t.name?.replace('#', '') || ''
      })) || [],

      // メンション
      mentions: object.tag?.filter(t => t.type === 'Mention').map(t => ({
        username: this.extract_username_from_actor(t.href),
        url: t.href
      })) || [],

      // その他のプロパティ
      visibility: object.to?.includes('https://www.w3.org/ns/activitystreams#Public') ? 'public' : 'unlisted',
      sensitive: object.sensitive || false,
      spoiler_text: object.summary || '',

      // 返信情報
      in_reply_to_id: object.inReplyTo,

      // URL: object.urlが人間用のURL、object.idはActivityPub ID
      // object.urlが存在しない場合、object.idからURLを生成
      url: object.url || this.convert_activity_id_to_url(object.id)
    }

    return status
  }

  /**
   * ActivityPub IDから人間が読めるURLに変換
   * @param {string} id - ActivityPub ID
   * @returns {string} 変換後のURL
   */
  convert_activity_id_to_url(id) {
    if (!id) return null

    // 例: https://mstdn.jp/users/yukihirog/statuses/123456789
    // → https://mstdn.jp/@yukihirog/123456789
    const match = id.match(/https?:\/\/([^\/]+)\/users\/([^\/]+)\/statuses\/(\d+)/)
    if (match) {
      const domain = match[1]
      const username = match[2]
      const status_id = match[3]
      return `https://${domain}/@${username}/${status_id}`
    }

    // パターンにマッチしない場合はそのまま返す
    return id
  }

  /**
   * アクティビティからブースト情報を抽出
   * @param {Object} activity - Announceアクティビティ
   * @returns {Object|null} ブーストデータ
   */
  extract_boost_from_activity(activity) {
    // ブースト元のユーザー情報をccフィールドから取得
    let boosted_username = 'unknown'
    let boosted_instance = null
    let boosted_display_name = 'Unknown User'

    if (activity.cc && activity.cc.length > 0) {
      // ccフィールドの最初のURLからユーザー情報を抽出
      const cc_url = activity.cc.find(url => url && url.includes('/users/'))
      if (cc_url) {
        // URLから username@instance 形式の情報を生成
        const url_match = cc_url.match(/https?:\/\/([^\/]+)\/users\/([^\/]+)/)
        if (url_match) {
          boosted_instance = url_match[1]
          boosted_username = url_match[2]
          // 表示名として username@instance 形式を使用（@mastodonは不要）
          boosted_display_name = `${boosted_username}@${boosted_instance}`
        }
      }
    }

    const boost = {
      id: activity.id,
      type: 'Announce',
      created_at: activity.published,
      content: '[ブースト]',  // 本文はシンプルに

      // ブースト元のユーザー情報を設定
      account: {
        username: boosted_username,  // ブースト元のユーザー名
        display_name: boosted_display_name,  // ブースト元の表示名
        url: activity.cc?.[0] || activity.object,  // ブースト元のURL
        avatar: null
      },

      // ブーストのメトリクス
      favourites_count: 0,
      reblogs_count: 0,
      replies_count: 0,

      language: 'ja',
      media_attachments: [],
      tags: [],
      mentions: [],

      visibility: 'public',
      sensitive: false,
      spoiler_text: '',

      // ブースト元のURL
      url: activity.object,

      // SNS固有情報にブーストフラグを追加
      is_boost: true,
      boosted_url: activity.object,
      boosted_user: boosted_display_name,  // ブースト元のユーザー情報も保存

      // ブーストした人の情報も保存
      booster_username: this.extract_username_from_actor(activity.actor),
      booster_url: activity.actor
    }

    return boost
  }

  /**
   * アクターURLからユーザー名を抽出
   * @param {string} actor_url - アクターのURL
   * @returns {string} ユーザー名
   */
  extract_username_from_actor(actor_url) {
    if (!actor_url) return 'unknown'

    // デバッグ用ログ
    console.log('Extracting username from actor URL:', actor_url)

    // パターン1: https://domain/@username 形式
    let match = actor_url.match(/https?:\/\/([^\/]+)\/@([^\/]+)/)
    if (match) {
      const instance = match[1]
      const username = match[2]
      console.log('Pattern 1 matched - username:', username, 'instance:', instance)
      return `${username}@${instance}`
    }

    // パターン2: https://domain/users/username 形式
    match = actor_url.match(/https?:\/\/([^\/]+)\/users\/([^\/]+)/)
    if (match) {
      const instance = match[1]
      const username = match[2]
      console.log('Pattern 2 matched - username:', username, 'instance:', instance)
      return `${username}@${instance}`
    }

    console.log('No pattern matched for URL:', actor_url)
    return 'unknown'
  }

  /**
   * ActivityPub IDから人間が読めるURLに変換
   * @param {string} id - ActivityPub ID
   * @returns {string} 変換後のURL
   */
  convert_activity_id_to_url(id) {
    if (!id) return null

    // 例: https://mstdn.jp/users/yukihirog/statuses/123456789
    // → https://mstdn.jp/@yukihirog/123456789
    const match = id.match(/https?:\/\/([^\/]+)\/users\/([^\/]+)\/statuses\/(\d+)/)
    if (match) {
      const domain = match[1]
      const username = match[2]
      const status_id = match[3]
      return `https://${domain}/@${username}/${status_id}`
    }

    // パターンにマッチしない場合はそのまま返す
    return id
  }

  /**
   * Mastodonの生データを統一スキーマに変換
   * @param {Object} raw_status - Mastodonの生データ
   * @returns {Object} 統一スキーマのデータ
   */
  transform_to_unified_schema(raw_status) {
    try {
      // PostModelのファクトリ関数を使用
      const post = create_post_from_raw_data('mastodon', raw_status)

      // Mastodon固有の追加処理
      // HTMLコンテンツをプレーンテキストに変換（簡易版）
      if (raw_status.content) {
        post.content = this.strip_html(raw_status.content)
      }

      // アカウント情報の設定（インポート時に指定されている場合、かつブーストでない場合）
      if (this.mastodon_account && !raw_status.is_boost) {
        post.author.username = this.mastodon_account
      }

      // ブーストの場合、author情報はそのまま（ブースト元の情報）を使用
      // transform_mastodon_dataで既に正しく設定されているはず

      // インスタンス情報の抽出
      const instance_match = raw_status.account?.url?.match(/https?:\/\/([^\/]+)/)
      if (instance_match) {
        post.sns_specific.instance = instance_match[1]
      }

      // ブースト情報の保存
      if (raw_status.is_boost) {
        post.is_repost = true  // 統一スキーマのリポストフラグを設定
        post.sns_specific.is_boost = true
        post.sns_specific.boosted_url = raw_status.boosted_url
        post.sns_specific.boosted_user = raw_status.boosted_user  // ブースト元ユーザー情報も保存
        post.sns_specific.booster_username = raw_status.booster_username  // ブーストした人
        post.sns_specific.booster_url = raw_status.booster_url
      }

      // URL生成とクリーンアップ
      if (!post.original_url && raw_status.url) {
        let url = raw_status.url

        // ActivityPub IDから人間が読めるURLに変換（必要な場合）
        if (url.includes('/users/') && url.includes('/statuses/')) {
          url = this.convert_activity_id_to_url(url)
        }

        // @users@domain形式の重複を除去
        // 例: https://mstdn.jp/@users@mstdn.jp/... -> https://mstdn.jp/...
        url = url.replace(/@users@[^\/]+\//, '')

        // https://の重複を除去
        // 例: https://mstdn.jp/https://mstdn.jp/... -> https://mstdn.jp/...
        const https_match = url.match(/(https:\/\/[^\/]+)\/(https:\/.+)/)
        if (https_match) {
          // 2つ目のhttps://から始まる部分を使用
          url = https_match[2]
        }

        // 複数のhttps://が含まれる場合の処理
        if (url.split('https://').length > 2) {
          // 最後のhttps://から始まる部分を使用
          const parts = url.split('https://')
          url = 'https://' + parts[parts.length - 1]
        }

        post.original_url = url
        // PostModelのgenerate_url()でも使用できるようにsns_specificにも保存
        post.sns_specific.url = url
      }

      // 言語コードの正規化
      if (post.language && post.language.includes('-')) {
        post.language = post.language.split('-')[0]
      }

      return post.to_db_object()

    } catch (error) {

      // IDの抽出（URLから数値部分のみを取得）
      let mastodon_id = raw_status.id || Date.now().toString()
      if (raw_status.id && raw_status.id.includes('statuses/')) {
        const id_match = raw_status.id.match(/statuses\/(\d+)/)
        if (id_match) {
          mastodon_id = id_match[1]
        }
      }

      // 最小限の情報で返す
      return {
        id: `mastodon_${mastodon_id}`,
        original_id: mastodon_id,
        sns_type: 'mastodon',
        created_at: raw_status.created_at || new Date().toISOString(),
        content: this.strip_html(raw_status.content || 'エラー: 投稿の変換に失敗しました'),
        is_repost: raw_status.is_boost || false,  // エラー時でもリポストフラグを設定
        author: {
          name: raw_status.account?.display_name || raw_status.account?.username || '',
          username: raw_status.account?.username || 'mastodon_user',
          avatar_url: raw_status.account?.avatar || null
        },
        metrics: {
          likes: raw_status.favourites_count || 0,
          shares: raw_status.reblogs_count || 0,
          replies: raw_status.replies_count || 0,
          views: null
        },
        language: 'ja',
        year_month: new Date().toISOString().substring(0, 7),
        media: [],
        urls: [],
        hashtags: [],
        mentions: [],
        sns_specific: {
          instance: 'mastodon.social',
          visibility: raw_status.visibility || 'public',
          sensitive: raw_status.sensitive || false,
          is_boost: raw_status.is_boost || false,
          boosted_user: raw_status.boosted_user || null,  // ブースト元ユーザー情報も保存
          booster_username: raw_status.booster_username || null
        },
        original_url: null,
        imported_at: new Date().toISOString(),
        version: 2
      }
    }
  }

  /**
   * HTMLタグを除去
   * @param {string} html - HTML文字列
   * @returns {string} プレーンテキスト
   */
  strip_html(html) {
    // 基本的なHTML除去（セキュリティのため簡易実装）
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n\n+/g, '\n\n')
      .trim()
  }

  /**
   * 有効なファイル拡張子を取得
   * @returns {Array<string>} 拡張子の配列
   */
  get_valid_extensions() {
    return ['json']
  }

  /**
   * インポート手順を取得
   * @returns {Object} インポート手順情報
   */
  get_import_instructions() {
    return {
      steps: [
        'Mastodonインスタンスの設定画面を開く',
        '「インポートとエクスポート」→「データのエクスポート」を選択',
        '投稿のアーカイブをリクエスト',
        'メールで通知が来たらダウンロード',
        'アーカイブを解凍してoutbox.jsonファイルを見つける',
        'outbox.jsonファイルを選択してインポート'
      ],
      file_info: {
        format: 'outbox.json',
        location: 'アーカイブ内のoutbox.json',
        description: 'ActivityPub形式の投稿データファイル'
      },
      notes: [
        'エクスポートにはインスタンスによって時間がかかる場合があります',
        'メディアファイル（画像・動画）は別途保存が必要です',
        'インスタンスによってエクスポート形式が異なる場合があります',
        'ブーストした投稿も含まれます'
      ]
    }
  }

  /**
   * データ破損チェック
   * @param {Object} status - チェックする投稿データ
   * @returns {boolean} 破損していない場合true
   */
  check_data_integrity(status) {
    if (!super.check_data_integrity(status)) return false

    // Mastodon固有のチェック
    if (!status.id) return false
    if (!status.created_at && !status.published) return false
    if (!status.content && !status.is_boost) return false

    return true
  }
}
