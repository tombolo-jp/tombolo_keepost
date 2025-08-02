import { writable, derived } from 'svelte/store'

/**
 * UI状態ストア
 */
function create_ui_store() {
  const { subscribe, set, update } = writable({
    // インポート関連
    import_state: 'idle', // 'idle' | 'importing' | 'success' | 'error'
    import_progress: {
      step: '',
      progress: 0,
      message: '',
      processed: 0,
      total: 0
    },
    import_error: null,
    
    // モーダル状態
    show_import_modal: false,
    show_settings_modal: false,
    show_stats_modal: false,
    show_terms_modal: false,
    
    // SNS選択状態
    selected_sns: '',
    auto_detect_sns: true,
    
    // タブ状態
    active_tab: 'all', // 'all' | 'keep' | 'twitter' | 'bluesky' | 'mastodon'
    
    // 通知
    notifications: [],
    
    // テーマ
    theme: 'light', // 'light' | 'dark'
    
    // サイドバー
    sidebar_collapsed: false,
    
    // その他のUI状態
    show_scroll_top: false,
    memory_warning_shown: false
  })

  return {
    subscribe,

    /**
     * インポート開始
     */
    start_import() {
      update(state => ({
        ...state,
        import_state: 'importing',
        import_error: null,
        import_progress: {
          step: '',
          progress: 0,
          message: '',
          processed: 0,
          total: 0
        }
      }))
    },

    /**
     * インポート進捗更新
     * @param {Object} progress - 進捗情報
     */
    update_import_progress(progress) {
      update(state => ({
        ...state,
        import_progress: { ...state.import_progress, ...progress }
      }))
    },

    /**
     * インポート成功
     * @param {string} message - 成功メッセージ
     */
    import_success(message) {
      update(state => ({
        ...state,
        import_state: 'success',
        import_progress: {
          ...state.import_progress,
          progress: 100,
          message
        }
      }))
      
      // 成功通知を表示
      this.add_notification({
        type: 'success',
        message,
        duration: 5000
      })
    },

    /**
     * インポートエラー
     * @param {string} error - エラーメッセージ
     */
    import_error(error) {
      update(state => ({
        ...state,
        import_state: 'error',
        import_error: error
      }))
      
      // エラー通知を表示
      this.add_notification({
        type: 'error',
        message: error,
        duration: 0 // 手動で閉じるまで表示
      })
    },

    /**
     * インポート状態リセット
     */
    reset_import() {
      update(state => ({
        ...state,
        import_state: 'idle',
        import_progress: {
          step: '',
          progress: 0,
          message: '',
          processed: 0,
          total: 0
        },
        import_error: null
      }))
    },

    /**
     * モーダル表示切り替え
     * @param {string} modal_name - モーダル名
     * @param {boolean} show - 表示状態
     */
    toggle_modal(modal_name, show) {
      update(state => ({
        ...state,
        [`show_${modal_name}_modal`]: show
      }))
    },

    /**
     * 通知追加
     * @param {Object} notification - 通知情報
     */
    add_notification(notification) {
      const id = Date.now()
      const new_notification = {
        id,
        ...notification
      }
      
      update(state => ({
        ...state,
        notifications: [...state.notifications, new_notification]
      }))
      
      // 自動削除設定
      if (notification.duration > 0) {
        setTimeout(() => {
          this.remove_notification(id)
        }, notification.duration)
      }
    },

    /**
     * 通知削除
     * @param {number} id - 通知ID
     */
    remove_notification(id) {
      update(state => ({
        ...state,
        notifications: state.notifications.filter(n => n.id !== id)
      }))
    },

    /**
     * テーマ切り替え
     * @param {string} theme - テーマ名
     */
    set_theme(theme) {
      update(state => ({ ...state, theme }))
      
      // ローカルストレージに保存
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('tlog_theme', theme)
      }
    },

    /**
     * SNS選択状態を設定
     * @param {string} sns_type - SNS種別
     */
    set_selected_sns(sns_type) {
      update(state => ({ ...state, selected_sns: sns_type }))
    },

    /**
     * SNS自動検出の有効/無効を設定
     * @param {boolean} enabled - 有効/無効
     */
    set_auto_detect_sns(enabled) {
      update(state => ({ ...state, auto_detect_sns: enabled }))
    },

    /**
     * アクティブタブを設定
     * @param {string} tab - タブID
     */
    set_active_tab(tab) {
      update(state => ({ ...state, active_tab: tab }))
      
      // ローカルストレージに保存
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('tlog_active_tab', tab)
      }
    },

    /**
     * サイドバー折りたたみ切り替え
     */
    toggle_sidebar() {
      update(state => ({
        ...state,
        sidebar_collapsed: !state.sidebar_collapsed
      }))
    },

    /**
     * スクロールトップボタン表示切り替え
     * @param {boolean} show - 表示状態
     */
    set_scroll_top_visibility(show) {
      update(state => ({ ...state, show_scroll_top: show }))
    },

    /**
     * メモリ警告表示
     */
    show_memory_warning() {
      update(state => ({ ...state, memory_warning_shown: true }))
      
      this.add_notification({
        type: 'warning',
        message: 'メモリ使用量が高くなっています。大量のデータ処理にご注意ください。',
        duration: 10000
      })
    },

    /**
     * UI状態を初期化
     */
    initialize() {
      // ローカルストレージから設定を復元
      if (typeof localStorage !== 'undefined') {
        // テーマ
        const saved_theme = localStorage.getItem('tlog_theme')
        if (saved_theme) {
          this.set_theme(saved_theme)
        }
        
        // アクティブタブ
        const saved_tab = localStorage.getItem('tlog_active_tab')
        if (saved_tab) {
          update(state => ({ ...state, active_tab: saved_tab }))
        }
      }
    },

    /**
     * ストアをリセット
     */
    reset() {
      set({
        import_state: 'idle',
        import_progress: {
          step: '',
          progress: 0,
          message: '',
          processed: 0,
          total: 0
        },
        import_error: null,
        show_import_modal: false,
        show_settings_modal: false,
        show_stats_modal: false,
        show_terms_modal: false,
        notifications: [],
        theme: 'light',
        sidebar_collapsed: false,
        show_scroll_top: false,
        memory_warning_shown: false,
        selected_sns: '',
        auto_detect_sns: true,
        active_tab: 'all'
      })
    }
  }
}

// UIストアのインスタンス
export const ui_store = create_ui_store()

// 派生ストア: インポート中かどうか
export const is_importing = derived(
  ui_store,
  $ui_store => $ui_store.import_state === 'importing'
)

// 派生ストア: 通知があるかどうか
export const has_notifications = derived(
  ui_store,
  $ui_store => $ui_store.notifications.length > 0
)

// 派生ストア: エラー通知があるかどうか
export const has_error_notifications = derived(
  ui_store,
  $ui_store => $ui_store.notifications.some(n => n.type === 'error')
)