<script>
  import { createEventDispatcher } from 'svelte'
  import { post_service } from '../../services/post_service.js'
  import { onMount } from 'svelte'
  import PostSearch from './PostSearch.svelte'

  export let active_filters = {}
  export let selected_sns = ''  // SNSフィルター用プロパティを追加

  const dispatch = createEventDispatcher()

  let year_months = []
  let show_filters = true // 常時表示化

  // SNSフィルター用データ
  const sns_options = [
    { value: '', label: '全SNS' },
    { value: 'twitter', label: 'Twitter' },
    { value: 'mastodon', label: 'Mastodon' },
    { value: 'bluesky', label: 'Bluesky' }
  ]

  onMount(async () => {
    // 年月リストを取得
    year_months = await post_service.get_year_months()
  })

  // 年月フォーマット変換関数を追加
  function format_year_month(year_month) {
    if (!year_month) return ''
    const [year, month] = year_month.split('-')
    return `${year}年${parseInt(month, 10)}月`
  }

  function toggle_filters() {
    // 常時表示のため、この関数は使用しない
    show_filters = true
  }

  function handle_filter_change(key, value) {
    const new_filters = { ...active_filters }

    if (value === null || value === '') {
      delete new_filters[key]
    } else {
      new_filters[key] = value
    }

    dispatch('filter-change', new_filters)
  }

  // SNSフィルター変更ハンドラーを追加
  function handle_sns_filter_change(event) {
    const sns_type = event.target.value
    dispatch('sns-filter-change', { sns_type })
  }


  function clear_filters() {
    search_value = ''
    dispatch('filter-change', {})
    dispatch('sns-filter-change', { sns_type: '' })
    dispatch('search', { query: '' })
  }

  let search_value = ''

  function handle_search(event) {
    search_value = event.detail.query
    dispatch('search', event.detail)
  }

  $: has_active_filters = Object.keys(active_filters).length > 0 || selected_sns !== '' || search_value !== ''
</script>

<div class="filter-container">
  <div class="filter-panel">
      <div class="filter-row">
        <div class="filter-group">
          <select
            id="sns-filter"
            class="filter-select"
            value={selected_sns}
            on:change={handle_sns_filter_change}
          >
            {#each sns_options as option}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </div>

        <div class="filter-group">
          <select
            id="year-month-filter"
            class="filter-select"
            value={active_filters.year_month || ''}
            on:change={(e) => handle_filter_change('year_month', e.target.value || null)}
          >
            <option value="">年月 すべて</option>
            {#each year_months as ym}
              <option value={ym}>{format_year_month(ym)}</option>
            {/each}
          </select>
        </div>

        <div class="filter-group">
          <select
            id="media-filter"
            class="filter-select"
            value={active_filters.has_media === true ? 'true' : (active_filters.has_media === false ? 'false' : '')}
            on:change={(e) => handle_filter_change('has_media', e.target.value === 'true' ? true : (e.target.value === 'false' ? false : null))}
          >
            <option value="">メディア すべて</option>
            <option value="true">メディアあり</option>
            <option value="false">メディアなし</option>
          </select>
        </div>

        <div class="search-group">
          <PostSearch
            on:search={handle_search}
            placeholder="ポストを検索"
            value={search_value}
          />
        </div>
      </div>
    </div>
</div>

<style>
  .filter-container {
    background: #f9fafb;
    border-radius: 8px;
  }

  .filter-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
  }

  .filter-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9375rem;
    color: #374151;
    font-weight: 500;
  }

  .filter-icon {
    font-size: 1.125rem;
  }

  .filter-badge {
    background: #3b82f6;
    color: white;
    font-size: 0.75rem;
    padding: 0.125rem 0.375rem;
    border-radius: 9999px;
    font-weight: 600;
  }



  .filter-panel {
    padding-top: 0.5rem;
  }

  .filter-row {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1rem;
    align-items: flex-end;
  }

  .search-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1 1 auto;
    min-width: 0;
  }

  .filter-group,
  .search-group {
    width: calc((100% - 3rem) / 4);
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1 1 auto;
    min-width: 0;
  }

  .filter-group label {
    font-size: 0.875rem;
    color: #374151;
    font-weight: 500;
  }

  .filter-select {
    padding: 0.75rem 0.75rem;
    font-size: 0.875rem;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: white;
    cursor: pointer;
  }

  .filter-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .filter-actions {
    display: flex;
    justify-content: flex-end;
  }

  .clear-filters-button {
    padding: 0.5rem 1rem;
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

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .filter-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
    }

    .filter-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .filter-group,
    .search-group {
      flex: 1 1 calc(50% - 0.25rem);
      min-width: calc(50% - 0.25rem);
    }
  }
</style>
