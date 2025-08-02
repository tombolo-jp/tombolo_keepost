import { post_repository } from '../repositories/post_repository.js'

/**
 * 検索サービス
 * 高度な検索機能を提供
 */
export class SearchService {
  constructor() {
    this.cached_posts = null
    this.cache_timestamp = null
    this.CACHE_DURATION = 5 * 60 * 1000  // 5分間キャッシュ
  }

  /**
   * 検索インデックスを初期化
   * @returns {Promise<void>}
   */
  async initialize_search_index() {
    try {
      // キャッシュが有効か確認
      if (this.is_cache_valid()) {
        return
      }

      // すべてのポストを取得

      const posts = await post_repository.get_posts({ limit: 999999 })

      if (!posts || posts.length === 0) {

        this.cached_posts = []
        this.cache_timestamp = Date.now()
        return
      }
      
      // デバッグ: 最初のポストの構造を確認
      if (posts.length > 0) {
        // デバッグ: 最初のポストの構造を確認
      }
      
      // 検索用のデータをキャッシュ
      this.cached_posts = posts
      this.cache_timestamp = Date.now()

    } catch (error) {

      throw new Error('検索機能の初期化に失敗しました')
    }
  }

  /**
   * キャッシュが有効かチェック
   * @returns {boolean} 有効な場合true
   */
  is_cache_valid() {
    if (!this.cached_posts || !this.cache_timestamp) {
      return false
    }

    const now = Date.now()
    return (now - this.cache_timestamp) < this.CACHE_DURATION
  }

  /**
   * 検索を実行
   * @param {string} query - 検索クエリ
   * @param {SearchOptions} options - 検索オプション
   * @returns {Promise<SearchResult>} 検索結果
   */
  async search(query, options = {}) {

    try {
      if (!query || query.trim().length === 0) {

        return {
          results: [],
          query: query,
          total: 0,
          search_time: 0
        }
      }

      const start_time = Date.now()

      // 検索インデックスを初期化
      await this.initialize_search_index()
      
      // 初期化後の確認
      if (!this.cached_posts || this.cached_posts.length === 0) {

        return {
          results: [],
          query: query,
          total: 0,
          search_time: 0
        }
      }

      // 検索オプション
      const { 
        limit = 50,
        offset = 0,
        filter = {},  // filtersからfilterに変更（統一性のため）
        sort = 'desc'  // ソート順を追加
      } = options

      // 検索を実行

      const queryLower = query.toLowerCase()
      const searchResults = this.cached_posts.filter(post => {
        // contentのみを検索対象にする
        const content = (post.content || '').toLowerCase()
        return content.includes(queryLower)
      })

      // スコアリングと結果のフォーマット
      let results = searchResults.map(post => {
        const content = (post.content || '').toLowerCase()
        const exactMatch = content === queryLower
        const startsWithMatch = content.startsWith(queryLower)
        
        // スコアを計算（完全一致 > 先頭一致 > 部分一致）
        let score = 1.0
        if (exactMatch) {
          score = 0.0
        } else if (startsWithMatch) {
          score = 0.3
        } else {
          score = 0.5
        }
        
        return {
          item: post,
          score: score
        }
      })
      
      // スコア順にソート
      results.sort((a, b) => a.score - b.score)
      
      // デバッグ: 最初の数件の結果を確認
      if (results.length > 0) {
        // デバッグ: 最初の数件の結果を確認
      }

      // フィルター適用
      if (filter && Object.keys(filter).length > 0) {


        results = this.apply_filters(results, filter)

      }

      // ソート適用（日付順）

      results = this.apply_sort(results, sort)

      // ページネーション
      const paginated_results = results.slice(offset, offset + limit)

      // 検索結果を整形
      const formatted_results = paginated_results.map(result => ({
        post: result.item,
        score: result.score,
        matches: []  // 空配列
      }))

      const search_time = Date.now() - start_time

      return {
        results: formatted_results,
        query: query,
        total: results.length,
        search_time: search_time,
        has_more: (offset + limit) < results.length
      }

    } catch (error) {

      throw new Error('検索の実行に失敗しました')
    }
  }

  /**
   * 高度な検索を実行
   * @param {AdvancedSearchQuery} advanced_query - 高度な検索クエリ
   * @returns {Promise<SearchResult>} 検索結果
   */
  async advanced_search(advanced_query) {
    try {
      await this.initialize_search_index()

      let results = this.cached_posts

      // テキスト検索
      if (advanced_query.text) {
        const queryLower = advanced_query.text.toLowerCase()
        results = results.filter(post => {
          const content = (post.content || '').toLowerCase()
          return content.includes(queryLower)
        })
      }

      // 日付範囲フィルター
      if (advanced_query.date_from || advanced_query.date_to) {
        results = results.filter(post => {
          const post_date = new Date(post.created_at)
          if (advanced_query.date_from && post_date < new Date(advanced_query.date_from)) {
            return false
          }
          if (advanced_query.date_to && post_date > new Date(advanced_query.date_to)) {
            return false
          }
          return true
        })
      }

      // 言語フィルター
      if (advanced_query.language) {
        results = results.filter(post => post.language === advanced_query.language)
      }

      // ハッシュタグフィルター
      if (advanced_query.hashtags && advanced_query.hashtags.length > 0) {
        results = results.filter(post => {
          if (!post.hashtags) return false
          return advanced_query.hashtags.some(tag => 
            post.hashtags.includes(tag.replace('#', ''))
          )
        })
      }

      // メンションフィルター
      if (advanced_query.mentions && advanced_query.mentions.length > 0) {
        results = results.filter(post => {
          if (!post.mentions) return false
          return advanced_query.mentions.some(mention => 
            post.mentions.includes(mention.replace('@', ''))
          )
        })
      }

      // いいね数フィルター
      if (advanced_query.min_favorites !== undefined) {
        results = results.filter(post => 
          post.metrics.likes >= advanced_query.min_favorites
        )
      }

      // シェア数フィルター
      if (advanced_query.min_retweets !== undefined) {
        results = results.filter(post => 
          post.metrics.shares >= advanced_query.min_retweets
        )
      }

      // メディア有無フィルター
      if (advanced_query.has_media !== undefined) {
        results = results.filter(post => 
          advanced_query.has_media ? post.media && post.media.length > 0 : !post.media
        )
      }

      // ソート
      if (advanced_query.sort_by) {
        results = this.sort_results(results, advanced_query.sort_by)
      }

      return {
        results: results.map(post => ({ post, score: 1 })),
        query: advanced_query,
        total: results.length,
        search_time: 0,
        has_more: false
      }

    } catch (error) {

      throw new Error('高度な検索の実行に失敗しました')
    }
  }

