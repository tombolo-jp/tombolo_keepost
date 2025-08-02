import { BaseImporter } from './base_importer.js'
import { create_post_from_raw_data } from '../../models/post.js'

/**
 * Bluesky専用インポーター
 * BlueskyのエクスポートデータのインポートをCARファイルまたはJSON形式で処理
 */
export class BlueskyImporter extends BaseImporter {
  constructor() {
    super('bluesky')
  }

  /**
   * Blueskyエクスポートデータをインポート
   * @param {File} file - エクスポートファイル（.carまたは.json）
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

      let posts_data = []

      if (file.name.endsWith('.car')) {
        // CARファイルの処理
        posts_data = await this.import_car_file(file, progress_callback)
      } else {
        throw new Error('サポートされていないファイル形式です')
      }

      if (!posts_data || posts_data.length === 0) {
        throw new Error('有効なポストデータが見つかりませんでした')
      }

      this.report_progress(progress_callback, {
        step: 'parsed',
        progress: 100,
        message: `${posts_data.length.toLocaleString()}件のポストを検出しました`
      })

      // バッチ処理でポストを変換
      const posts = await this.process_posts_in_batches(
        posts_data,
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
   * CARファイルをインポート
   * @param {File} file - CARファイル
   * @param {Function} progress_callback - 進捗コールバック
   * @returns {Promise<Array>} ポストデータの配列
   */
  async import_car_file(file, progress_callback) {
    this.report_progress(progress_callback, {
      step: 'parsing',
      progress: 0,
      message: 'CARファイルを解析しています...'
    })

    try {

      // CARファイルをArrayBufferとして読み込み
      const array_buffer = await file.arrayBuffer()

      // @ipld/carおよび@ipld/dag-cborライブラリの動的インポート
      let CarReader
      let decode
      try {
        const carModule = await import('@ipld/car')
        const cborModule = await import('@ipld/dag-cbor')
        CarReader = carModule.CarReader
        decode = cborModule.decode
      } catch (importError) {

        throw new Error('CARファイル解析ライブラリの読み込みに失敗しました。')
      }
      
      // CARファイルの解析
      let reader
      try {
        reader = await CarReader.fromBytes(new Uint8Array(array_buffer))
      } catch (parseError) {

        throw new Error('CARファイル形式が正しくありません。Blueskyの最新エクスポートファイルをご使用ください。')
      }
      
      const posts = []
      const roots = await reader.getRoots()

      this.report_progress(progress_callback, {
        step: 'parsing',
        progress: 20,
        message: 'CARファイルのブロックを読み込んでいます...'
      })
      
      // すべてのブロックを読み込む
      const blocks = new Map()
      let block_count = 0
      
      // ルートから情報を取得
      for (const root of roots) {

        // ルートブロックをデコードしてリポジトリ情報を取得
        try {
          const root_block = await reader.get(root)
          if (root_block) {
            const root_data = decode(root_block.bytes)

            // DIDの取得を試みる
            if (root_data && root_data.did) {
              did = root_data.did

            }
          }
        } catch (e) {

        }
      }
      
      try {
        for await (const { cid, bytes } of reader.blocks()) {
          blocks.set(cid.toString(), bytes)
          block_count++
          
          // 進捗を更新（100ブロックごと）
          if (block_count % 100 === 0) {
            this.report_progress(progress_callback, {
              step: 'parsing',
              progress: Math.min(40, 20 + (block_count / 100)),
              message: `${block_count}個のブロックを処理中...`
            })
          }
        }
      } catch (blockError) {

        throw new Error('CARファイルのデータ読み込みに失敗しました。')
      }

      this.report_progress(progress_callback, {
        step: 'parsing',
        progress: 50,
        message: 'ポストデータを抽出しています...'
      })
      
      // CARファイルからポストデータを抽出
      let processed_count = 0
      let post_count = 0
      let profile_data = null
      let user_handle = null
      let did = null
      const post_records = []  // 全ポストレコードを格納
      const path_to_cid = new Map()  // パス -> CIDのマッピング
      
      for (const [cid, bytes] of blocks) {
        processed_count++
        
        try {
          // CBORデータをデコード
          const data = decode(bytes)
          
          // プロフィール情報を探す（app.bsky.actor.profile）
          if (data && data.$type === 'app.bsky.actor.profile') {
            profile_data = data
            user_handle = data.handle || data.displayName

          }
          
          // ハンドル情報の取得を試みる（#self レコードなど）
          if (data && data.handle) {
            user_handle = data.handle

          }
          
          // repo情報からDIDを取得（CARファイルのルート構造）
          if (data && data.did) {
            did = data.did

          }
          
          // app.bsky.feed.post タイプのレコードを探す
          if (data && data.$type === 'app.bsky.feed.post') {
            // CIDから実際のrkeyを抽出
            // CIDは通常 bafyrei... の形式だが、実際のrkeyはCARファイル内のパス構造から取得する必要がある
            // CIDの最後の13文字をrkeyとして使用（簡易的な方法）
            let rkey = cid
            if (cid.length > 13) {
              // Blueskyの標準的なrkey形式（13文字）に合わせる
              // CIDのハッシュから13文字を生成
              const hash = cid.substring(cid.length - 20, cid.length - 7)
              rkey = '3' + hash.toLowerCase().substring(0, 12)
            }
            
            // レコードを保存（後でまとめて処理）
            post_records.push({
              cid: cid,
              rkey: rkey,
              data: data,
              createdAt: data.createdAt || new Date().toISOString()
            })
            post_count++
            
            // 進捗を更新（10件ごと）
            if (post_count % 10 === 0) {
              this.report_progress(progress_callback, {
                step: 'parsing',
                progress: Math.min(70, 50 + (post_count / 10)),
                message: `${post_count}件のポストを検出...`
              })
            }
          }
        } catch (decode_error) {
          // デコードエラーは無視（バイナリデータなど）
          // ポストデータ以外のブロックも含まれるため、これは正常
        }
      }
      
      // post_recordsをpostsに変換
      // ユーザーハンドルがない場合はファイル名から推測を試みる
      if (!user_handle && file.name) {
        // ファイル名からハンドルを推測（例: username.bsky.social.car -> username.bsky.social）
        const name_match = file.name.match(/^([^.]+(?:\.[^.]+)*?)(?:\.car)?$/i)
        if (name_match) {
          user_handle = name_match[1]

        }
      }
      
      // DIDがない場合、ファイル名から推測を試みる
      if (!did && file.name) {
        // ファイル名にdidが含まれている場合
        const did_match = file.name.match(/did[:]plc[:]([a-z0-9]+)/i)
        if (did_match) {
          did = `did:plc:${did_match[1]}`

        }
      }
      
      // post_recordsをpostsフォーマットに変換
      let rkey_counter = 0
      for (const record of post_records) {
        // BlueskyのTID形式のrkeyを生成
        // 形式: 3 + タイムスタンプ(base32) + シーケンス番号
        const timestamp = record.createdAt ? new Date(record.createdAt).getTime() : Date.now()
        const tid_timestamp = Math.floor(timestamp * 1000) // マイクロ秒精度
        const tid_clock = rkey_counter++ % 1024 // シーケンス番号（0-1023）
        
        // Base32エンコード用の文字セット
        const base32chars = '234567abcdefghijklmnopqrstuvwxyz'
        
        // タイムスタンプとシーケンスを組み合わせてTIDを生成
        const tid_bigint = BigInt(tid_timestamp) * 1024n + BigInt(tid_clock)
        let tid_str = ''
        let n = tid_bigint
        while (n > 0n) {
          tid_str = base32chars[Number(n % 32n)] + tid_str
          n = n / 32n
        }
        
        // 13文字にパディング（3 + 10文字のbase32）
        const rkey = '3' + tid_str.padStart(12, '2')
        
        // DIDとrkeyからURIを構築
        const post_uri = did ? `at://${did}/app.bsky.feed.post/${rkey}` : null
        
        posts.push({
          cid: record.cid,
          uri: post_uri,
          rkey: rkey,
          record: record.data,
          createdAt: record.createdAt,
          author: {
            handle: user_handle || 'unknown.bsky.social',
            displayName: profile_data?.displayName || profile_data?.name || 'Bluesky User',
            avatar: profile_data?.avatar
          }
        })
      }

      this.report_progress(progress_callback, {
        step: 'parsing',
        progress: 80,
        message: `${posts.length}件のポストを検出しました`
      })
      
      // ポストが見つからない場合の詳細エラー
      if (posts.length === 0) {

        throw new Error('CARファイル内に有効なポストデータが見つかりませんでした。エクスポートファイルが正しいか確認してください。')
      }
      
      // メモリ安全性チェック
      await this.check_memory_safety()
      
      return posts
      
    } catch (error) {

      // エラーメッセージの改善
      if (error.message.includes('ライブラリ')) {
        throw error
      } else if (error.message.includes('形式')) {
        throw error
      } else if (error.message.includes('ポストデータ')) {
        throw error
      } else {
        throw new Error(`CARファイルの解析に失敗しました: ${error.message}`)
      }
    }
  }

