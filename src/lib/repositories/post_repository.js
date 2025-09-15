import { db } from '../db/database.js';
import { debug_log, debug_error, debug_warn } from '../utils/debug.js';

/**
 * マルチSNS対応統一ポストリポジトリ
 * Twitter/Bluesky/Mastodon等の投稿データを統一スキーマで管理
 * Dexie.jsを使用した実装
 */
export class PostRepository {
  constructor() {
    this.schema_version = 4;
  }

  /**
   * データベースを初期化
   * Dexie.jsでは自動的に処理されるため、互換性のためのメソッド
   */
  async initialize_database() {
    await db.initialize();
    return db;
  }

  /**
   * データベースが初期化されているか確認
   * Dexie.jsでは自動的に処理される
   */
  async ensure_initialized() {
    if (!db.isOpen()) {
      debug_log('post_repository.ensure_initialized: Opening database...');
      await db.open();
      debug_log('post_repository.ensure_initialized: Database opened successfully');
    }
    return db;
  }

  /**
   * ポストを保存（バッチ処理対応）
   * @param {Post[]} posts - 保存するポストの配列
   * @returns {Promise<void>}
   */
  async save_posts(posts) {
    await this.ensure_initialized();

    try {
      // トランザクション内でバッチ追加
      const result = await db.transaction('rw', db.posts, async () => {
        const processed_posts = posts.map(post => {
          // 日付から年月を抽出してインデックス用に追加
          const created_date = new Date(post.created_at);
          post.year_month = `${created_date.getFullYear()}-${String(created_date.getMonth() + 1).padStart(2, '0')}`;
          return post;
        });

        // バルク挿入（重複はスキップ）
        let saved_count = 0;
        let saved_posts = [];

        try {
          saved_count = await db.posts.bulkAdd(processed_posts);
          saved_posts = processed_posts;
        } catch (err) {
          if (err.name === 'BulkError') {
            // BulkErrorの場合、成功したものだけを取得
            console.log(`バルク挿入で一部エラー: ${err.failures.length}件失敗`);

            // 成功したポストを特定
            for (let i = 0; i < processed_posts.length; i++) {
              if (!err.failuresByPos[i]) {
                saved_posts.push(processed_posts[i]);
                saved_count++;
              }
            }

            // 失敗したものを個別に処理
            for (let i = 0; i < processed_posts.length; i++) {
              if (err.failuresByPos[i]) {
                const post = processed_posts[i];
                try {
                  // 既存のポストがある場合はスキップ
                  const existing = await db.posts.get(post.id);
                  if (!existing) {
                    await db.posts.add(post);
                    saved_posts.push(post);
                    saved_count++;
                  }
                } catch (e) {
                  // 個別の重複もスキップ（エラーログは出さない）
                }
              }
            }
          } else if (err.name === 'ConstraintError') {
            // 重複エラーは無視して、個別に処理
            for (const post of processed_posts) {
              try {
                await db.posts.add(post);
                saved_posts.push(post);
                saved_count++;
              } catch (e) {
                // 個別の重複も無視
              }
            }
          } else {
            throw err;
          }
        }

        // 保存されたポストを返す
        return saved_posts;
      });

      return result;

    } catch (error) {
      console.error('ポスト保存エラー:', error);
      // エラーが発生しても、元のポストを返す（インポートを継続するため）
      return posts;
    }
  }

