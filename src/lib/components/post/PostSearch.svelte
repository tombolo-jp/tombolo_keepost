<script>
  import { createEventDispatcher } from 'svelte'

  export let placeholder = 'ポストを検索'
  export let value = ''

  const dispatch = createEventDispatcher()

  let input_element
  let debounce_timer

  function handle_input(event) {
    value = event.target.value

    // デバウンス処理
    clearTimeout(debounce_timer)
    debounce_timer = setTimeout(() => {
      dispatch('search', { query: value })
    }, 300)
  }

  function handle_clear() {
    value = ''
    dispatch('search', { query: '' })
    input_element.focus()
  }

  function handle_submit(event) {
    event.preventDefault()
    clearTimeout(debounce_timer)
    dispatch('search', { query: value })
  }
</script>

<form class="search-form" on:submit={handle_submit}>
  <div class="search-container">
    <i class="search-icon fas fa-search"></i>
    <input
      bind:this={input_element}
      type="text"
      class="search-input"
      {placeholder}
      bind:value
      on:input={handle_input}
      aria-label="検索"
    />
    {#if value}
      <button
        type="button"
        class="clear-button"
        on:click={handle_clear}
        aria-label="クリア"
      >
        <i class="fas fa-times"></i>
      </button>
    {/if}
  </div>
</form>

<style>
  .search-form {
    width: 100%;
  }

  .search-container {
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-icon {
    position: absolute;
    left: 0.75rem;
    pointer-events: none;
    font-size: 1.125rem;
  }

  .search-input {
    width: 100%;
    padding: 0.7rem 1rem 0.7rem 2.25rem;
    font-size: 0.9375rem;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    background: white;
    transition: all 0.2s;
  }

  .search-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .search-input::placeholder {
    color: #9ca3af;
  }

  .clear-button {
    position: absolute;
    right: 0.75rem;
    background: none;
    border: none;
    font-size: 1.25rem;
    color: #6b7280;
    cursor: pointer;
    padding: 0.25rem;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s;
  }

  .clear-button:hover {
    background: #f3f4f6;
    color: #374151;
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
  }
</style>
