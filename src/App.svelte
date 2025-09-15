<script>
  import { onMount } from 'svelte'
  import Layout from './lib/components/layout/Layout.svelte'
  import PostsPage from './lib/components/pages/PostsPage.svelte'
  import ImportPage from './lib/components/pages/ImportPage.svelte'
  import TermsPage from './lib/components/layout/TermsPage.svelte'
  import NewsPage from './lib/components/layout/NewsPage.svelte'
  import RoadmapPage from './lib/components/layout/RoadmapPage.svelte'
  import ManualPage from './lib/components/layout/ManualPage.svelte'
  import ImportSettings from './lib/components/import/ImportSettings.svelte'

  import { post_store } from './lib/stores/post_store.js'
  import { keep_store } from './lib/stores/keep_store.js'
  import { ui_store } from './lib/stores/ui_store.js'
  import { filter_store, total_post_count } from './lib/stores/filter_store.js'
  import { memory_monitor } from './lib/utils/memory_monitor.js'
  import { debug_log, debug_error } from './lib/utils/debug.js'
  import { error_handler } from './lib/utils/error_handler.js'
  import { router } from './lib/services/router_service.js'
  import { migration_progress } from './lib/stores/migration_store.js'
  import { db } from './lib/db/database.js'
  import MigrationProgress from './lib/components/common/MigrationProgress.svelte'

  let active_page = 'posts'
  let show_migration_progress = false

  // ストアの購読
  $: total_posts = $total_post_count
  $: active_tab = $ui_store.active_tab
  $: active_page = $router
  $: is_migrating = $migration_progress.is_migrating

  onMount(async () => {
    debug_log('App.svelte: Starting initialization');

    // マイグレーションチェック
    try {
      // 実際のDBバージョンを確認
      const actual_version = await db.get_actual_version()
      const target_version = 7 // 目標のDBバージョン

      debug_log('App.svelte: Actual DB version:', actual_version, 'Target version:', target_version)

      // マイグレーションが必要か判断
      if (actual_version && actual_version < target_version) {
        debug_log('App.svelte: Migration needed from version', actual_version, 'to', target_version)
        show_migration_progress = true
        migration_progress.start()

        // データベースを初期化（マイグレーションが自動実行される）
        const result = await db.initialize()

        if (result.migrated) {
          debug_log('App.svelte: Migration completed from', result.from_version, 'to', result.to_version)
          // マイグレーション完了
          migration_progress.complete()
          setTimeout(() => {
            show_migration_progress = false
          }, 1000)
        } else {
          // マイグレーションが実行されなかった場合
          show_migration_progress = false
        }
      } else {
        // マイグレーション不要、通常の初期化
        debug_log('App.svelte: No migration needed, current version:', actual_version)
        await db.initialize()
      }
    } catch (error) {
      debug_error('App.svelte: Migration error:', error)
      migration_progress.update({ error: error.message })
      show_migration_progress = false
      ui_store.add_notification({
        type: 'error',
        message: 'データベースの更新に失敗しました: ' + error.message,
        duration: 0
      })
    }

    // ルーターを初期化
    const cleanup_router = router.initialize()

    // 無効なルートへのアクセスを検出して通知
    if (!router.is_valid_route()) {
      const pathname = window.location.pathname
      debug_log('App.svelte: Invalid route detected:', pathname)
      ui_store.add_notification({
        type: 'info',
        message: 'ページが見つかりません。ホームに戻りました。',
        duration: 3000
      })
    }

    // UI状態を初期化
    ui_store.initialize()

    // エラーハンドラーを設定
    error_handler.add_listener((error) => {
      ui_store.add_notification({
        type: 'error',
        message: error_handler.get_user_message(error),
        duration: 0
      })
    })

    // メモリ監視を開始
    const stop_monitoring = memory_monitor.start_monitoring((report) => {
      if (report.status === 'warning' && !ui_store.memory_warning_shown) {
        ui_store.show_memory_warning()
      }
    })

    // 初期データを読み込み
    try {
      await filter_store.load_stats()
      debug_log('App.svelte: filter_store.load_stats completed');
      await keep_store.load_stats()

      // filter_storeから直接総ポスト数を取得
      const filter_state = filter_store.get ? filter_store.get() : {}
      debug_log('App.svelte: filter_state:', filter_state)
      const current_total_posts = filter_state.stats?.total_posts || 0

      // ポストがない場合でも、インポートページへは自動転送しない
      // ユーザーが明示的にインポートボタンをクリックした場合のみ移動
      if (active_tab) {
        await post_store.load_posts(1)
      }
    } catch (error) {
      debug_error('App.svelte: Initialization error:', error)

    }

    return () => {
      stop_monitoring()
      cleanup_router()
    }
  })

  function handle_page_navigate(event) {
    router.navigate(event.detail.page)
  }

  function handle_navigate(event) {
    router.navigate(event.detail.page)
  }
</script>

{#if show_migration_progress}
  <MigrationProgress
    onComplete={() => {
      debug_log('App.svelte: Migration completed')
    }}
    onError={(error) => {
      debug_error('App.svelte: Migration error:', error)
      ui_store.add_notification({
        type: 'error',
        message: 'データベースの更新に失敗しました',
        duration: 0
      })
    }}
  />
{/if}

<Layout {active_page} on:navigate={handle_navigate}>
  {#if active_page === 'posts'}
    <PostsPage on:navigate={handle_page_navigate} />
  {:else if active_page === 'import'}
    <ImportPage on:navigate={handle_page_navigate} />
  {:else if active_page === 'news'}
    <NewsPage />
  {:else if active_page === 'terms'}
    <TermsPage />
  {:else if active_page === 'roadmap'}
    <RoadmapPage />
  {:else if active_page === 'manual'}
    <ManualPage />
  {:else if active_page === 'settings'}
    <div class="settings-page">
      <ImportSettings />
    </div>
  {/if}
</Layout>

<style>
  /* 設定ページ */
  .settings-page {
    max-width: 800px;
    margin: 2rem auto;
    padding: 2rem;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .settings-page h2 {
    margin: 0 0 2rem 0;
    color: #1f2937;
  }
</style>
