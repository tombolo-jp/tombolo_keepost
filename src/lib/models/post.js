/**
 * 統一ポストモデル
 * マルチSNS対応の統一データスキーマとバリデーション
 */
export class PostModel {
  /**
   * コンストラクタ
   * @param {Object} data - 投稿データ
   */
  constructor(data = {}) {
    // 基本情報
    this.id = data.id || null
    this.original_id = data.original_id || null
    this.sns_type = data.sns_type || null
    this.created_at = data.created_at || null
    this.content = data.content || ''

    // 著者情報
    this.author = {
      name: data.author?.name || 'Unknown',
      username: data.author?.username || 'unknown',
      avatar_url: data.author?.avatar_url || null
    }

    // エンゲージメント情報
    this.metrics = {
      likes: data.metrics?.likes || 0,
      shares: data.metrics?.shares || 0,
      replies: data.metrics?.replies || 0,
      views: data.metrics?.views || null
    }

    // メタデータ
    this.language = data.language || 'ja'
    this.year_month = data.year_month || this.calculate_year_month()

    // エンティティ
    this.media = data.media || []
    this.urls = data.urls || []
    this.hashtags = data.hashtags || []
    this.mentions = data.mentions || []

    // SNS固有情報
    this.sns_specific = data.sns_specific || {}

    // リポスト判定（リツイート、ブースト、リポスト）
    this.is_repost = data.is_repost || false

    // リンク情報
    this.original_url = data.original_url || null

    // 内部管理用
    this.imported_at = data.imported_at || new Date().toISOString()
    this.version = data.version || 2
  }

  /**
   * 年月を計算
   * @returns {string} YYYY-MM形式の年月
   */
  calculate_year_month() {
    if (!this.created_at) return null

    const date = new Date(this.created_at)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')

    return `${year}-${month}`
  }

  /**
   * データのバリデーション
   * @returns {Object} バリデーション結果
   */
  validate() {
    const errors = []

    // 必須フィールドのチェック
    if (!this.id) errors.push('IDが必要です')
    if (!this.original_id) errors.push('オリジナルIDが必要です')
    if (!this.sns_type) errors.push('SNS種別が必要です')
    if (!this.created_at) errors.push('作成日時が必要です')

    // SNS種別の検証
    const valid_sns_types = ['twitter', 'bluesky', 'mastodon']
    if (this.sns_type && !valid_sns_types.includes(this.sns_type)) {
      errors.push(`無効なSNS種別: ${this.sns_type}`)
    }

    // 日付の検証
    if (this.created_at) {
      const date = new Date(this.created_at)
      if (isNaN(date.getTime())) {
        errors.push('無効な作成日時形式')
      }
    }

    // 数値フィールドの検証
    if (this.metrics.likes < 0) errors.push('いいね数は0以上である必要があります')
    if (this.metrics.shares < 0) errors.push('シェア数は0以上である必要があります')
    if (this.metrics.replies < 0) errors.push('返信数は0以上である必要があります')

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 表示用テキストを取得（トランケート対応）
   * @param {number} max_length - 最大文字数
   * @returns {string} 表示用テキスト
   */
  get_display_text(max_length = null) {
    if (!max_length || this.content.length <= max_length) {
      return this.content
    }

    return this.content.substring(0, max_length) + '...'
  }

  /**
   * SNS固有のURLを生成
   * @returns {string} URL
   */
  generate_url() {
    // 既にoriginal_urlが設定されている場合はそれを返す
    if (this.original_url && this.original_url !== '#') {
      return this.original_url
    }

    switch (this.sns_type) {
      case 'twitter':
        return `https://twitter.com/${this.author.username}/status/${this.original_id}`

      case 'bluesky':
        // BlueskyはURL生成に必要な情報が不足しているためnullを返す
        return null

      case 'mastodon':
        // Mastodonのインスタンス情報が必要
        // sns_specificにURLがある場合はそれを使用
        if (this.sns_specific?.url) {
          return this.sns_specific.url
        }
        // インスタンス情報から構築
        const instance = this.sns_specific?.instance || 'mastodon.social'
        // Mastodonの標準的なURL形式: https://instance/@username/postid
        return `https://${instance}/@${this.author.username}/${this.original_id}`

      default:
        return null
    }
  }

  /**
   * SNS種別の表示名を取得
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
   * SNS種別のアイコンを取得
   * @returns {string} アイコン文字
   */
  get_sns_icon() {
    const icons = {
      twitter: 'T',
      bluesky: 'B',
      mastodon: 'M'
    }

    return icons[this.sns_type] || '?'
  }

  /**
   * フォーマットされた日付を取得
   * @param {string} format - 日付フォーマット
   * @returns {string} フォーマット済み日付
   */
  get_formatted_date(format = 'relative') {
    if (!this.created_at) return ''

    const date = new Date(this.created_at)

    switch (format) {
      case 'relative':
        return this.get_relative_time(date)

      case 'short':
        return this.format_short_date(date)

      case 'full':
        return date.toLocaleString('ja-JP')

      case 'date':
        return date.toLocaleDateString('ja-JP')

      default:
        return date.toISOString()
    }
  }

  /**
   * 相対時間を取得
   * @param {Date} date - 日付オブジェクト
   * @returns {string} 相対時間
   */
  get_relative_time(date) {
    const now = new Date()
    const diff = now - date

    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 7) {
      return this.format_short_date(date)
    } else if (days > 0) {
      return `${days}日前`
    } else if (hours > 0) {
      return `${hours}時間前`
    } else if (minutes > 0) {
      return `${minutes}分前`
    } else {
      return '今'
    }
  }

