import { writable, derived } from 'svelte/store'
import { post_service } from '../services/post_service.js'
import { debug_log, debug_error } from '../utils/debug.js'

/**
 * フィルター状態ストア
 * マルチSNS対応の統一フィルタリング機能
 */
function create_filter_store() {
  const { subscribe, set, update } = writable({
    // フィルター設定
    filters: {
      sns_types: [],       // 選択されたSNS種別の配列
      year_month: null,    // 選択された年月（YYYY-MM形式）
      language: null,      // 選択された言語
      has_media: null,     // メディア有無フィルター
      has_links: null,     // リンク有無フィルター
      is_kept: null,       // KEEP状態フィルター
      hashtag: null,       // ハッシュタグフィルター
      mention: null,       // メンションフィルター
      author: null         // 作成者フィルター
    },
    
    // 統計情報
    stats: {
      by_sns_type: {},     // SNS別統計
      monthly_stats: [],   // 月別統計
      yearly_stats: [],    // 年別統計
      language_stats: {},  // 言語別統計
      total_posts: null,   // 総ポスト数（初期値をnullに）
      date_range: null,    // 日付範囲
      hashtag_stats: [],   // ハッシュタグ統計
      mention_stats: []    // メンション統計
    },
    
    // UI状態
    is_loading_stats: false,
    stats_error: null,
    active_filters_count: 0
  })

  return {
    subscribe,
    get,

    /**
     * 統計情報を読み込む
     */
    async load_stats() {
      debug_log('filter_store.load_stats called');
      update(state => ({ 
        ...state, 
        is_loading_stats: true, 
        stats_error: null 
      }))

      try {
        // 基本統計を取得
        const stats = await post_service.get_post_stats()
        debug_log('filter_store.load_stats received stats:', stats)
        
        // 月別統計を取得
        const monthly_stats = await post_service.get_monthly_stats()
        
        // 年別統計を取得
        const yearly_stats = await post_service.get_yearly_stats()
        
        // SNS別統計を取得
        const sns_stats = await post_service.get_sns_stats()

        debug_log('filter_store.load_stats updating state with total_posts:', stats.total_count);
        update(state => ({
          ...state,
          stats: {
            ...state.stats,
            by_sns_type: sns_stats,
            monthly_stats,
            yearly_stats,
            language_stats: stats.language_stats || {},
            total_posts: stats.total_count,
            date_range: stats.date_range,
            hashtag_stats: stats.hashtag_stats || [],
            mention_stats: stats.mention_stats || []
          },
          is_loading_stats: false
        }))
      } catch (error) {
        debug_error('統計情報の読み込みエラー:', error)
        update(state => ({
          ...state,
          is_loading_stats: false,
          stats_error: error.message
        }))
      }
    },

    /**
     * フィルターを設定
     * @param {string} filter_type - フィルタータイプ
     * @param {any} value - フィルター値
     */
    set_filter(filter_type, value) {
      update(state => {
        const new_filters = { ...state.filters }
        
        // 値がnullまたは空配列の場合はフィルターを削除
        if (value === null || (Array.isArray(value) && value.length === 0)) {
          new_filters[filter_type] = null
        } else {
          new_filters[filter_type] = value
        }
        
        // アクティブフィルター数を計算
        const active_count = Object.values(new_filters)
          .filter(v => v !== null && (!Array.isArray(v) || v.length > 0))
          .length
        
        return {
          ...state,
          filters: new_filters,
          active_filters_count: active_count
        }
      })
    },

    /**
     * SNSフィルターを設定
     * @param {Array<string>} sns_types - SNS種別の配列
     */
    set_sns_filter(sns_types) {
      this.set_filter('sns_types', sns_types)
    },

    /**
     * SNSフィルターをクリア
     */
    clear_sns_filter() {
      this.set_filter('sns_types', [])
    },

    /**
     * 年月フィルターを設定
     * @param {string} year_month - YYYY-MM形式の年月
     */
    set_year_month_filter(year_month) {
      this.set_filter('year_month', year_month)
    },

    /**
     * 言語フィルターを設定
     * @param {string} language - 言語コード
     */
    set_language_filter(language) {
      this.set_filter('language', language)
    },

    /**
     * KEEPフィルターを設定
     * @param {boolean} is_kept - KEEP状態
     */
    set_keep_filter(is_kept) {
      this.set_filter('is_kept', is_kept)
    },

    /**
     * メディアフィルターを設定
     * @param {boolean} has_media - メディア有無
     */
    set_media_filter(has_media) {
      this.set_filter('has_media', has_media)
    },

    /**
     * リンクフィルターを設定
     * @param {boolean} has_links - リンク有無
     */
    set_link_filter(has_links) {
      this.set_filter('has_links', has_links)
    },

    /**
     * ハッシュタグフィルターを設定
     * @param {string} hashtag - ハッシュタグ
     */
    set_hashtag_filter(hashtag) {
      this.set_filter('hashtag', hashtag)
    },

    /**
     * メンションフィルターを設定
     * @param {string} mention - メンション
     */
    set_mention_filter(mention) {
      this.set_filter('mention', mention)
    },

    /**
     * 作成者フィルターを設定
     * @param {string} author - 作成者
     */
    set_author_filter(author) {
      this.set_filter('author', author)
    },

    /**
     * すべてのフィルターをクリア
     */
    clear_all_filters() {
      update(state => ({
        ...state,
        filters: {
          sns_types: [],
          year_month: null,
          language: null,
          has_media: null,
          has_links: null,
          is_kept: null,
          hashtag: null,
          mention: null,
          author: null
        },
        active_filters_count: 0
      }))
    },

    /**
     * 年月リストを取得（フィルター用）
     */
    get_year_month_list() {
      const state = get()
      return state.stats.monthly_stats.map(stat => ({
        value: stat.year_month,
        label: `${stat.year}年${stat.month}月 (${stat.count.toLocaleString()}件)`,
        count: stat.count
      }))
    },

    /**
     * 言語リストを取得（フィルター用）
     */
    get_language_list() {
      const state = get()
      return Object.entries(state.stats.language_stats)
        .map(([lang, count]) => ({
          value: lang,
          label: `${get_language_name(lang)} (${count.toLocaleString()}件)`,
          count: count
        }))
        .sort((a, b) => b.count - a.count)
    },

    /**
     * SNSリストを取得（フィルター用）
     */
    get_sns_list() {
      const state = get()
      return Object.entries(state.stats.by_sns_type)
        .map(([sns_type, count]) => ({
          value: sns_type,
          label: `${get_sns_display_name(sns_type)} (${count.toLocaleString()}件)`,
          count: count,
          icon: get_sns_icon(sns_type)
        }))
        .sort((a, b) => b.count - a.count)
    },

    /**
     * ハッシュタグリストを取得（フィルター用）
     */
    get_hashtag_list() {
      const state = get()
      return state.stats.hashtag_stats
        .slice(0, 20)  // 上位20件
        .map(stat => ({
          value: stat.tag,
          label: `#${stat.tag} (${stat.count.toLocaleString()}件)`,
          count: stat.count
        }))
    },

    /**
     * 人気ポストを取得
     * @param {number} limit - 取得件数
     */
    async get_popular_posts(limit = 10) {
      try {
        return await post_service.get_popular_posts(limit)
      } catch (error) {

        return []
      }
    },

    /**
     * ストアをリセット
     */
    reset() {
      set({
        filters: {
          sns_types: [],
          year_month: null,
          language: null,
          has_media: null,
          has_links: null,
          is_kept: null,
          hashtag: null,
          mention: null,
          author: null
        },
        stats: {
          by_sns_type: {},
          monthly_stats: [],
          yearly_stats: [],
          language_stats: {},
          total_posts: null,
          date_range: null,
          hashtag_stats: [],
          mention_stats: []
        },
        is_loading_stats: false,
        stats_error: null,
        active_filters_count: 0
      })
    }
  }

  function get() {
    let value
    subscribe(v => value = v)()
    return value
  }
}

