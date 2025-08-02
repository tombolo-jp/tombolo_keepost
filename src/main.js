import App from './App.svelte'

// 開発環境でのみデバッグヘルパーを読み込み
if (import.meta.env.DEV) {
  import('./lib/utils/debug_helper.js')
}

const app = new App({
  target: document.getElementById('app'),
})

export default app