  /**
   * フィルターを適用
   * @param {Array} results - 検索結果
   * @param {Object} filters - フィルター条件
   * @returns {Array} フィルター済み結果
   */
  apply_filters(results, filters) {
    return results.filter(result => {
      const post = result.item

      // SNS種別フィルター
      if (filters.sns_type && filters.sns_type !== null && post.sns_type !== filters.sns_type) {
        return false
      }

      // KEEPフィルター
      if (filters.is_kept !== undefined && filters.is_kept !== null) {
        if (post.is_kept !== filters.is_kept) {
          return false
        }
      }

      // 言語フィルター
      if (filters.language && filters.language !== null && post.language !== filters.language) {
        return false
      }

      // 年月フィルター
      if (filters.year_month && filters.year_month !== null && post.year_month !== filters.year_month) {
        return false
      }

      // メディアフィルター (nullは無視)
      if (filters.has_media !== undefined && filters.has_media !== null) {
        const has_media = post.media && post.media.length > 0
        if (filters.has_media !== has_media) {
          return false
        }
      }

      // リンクフィルター (nullは無視)
      if (filters.has_links !== undefined && filters.has_links !== null) {
        const has_links = post.urls && post.urls.length > 0
        if (filters.has_links !== has_links) {
          return false
        }
      }

      return true
    })
  }

  /**
   * 検索結果にソートを適用
   * @param {Array} results - 検索結果
   * @param {string} sort - ソート順 ('asc' または 'desc')
   * @returns {Array} ソート済み結果
   */
  apply_sort(results, sort) {
    if (!results || results.length === 0) {
      return results
    }

    // sortパラメータを適切な形式に変換
    const sort_by = sort === 'asc' ? 'date_asc' : 'date_desc'
    
    // 結果からポストを抽出
    const posts = results.map(r => r.item)
    
    // ソート実行
    const sorted_posts = this.sort_results(posts, sort_by)
    
    // 元の結果構造を維持しながらソート
    return sorted_posts.map(post => {
      const original_result = results.find(r => r.item.id === post.id)
      return original_result || { item: post, score: 0 }
    })
  }

  /**
   * 結果をソート
   * @param {Post[]} posts - ポストの配列
   * @param {string} sort_by - ソート条件
   * @returns {Post[]} ソート済みポスト
   */
  sort_results(posts, sort_by) {
    const sorted = [...posts]

    switch (sort_by) {
      case 'date_desc':
        return sorted.sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        )
      case 'date_asc':
        return sorted.sort((a, b) => 
          new Date(a.created_at) - new Date(b.created_at)
        )
      case 'favorites':
        return sorted.sort((a, b) => b.metrics.likes - a.metrics.likes)
      case 'retweets':
        return sorted.sort((a, b) => b.metrics.shares - a.metrics.shares)
      default:
        return sorted
    }
  }

  /**
   * 検索候補を取得
   * @param {string} query - 部分クエリ
   * @returns {Promise<string[]>} 検索候補
   */
  async get_suggestions(query) {
    try {
      if (!query || query.length < 2) {
        return []
      }

      await this.initialize_search_index()

      const queryLower = query.toLowerCase()
      const suggestions = new Set()

      // cached_postsから候補を抽出（最大100件チェック）
      const posts_to_check = this.cached_posts.slice(0, 100)
      
      posts_to_check.forEach(post => {
        // ハッシュタグから候補を追加
        if (post.hashtags && Array.isArray(post.hashtags)) {
          post.hashtags.forEach(tag => {
            const tagStr = typeof tag === 'string' ? tag : String(tag)
            if (tagStr.toLowerCase().includes(queryLower)) {
              suggestions.add(`#${tagStr}`)
            }
          })
        }

        // メンションから候補を追加
        if (post.mentions && Array.isArray(post.mentions)) {
          post.mentions.forEach(mention => {
            const mentionStr = typeof mention === 'string' ? mention : String(mention)
            if (mentionStr.toLowerCase().includes(queryLower)) {
              suggestions.add(`@${mentionStr}`)
            }
          })
        }
      })

      return Array.from(suggestions).slice(0, 5)

    } catch (error) {

      return []
    }
  }

  /**
   * キャッシュをクリア
   */
  clear_cache() {
    this.cached_posts = null
    this.cache_timestamp = null

  }
}

// シングルトンインスタンスをエクスポート
export const search_service = new SearchService()