  async save_posts_with_diff(posts, sns_type) {
    await this.ensure_initialized();

    try {
      // 既存のポストIDを取得（SNS種別でフィルタリング）
      const existing_posts = await db.posts
        .where('sns_type')
        .equals(sns_type)
        .toArray();

      const existing_ids = new Set(existing_posts.map(p => p.original_id));

      // 差分のみを抽出
      const new_posts = posts.filter(post => !existing_ids.has(post.original_id));

      if (new_posts.length === 0) {
        return {
          imported: 0,
          skipped: posts.length,
          total: posts.length,
          message: 'すべてのポストは既にインポート済みです'
        };
      }

      // トランザクション内でバッチ追加
      await db.transaction('rw', db.posts, async () => {
        const processed_posts = new_posts.map(post => {
          // 日付から年月を抽出してインデックス用に追加
          const created_date = new Date(post.created_at);
          post.year_month = `${created_date.getFullYear()}-${String(created_date.getMonth() + 1).padStart(2, '0')}`;
          return post;
        });

        await db.posts.bulkAdd(processed_posts);
      });

      return {
        imported: new_posts.length,
        skipped: posts.length - new_posts.length,
        total: posts.length,
        message: `${new_posts.length}件の新規ポストをインポートしました`
      };
    } catch (error) {

      throw new Error('差分インポートに失敗しました');
    }
  }

  // 重複キーを生成するヘルパー関数
  generate_duplicate_key(post, sns_type) {
    switch(sns_type) {
      case 'twitter':
        return `twitter_${post.id_str || post.id}`;
      case 'bluesky':
        return `bluesky_${post.uri || post.cid}`;
      case 'mastodon':
        return `mastodon_${post.id}`;
      default:
        return `${sns_type}_${post.original_id}`;
    }
  }

  // 既存ポストのIDセットを取得
  async get_existing_post_ids(sns_type = null) {
    await this.ensure_initialized();

    try {
      let query = db.posts;
      if (sns_type) {
        query = query.where('sns_type').equals(sns_type);
      }

      const posts = await query.toArray();
      const id_set = new Set();

      posts.forEach(post => {
        const key = this.generate_duplicate_key(post, post.sns_type);
        id_set.add(key);
      });

      return id_set;
    } catch (error) {

      return new Set();
    }
  }