  /**
   * 短い日付形式にフォーマット
   * @param {Date} date - 日付オブジェクト
   * @returns {string} フォーマット済み日付
   */
  format_short_date(date) {
    const now = new Date()
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()

    if (year === now.getFullYear()) {
      return `${month}月${day}日`
    } else {
      return `${year}年${month}月${day}日`
    }
  }

  /**
   * メディアの種類を判定
   * @returns {string|null} メディアタイプ
   */
  get_media_type() {
    if (!this.media || this.media.length === 0) return null

    const first_media = this.media[0]

    if (first_media.type) {
      return first_media.type
    }

    // URLから判定
    const url = first_media.url || first_media.media_url || ''
    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return 'photo'
    if (url.match(/\.(mp4|webm|mov)$/i)) return 'video'

    return 'unknown'
  }

  /**
   * ハッシュタグのリストを取得
   * @returns {Array<string>} ハッシュタグリスト
   */
  get_hashtag_list() {
    if (Array.isArray(this.hashtags)) {
      return this.hashtags
    }

    // コンテンツからハッシュタグを抽出
    const hashtag_regex = /#[^\s#]+/g
    const matches = this.content.match(hashtag_regex) || []

    return matches.map(tag => tag.substring(1))
  }

  /**
   * メンションのリストを取得
   * @returns {Array<string>} メンションリスト
   */
  get_mention_list() {
    if (Array.isArray(this.mentions)) {
      return this.mentions.map(m =>
        typeof m === 'string' ? m : (m.screen_name || m.username)
      )
    }

    // コンテンツからメンションを抽出
    const mention_regex = /@[^\s@]+/g
    const matches = this.content.match(mention_regex) || []

    return matches.map(mention => mention.substring(1))
  }

  /**
   * 検索用の全文テキストを生成
   * @returns {string} 検索用テキスト
   */
  get_searchable_text() {
    const parts = [
      this.content,
      this.author.name,
      this.author.username,
      ...this.get_hashtag_list(),
      ...this.get_mention_list()
    ]

    return parts.filter(Boolean).join(' ').toLowerCase()
  }

  /**
   * JSON形式にシリアライズ
   * @returns {Object} JSONオブジェクト
   */
  to_json() {
    return {
      id: this.id,
      original_id: this.original_id,
      sns_type: this.sns_type,
      created_at: this.created_at,
      content: this.content,
      author: this.author,
      metrics: this.metrics,
      language: this.language,
      year_month: this.year_month,
      media: this.media,
      urls: this.urls,
      hashtags: this.hashtags,
      mentions: this.mentions,
      sns_specific: this.sns_specific,
      is_repost: this.is_repost,
      original_url: this.original_url,
      imported_at: this.imported_at,
      version: this.version
    }
  }

