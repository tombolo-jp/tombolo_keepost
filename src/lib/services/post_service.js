import { post_repository } from '../repositories/post_repository.js'
import { search_service } from './search_service.js'
import { debug_log, debug_error } from '../utils/debug.js'

/**
 * ポストサービス
 * 投稿データのビジネスロジックを管理
 */
export class PostService {
  /**
   * ポストを取得（ページネーション対応）
   * @param {Object} options - 取得オプション
   * @returns {Promise<Object>} ポストとページネーション情報
   */
  async get_posts(options = {}) {
    const {
      page = 1,
      per_page = 20,
      sort = 'desc',
      filter = {}
    } = options

    const offset = (page - 1) * per_page

    // フィルター条件を構築
    const query_options = {
      limit: per_page,
      offset,
      sort,
      filter: filter  // filterオブジェクトを展開せずに渡す
    }

    // ポストを取得
    const posts = await post_repository.get_posts(query_options)

    // 総数を取得
    const total_count = await post_repository.get_post_count(filter)
    const total_pages = Math.ceil(total_count / per_page)

    return {
      posts,
      pagination: {
        current_page: page,
        per_page,
        total_count,
        total_pages,
        has_next: page < total_pages,
        has_prev: page > 1
      }
    }
  }

  /**
   * ポストを検索
   * @param {string} query - 検索クエリ
   * @param {Object} options - 検索オプション
   * @returns {Promise<Object>} 検索結果
   */
  async search_posts(query, options = {}) {
    debug_log('post_service.search_posts called with:', { query, options })

    const {
      page = 1,
      per_page = 20,
      filter = {},
      sort = 'created_desc'  // ソートパラメータを追加
    } = options

    // 検索サービスを使用
    const search_results = await search_service.search(query, {
      filter,
      sort,  // ソートパラメータを渡す
      limit: per_page,
      offset: (page - 1) * per_page
    })

    debug_log('post_service: search_results from search_service:', {
      total: search_results.total,
      results_count: search_results.results?.length,
      has_results: search_results.results && search_results.results.length > 0
    })

    const total_pages = Math.ceil(search_results.total / per_page)

    return {
      posts: search_results.results.map(r => r.post),
      pagination: {
        current_page: page,
        per_page,
        total_count: search_results.total,
        total_pages,
        has_next: page < total_pages,
        has_prev: page > 1
      }
    }
  }

  /**
   * SNS別のポスト統計を取得
   * @returns {Promise<Object>} 統計情報
   */
  async get_sns_stats() {
    try {
      const by_sns = {}

      // SNS別の統計
      const sns_types = ['twitter', 'bluesky', 'mastodon']
      for (const sns_type of sns_types) {
        by_sns[sns_type] = await post_repository.get_post_count({ sns_type })
      }

      return { by_sns }
    } catch (error) {
      debug_error('post_service.get_sns_stats error:', error)
      // エラー時はデフォルト値を返す
      return {
        twitter: 0,
        bluesky: 0,
        mastodon: 0
      }
    }
  }

  /**
   * ポストの総合統計を取得
   * @returns {Promise<Object>} 統計情報
   */
  async get_post_stats() {
    debug_log('post_service.get_post_stats called');
    try {
      const total_count = await post_repository.get_post_count();
      debug_log('post_service.get_post_stats total_count:', total_count);

      return {
        total_count: total_count || 0,  // null/undefined を 0 に変換
        language_stats: {},
        date_range: null,
        hashtag_stats: [],
        mention_stats: []
      };
    } catch (error) {
      debug_error('post_service.get_post_stats error:', error);
      return {
        total_count: 0,  // エラー時はデフォルト値を返す
        language_stats: {},
        date_range: null,
        hashtag_stats: [],
        mention_stats: []
      };
    }
  }

  /**
   * 月別統計を取得
   * @returns {Promise<Array>} 月別統計
   */
  async get_monthly_stats() {
    try {
      // TODO: より効率的な実装に変更
      const all_posts = await post_repository.get_posts({ limit: 999999 })
      const monthly_counts = {}

      all_posts.forEach(post => {
        if (post.year_month) {
          if (!monthly_counts[post.year_month]) {
            monthly_counts[post.year_month] = 0
          }
          monthly_counts[post.year_month]++
        }
      })

      return Object.entries(monthly_counts)
        .map(([year_month, count]) => {
          const [year, month] = year_month.split('-')
          return {
            year_month,
            year: parseInt(year),
            month: parseInt(month),
            count
          }
        })
        .sort((a, b) => b.year_month.localeCompare(a.year_month))
    } catch (error) {
      debug_error('post_service.get_monthly_stats error:', error)
      return []  // エラー時は空の配列を返す
    }
  }

