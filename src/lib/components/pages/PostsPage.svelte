<script>
  import PostList from '../post/PostList.svelte'
  import PostFilter from '../post/PostFilter.svelte'
  import KeepFilterCheckbox from '../filter/KeepFilterCheckbox.svelte'
  import Loading from '../common/Loading.svelte'
  import ErrorMessage from '../common/ErrorMessage.svelte'
  import { onMount } from 'svelte'
  import { with_base_path } from '../../utils/base_path.js'

  import { post_store } from '../../stores/post_store.js'
  import { keep_store, keep_count } from '../../stores/keep_store.js'
  import { sns_store } from '../../stores/sns_store.js'
  import { ui_store } from '../../stores/ui_store.js'
  import { filter_store, sns_stats, total_post_count } from '../../stores/filter_store.js'
  import { debug_log } from '../../utils/debug.js'


  let active_filters = {}
  let current_sort = 'desc'
  let selected_sns = ''  // SNSフィルター用変数を追加
  let is_keep_filtered = false  // KEEPフィルター状態
  let search_value = ''  // 検索値を追跡

  // ストアの購読
  $: posts = $post_store.posts
  $: pagination = $post_store.pagination
  $: is_loading = $post_store.is_loading
  $: error = $post_store.error
  $: total_posts = $total_post_count

  // 初期化中かどうかの判定（total_postsがnullなら初期化中）
  $: is_initializing = total_posts === null

  // デバッグログを追加
  $: {
    debug_log('PostsPage: State update', {
      total_posts,
      is_initializing,
      posts_length: posts?.length,
      is_loading,
      error
    })
  }

  // デバッグ用
  $: debug_log('PostsPage状態:', {
    is_initializing,
    total_posts,
    filter_store_total: $filter_store.stats.total_posts
  })

  // コンポーネントマウント時に初期データを読み込む
  onMount(async () => {
    debug_log('PostsPage: onMount - 初期データ読み込み開始')

    // SNS統計情報を読み込む（タブ表示のため）
    await sns_store.load_sns_stats()

    // filter_storeが初期化されていない場合は読み込む
    if (total_posts === null) {
      debug_log('PostsPage: onMount - filter_store.load_stats()を実行')
      await filter_store.load_stats()
    }

    // 初期データを読み込む
    debug_log('PostsPage: onMount - 初期データ読み込み')
    await post_store.load_posts(1, 'all')
  })


  async function handle_search(event) {
    const query = event.detail.query
    search_value = query  // 検索値を追跡
    const current_sns = selected_sns || 'all'

    // 空のクエリの場合は通常のポスト一覧を読み込む
    if (!query || query.trim() === '') {
      await post_store.load_posts(1, current_sns)
    } else {
      await post_store.search_posts(query, current_sns)
    }
  }

  async function handle_filter_change(event) {
    active_filters = event.detail

    // フィルタークリアの場合
    if (Object.keys(active_filters).length === 0) {
      // KEEPフィルターもクリア
      is_keep_filtered = false
      filter_store.set_keep_filter(null)
      // フィルターをクリアして再読み込み
      post_store.clear_filter()
    } else {
      post_store.set_filter(active_filters)
    }
  }

  // フィルタークリア用の関数を追加
  function clear_all_filters() {
    active_filters = {}
    selected_sns = ''
    is_keep_filtered = false
    search_value = ''
    filter_store.set_keep_filter(null)
    filter_store.clear_sns_filter()
    post_store.clear_filter()
    post_store.load_posts(1, 'all')
  }

  // SNSフィルター変更ハンドラーを追加
  async function handle_sns_filter_change(event) {
    const sns_type = event.detail.sns_type
    selected_sns = sns_type

    if (sns_type === '') {
      filter_store.clear_sns_filter()
      await post_store.load_posts(1, 'all')
    } else {
      filter_store.set_sns_filter([sns_type])
      await post_store.load_posts(1, sns_type)
    }
  }

  // KEEPチェックボックスのハンドラー
  async function handle_keep_filter_change(checked) {
    is_keep_filtered = checked
    filter_store.set_keep_filter(checked ? true : null)

    // post_storeにもフィルターを設定
    post_store.set_filter({ is_kept: checked ? true : null })
  }

  async function handle_sort_change(event) {
    current_sort = event.target.value
    post_store.set_sort(current_sort)
  }

  async function handle_page_change(event) {
    const current_sns = selected_sns || 'all'
    await post_store.load_posts(event.detail.page, current_sns)
  }