  /**
   * データベース保存用のオブジェクトを生成
   * @returns {Object} 保存用オブジェクト
   */
  to_db_object() {
    const obj = this.to_json()

    // 年月が設定されていない場合は計算
    if (!obj.year_month) {
      obj.year_month = this.calculate_year_month()
    }

    // URLが設定されていない場合は生成
    if (!obj.original_url) {
      obj.original_url = this.generate_url()
    }

    return obj
  }

  /**
   * インスタンスのクローンを作成
   * @returns {PostModel} クローンインスタンス
   */
  clone() {
    return new PostModel(this.to_json())
  }
}

/**
 * ファクトリ関数: 生データからPostModelを作成
 * @param {string} sns_type - SNS種別
 * @param {Object} raw_data - 生データ
 * @returns {PostModel} PostModelインスタンス
 */
export function create_post_from_raw_data(sns_type, raw_data) {
  const transform_functions = {
    twitter: transform_twitter_data,
    bluesky: transform_bluesky_data,
    mastodon: transform_mastodon_data
  }

  const transform = transform_functions[sns_type]

  if (!transform) {
    throw new Error(`未対応のSNS種別: ${sns_type}`)
  }

  const post_data = transform(raw_data)
  return new PostModel(post_data)
}

/**
 * Twitterデータを統一スキーマに変換
 * @param {Object} tweet - Twitterの生データ
 * @returns {Object} 統一スキーマデータ
 */
function transform_twitter_data(tweet) {
  // リツイート判定
  const is_repost = !!tweet.retweeted_status

  // リツイートの場合は元のツイートのコンテンツを使用
  const actual_tweet = tweet.retweeted_status || tweet

  return {
    id: `twitter_${tweet.id_str || tweet.id}`,
    original_id: tweet.id_str || tweet.id,
    sns_type: 'twitter',
    created_at: new Date(tweet.created_at).toISOString(),
    content: actual_tweet.full_text || actual_tweet.text || '',
    is_repost: is_repost,

    author: {
      name: actual_tweet.user?.name || 'Twitter User',
      username: actual_tweet.user?.screen_name || 'unknown',
      avatar_url: actual_tweet.user?.profile_image_url || null
    },

    metrics: {
      likes: actual_tweet.favorite_count || 0,
      shares: actual_tweet.retweet_count || 0,
      replies: actual_tweet.reply_count || 0,
      views: null
    },

    language: actual_tweet.lang || 'ja',

    // extended_entitiesがある場合はそちらを優先（複数画像対応）
    media: (actual_tweet.extended_entities?.media || actual_tweet.entities?.media || []).map(m => ({
      url: m.media_url_https || m.media_url,
      type: m.type,
      display_url: m.display_url
    })),

    urls: (actual_tweet.entities?.urls || []).map(u => ({
      url: u.url,
      expanded_url: u.expanded_url,
      display_url: u.display_url
    })),

    hashtags: (actual_tweet.entities?.hashtags || []).map(h => h.text),

    mentions: (actual_tweet.entities?.user_mentions || []).map(m => ({
      screen_name: m.screen_name,
      name: m.name
    })),

    sns_specific: {
      reply_to_status_id: tweet.in_reply_to_status_id_str,
      quoted_status_id: tweet.quoted_status_id_str,
      is_quote_status: tweet.is_quote_status,
      original_author: is_repost ? actual_tweet.user?.screen_name : null
    }
  }
}

/**
 * Blueskyデータを統一スキーマに変換
 * @param {Object} post - Blueskyの生データ
 * @returns {Object} 統一スキーマデータ
 */
