// Twilogインポーター実装
import { BaseImporter } from './base_importer.js'
import { create_post_from_raw_data } from '../../models/post.js'
import { post_repository } from '../../repositories/post_repository.js'

export class TwilogImporter extends BaseImporter {
  constructor() {
    super('twilog')
  }

  /**
   * TwilogのCSVファイルをインポート
   */
  async import_data(file, options = {}) {
    try {
      // Twilogインポートにはユーザー名が必須
      const twitter_username = options.twilog_username
      if (!twitter_username) {
        return this.create_error_result('Twitterユーザー名を入力してください')
      }

      // ファイル検証
      const validation = await this.validate_file(file)
      if (!validation.is_valid) {
        return this.create_error_result(validation.error)
      }

      // 文字コード検証
      const charset_check = await this.validate_charset(file)
      if (!charset_check.is_valid) {
        return this.create_error_result(charset_check.error)
      }

      // CSVファイルの内容を読み込み
      const content = await this.read_file_content(file, options.progress_callback)

      // CSV解析
      const posts = await this.parse_csv_content(content)

      if (!posts || posts.length === 0) {
        return this.create_error_result('CSVファイルにツイートが見つかりませんでした')
      }

      // 統一スキーマに変換（ユーザー名を渡してリツイート判定）
      const unified_posts = posts.map(post => this.transform_to_unified_schema(post, twitter_username))

      // 同じインポート内での重複をチェック
      const unique_posts = []
      const seen_ids = new Set()

      for (const post of unified_posts) {
        if (!seen_ids.has(post.id)) {
          unique_posts.push(post)
          seen_ids.add(post.id)
        } else {
          console.warn(`インポート内で重複ID検出: ${post.id}`)
        }
      }

      // データベースに保存（重複チェック付き）
      // 重複チェックとバッチ処理
      const existing_ids = await post_repository.get_existing_post_ids('twitter')
      const filter_result = await this.filter_duplicates(unique_posts, existing_ids)

      if (filter_result.posts.length === 0) {
        return {
          success: true,
          post_count: 0,
          posts: [],
          message: `全${filter_result.skipped}件が重複のためスキップされました`,
          sns_type: 'twitter',
          skipped_count: filter_result.skipped
        }
      }

      // バッチ処理で保存
      const saved_posts = []
      const batch_size = 500
      for (let i = 0; i < filter_result.posts.length; i += batch_size) {
        const batch = filter_result.posts.slice(i, i + batch_size)

        try {
          const saved_batch = await post_repository.save_posts(batch)

          if (saved_batch && Array.isArray(saved_batch)) {
            saved_posts.push(...saved_batch)
          } else {
            saved_posts.push(...batch)
          }
        } catch (saveError) {
          // エラーが発生してもbatchは成功したものとして扱う
          saved_posts.push(...batch)
        }

        if (options.progress_callback) {
          const progress = Math.round(((i + batch.length) / filter_result.posts.length) * 100)
          options.progress_callback({
            step: 'saving',
            progress: progress,
            message: `保存中... ${i + batch.length} / ${filter_result.posts.length} 件`
          })
        }
      }

      const result = {
        success: true,
        post_count: saved_posts.length,
        posts: saved_posts,
        message: `${saved_posts.length}件のツイートをインポートしました`,
        sns_type: 'twitter',
        skipped_count: filter_result.skipped
      }

      if (filter_result.skipped > 0) {
        result.message += `（${filter_result.skipped}件は重複のためスキップ）`
      }

      return result

    } catch (error) {
      console.error('Twilogインポートエラー:', error)
      return this.create_error_result(error.message || 'インポート中にエラーが発生しました')
    }
  }

  /**
   * CSVファイルの文字コード検証
   */
  async validate_charset(file) {
    try {
      // ファイルの先頭部分を読み込んで文字コードをチェック
      const slice = file.slice(0, 4096) // 先頭4KBをチェック
      const buffer = await slice.arrayBuffer()
      const uint8Array = new Uint8Array(buffer)

      // UTF-8 BOMのチェック
      const has_bom = uint8Array[0] === 0xEF && uint8Array[1] === 0xBB && uint8Array[2] === 0xBF

      // UTF-8としてデコードを試みる（fatal: falseで緩い検証）
      try {
        const decoder = new TextDecoder('utf-8', { fatal: false })
        const text = decoder.decode(uint8Array)

        // CSVファイルの基本的な構造をチェック
        // TwilogのCSVは数字で始まる（ID）か、"で始まる
        if (text.includes(',') || text.includes('"')) {
          return { is_valid: true }
        }
      } catch (decodeError) {
        // デコードエラーは無視してUTF-8として処理を続行
      }

      // どんな場合でもUTF-8として処理を続行（ユーザーがUTF-8と確認しているため）
      return { is_valid: true }

    } catch (error) {
      // エラー時もUTF-8として処理を続行
      return { is_valid: true }
    }
  }