  /**
   * ポストを取得（ページネーション対応）
   * @param {QueryOptions} options - クエリオプション
   * @returns {Promise<Post[]>} ポストの配列
   */
  async get_posts(options = {}) {
    debug_log('post_repository.get_posts called with:', options);
    await this.ensure_initialized();

    // データベースの状態を確認
    const count = await db.posts.count();
    debug_log(`post_repository: Total posts in DB: ${count}`);

    const {
      limit = 20,
      offset = 0,
      sort = 'created_desc',  // created_desc | created_asc | kept_desc | kept_asc
      filter = {}
    } = options;

    debug_log('Extracted filter from options:', filter);

    // filterオブジェクトから個別のフィルター値を取得
    const {
      sns_type = null,
      is_kept = null,
      year_month = null,
      has_media = null,
      language = null,
      has_links = null
    } = filter;

    debug_log('Filter values:', { sns_type, is_kept, year_month, has_media, language, has_links });

    try {
      // KEEPフィルター専用の処理パス
      if (is_kept === true) {
        // keep_itemsテーブルから全件取得してフィルタリング
        let keep_items = await db.keep_items.toArray();
        
        // SNS種別フィルター（メモリ上でフィルタリング）
        if (sns_type) {
          keep_items = keep_items.filter(item => item.sns_type === sns_type);
        }
        
        // ソート処理（kept_at または created_at）
        // まずポスト情報も一緒に取得してからソート
        const post_ids_for_sort = keep_items.map(item => item.post_id);
        const posts_for_sort = await db.posts.where('id').anyOf(post_ids_for_sort).toArray();
        const posts_map_for_sort = new Map(posts_for_sort.map(p => [p.id, p]));

        // keep_itemsにポスト情報を結合
        const items_with_posts = keep_items.map(item => ({
          ...item,
          created_at: posts_map_for_sort.get(item.post_id)?.created_at
        }));

        // ソートタイプに応じてソート
        items_with_posts.sort((a, b) => {
          if (sort === 'kept_desc' || sort === 'kept_asc') {
            // KEEP日時でソート
            const dateA = new Date(a.kept_at);
            const dateB = new Date(b.kept_at);
            return sort === 'kept_desc' ? dateB - dateA : dateA - dateB;
          } else {
            // 投稿日時でソート
            const dateA = new Date(a.created_at);
            const dateB = new Date(b.created_at);
            return sort === 'created_desc' ? dateB - dateA : dateA - dateB;
          }
        });

        keep_items = items_with_posts;
        
        // ページネーション
        const paginated_items = keep_items.slice(offset, offset + limit);
        
        // 対応するポストを一括取得
        const post_ids = paginated_items.map(item => item.post_id);
        
        if (post_ids.length === 0) {
          debug_log('post_repository.get_posts (KEEP filter) result: no posts');
          return [];
        }
        
        const posts = await db.posts.where('id').anyOf(post_ids).toArray();

        // post_idsの順序を保持しながらpostsを並び替え
        const posts_map = new Map(posts.map(p => [p.id, p]));
        const sorted_posts = [];

        for (const keep_item of paginated_items) {
          const post = posts_map.get(keep_item.post_id);
          if (post) {
            // JavaScriptオブジェクトにkept情報を追加（DBは更新しない）
            sorted_posts.push({
              ...post,
              is_kept: true,
              kept_at: keep_item.kept_at
            });
          }
        }

        // 年月フィルター（KEEPデータに対して追加フィルタリング）
        let filtered_posts = sorted_posts;
        if (year_month) {
          filtered_posts = filtered_posts.filter(post => post.year_month === year_month);
        }

        // メディアフィルター
        if (has_media !== null) {
          filtered_posts = filtered_posts.filter(post =>
            has_media ? (post.media && post.media.length > 0) : (!post.media || post.media.length === 0)
          );
        }

        debug_log('post_repository.get_posts (KEEP filter) result:', {
          count: filtered_posts.length,
          offset,
          limit,
          first_post: filtered_posts[0]?.id || 'no posts'
        });

        return filtered_posts;
      }

      let query = db.posts;

      // SNS種別でフィルタリング
      debug_log('sns_type check:', { sns_type });
      if (sns_type && sns_type !== null) {
        debug_log('Applying sns_filter:', sns_type);
        query = query.where('[sns_type+created_at]').between(
          [sns_type, new Date(0).toISOString()],
          [sns_type, new Date().toISOString()]
        );
      } else {
        debug_log('Using orderBy for all posts');
        query = query.orderBy('created_at');
      }

      // ソート順を適用
      if (sort === 'created_desc' || sort === 'kept_desc') {
        query = query.reverse();
      }

      // 年月フィルタリング
      if (year_month) {
        query = query.filter(post => post.year_month === year_month);
      }


      // メディアフィルタリング
      if (has_media !== null) {
        query = query.filter(post =>
          has_media ? (post.media && post.media.length > 0) : (!post.media || post.media.length === 0)
        );
      }

      // リンクフィルタリング（削除予定だが互換性のため残す）
      if (has_links !== null) {
        query = query.filter(post =>
          has_links ? (post.urls && post.urls.length > 0) : (!post.urls || post.urls.length === 0)
        );
      }

      // 言語フィルタリング（削除予定だが互換性のため残す）
      if (language) {
        query = query.filter(post => post.language === language);
      }

      // ページネーション
      const posts = await query
        .offset(offset)
        .limit(limit)
        .toArray();

      // 通常の処理パス（KEEP以外のフィルター）
      let filtered_posts = posts;

      // すべてのポストにKEEP状態を追加
      const keep_items = await db.keep_items.toArray();
      const kept_post_ids = new Set(keep_items.map(item => item.post_id));

      const posts_with_keep_status = filtered_posts.map(post => ({
        ...post,
        is_kept: kept_post_ids.has(post.id)
      }));

      debug_log('post_repository.get_posts result:', {
        count: posts_with_keep_status.length,
        offset,
        limit,
        first_post: posts_with_keep_status[0]?.id || 'no posts'
      });

      return posts_with_keep_status;
    } catch (error) {
      debug_error('post_repository.get_posts error:', error);
      throw new Error('ポストの取得に失敗しました');
    }
  }