  /**
   * JSONファイルをインポート
   * @param {File} file - JSONファイル
   * @param {Function} progress_callback - 進捗コールバック
   * @returns {Promise<Array>} ポストデータの配列
   */
  async import_json_file(file, progress_callback) {
    this.report_progress(progress_callback, {
      step: 'parsing',
      progress: 0,
      message: 'JSONファイルを解析しています...'
    })

    const content = await this.read_file_content(file, progress_callback)

    try {
      const data = JSON.parse(content)
      
      // Blueskyのエクスポートデータ構造に基づいて解析
      let posts = []
      
      // 複数の形式に対応
      if (Array.isArray(data)) {
        // 配列形式の場合
        posts = data
      } else if (data.posts) {
        // posts プロパティがある場合
        posts = data.posts
      } else if (data.feed) {
        // feed プロパティがある場合
        posts = data.feed
      } else {
        // 他の可能性のある構造をチェック
        const possible_keys = ['timeline', 'items', 'entries']
        for (const key of possible_keys) {
          if (data[key] && Array.isArray(data[key])) {
            posts = data[key]
            break
          }
        }
      }

      if (!Array.isArray(posts)) {
        throw new Error('有効なポストデータが見つかりませんでした')
      }

      // メモリ安全性チェック
      await this.check_memory_safety()

      return posts

    } catch (error) {

      throw new Error('JSONファイルの解析に失敗しました')
    }
  }

