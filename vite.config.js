import { defineConfig } from 'vite'
import { resolve } from 'path'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  // Svelteプラグインを追加
  plugins: [svelte()],
  
  // 本番環境では /keepost/ サブディレクトリで動作
  base: process.env.NODE_ENV === 'production' ? '/keepost/' : '/',
  
  // 既存のディレクトリ構成を保持
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  },
  
  // 開発サーバー設定
  server: {
    port: 8080,
    open: true,
    // 静的ファイルの提供設定を追加
    fs: {
      strict: false
    }
  },
  
  // CSS設定（Sassサポート）
  css: {
    preprocessorOptions: {
      scss: {
        // Dart Sassの警告を抑制
        silenceDeprecations: ['legacy-js-api']
      }
    }
  },
  
  // 静的アセットの処理
  publicDir: 'public',
  
  // エイリアス設定（既存のパス構造に合わせて）
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
      '@js': resolve(__dirname, './js'),
      '@css': resolve(__dirname, './css')
    }
  }
  
})