// ヘルパー関数
function get_language_name(lang_code) {
  const lang_names = {
    ja: '日本語',
    en: '英語',
    ko: '韓国語',
    zh: '中国語',
    es: 'スペイン語',
    fr: 'フランス語',
    de: 'ドイツ語',
    it: 'イタリア語',
    pt: 'ポルトガル語',
    ru: 'ロシア語',
    ar: 'アラビア語'
  }
  return lang_names[lang_code] || lang_code
}

function get_sns_display_name(sns_type) {
  const sns_names = {
    twitter: 'Twitter',
    bluesky: 'Bluesky',
    mastodon: 'Mastodon'
  }
  return sns_names[sns_type] || sns_type
}

function get_sns_icon(sns_type) {
  const sns_icons = {
    twitter: '🐦',
    bluesky: '☁️',
    mastodon: '🐘'
  }
  return sns_icons[sns_type] || '📱'
}

// フィルターストアのインスタンス
export const filter_store = create_filter_store()

// 派生ストア: アクティブフィルター数
export const active_filter_count = derived(
  filter_store,
  $filter_store => $filter_store.active_filters_count
)

// 派生ストア: SNS別統計
export const sns_stats = derived(
  filter_store,
  $filter_store => $filter_store.stats.by_sns_type
)

// 派生ストア: 総ポスト数
export const total_post_count = derived(
  filter_store,
  $filter_store => $filter_store.stats.total_posts
)

// 派生ストア: 現在のフィルター設定
export const current_filters = derived(
  filter_store,
  $filter_store => $filter_store.filters
)

// 派生ストア: フィルターが適用されているか
export const has_active_filters = derived(
  filter_store,
  $filter_store => $filter_store.active_filters_count > 0
)