  /**
   * 年別統計を取得
   * @returns {Promise<Array>} 年別統計
   */
  async get_yearly_stats() {
    try {
      const monthly_stats = await this.get_monthly_stats()
      const yearly_counts = {}

      monthly_stats.forEach(stat => {
        if (!yearly_counts[stat.year]) {
          yearly_counts[stat.year] = 0
        }
        yearly_counts[stat.year] += stat.count
      })

      return Object.entries(yearly_counts)
        .map(([year, count]) => ({
          year: parseInt(year),
          count
        }))
        .sort((a, b) => b.year - a.year)
    } catch (error) {
      debug_error('post_service.get_yearly_stats error:', error)
      return []  // エラー時は空の配列を返す
    }
  }

  /**
   * 年月の一覧を取得
   * @returns {Promise<Array>} 年月リスト
   */
  async get_year_months() {
    // TODO: より効率的な実装に変更
    const all_posts = await post_repository.get_posts({ limit: 999999 })
    const year_months = new Set()

    all_posts.forEach(post => {
      if (post.year_month) {
        year_months.add(post.year_month)
      }
    })

    return Array.from(year_months).sort((a, b) => b.localeCompare(a))
  }

  /**
   * 言語の一覧を取得
   * @returns {Promise<Array>} 言語リスト
   */
  async get_languages() {
    // TODO: より効率的な実装に変更
    const all_posts = await post_repository.get_posts({ limit: 999999 })
    const language_count = {}

    all_posts.forEach(post => {
      const lang = post.language || 'unknown'
      language_count[lang] = (language_count[lang] || 0) + 1
    })

    return Object.entries(language_count)
      .sort((a, b) => b[1] - a[1])
      .map(([lang, count]) => ({ lang, count }))
  }

  /**
   * インポート履歴を取得
   * @returns {Promise<Array>} インポート履歴
   */
  async get_import_history() {
    return await post_repository.get_setting('import_history') || []
  }

  /**
   * インポート履歴を保存
   * @param {Object} history_item - 履歴アイテム
   * @returns {Promise<void>}
   */
  async save_import_history(history_item) {
    const history = await this.get_import_history()

    history.unshift({
      ...history_item,
      imported_at: new Date().toISOString()
    })

    // 最新10件のみ保持
    if (history.length > 10) {
      history.length = 10
    }

    await post_repository.save_setting('import_history', history)
  }

  /**
   * すべてのデータをクリア
   * @returns {Promise<void>}
   */
  /**
   * 既存のMastodonポストのURLを修正
   * @returns {Promise<{success: boolean, fixed_count: number, error?: string}>}
   */
  async fix_mastodon_urls() {
    try {
      const repository = get_post_repository()
      const BATCH_SIZE = 100
      let offset = 0
      let fixed_count = 0

      while (true) {
        // Mastodonポストをバッチで取得
        const posts = await repository.get_posts({
          sns_type: 'mastodon',
          limit: BATCH_SIZE,
          offset: offset
        })

        if (!posts || posts.length === 0) break

        // 各ポストのURLを修正
        for (const post of posts) {
          if (post.original_url) {
            let url = post.original_url
            let needs_update = false

            // @users@domain形式の重複を除去
            if (url.includes('@users@')) {
              url = url.replace(/@users@[^\/]+\//, '')
              needs_update = true
            }

            // https://の重複を除去
            const https_match = url.match(/(https:\/\/[^\/]+)\/(https:\/\/.+)/)
            if (https_match) {
              url = https_match[2]
              needs_update = true
            }

            // 複数のhttps://が含まれる場合
            if (url.split('https://').length > 2) {
              const parts = url.split('https://')
              url = 'https://' + parts[parts.length - 1]
              needs_update = true
            }

            // URLが変更された場合のみ更新
            if (needs_update) {
              post.original_url = url
              await repository.update_post(post.id, { original_url: url })
              fixed_count++
            }
          }
        }

        offset += BATCH_SIZE
      }

      return { success: true, fixed_count }

    } catch (error) {

      return { success: false, fixed_count: 0, error: error.message }
    }
  }

  async clear_all_data() {
    await post_repository.clear_all_data()
  }

  /**
   * ストレージ情報を取得
   * @returns {Promise<Object>} ストレージ情報
   */
  async get_storage_info() {
    return await post_repository.get_storage_info()
  }
}

// シングルトンインスタンスをエクスポート
export const post_service = new PostService()
