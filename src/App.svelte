<script>
  import { onMount } from 'svelte'
  import Layout from './lib/components/layout/Layout.svelte'
  import PostsPage from './lib/components/pages/PostsPage.svelte'
  import ImportPage from './lib/components/pages/ImportPage.svelte'
  import TermsPage from './lib/components/layout/TermsPage.svelte'
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

  let active_page = 'posts'

  // ストアの購読
  $: total_posts = $total_post_count
  $: active_tab = $ui_store.active_tab
  $: active_page = $router

  onMount(async () => {
    debug_log('App.svelte: Starting initialization');
    
    // ルーターを初期化
    const cleanup_router = router.initialize()
    
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

      // ポストがない場合はインポートページへ
      if (current_total_posts === 0 && router.get_page_from_url() === 'posts') {
        router.navigate('import')
      } else if (active_tab) {
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

<Layout {active_page} on:navigate={handle_navigate}>
  {#if active_page === 'posts'}
    <PostsPage on:navigate={handle_page_navigate} />
  {:else if active_page === 'import'}
    <ImportPage on:navigate={handle_page_navigate} />
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
