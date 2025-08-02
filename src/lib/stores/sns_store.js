import { writable, derived } from 'svelte/store'
import { post_service } from '../services/post_service.js'

/**
 * SNS管理ストア
 * インポート済みSNS情報とアカウント情報を管理
 */
function create_sns_store() {
  const { subscribe, set, update } = writable({
    available_sns: [],
    sns_stats: {
      twitter: { count: 0, latest_post: null, username: null },
      bluesky: { count: 0, latest_post: null, username: null },
      mastodon: { count: 0, latest_post: null, username: null }
    },
    accounts: [],
    is_loading: false,
    error: null
  })

  /**
   * SNSの表示名を取得
   * @param {string} sns_type - SNS種別
   * @returns {string} 表示名
   */
  function get_sns_display_name(sns_type) {
    const display_names = {
      twitter: 'Twitter',
      bluesky: 'Bluesky',
      mastodon: 'Mastodon'
    }
    return display_names[sns_type] || sns_type
  }

  /**
   * SNSアイコンを取得
   * @param {string} sns_type - SNS種別
   * @returns {string} アイコン文字
   */
  function get_sns_icon(sns_type) {
    const icons = {
      twitter: 'T',
      bluesky: 'B',
      mastodon: 'M'
    }
    return icons[sns_type] || '?'
  }

  function get() {
    let value
    subscribe(v => value = v)()
    return value
  }

  /**
   * SNS統計情報を読み込む
   */
  async function load_sns_stats() {
      update(state => ({ ...state, is_loading: true, error: null }))

      try {
        const stats = await post_service.get_sns_stats()
        
        // 利用可能なSNSを判定
        const available_sns = []
        const sns_stats = {}
        
        for (const [sns_type, count] of Object.entries(stats.by_sns || {})) {
          if (count > 0) {
            available_sns.push({
            type: sns_type,
            display_name: get_sns_display_name(sns_type),
            count: count
          })
            
            // 各SNSの詳細統計を取得（TODO: 実装を最適化）
            sns_stats[sns_type] = {
              count: count,
              latest_post: null,  // TODO: 最新ポストの取得
              username: null      // TODO: アカウント情報の取得
            }
          }
        }

        update(state => ({
          ...state,
          available_sns,
          sns_stats,
          is_loading: false
        }))
      } catch (error) {
        update(state => ({
          ...state,
          is_loading: false,
          error: error.message
        }))
      }
  }

  return {
    subscribe,
    load_sns_stats,

    /**
     * アカウント情報を更新
     * @param {string} sns_type - SNS種別
     * @param {Object} account_info - アカウント情報
     */
    update_account_info(sns_type, account_info) {
      update(state => ({
        ...state,
        sns_stats: {
          ...state.sns_stats,
          [sns_type]: {
            ...state.sns_stats[sns_type],
            username: account_info.username,
            ...account_info
          }
        }
      }))
    },



    /**
     * インポート後にSNS情報を更新
     * @param {string} sns_type - SNS種別
     * @param {number} count - インポートしたポスト数
     */
    async update_after_import(sns_type, count) {
      // 統計を再読み込み
      await load_sns_stats()
      
      // インポート成功を通知（UIで使用）
      update(state => ({
        ...state,
        last_import: {
          sns_type,
          count,
          imported_at: new Date().toISOString()
        }
      }))
    },

    /**
     * タブ用のSNS情報を取得
     * @returns {Array} タブ情報の配列
     */
    get_tab_info() {
      const state = get()
      const tabs = [
        {
          id: 'all',
          label: '全SNS',
          count: Object.values(state.sns_stats).reduce((sum, stat) => sum + stat.count, 0),
          icon: null
        }
      ]

      // 各SNSのタブ
      state.available_sns.forEach(sns => {
        tabs.push({
          id: sns.type,
          label: sns.display_name,
          count: sns.count,
          icon: get_sns_icon(sns.type)
        })
      })

      // KEEPタブ（別ストアから取得する必要があるため、ここでは仮の実装）
      tabs.push({
        id: 'keep',
        label: 'KEEP',
        count: 0,  // keep_storeから取得
        icon: '★'
      })

      return tabs
    },

    /**
     * 特定のSNSがインポート済みか確認
     * @param {string} sns_type - SNS種別
     * @returns {boolean} インポート済みの場合true
     */
    is_sns_imported(sns_type) {
      const state = get()
      return state.available_sns.some(sns => sns.type === sns_type)
    },

    /**
     * ストアをリセット
     */
    reset() {
      set({
        available_sns: [],
        sns_stats: {
          twitter: { count: 0, latest_post: null, username: null },
          bluesky: { count: 0, latest_post: null, username: null },
          mastodon: { count: 0, latest_post: null, username: null }
        },
        accounts: [],
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

// SNSストアのインスタンス
export const sns_store = create_sns_store()

// 派生ストア: インポート済みSNS数
export const imported_sns_count = derived(
  sns_store,
  $sns_store => $sns_store.available_sns.length
)

// 派生ストア: 総ポスト数
export const total_posts_count = derived(
  sns_store,
  $sns_store => Object.values($sns_store.sns_stats).reduce((sum, stat) => sum + stat.count, 0)
)

// 派生ストア: SNS別統計情報
export const sns_stats_summary = derived(
  sns_store,
  $sns_store => {
    const summary = {}
    $sns_store.available_sns.forEach(sns => {
      summary[sns.type] = {
        ...sns,
        stats: $sns_store.sns_stats[sns.type]
      }
    })
    return summary
  }
)