  /**
   * IDでポストを取得
   * @param {string} post_id - ポストID
   * @returns {Promise<Object|null>} ポスト情報またはnull
   */
  async get_post_by_id(post_id) {
    await this.ensure_initialized();

    try {
      const post = await db.posts.get(post_id);
      return post || null;
    } catch (error) {

      return null;
    }
  }

  /**
   * SNS種別でポストを取得
   * @param {string} sns_type - SNS種別
   * @param {QueryOptions} options - クエリオプション
   * @returns {Promise<Post[]>} ポストの配列
   */
  async get_posts_by_sns(sns_type, options = {}) {
    return this.get_posts({ ...options, sns_type });
  }

  /**
   * KEEPされたポストを取得
   * @param {QueryOptions} options - クエリオプション
   * @returns {Promise<Post[]>} ポストの配列
   */
  async get_kept_posts(options = {}) {
    // keep_itemsテーブルから取得
    const keep_items = await db.keep_items.toArray();
    const kept_post_ids = keep_items.map(item => item.post_id);

    if (kept_post_ids.length === 0) {
      return [];
    }

    // KEEPされているポストを取得
    const posts = await db.posts.where('id').anyOf(kept_post_ids).toArray();

    // KEEPの日時情報を追加
    return posts.map(post => {
      const keep_item = keep_items.find(item => item.post_id === post.id);
      return {
        ...post,
        kept_at: keep_item ? keep_item.kept_at : null
      };
    });
  }

  /**
   * ポストの総数を取得
   * @param {Object} filter - フィルター条件
   * @returns {Promise<number>} ポスト数
   */
  async get_post_count(filter = {}) {
    debug_log('post_repository.get_post_count called with:', filter);
    await this.ensure_initialized();

    try {
      let query = db.posts;

      // SNS種別フィルター
      if (filter.sns_type) {
        query = query.where('sns_type').equals(filter.sns_type);
      }

      // 年月フィルター
      if (filter.year_month) {
        query = query.filter(post => post.year_month === filter.year_month);
      }


      // メディアフィルター
      if (filter.has_media !== null && filter.has_media !== undefined) {
        query = query.filter(post =>
          filter.has_media ? (post.media && post.media.length > 0) : (!post.media || post.media.length === 0)
        );
      }

      // KEEPフィルター
      if (filter.is_kept === true) {
        // keep_itemsテーブルから取得
        let keep_items = await db.keep_items.toArray();
        
        // SNS種別フィルターが適用されている場合は、keep_itemsもフィルタリング
        if (filter.sns_type) {
          keep_items = keep_items.filter(item => item.sns_type === filter.sns_type);
        }
        
        const kept_post_ids = new Set(keep_items.map(item => item.post_id));
        query = query.filter(post => kept_post_ids.has(post.id));
      }

      const count = await query.count();
      debug_log('post_repository.get_post_count result:', count);
      return count;
    } catch (error) {
      debug_error('post_repository.get_post_count error:', error);

      return 0;
    }
  }

  /**
   * ポストを更新
   * @param {string} post_id - ポストID
   * @param {Object} updates - 更新内容
   * @returns {Promise<void>}
   */
  async update_post(post_id, updates) {
    await this.ensure_initialized();

    try {
      const post = await db.posts.get(post_id);

      if (!post) {
        throw new Error('ポストが見つかりません');
      }

      // 更新内容をマージして保存
      await db.posts.put({ ...post, ...updates });
    } catch (error) {

      throw new Error('ポストの更新に失敗しました');
    }
  }