  /**
   * Blueskyの生データを統一スキーマに変換
   * @param {Object} raw_post - Blueskyの生データ
   * @returns {Object} 統一スキーマのデータ
   */
  transform_to_unified_schema(raw_post) {
    try {
      // PostModelのファクトリ関数を使用
      const post = create_post_from_raw_data('bluesky', raw_post)
      
      // Bluesky固有の追加処理
      // AT Protocolの構造を解析
      if (raw_post.record) {
        // テキストコンテンツ
        if (raw_post.record.text) {
          post.content = raw_post.record.text
        }
        
        // facets（リンク、メンション、ハッシュタグ）の処理
        if (raw_post.record.facets) {
          this.process_facets(post, raw_post.record.facets)
        }
        
        // 埋め込みコンテンツの処理
        if (raw_post.record.embed) {
          this.process_embed(post, raw_post.record.embed)
        }
      }
      
      // CIDとURIの確実な保存
      post.sns_specific.cid = raw_post.cid || raw_post.record?.cid
      post.sns_specific.uri = raw_post.uri || raw_post.record?.uri
      post.sns_specific.rkey = raw_post.rkey  // rkeyを保存
      
      // author情報の更新（CARファイルから取得した情報がある場合）
      if (raw_post.author) {
        post.author.username = raw_post.author.handle || post.author.username
        post.author.name = raw_post.author.displayName || post.author.name
        post.author.avatar_url = raw_post.author.avatar || post.author.avatar_url
      }
      
      // PostModelのgenerate_url()でURLを生成するため、ここでは設定しない
      // URIはsns_specificに保存済みなので、PostModelが適切にURLを生成できる
      
      return post.to_db_object()
      
    } catch (error) {

      // 最小限の情報で返す
      return {
        id: `bluesky_${raw_post.uri || raw_post.cid || Date.now()}`,
        original_id: raw_post.uri || raw_post.cid || Date.now().toString(),
        sns_type: 'bluesky',
        created_at: raw_post.indexedAt || raw_post.createdAt || new Date().toISOString(),
        content: raw_post.record?.text || raw_post.text || 'エラー: ポストの変換に失敗しました',
        author: {
          name: raw_post.author?.displayName || 'Bluesky User',
          username: raw_post.author?.handle || 'bluesky_user',
          avatar_url: raw_post.author?.avatar || null
        },
        metrics: {
          likes: raw_post.likeCount || 0,
          shares: raw_post.repostCount || 0,
          replies: raw_post.replyCount || 0,
          views: null
        },
        language: 'ja',
        year_month: new Date().toISOString().substring(0, 7),
        media: [],
        urls: [],
        hashtags: [],
        mentions: [],
        sns_specific: {
          cid: raw_post.cid,
          uri: raw_post.uri
        },
        is_kept: false,
        kept_at: null,
        original_url: null,
        imported_at: new Date().toISOString(),
        version: 2
      }
    }
  }

