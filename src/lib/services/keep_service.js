import { keep_repository } from '../repositories/keep_repository.js'
import { post_repository } from '../repositories/post_repository.js'
import { search_service } from './search_service.js'

/**
 * KEEP機能サービス
 * KEEPリストのビジネスロジックを管理
 */
export class KeepService {
  /**
   * ポストをKEEPに追加
   * @param {string} post_id - ポストID
   * @returns {Promise<void>}
   */
  async add_to_keep(post_id) {
    // ポストの存在確認
    const post_data = await post_repository.get_post_by_id(post_id)

    if (!post_data) {
      throw new Error('ポストが見つかりません')
    }

    // KEEPリポジトリに追加
    await keep_repository.add_keep_item(post_id, post_data.sns_type)
  }

  /**
   * ポストをKEEPから削除
   * @param {string} post_id - ポストID
   * @returns {Promise<void>}
   */
  async remove_from_keep(post_id) {
    // KEEPリポジトリから削除
    await keep_repository.remove_keep_item(post_id)
  }

  /**
   * ポストがKEEPされているか確認
   * @param {string} post_id - ポストID
   * @returns {Promise<boolean>} KEEPされている場合true
   */
  async is_kept(post_id) {
    return await keep_repository.is_kept(post_id)
  }

  /**
   * KEEP一覧を取得
   * @param {Object} options - 取得オプション
   * @returns {Promise<Object>} KEEPアイテムとページネーション情報
   */
  async get_keep_list(options = {}) {
    const {
      page = 1,
      per_page = 20,
      sort = 'desc',
      sns_type = null
    } = options

    const offset = (page - 1) * per_page

    // KEEPアイテムを取得
    const items = await keep_repository.get_keep_list({
      limit: per_page,
      offset,
      sort,
      sns_type
    })

    // 総数を取得
    const total_count = await keep_repository.get_keep_count({ sns_type })
    const total_pages = Math.ceil(total_count / per_page)

    return {
      items,
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
   * KEEP内を検索
   * @param {string} query - 検索クエリ
   * @param {Object} options - 検索オプション
   * @returns {Promise<Object>} 検索結果
   */
  async search_keeps(query, options = {}) {
    const {
      page = 1,
      per_page = 20
    } = options

    // KEEPされているポストIDを取得
    const keep_items = await keep_repository.get_keep_list({
      limit: 10000,
      offset: 0
    })
    const kept_post_ids = keep_items.map(item => item.post_id)

    // KEEPされているポストのみを検索
    const search_results = await search_service.search(query, {
      filter: { post_ids: kept_post_ids },
      limit: per_page,
      offset: (page - 1) * per_page
    })

    const total_pages = Math.ceil(search_results.total_count / per_page)

    return {
      items: search_results.posts,
      pagination: {
        current_page: page,
        per_page,
        total_count: search_results.total_count,
        total_pages,
        has_next: page < total_pages,
        has_prev: page > 1
      }
    }
  }

  /**
   * KEEP統計情報を取得
   * @returns {Promise<Object>} 統計情報
   */
  async get_keep_stats() {
    return await keep_repository.get_keep_stats()
  }

  /**
   * KEEPデータをエクスポート
   * @param {string} format - エクスポート形式（'json' | 'csv'）
   * @returns {Promise<string>} エクスポートデータ
   */


  /**
   * KEEPデータをCSV形式に変換
   * @param {Array} keeps - KEEPアイテムの配列
   * @returns {string} CSV文字列
   */


  /**
   * バッチでKEEPに追加
   * @param {Array<string>} post_ids - ポストIDの配列
   * @returns {Promise<Object>} 処理結果
   */
  async add_to_keep_batch(post_ids) {
    let success_count = 0
    let error_count = 0
    const errors = []

    for (const post_id of post_ids) {
      try {
        await this.add_to_keep(post_id)
        success_count++
      } catch (error) {
        error_count++
        errors.push({ post_id, error: error.message })
      }
    }

    return {
      success_count,
      error_count,
      errors,
      total: post_ids.length
    }
  }

  /**
   * バッチでKEEPから削除
   * @param {Array<string>} post_ids - ポストIDの配列
   * @returns {Promise<Object>} 処理結果
   */
  async remove_from_keep_batch(post_ids) {
    let success_count = 0
    let error_count = 0
    const errors = []

    for (const post_id of post_ids) {
      try {
        await this.remove_from_keep(post_id)
        success_count++
      } catch (error) {
        error_count++
        errors.push({ post_id, error: error.message })
      }
    }

    return {
      success_count,
      error_count,
      errors,
      total: post_ids.length
    }
  }

  /**
   * 期間指定でKEEPアイテムを取得
   * @param {Date} start_date - 開始日
   * @param {Date} end_date - 終了日
   * @returns {Promise<Array>} KEEPアイテムの配列
   */
  async get_keeps_by_date_range(start_date, end_date) {
    const keep_items = await keep_repository.get_keeps_by_date_range(start_date, end_date)

    // 投稿データを取得
    const posts = []
    for (const keep_item of keep_items) {
      const post = await post_repository.get_post_by_id(keep_item.post_id)
      if (post) {
        posts.push(post)
      }
    }

    // KEEPアイテムと投稿データをマージ
    return keep_items.map(item => {
      const post = posts.find(p => p.id === item.post_id)
      return {
        ...post,
        kept_at: item.kept_at
      }
    })
  }

  /**
   * すべてのKEEPをクリア
   * @returns {Promise<void>}
   */
  async clear_all_keeps() {
    // KEEPリポジトリをクリア
    await keep_repository.clear_all_keeps()
  }
}

// シングルトンインスタンスをエクスポート
export const keep_service = new KeepService()
