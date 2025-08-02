import { writable } from 'svelte/store'

// ベースパスを取得（Viteの環境変数から）
const BASE_PATH = import.meta.env.BASE_URL || '/'

// ルート定義（相対パス）
const routes = {
  '': 'posts',           // ルートページ
  'import': 'import',
  'config': 'settings',
  'rules': 'terms',
  'roadmap': 'roadmap',
  'manual': 'manual'
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
    const pathname = window.location.pathname
    // ベースパスを除去して相対パスを取得
    let relativePath = pathname
    if (pathname.startsWith(BASE_PATH)) {
      relativePath = pathname.slice(BASE_PATH.length)
    }
    // 先頭のスラッシュを除去
    if (relativePath.startsWith('/')) {
      relativePath = relativePath.slice(1)
    }
    return routes[relativePath] || 'posts'
  }
  
  // URLを更新してページを変更
  function navigate(page) {
    // ページ名から相対パスを取得
    const relativePath = Object.keys(routes).find(key => routes[key] === page) || ''
    const fullPath = BASE_PATH + relativePath
    
    // History APIを使用してURLを更新
    if (window.location.pathname !== fullPath) {
      window.history.pushState({ page }, '', fullPath)
    }
    
    // ストアを更新
    set(page)
    
    // ハッシュフラグメントがない場合のみページトップにスクロール
    if (!window.location.hash) {
      window.scrollTo(0, 0)
    }
  }
  
  // ブラウザの戻る/進むボタンを処理
  function handle_popstate() {
    const page = get_page_from_url()
    set(page)
    // ハッシュフラグメントがない場合のみページトップにスクロール
    if (!window.location.hash) {
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
    if (href && href.startsWith('#')) {
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
  
  // 初期化
  function initialize() {
    // 現在のURLからページを設定
    const page = get_page_from_url()
    set(page)
    
    // popstateイベントをリッスン
    window.addEventListener('popstate', handle_popstate)
    
    // ドキュメント全体のクリックをリッスン
    document.addEventListener('click', handle_click)
    
    // クリーンアップ関数を返す
    return () => {
      window.removeEventListener('popstate', handle_popstate)
      document.removeEventListener('click', handle_click)
    }
  }
  
  return {
    subscribe,
    navigate,
    initialize,
    get_page_from_url
  }
}

export const router = create_router()