  /**
   * Blueskyのfacetsを処理（リンク、メンション、ハッシュタグ）
   * @param {PostModel} post - ポストモデル
   * @param {Array} facets - facetsデータ
   */
  process_facets(post, facets) {
    for (const facet of facets) {
      if (!facet.features) continue
      
      for (const feature of facet.features) {
        if (feature.$type === 'app.bsky.richtext.facet#mention') {
          // メンション
          const handle = feature.did || feature.handle
          if (handle && !post.mentions.includes(handle)) {
            post.mentions.push(handle)
          }
        } else if (feature.$type === 'app.bsky.richtext.facet#link') {
          // リンク
          if (feature.uri) {
            post.urls.push({
              url: feature.uri,
              expanded_url: feature.uri,
              display_url: feature.uri
            })
          }
        } else if (feature.$type === 'app.bsky.richtext.facet#tag') {
          // ハッシュタグ
          if (feature.tag && !post.hashtags.includes(feature.tag)) {
            post.hashtags.push(feature.tag)
          }
        }
      }
    }
  }

  /**
   * Blueskyの埋め込みコンテンツを処理
   * @param {PostModel} post - ポストモデル
   * @param {Object} embed - 埋め込みデータ
   */
  process_embed(post, embed) {
    if (embed.$type === 'app.bsky.embed.images') {
      // 画像埋め込み
      if (embed.images) {
        for (const image of embed.images) {
          post.media.push({
            url: image.fullsize || image.thumb,
            type: 'photo',
            display_url: image.thumb,
            alt: image.alt || null
          })
        }
      }
    } else if (embed.$type === 'app.bsky.embed.external') {
      // 外部リンク埋め込み
      if (embed.external) {
        post.urls.push({
          url: embed.external.uri,
          expanded_url: embed.external.uri,
          display_url: embed.external.title || embed.external.uri,
          description: embed.external.description
        })
      }
    } else if (embed.$type === 'app.bsky.embed.record') {
      // 引用ポスト
      post.sns_specific.quoted_post = embed.record
    }
  }

  /**
   * 有効なファイル拡張子を取得
   * @returns {Array<string>} 拡張子の配列
   */
  get_valid_extensions() {
    return ['car']
  }

  /**
   * インポート手順を取得
   * @returns {Object} インポート手順情報
   */
  get_import_instructions() {
    return {
      steps: [
        'Blueskyの設定から「Export My Data」を選択',
        'エクスポート形式でJSONを選択（推奨）',
        'エクスポートをリクエスト',
        'ダウンロード完了通知を待つ',
        'ダウンロードしたファイルを選択してインポート'
      ],
      file_info: {
        format: '.car',
        location: 'ダウンロードフォルダ',
        description: 'BlueskyからエクスポートしたCARファイル'
      },
      notes: [
        'CARファイル形式のみサポートしています',
        'Blueskyの設定からエクスポートをリクエストしてください',
        'エクスポートには時間がかかる場合があります'
      ]
    }
  }

  /**
   * データ破損チェック
   * @param {Object} post - チェックするポストデータ
   * @returns {boolean} 破損していない場合true
   */
  check_data_integrity(post) {
    if (!super.check_data_integrity(post)) return false
    
    // Bluesky固有のチェック
    if (!post.uri && !post.cid) return false
    if (!post.record && !post.text) return false
    
    return true
  }
}