  /**
   * すべてのデータをクリア
   * @returns {Promise<void>}
   */
  async clear_all_data() {
    await this.ensure_initialized();

    try {
      await db.transaction('rw', db.posts, db.keep_items, db.settings, async () => {
        await db.posts.clear();
        await db.keep_items.clear();
        await db.settings.clear();
      });

      // localStorage もクリア
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }

      // sessionStorage もクリア
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }

    } catch (error) {

      throw new Error('データのクリアに失敗しました');
    }
  }

  /**
   * 特定のSNSの投稿データのみを削除（KEEPデータは保持）
   */
  async clear_posts_by_sns(sns_type) {
    await this.ensure_initialized();

    try {
      // Twilogも含める場合の処理
      const sns_types = sns_type === 'twitter' ? ['twitter', 'twilog'] : [sns_type];

      await db.transaction('rw', db.posts, async () => {
        // 該当SNSの投稿を削除
        for (const type of sns_types) {
          await db.posts.where('sns_type').equals(type).delete();
        }
      });

    } catch (error) {

      throw new Error(`${sns_type}のデータ削除に失敗しました`);
    }
  }

  /**
   * 設定を保存
   * @param {string} key - 設定キー
   * @param {any} value - 設定値
   * @returns {Promise<void>}
   */
  async save_setting(key, value) {
    await this.ensure_initialized();

    try {
      await db.settings.put({ key, value });
    } catch (error) {

      throw new Error('設定の保存に失敗しました');
    }
  }

  /**
   * 設定を取得
   * @param {string} key - 設定キー
   * @returns {Promise<any>} 設定値
   */
  async get_setting(key) {
    await this.ensure_initialized();

    try {
      const setting = await db.settings.get(key);
      return setting?.value;
    } catch (error) {

      return null;
    }
  }

  /**
   * ストレージ使用量を取得
   * @returns {Promise<StorageInfo>} ストレージ情報
   */
  async get_storage_info() {
    try {
      await this.ensure_initialized();

      // KeePostのIndexedDBに存在するデータを確認
      const postCount = await db.posts.count();
      const keepCount = await db.keep_items.count();
      const settingsCount = await db.settings.count();

      const totalRecords = postCount + keepCount + settingsCount;

      // データが完全に0件の場合は使用容量0を返す
      if (totalRecords === 0) {
        return {
          usage: 0,
          quota: 0,
          percentage: 0,
          post_count: postCount
        };
      }

      // 実際のデータサイズを計算
      let totalSize = 0;

      // postsテーブルのサイズを推定（サンプリング）
      if (postCount > 0) {
        // 最大100件のサンプルを取得してサイズを推定
        const sampleSize = Math.min(100, postCount);
        const posts = await db.posts.limit(sampleSize).toArray();
        let sampleTotalSize = 0;

        for (const post of posts) {
          // JSONに変換してバイト数を計算
          const jsonStr = JSON.stringify(post);
          sampleTotalSize += new Blob([jsonStr]).size;
        }

        // サンプルから全体のサイズを推定
        const avgPostSize = sampleTotalSize / sampleSize;
        totalSize += avgPostSize * postCount;
      }

      // その他のテーブルのサイズ（小さいので全件計算）
      if (keepCount > 0) {
        const keeps = await db.keep_items.toArray();
        const keepsJson = JSON.stringify(keeps);
        totalSize += new Blob([keepsJson]).size;
      }

      if (settingsCount > 0) {
        const settings = await db.settings.toArray();
        const settingsJson = JSON.stringify(settings);
        totalSize += new Blob([settingsJson]).size;
      }

      // navigator.storage.estimateで全体のクォータを取得
      let totalQuota = 0;
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        totalQuota = estimate.quota || 0;
      }

      return {
        usage: Math.round(totalSize),
        quota: totalQuota,
        percentage: totalQuota > 0 ? (totalSize / totalQuota) * 100 : 0,
        post_count: postCount
      };
    } catch (error) {

      return {
        usage: 0,
        quota: 0,
        percentage: 0,
        post_count: 0
      };
    }
  }

  /**
   * データベースを閉じる
   */
  close() {
    if (db.isOpen()) {
      db.close();

    }
  }
}

// シングルトンインスタンスをエクスポート
export const post_repository = new PostRepository();