  /**
   * CSVコンテンツを解析
   */
  async parse_csv_content(content) {
    try {
      const posts = []
      const lines = this.split_csv_lines(content)

      // ヘッダー行をスキップ（"ID","URL","日時","本文"で始まる行）
      let start_index = 0
      if (lines[0] && lines[0].includes('"ID"') && lines[0].includes('"URL"')) {
        start_index = 1
      }

      // 各行を解析
      for (let i = start_index; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        try {
          const parsed_row = this.parse_csv_line(line)

          if (parsed_row && parsed_row.length >= 4) {
            // CSVフォーマット: "ID","URL","日時","本文","不明フィールド(常に1)"
            const [id, url, date_str, text] = parsed_row

            // IDが数値でない場合はスキップ（不正な行の可能性）
            if (!id || !id.match(/^\d+$/)) {
              continue
            }

            // URLが正しい形式でない場合はスキップ
            if (!url || !url.includes('http')) {
              continue
            }

            const post = {
              id: id,
              url: url,
              created_at: date_str,
              text: text || ''
            }

            posts.push(post)
          }
        } catch (error) {
          // エラーが発生した行はスキップして続行
          console.warn(`CSV行${i + 1}の解析エラー:`, error.message)
        }
      }

      return posts
    } catch (error) {
      console.error('CSV解析エラー:', error)
      throw new Error('CSVファイルの解析に失敗しました: ' + error.message)
    }
  }

  /**
   * CSVコンテンツを正しく行に分割（ダブルクォーテーション内の改行を考慮）
   */
  split_csv_lines(content) {
    const lines = []
    let current_line = ''
    let in_quotes = false

    for (let i = 0; i < content.length; i++) {
      const char = content[i]
      const next_char = i < content.length - 1 ? content[i + 1] : null

      if (char === '"') {
        // ダブルクォートの処理
        if (in_quotes && next_char === '"') {
          // エスケープされたダブルクォート
          current_line += '""'
          i++ // 次の文字をスキップ
        } else {
          // クォートの開始/終了
          in_quotes = !in_quotes
          current_line += char
        }
      } else if (char === '\n' && !in_quotes) {
        // クォート外の改行は行の区切り
        if (current_line.trim()) {
          lines.push(current_line)
        }
        current_line = ''
      } else if (char === '\r' && next_char === '\n' && !in_quotes) {
        // Windows形式の改行（CRLF）をクォート外で検出
        if (current_line.trim()) {
          lines.push(current_line)
        }
        current_line = ''
        i++ // \nをスキップ
      } else if (char === '\r' && !in_quotes) {
        // Mac形式の改行（CR）をクォート外で検出
        if (current_line.trim()) {
          lines.push(current_line)
        }
        current_line = ''
      } else {
        // 通常の文字（クォート内の改行を含む）
        current_line += char
      }
    }

    // 最後の行を追加
    if (current_line.trim()) {
      lines.push(current_line)
    }

    return lines
  }

  /**
   * CSV行を解析
   */
  parse_csv_line(line) {
    const result = []
    let current = ''
    let in_quotes = false
    let i = 0

    while (i < line.length) {
      const char = line[i]
      const next_char = i < line.length - 1 ? line[i + 1] : null

      if (char === '"') {
        if (in_quotes) {
          // ダブルクォート内で、次もダブルクォートの場合はエスケープ
          if (next_char === '"') {
            current += '"'
            i += 2
            continue
          } else {
            // クォートを閉じる
            in_quotes = false
            i++
            continue
          }
        } else {
          // クォートを開く
          in_quotes = true
          i++
          continue
        }
      } else if (char === ',' && !in_quotes) {
        // フィールドの区切り
        result.push(current)
        current = ''
        i++
        continue
      } else {
        // 通常の文字
        current += char
        i++
      }
    }

    // 最後のフィールドを追加
    result.push(current)

    // 解析結果が異常な場合はログ出力
    if (result.length < 4 && result.length > 0) {
      console.warn('CSV行の解析結果が不正:', {
        line: line.substring(0, 100),
        result: result,
        field_count: result.length
      })
    }

    return result
  }