</script>

<div class="posts-page">
  {#if is_initializing}
    <Loading message="読み込み中..." />
  {:else if total_posts === 0}
    <div class="empty-state">
      <div class="empty-icon">📁</div>
      <h2>まだポストがありません</h2>
      <p>SNSのエクスポートデータをインポートすると、ポストを閲覧・管理できます。</p>
      <a href="{with_base_path('import')}" class="import-button">
        データをインポート
      </a>
    </div>
  {:else}
    <div class="posts-section">
      <div class="search-filter-section">
        <PostFilter
          {active_filters}
          {selected_sns}
          on:filter-change={handle_filter_change}
          on:sns-filter-change={handle_sns_filter_change}
          on:search={handle_search}
        />

        <!-- フィルターコントロールを横並び配置 -->
        <div class="filter-controls">
          <KeepFilterCheckbox
            checked={is_keep_filtered}
            count={$keep_count}
            on:change={(e) => handle_keep_filter_change(e.detail)}
          />

          <div class="sort-control">
            <select
              id="sort-select"
              class="sort-select"
              bind:value={current_sort}
              on:change={handle_sort_change}
            >
              <option value="desc">新しい順</option>
              <option value="asc">古い順</option>
            </select>
          </div>

          {#if active_filters && Object.keys(active_filters).length > 0 || selected_sns !== '' || is_keep_filtered || search_value !== ''}
            <button
              class="clear-filters-button"
              on:click={clear_all_filters}
            >
              フィルターをクリア
            </button>
          {/if}
        </div>
      </div>

        {#if error}
          <ErrorMessage
            {error}
            dismissible={true}
            on:dismiss={() => post_store.update(s => ({ ...s, error: null }))}
          />
        {/if}

        <div class="posts-container">
          {#if is_loading && posts.length === 0}
            <Loading message="ポストを読み込んでいます..." />
          {:else}
            <PostList
              {posts}
              {is_loading}
              current_page={pagination.current_page}
              total_pages={pagination.total_pages}
              total_items={pagination.total_count}
              items_per_page={pagination.per_page}
              on:page-change={handle_page_change}
            />
          {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .posts-page {
  }

  .empty-state {
    max-width: 600px;
    margin: 4rem auto;
    padding: 3rem;
    text-align: center;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1.5rem;
    opacity: 0.8;
  }

  .empty-state h2 {
    margin: 0 0 1rem 0;
    color: #1f2937;
    font-size: 1.75rem;
  }

  .empty-state p {
    margin: 0 0 2rem 0;
    color: #6b7280;
    line-height: 1.6;
  }

  .import-button {
    padding: 0.75rem 1.5rem;
    background: #059669;
    color: white;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    display: inline-block;
  }

  .import-button:hover {
    background: #059669;
  }

  /* フィルターコントロールの横並び配置 */
  .filter-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: 1.25rem;
    background: #f9fafb;
    border-radius: 8px;
    justify-content: center;
  }

  .sort-control {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .sort-select {
    padding: 0.75rem 0.75rem;
    font-size: 0.875rem;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: white;
    cursor: pointer;
  }

  .sort-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  /* フィルタークリアボタン */
  .clear-filters-button {
    display: table;
    padding: 0.375rem 1rem;
    font-size: 0.875rem;
    color: #dc2626;
    background: white;
    border: 1px solid #fecaca;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .clear-filters-button:hover {
    background: #fee2e2;
    border-color: #f87171;
  }

  @media (max-width: 768px) {

    .filter-controls {
      flex-wrap: wrap;
    }

    .clear-filters-button {
      margin-left: 0;
    }
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .empty-state {
      margin: 2rem 1rem;
      padding: 2rem 1.5rem;
    }

    .empty-icon {
      font-size: 3rem;
    }

    .empty-state h2 {
      font-size: 1.5rem;
    }
  }
</style>
