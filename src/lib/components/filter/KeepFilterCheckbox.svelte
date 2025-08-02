<script>
  import { createEventDispatcher } from 'svelte'

  export let checked = false
  export let count = 0

  const dispatch = createEventDispatcher()

  function handle_change(event) {
    dispatch('change', event.target.checked)
  }
</script>

<div class="keep-filter-container">
  <label class="keep-filter-label">
    <input
      type="checkbox"
      class="keep-checkbox"
      bind:checked
      on:change={handle_change}
    />
    <span class="keep-text">
      KEEPのみ表示
    </span>
  </label>
</div>

<style>
  .keep-filter-container {
    display: inline-flex;
    align-items: center;
  }

  .keep-filter-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    user-select: none;
    padding: 0.5rem 0.75rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    transition: all 0.2s;
  }

  .keep-filter-label:hover {
    background: #f9fafb;
    border-color: #d1d5db;
  }

  .keep-checkbox {
    width: 1.125rem;
    height: 1.125rem;
    cursor: pointer;
    accent-color: #f59e0b;
  }

  .keep-text {
    font-size: 0.9375rem;
    color: #374151;
    font-weight: 500;
  }

  .keep-count {
    color: #6b7280;
    font-weight: normal;
  }

  /* チェック時のスタイル */
  .keep-filter-label:has(.keep-checkbox:checked) {
    background: #fef3c7;
    border-color: #f59e0b;
  }

  .keep-filter-label:has(.keep-checkbox:checked) .keep-text {
    color: #92400e;
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {

  }
</style>
