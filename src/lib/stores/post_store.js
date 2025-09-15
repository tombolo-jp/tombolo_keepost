import { writable, derived } from 'svelte/store'
import { post_service } from '../services/post_service.js'
import { search_service } from '../services/search_service.js'

/**
 * マルチSNS対応投稿データストア
 */
function create_post_store() {
  const { subscribe, set, update } = writable({
    posts: [],
    pagination: {
      current_page: 1,
      per_page: 20,
      total_count: 0,
      total_pages: 0,
      has_next: false,
      has_prev: false
    },
    filter: {
      sns_type: null,      // null | 'twitter' | 'bluesky' | 'mastodon'
      is_kept: null,       // null | true | false
      year_month: null,
      start_date: null,
      end_date: null,
      language: null,
      has_media: null,
      has_links: null
    },
    sort: 'created_desc',  // created_desc | created_asc | kept_desc | kept_asc
    search_query: '',
    is_loading: false,
    error: null,
    active_tab: 'all'     // 'all' | 'twitter' | 'bluesky' | 'mastodon' | 'keep'
  })

  function get() {
    let value
    subscribe(v => value = v)()
    return value
  }

  return {
    subscribe,
    get,

    /**
     * ポストを読み込む
     * @param {number} page - ページ番号
     */
    async load_posts(page = 1, tab_id = null) {
      update(state => ({ ...state, is_loading: true, error: null }))

      try {
        const current_state = get()
        const filter = { ...current_state.filter }

        // タブIDが指定されていない場合は、現在のactive_tabを使用
        const active_tab = tab_id || current_state.active_tab

        // タブに応じてフィルターを設定
        if (active_tab === 'keep') {
          filter.is_kept = true
          filter.sns_type = null
        } else if (active_tab !== 'all') {
          filter.sns_type = active_tab
          // is_keptは現在の値を保持（KEEPフィルターチェックボックスの状態を維持）
        } else {
          // 'all'の場合はsns_typeのみクリア、is_keptは現在の値を保持
          filter.sns_type = null
          // is_keptは現在の値を保持（KEEPフィルターチェックボックスの状態を維持）
        }

        const response = await post_service.get_posts({
          page,
          per_page: 20,
          sort: current_state.sort,
          filter
        })

        update(state => ({
          ...state,
          posts: response.posts,
          pagination: response.pagination,
          is_loading: false,
          active_tab: active_tab  // active_tabも更新
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
     * 次のページを読み込む
     */
    async load_next_page() {
      const state = get()
      if (state.pagination.has_next && !state.is_loading) {
        await this.load_posts(state.pagination.current_page + 1)
      }
    },

    /**
     * 前のページを読み込む
     */
    async load_prev_page() {
      const state = get()
      if (state.pagination.has_prev && !state.is_loading) {
        await this.load_posts(state.pagination.current_page - 1)
      }
    },

    /**
     * ポストを検索
     * @param {string} query - 検索クエリ
     */
    async search_posts(query, tab_id = null) {

      update(state => ({
        ...state,
        search_query: query,
        is_loading: true,
        error: null
      }))

      try {
        const current_state = get()
        const filter = { ...current_state.filter }

        // タブIDが指定されていない場合は、現在のactive_tabを使用
        const active_tab = tab_id || current_state.active_tab

        // タブフィルターを適用
        if (active_tab === 'keep') {
          filter.is_kept = true
        } else if (active_tab !== 'all') {
          filter.sns_type = active_tab
        }

        const response = await post_service.search_posts(query, {
          page: 1,
          per_page: 20,
          filter,
          sort: current_state.sort  // ソート条件を追加
        })

        update(state => ({
          ...state,
          posts: response.posts,
          pagination: response.pagination,
          is_loading: false,
          active_tab: active_tab  // active_tabも更新
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
     * フィルターを設定
     * @param {Object} filter - フィルター条件
     */
    set_filter(filter) {
      update(state => ({
        ...state,
        filter: { ...state.filter, ...filter }
      }))
      this.load_posts(1) // フィルター変更時は1ページ目から
    },

    /**
     * フィルターをクリア
     */
    clear_filter() {
      update(state => ({
        ...state,
        filter: {
          sns_type: null,
          is_kept: null,
          year_month: null,
          start_date: null,
          end_date: null,
          language: null,
          has_media: null,
          has_links: null
        },
        search_query: ''
      }))
      this.load_posts(1)
    },

    /**
     * ソート順を設定
     * @param {string} sort - ソート順（'created_desc' | 'created_asc' | 'kept_desc' | 'kept_asc'）
     */
    set_sort(sort) {
      update(state => ({ ...state, sort }))

      // 現在の状態を取得
      const current_state = get()

      // 検索クエリがある場合は検索を再実行、なければ通常のload_posts
      if (current_state.search_query) {
        this.search_posts(current_state.search_query, current_state.active_tab)
      } else {
        this.load_posts(1)
      }
    },

    /**
     * アクティブタブを設定
     * @param {string} tab - タブID
     */
    set_active_tab(tab) {
      update(state => ({ ...state, active_tab: tab }))
      this.load_posts(1)
    },

    /**
     * 特定のポストを更新
     * @param {string} post_id - ポストID
     * @param {Object} updates - 更新内容
     */
    update_post(post_id, updates) {
      update(state => ({
        ...state,
        posts: state.posts.map(post =>
          post.id === post_id ? { ...post, ...updates } : post
        )
      }))
    },

    /**
     * ストアをリセット
     */
    reset() {
      set({
        posts: [],
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
          is_kept: null,
          year_month: null,
          start_date: null,
          end_date: null,
          language: null,
          has_media: null,
          has_links: null
        },
        sort: 'created_desc',  // created_desc | created_asc | kept_desc | kept_asc
        search_query: '',
        is_loading: false,
        error: null,
        active_tab: 'all'
      })
    }
  }
}

// ポストストアのインスタンス
export const post_store = create_post_store()

// 派生ストア: 現在のポスト数
export const post_count = derived(
  post_store,
  $post_store => $post_store.posts.length
)

// 派生ストア: 総ポスト数
export const total_post_count = derived(
  post_store,
  $post_store => $post_store.pagination.total_count
)

// 派生ストア: フィルターが適用されているか
export const has_filter = derived(
  post_store,
  $post_store => {
    const filter = $post_store.filter
    return filter.year_month || filter.start_date || filter.end_date ||
           filter.language || filter.has_media || filter.has_links ||
           $post_store.search_query.length > 0
  }
)

// 派生ストア: 検索中かどうか
export const is_searching = derived(
  post_store,
  $post_store => $post_store.search_query.length > 0
)

// 派生ストア: 現在のタブ名
export const current_tab_name = derived(
  post_store,
  $post_store => {
    const tab_names = {
      all: '全SNS',
      twitter: 'Twitter',
      bluesky: 'Bluesky',
      mastodon: 'Mastodon',
      keep: 'KEEP'
    }
    return tab_names[$post_store.active_tab] || $post_store.active_tab
  }
)
