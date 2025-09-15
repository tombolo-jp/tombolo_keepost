import { writable } from 'svelte/store'

// ベースパスを取得（Viteの環境変数から）
const BASE_PATH = import.meta.env.BASE_URL || '/'

// ハッシュルーティングを使用するかどうかを判定（環境変数またはURLから自動検出）
const USE_HASH_ROUTING = import.meta.env.VITE_USE_HASH_ROUTING === 'true' ||
                         window.location.hash.startsWith('#/')

// ルート定義（相対パス）
const routes = {
  ''       : 'posts',
  'import' : 'import',
  'config' : 'settings',
  'news'   : 'news',
  'rules'  : 'terms',
  'roadmap': 'roadmap',
  'manual' : 'manual'
}

// ページからURLパスを取得
export function get_path_from_page(page) {
  const relativePath = Object.keys(routes).find(key => routes[key] === page) || ''
  return BASE_PATH + relativePath
}

// 現在のページを管理するストア
function create_router() {
  const { subscribe, set } = writable('posts')

  // URLからページを取得
  function get_page_from_url() {
    let relativePath = ''

    if (USE_HASH_ROUTING) {
      // ハッシュルーティングモード
      const hash = window.location.hash
      if (hash.startsWith('#/')) {
        relativePath = hash.slice(2) // #/ を削除
      }
    } else {
      // 通常のルーティングモード
      const pathname = window.location.pathname
      // ベースパスを除去して相対パスを取得
      let path = pathname
      if (pathname.startsWith(BASE_PATH)) {
        path = pathname.slice(BASE_PATH.length)
      }
      // 先頭のスラッシュを除去
      if (path.startsWith('/')) {
        path = path.slice(1)
      }
      relativePath = path
    }

    // 無効なルートの場合、sessionStorageに保存（404フォールバック用）
    const page = routes[relativePath]
    if (page === undefined && relativePath !== '') {
      // 意図したパスを保存（404ページから復帰時に使用）
      if (!USE_HASH_ROUTING) {
        sessionStorage.setItem('intended_path', window.location.pathname)
      }
    }

    return page || 'posts'
  }

  // URLを更新してページを変更
  function navigate(page, push_state = true) {
    // ページ名から相対パスを取得
    const relativePath = Object.keys(routes).find(key => routes[key] === page) || ''

    if (USE_HASH_ROUTING) {
      // ハッシュルーティングモード
      const newHash = '#/' + relativePath

      if (push_state && window.location.hash !== newHash) {
        window.location.hash = newHash
      }
    } else {
      // 通常のルーティングモード
      const fullPath = BASE_PATH + relativePath

      // History APIを使用してURLを更新
      if (push_state && window.location.pathname !== fullPath) {
        window.history.pushState({ page }, '', fullPath)
      }
    }

    // ストアを更新
    set(page)

    // ハッシュフラグメントがない場合のみページトップにスクロール
    if (!window.location.hash || USE_HASH_ROUTING) {
      window.scrollTo(0, 0)
    }
  }

  // ブラウザの戻る/進むボタンを処理
  function handle_popstate() {
    const page = get_page_from_url()
    set(page)
    // ハッシュフラグメントがない場合のみページトップにスクロール
    if (!window.location.hash || USE_HASH_ROUTING) {
      window.scrollTo(0, 0)
    }
  }

  // ハッシュ変更を処理（ハッシュルーティングモード用）
  function handle_hashchange() {
    if (USE_HASH_ROUTING) {
      const page = get_page_from_url()
      set(page)
      window.scrollTo(0, 0)
    }
  }

  // aタグのクリックをインターセプト
  function handle_click(event) {
    // metaKey, ctrlKey, shiftKeyが押されている場合は通常の動作
    if (event.metaKey || event.ctrlKey || event.shiftKey) return

    // aタグまで遡る
    let target = event.target
    while (target && target.nodeName !== 'A') {
      target = target.parentNode
    }

    if (!target || target.nodeName !== 'A') return

    // href属性が#で始まる場合は、ページ内リンクなので通常の動作を許可
    const href = target.getAttribute('href')

    if (USE_HASH_ROUTING) {
      // ハッシュルーティングモード
      if (href && href.startsWith('#/')) {
        const relativePath = href.slice(2)
        if (routes[relativePath] !== undefined) {
          event.preventDefault()
          navigate(routes[relativePath])
        }
      }
    } else {
      // 通常のルーティングモード
      if (href && href.startsWith('#') && !href.startsWith('#/')) {
        return // ブラウザ標準のアンカー動作に任せる
      }

      // 外部リンクは無視
      if (target.target === '_blank') return
      if (target.href && !target.href.startsWith(window.location.origin)) return

      // 内部リンクの場合
      const pathname = target.pathname
      // ベースパスを除去して相対パスを取得
      let relativePath = pathname
      if (pathname.startsWith(BASE_PATH)) {
        relativePath = pathname.slice(BASE_PATH.length)
      }
      // 先頭のスラッシュを除去
      if (relativePath.startsWith('/')) {
        relativePath = relativePath.slice(1)
      }

      if (routes[relativePath] !== undefined) {
        event.preventDefault()
        navigate(routes[relativePath])
      }
    }
  }

  // 初期化
  function initialize() {
    // 404ページから戻ってきた場合の処理（sessionStorageから意図したパスを復元）
    const intended_path = sessionStorage.getItem('intended_path')
    if (intended_path) {
      sessionStorage.removeItem('intended_path')
      // 保存されていたパスから適切なページを判定
      let relativePath = intended_path
      if (intended_path.startsWith(BASE_PATH)) {
        relativePath = intended_path.slice(BASE_PATH.length)
      }
      if (relativePath.startsWith('/')) {
        relativePath = relativePath.slice(1)
      }
      const page = routes[relativePath] || 'posts'
      // ストアを直接更新（URLは既に正しい場所にいるため）
      set(page)
      // ページトップにスクロール
      window.scrollTo(0, 0)
    }

    // 現在のURLからページを設定
    const page = get_page_from_url()
    set(page)

    // イベントリスナーを設定
    if (USE_HASH_ROUTING) {
      // ハッシュルーティングモード
      window.addEventListener('hashchange', handle_hashchange)
    } else {
      // 通常のルーティングモード
      window.addEventListener('popstate', handle_popstate)
    }

    // ドキュメント全体のクリックをリッスン
    document.addEventListener('click', handle_click)

    // クリーンアップ関数を返す
    return () => {
      if (USE_HASH_ROUTING) {
        window.removeEventListener('hashchange', handle_hashchange)
      } else {
        window.removeEventListener('popstate', handle_popstate)
      }
      document.removeEventListener('click', handle_click)
    }
  }

  // 現在のURLが有効なルートかどうかを判定
  function is_valid_route() {
    let relativePath = ''

    if (USE_HASH_ROUTING) {
      // ハッシュルーティングモード
      const hash = window.location.hash
      if (hash.startsWith('#/')) {
        relativePath = hash.slice(2)
      }
    } else {
      // 通常のルーティングモード
      const pathname = window.location.pathname
      let path = pathname
      if (pathname.startsWith(BASE_PATH)) {
        path = pathname.slice(BASE_PATH.length)
      }
      if (path.startsWith('/')) {
        path = path.slice(1)
      }
      relativePath = path
    }

    return relativePath === '' || routes[relativePath] !== undefined
  }

  // 相対パスからページを取得（デバッグ用）
  function get_page_from_path(path) {
    let relativePath = path
    if (path.startsWith(BASE_PATH)) {
      relativePath = path.slice(BASE_PATH.length)
    }
    if (relativePath.startsWith('/')) {
      relativePath = relativePath.slice(1)
    }
    return routes[relativePath] || null
  }

  // ページに対応するURLを取得
  function get_url_for_page(page) {
    const relativePath = Object.keys(routes).find(key => routes[key] === page) || ''

    if (USE_HASH_ROUTING) {
      return window.location.origin + window.location.pathname + '#/' + relativePath
    } else {
      return window.location.origin + BASE_PATH + relativePath
    }
  }

  return {
    subscribe,
    navigate,
    initialize,
    get_page_from_url,
    is_valid_route,
    get_page_from_path,
    get_url_for_page,
    USE_HASH_ROUTING // エクスポートして他のコンポーネントでも参照可能に
  }
}

export const router = create_router()
