<script>
  import { createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher()

  export let current_page = 1
  export let total_pages = 1
  export let total_count = 0
  export let per_page = 20
  export let show_info = true

  $: start_count = (current_page - 1) * per_page + 1
  $: end_count = Math.min(current_page * per_page, total_count)
  $: page_numbers = get_page_numbers(current_page, total_pages)

  function get_page_numbers(current, total) {
    const delta = 2
    const range = []
    const rangeWithDots = []
    let l

    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
        range.push(i)
      }
    }

    range.forEach((i) => {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1)
        } else if (i - l !== 1) {
          rangeWithDots.push('...')
        }
      }
      rangeWithDots.push(i)
      l = i
    })

    return rangeWithDots
  }

  function handle_page_click(page) {
    if (page !== current_page && page !== '...') {
      dispatch('page-change', { page })
    }
  }

  function handle_prev() {
    if (current_page > 1) {
      dispatch('page-change', { page: current_page - 1 })
    }
  }

  function handle_next() {
    if (current_page < total_pages) {
      dispatch('page-change', { page: current_page + 1 })
    }
  }
</script>

<div class="pagination-container">
  {#if show_info && total_count > 0}
    <div class="pagination-info">
      {start_count.toLocaleString()} - {end_count.toLocaleString()} / {total_count.toLocaleString()} 件
    </div>
  {/if}

  {#if total_pages > 1}
    <nav class="pagination" aria-label="ページネーション">
      <button
        class="page-button prev"
        on:click={handle_prev}
        disabled={current_page === 1}
        aria-label="前のページ"
      >
        ←
      </button>

      <div class="page-numbers">
        {#each page_numbers as page}
          {#if page === '...'}
            <span class="page-dots">...</span>
          {:else}
            <button
              class="page-button"
              class:active={page === current_page}
              on:click={() => handle_page_click(page)}
              aria-label="ページ {page}"
              aria-current={page === current_page ? 'page' : undefined}
            >
              {page}
            </button>
          {/if}
        {/each}
      </div>

      <button
        class="page-button next"
        on:click={handle_next}
        disabled={current_page === total_pages}
        aria-label="次のページ"
      >
        →
      </button>
    </nav>
  {/if}
</div>

<style>
  .pagination-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .pagination-info {
    color: #718096;
    font-size: 0.875rem;
  }

  .pagination {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: white;
    padding: 0.5rem;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .page-numbers {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .page-button {
    min-width: 2rem;
    height: 2rem;
    padding: 0 0.5rem;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    font-size: 0.875rem;
    color: #4a5568;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .page-button:hover:not(:disabled) {
    background-color: #f7fafc;
    border-color: #cbd5e0;
  }

  .page-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .page-button.active {
    background-color: #3182ce;
    color: white;
    border-color: #3182ce;
  }

  .page-button.prev,
  .page-button.next {
    font-weight: 600;
  }

  .page-dots {
    padding: 0 0.5rem;
    color: #a0aec0;
  }

  @media (max-width: 640px) {
    .pagination-container {
      width: 100%;
    }

    .pagination {
      justify-content: center;
      flex-wrap: wrap;
    }

    .page-button {
      min-width: 2rem;
      height: 2rem;
      font-size: 0.813rem;
    }

    /* モバイルでは一部のページ番号を非表示 */
    .page-numbers > .page-button:not(.active):not(:first-child):not(:last-child) {
      display: none;
    }

    .page-numbers > .page-button.active,
    .page-numbers > .page-button.active + .page-button,
    .page-numbers > .page-button.active + .page-dots + .page-button {
      display: flex;
    }
  }
</style>