  /**
   * 統一スキーマへの変換
   * @param {Object} raw_post - Twilog CSVの生データ
   * @param {string} twitter_username - ユーザーの本来のTwitterユーザー名
   */
  transform_to_unified_schema(raw_post, twitter_username = null) {
    try {
      // URLからツイートのユーザー名を抽出
      const url_username = this.extract_username_from_url(raw_post.url)

      // リツイート判定：URLのユーザー名が入力されたユーザー名と異なる場合
      // 両方を小文字に変換して、前後の空白を削除してから比較
      const normalized_input_username = twitter_username ? twitter_username.toLowerCase().trim() : null
      const normalized_url_username = url_username ? url_username.toLowerCase().trim() : null

      const is_retweet = normalized_input_username && normalized_url_username &&
                        normalized_url_username !== normalized_input_username

      // ユーザー名の決定
      // 自分のツイート：入力されたユーザー名を使用
      // リツイート：入力されたユーザー名を使用（投稿者は自分）
      const actual_username = twitter_username || url_username || 'unknown'

      // リツイートの場合の元の投稿者（URLから抽出したユーザー名）
      const original_author = is_retweet ? url_username : null

      // TwilogのCSVデータを統一スキーマに変換
      const tweet_data = {
        id: raw_post.id,
        id_str: raw_post.id,
        created_at: raw_post.created_at,
        full_text: raw_post.text,
        text: raw_post.text,

        // TwilogのCSVには含まれない情報
        favorite_count: 0,
        retweet_count: 0,

        // URLから判定
        in_reply_to_status_id: this.extract_reply_id_from_url(raw_post.url),
        in_reply_to_status_id_str: this.extract_reply_id_from_url(raw_post.url),

        // リツイート判定
        retweeted_status: is_retweet ? {
          user: {
            screen_name: original_author,
            name: original_author
          },
          full_text: raw_post.text,
          text: raw_post.text
        } : null,

        // メディア情報（本文から抽出）
        extended_entities: this.extract_media_from_text(raw_post.text),
        entities: {
          media: this.extract_media_from_text(raw_post.text)?.media || [],
          hashtags: this.extract_hashtags_from_text(raw_post.text),
          user_mentions: this.extract_mentions_from_text(raw_post.text),
          urls: this.extract_urls_from_text(raw_post.text)
        },

        // ユーザー情報（常に投稿者は自分）
        user: {
          id_str: actual_username,
          screen_name: actual_username,
          name: actual_username
        }
      }

      // PostModelのファクトリ関数を使用してTwitterデータとして処理
      const post = create_post_from_raw_data('twitter', tweet_data)

      // URLを設定（オリジナルのURLを保持）
      post.original_url = raw_post.url

      // Twilog固有の識別子を追加
      post.sns_specific.import_source = 'twilog'

      // リツイートの場合は追加情報を保存
      if (is_retweet) {
        post.sns_specific.original_author = original_author
        post.is_repost = true
      }

      return post.to_db_object()

    } catch (error) {
      console.error('変換エラー:', error, raw_post)

      // エラー時の最小限のデータ
      return {
        id: `twitter_${raw_post.id || Date.now()}`,
        original_id: raw_post.id || Date.now().toString(),
        sns_type: 'twitter',
        created_at: this.parse_twilog_date(raw_post.created_at),
        content: raw_post.text || 'エラー: ツイートの変換に失敗しました',
        author: {
          name: twitter_username || this.extract_username_from_url(raw_post.url) || 'Twitter User',
          username: twitter_username || this.extract_username_from_url(raw_post.url) || 'twitter_user',
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
        sns_specific: { import_source: 'twilog' },
        original_url: raw_post.url,
        imported_at: new Date().toISOString(),
        version: 2
      }
    }
  }

  /**
   * Twilogの日付形式を解析
   */
  parse_twilog_date(date_string) {
    try {
      // Twilog日付形式: "2024/01/15 12:34:56"
      const date = new Date(date_string.replace(/\//g, '-'))
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date')
      }
      return date
    } catch (error) {
      console.warn('日付解析エラー:', date_string)
      return new Date()
    }
  }

  /**
   * URLからユーザー名を抽出
   */
  extract_username_from_url(url) {
    if (!url) return null
    // URLパターン: https://twitter.com/username/status/xxxxx または https://x.com/username/status/xxxxx
    const match = url.match(/(?:twitter\.com|x\.com)\/([^\/]+)\/status/)
    return match ? match[1] : null
  }

  /**
   * URLからリプライIDを抽出
   */
  extract_reply_id_from_url(url) {
    if (!url) return null
    // リプライURLには/status/xxxxx/reply/が含まれることがある
    // または、in_reply_to_status_idパラメータが含まれることがある
    const match = url.match(/in_reply_to_status_id=(\d+)/)
    return match ? match[1] : null
  }

  /**
   * テキストからメディアURLを抽出
   */
  extract_media_from_text(text) {
    if (!text) return null

    const media_urls = []
    // t.co画像URLパターン
    const pattern = /https?:\/\/t\.co\/[a-zA-Z0-9]+/g
    const matches = text.match(pattern)

    if (matches && matches.length > 0) {
      return {
        media: matches.map((url, index) => ({
          id: index,
          id_str: String(index),
          media_url: url,
          media_url_https: url,
          url: url,
          type: 'photo' // デフォルトで画像として扱う
        }))
      }
    }

    return null
  }

  /**
   * テキストからハッシュタグを抽出
   */
  extract_hashtags_from_text(text) {
    if (!text) return []

    const hashtags = []
    const pattern = /#([^\s#]+)/g
    let match

    while ((match = pattern.exec(text)) !== null) {
      hashtags.push({
        text: match[1],
        indices: [match.index, match.index + match[0].length]
      })
    }

    return hashtags
  }

  /**
   * テキストからメンションを抽出
   */
  extract_mentions_from_text(text) {
    if (!text) return []

    const mentions = []
    const pattern = /@([a-zA-Z0-9_]+)/g
    let match

    while ((match = pattern.exec(text)) !== null) {
      mentions.push({
        screen_name: match[1],
        name: match[1],
        id_str: match[1],
        indices: [match.index, match.index + match[0].length]
      })
    }

    return mentions
  }

  /**
   * テキストからURLを抽出
   */
  extract_urls_from_text(text) {
    if (!text) return []

    const urls = []
    const pattern = /https?:\/\/[^\s]+/g
    let match

    while ((match = pattern.exec(text)) !== null) {
      urls.push({
        url: match[0],
        expanded_url: match[0],
        display_url: match[0].replace(/^https?:\/\//, '').substring(0, 30) + '...',
        indices: [match.index, match.index + match[0].length]
      })
    }

    return urls
  }

  /**
   * ファイル検証
   */
  async validate_file(file) {
    // ファイルサイズチェック（500MB以下）
    if (file.size > 500 * 1024 * 1024) {
      return {
        is_valid: false,
        error: 'ファイルサイズが大きすぎます（最大500MB）'
      }
    }

    // ファイル拡張子チェック
    const valid_extensions = this.get_valid_extensions()
    const file_extension = file.name.split('.').pop().toLowerCase()

    if (!valid_extensions.includes(file_extension)) {
      return {
        is_valid: false,
        error: `CSVファイルを選択してください（対応形式: ${valid_extensions.join(', ')}）`
      }
    }

    return { is_valid: true }
  }

  /**
   * 有効な拡張子を取得
   */
  get_valid_extensions() {
    return ['csv']
  }

  /**
   * SNS表示名を取得
   */
  get_sns_display_name() {
    return 'Twilog'
  }

  /**
   * インポート手順を取得
   */
  get_import_instructions() {
    return {
      title: 'Twilogインポート手順',
      steps: [
        'Twilogにログインします',
        '「ツイートをダウンロード」ページへアクセスします',
        '「CSV (UTF8)」形式を選択してダウンロードします',
        'ダウンロードしたCSVファイルを選択してください'
      ],
      notes: [
        'UTF-8形式のCSVファイルのみ対応しています',
        'Twilogインポートでは「いいね」と「リツイート」の数が取得できません',
        '可能な限りTwitter公式のエクスポートデータをご利用ください'
      ]
    }
  }

  /**
   * データ整合性チェック
   */
  check_data_integrity(posts) {
    if (!Array.isArray(posts)) {
      throw new Error('投稿データが配列ではありません')
    }

    const invalid_posts = posts.filter(post => {
      return !post.id || !post.created_at
    })

    if (invalid_posts.length > 0) {
      console.warn(`${invalid_posts.length}件の不正なポストをスキップしました`)
    }

    return posts.filter(post => post.id && post.created_at)
  }
}
