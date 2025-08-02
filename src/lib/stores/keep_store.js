import { writable, derived } from 'svelte/store'
import { keep_service } from '../services/keep_service.js'

/**
 * KEEP機能専用ストア
 */
function create_keep_store() {
  const { subscribe, set, update } = writable({
    keep_items: [],
    stats: {
      total_count: 0,
      by_sns_type: {},
      by_month: {},
      recent_keeps: []
    },
    pagination: {
      current_page: 1,
      per_page: 20,
      total_count: 0,
      total_pages: 0,
      has_next: false,
      has_prev: false
    },
    filter: {
      sns_type: null,
      search_query: ''
    },
    sort: 'desc',
    is_loading: false,
    error: null
  })

  return {
    subscribe,

    /**
     * KEEP一覧を読み込む
     * @param {number} page - ページ番号
     */
    async load_keep_list(page = 1) {
      update(state => ({ ...state, is_loading: true, error: null }))

      try {
        const current_state = get()
        const response = await keep_service.get_keep_list({
          page,
          per_page: 20,
          sort: current_state.sort,
          sns_type: current_state.filter.sns_type
        })

        update(state => ({
          ...state,
          keep_items: response.items,
          pagination: response.pagination,
          is_loading: false
        }))
      } catch (error) {
        update(state => ({
          ...state,
          is_loading: false,
          error: error.message
        }))
      }
    },

    /**
     * KEEP統計を読み込む
     */
    async load_stats() {
      try {
        const stats = await keep_service.get_keep_stats()
        update(state => ({ ...state, stats }))
      } catch (error) {

      }
    },

    /**
     * ポストをKEEPに追加
     * @param {string} post_id - ポストID
     */
    async add_to_keep(post_id) {
      try {
        await keep_service.add_to_keep(post_id)
        
        // 統計を更新
        await this.load_stats()
        
        // 現在KEEP一覧を表示中の場合はリロード
        const state = get()
        if (state.keep_items.length > 0) {
          await this.load_keep_list(state.pagination.current_page)
        }
        
        return { success: true }
      } catch (error) {

        return { success: false, error: error.message }
      }
    },

    /**
     * ポストをKEEPから削除
     * @param {string} post_id - ポストID
     */
    async remove_from_keep(post_id) {
      try {
        await keep_service.remove_from_keep(post_id)
        
        // 統計を更新
        await this.load_stats()
        
        // KEEP一覧から削除
        update(state => ({
          ...state,
          keep_items: state.keep_items.filter(item => item.id !== post_id),
          pagination: {
            ...state.pagination,
            total_count: Math.max(0, state.pagination.total_count - 1)
          }
        }))
        
        return { success: true }
      } catch (error) {

        return { success: false, error: error.message }
      }
    },

    /**
     * KEEPの状態をトグル
     * @param {string} post_id - ポストID
     * @param {boolean} is_kept - 現在のKEEP状態
     */
    async toggle_keep(post_id, is_kept) {
      if (is_kept) {
        return await this.remove_from_keep(post_id)
      } else {
        return await this.add_to_keep(post_id)
      }
    },

    /**
     * KEEP内を検索
     * @param {string} query - 検索クエリ
     */
    async search_keeps(query) {
      update(state => ({ 
        ...state, 
        filter: { ...state.filter, search_query: query },
        is_loading: true, 
        error: null 
      }))

      try {
        const response = await keep_service.search_keeps(query, {
          page: 1,
          per_page: 50
        })

        update(state => ({
          ...state,
          keep_items: response.items,
          pagination: response.pagination,
          is_loading: false
        }))
      } catch (error) {
        update(state => ({
          ...state,
          is_loading: false,
          error: error.message
        }))
      }
    },

    /**
     * SNSフィルターを設定
     * @param {string|null} sns_type - SNS種別
     */
    set_sns_filter(sns_type) {
      update(state => ({
        ...state,
        filter: { ...state.filter, sns_type }
      }))
      this.load_keep_list(1)
    },

    /**
     * ソート順を設定
     * @param {string} sort - ソート順（'asc' | 'desc'）
     */
    set_sort(sort) {
      update(state => ({ ...state, sort }))
      this.load_keep_list(1)
    },

    /**
     * 次のページを読み込む
     */
    async load_next_page() {
      const state = get()
      if (state.pagination.has_next && !state.is_loading) {
        await this.load_keep_list(state.pagination.current_page + 1)
      }
    },

    /**
     * 前のページを読み込む
     */
    async load_prev_page() {
      const state = get()
      if (state.pagination.has_prev && !state.is_loading) {
        await this.load_keep_list(state.pagination.current_page - 1)
      }
    },

    /**
     * ストアをリセット
     */
    reset() {
      set({
        keep_items: [],
        stats: {
          total_count: 0,
          by_sns_type: {},
          by_month: {},
          recent_keeps: []
        },
        pagination: {
          current_page: 1,
          per_page: 20,
          total_count: 0,
          total_pages: 0,
          has_next: false,
          has_prev: false
        },
        filter: {
          sns_type: null,
          search_query: ''
        },
        sort: 'desc',
        is_loading: false,
        error: null
      })
    }
  }

  function get() {
    let value
    subscribe(v => value = v)()
    return value
  }
}

// KEEPストアのインスタンス
export const keep_store = create_keep_store()

// 派生ストア: KEEP総数
export const keep_count = derived(
  keep_store,
  $keep_store => $keep_store.stats.total_count
)

// 派生ストア: SNS別KEEP数
export const keep_count_by_sns = derived(
  keep_store,
  $keep_store => $keep_store.stats.by_sns_type
)

// 派生ストア: 最近のKEEP
export const recent_keeps = derived(
  keep_store,
  $keep_store => $keep_store.stats.recent_keeps
)