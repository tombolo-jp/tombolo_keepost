<script>
  import PostItem from './PostItem.svelte'
  import Loading from '../common/Loading.svelte'
  import Pagination from '../common/Pagination.svelte'
  import { keep_store } from '../../stores/keep_store.js'
  import { createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher()

  export let posts = []
  export let is_loading = false
  export let current_page = 1
  export let total_pages = 1
  export let total_items = 0
  export let items_per_page = 20

  // KEEPの状態変更を処理
  async function handle_keep_toggle(event) {
    const { post_id, is_kept } = event.detail
    const result = await keep_store.toggle_keep(post_id, is_kept)

    if (result.success) {
      // ポストの状態を更新
      posts = posts.map(post =>
        post.id === post_id
          ? { ...post, is_kept: !is_kept }
          : post
      )
    }
  }

  // スムーススクロール関数（300ミリ秒）
  function smooth_scroll_to(element, duration = 300) {
    const target_position = element.getBoundingClientRect().top + window.pageYOffset
    const start_position = window.pageYOffset
    const distance = target_position - start_position
    let start_time = null

    function animation(current_time) {
      if (start_time === null) start_time = current_time
      const time_elapsed = current_time - start_time
      const progress = Math.min(time_elapsed / duration, 1)

      // easeInOutQuad イージング関数
      const easing = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2

      window.scrollTo(0, start_position + distance * easing)

      if (progress < 1) {
        requestAnimationFrame(animation)
      }
    }

    requestAnimationFrame(animation)
  }

  // ページ変更イベントを処理して親コンポーネントに伝播
  function handle_page_change(event, from_bottom = false) {
    // 下部のページネーションからのクリックの場合は上部にスクロール
    if (from_bottom) {
      const pagination_top = document.querySelector('.pagination-top')
      if (pagination_top) {
        smooth_scroll_to(pagination_top, 500)
      }
    }
    // イベントを親コンポーネントに伝播
    dispatch('page-change', event.detail)
  }
</script>

<div class="post-list">
  {#if posts.length > 0 && total_pages >= 1}
    <div class="pagination-top">
      <Pagination
        {current_page}
        {total_pages}
        per_page={items_per_page}
        total_count={total_items}
        on:page-change={(e) => handle_page_change(e, false)}
      />
    </div>
  {/if}

  {#if posts.length === 0}
    {#if is_loading}
      <Loading message="ポストを読み込んでいます..." />
    {:else}
      <div class="empty-state">
        <h3>ポストがありません</h3>
        <p>検索条件を変更するか、データをインポートしてください。</p>
      </div>
    {/if}
  {:else}
    <div class="posts-container">
      {#each posts as post (post.id)}
        <PostItem
          {post}
          on:keep-toggle={handle_keep_toggle}
        />
      {/each}
    </div>


    {#if is_loading}
      <div class="loading-section">
        <Loading message="ポストを読み込んでいます..." />
      </div>
    {/if}
  {/if}

  {#if posts.length > 0 && total_pages >= 1}
    <div class="pagination-bottom">
      <Pagination
        {current_page}
        {total_pages}
        per_page={items_per_page}
        total_count={total_items}
        on:page-change={(e) => handle_page_change(e, true)}
      />
    </div>
  {/if}
</div>

<style>
  .post-list {
    border-radius: 8px;
    min-height: 400px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
    color: #6b7280;
  }

  .empty-state h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    color: #374151;
  }

  .empty-state p {
    margin: 0;
    font-size: 0.875rem;
  }

  .posts-container {
    display: flex;
    flex-direction: column;
    margin-top: 2rem;
  }

  .loading-section {
    padding: 2rem;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80px;
  }

  .pagination-top {
    padding: 0 0;
    background: #f9fafb;
    border-radius: 8px 8px 0 0;
    margin-top: 2rem;
  }

  .pagination-bottom {
    padding: 1.5rem 0 0;
    border-top: 1px solid #e5e7eb;
    background: #f9fafb;
    border-radius: 0 0 8px 8px;
  }

  /* アニメーション */
  :global(.posts-container > *) {
    animation: fadeIn 0.3s ease-in;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .post-list {
      border-radius: 0;
    }

    .empty-state {
      padding: 3rem 1.5rem;
    }

    .loading-section {
      padding: 1.5rem;
    }
  }
</style>