function transform_bluesky_data(post) {
  // リポスト判定（reason.repostを持つ場合はリポスト）
  const is_repost = post.reason?.$type === 'app.bsky.feed.defs#reasonRepost'

  // CIDを優先的にIDとして使用（CIDは投稿内容のハッシュで常に同じ）
  const unique_id = post.cid || post.uri || `bluesky_${Date.now()}`

  // Bluesky AT Protocolのデータ構造に基づく変換
  return {
    id: `bluesky_${unique_id}`,
    original_id: unique_id,
    sns_type: 'bluesky',
    created_at: post.indexedAt || post.createdAt,
    content: post.record?.text || post.text || '',
    is_repost: is_repost,

    author: {
      name: post.author?.displayName || 'Bluesky User',
      username: post.author?.handle || 'unknown',
      avatar_url: post.author?.avatar || null
    },

    metrics: {
      likes: post.likeCount || 0,
      shares: post.repostCount || 0,
      replies: post.replyCount || 0,
      views: null
    },

    language: post.record?.langs?.[0] || 'ja',

    media: (post.embed?.images || []).map(img => ({
      url: img.fullsize,
      type: 'photo',
      display_url: img.thumb
    })),

    urls: [],  // BlueskyのURL処理は後で実装
    hashtags: [],  // Blueskyのハッシュタグ処理は後で実装
    mentions: [],  // Blueskyのメンション処理は後で実装

    sns_specific: {
      cid: post.cid,
      uri: post.uri,
      rkey: post.rkey,  // rkeyも保存
      reply: post.record?.reply,
      original_author: is_repost && post.reason?.by ? post.reason.by.handle : null
    }
  }
}

/**
 * Mastodonデータを統一スキーマに変換
 * @param {Object} status - Mastodonの生データ
 * @returns {Object} 統一スキーマデータ
 */
function transform_mastodon_data(status) {
  // ブースト判定（reblogフィールドがある場合、またはis_boostフラグがある場合）
  const is_repost = !!status.reblog || !!status.is_boost

  // ブーストの場合は元のステータスのコンテンツを使用
  const actual_status = status.reblog || status

  // 表示名とユーザー名の取得
  let display_name = actual_status.account?.display_name ||
                     actual_status.account?.username ||
                     ''
  let username = actual_status.account?.username || 'unknown'

  // ブーストの場合、account情報がブースト元の情報になっているはず
  if (is_repost && status.account) {
    display_name = status.account.display_name || display_name
    username = status.account.username || username
  }

  // IDの抽出（URLから数値部分のみを取得）
  let mastodon_id = status.id
  if (status.id && status.id.includes('statuses/')) {
    // URLから最後のステータスID（数値）を抽出
    const id_match = status.id.match(/statuses\/(\d+)/)
    if (id_match) {
      mastodon_id = id_match[1]
    }
  }

  return {
    id: `mastodon_${mastodon_id}`,
    original_id: mastodon_id,
    sns_type: 'mastodon',
    created_at: status.created_at,
    content: actual_status.content || '',
    is_repost: is_repost,

    author: {
      name: display_name,  // 表示名（ブーストの場合はブースト元）
      username: username,  // ユーザー名（ブーストの場合はブースト元）
      avatar_url: actual_status.account?.avatar || null
    },

    metrics: {
      likes: actual_status.favourites_count || 0,
      shares: actual_status.reblogs_count || 0,
      replies: actual_status.replies_count || 0,
      views: null
    },

    language: actual_status.language || 'ja',

    media: (actual_status.media_attachments || []).map(m => ({
      url: m.url,
      type: m.type,
      display_url: m.preview_url
    })),

    urls: [],  // Mastodonは本文中のリンクを別途解析する必要がある

    hashtags: (actual_status.tags || []).map(t => t.name),

    mentions: (actual_status.mentions || []).map(m => ({
      screen_name: m.username,
      name: m.username
    })),

    sns_specific: {
      instance: actual_status.account?.url?.match(/https?:\/\/([^\/]+)/)?.[1],
      visibility: actual_status.visibility,
      sensitive: actual_status.sensitive,
      spoiler_text: actual_status.spoiler_text,
      original_author: is_repost ? (status.boosted_user || actual_status.account?.username) : null,
      is_boost: is_repost,  // ブーストフラグも保存
      boosted_url: status.boosted_url || null,
      boosted_user: status.boosted_user || null,  // ブースト元ユーザー情報も保存
      booster_username: status.booster_username || null,  // ブーストした人の情報
      booster_url: status.booster_url || null,
      original_url: status.id  // 元のURL（IDとして渡されていた値）を保存
    }
  }
}
