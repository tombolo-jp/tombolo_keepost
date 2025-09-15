<script>
  import { createEventDispatcher } from 'svelte'
  import { import_service } from '../../services/import_service.js'

  export let selected_sns = ''
  export let show_auto_detect = true

  const dispatch = createEventDispatcher()

  // サポートされているSNS一覧を取得
  const supported_sns = import_service.get_supported_sns_list()

  function handle_sns_change(event) {
    selected_sns = event.target.value
    dispatch('change', { sns_type: selected_sns })
  }

  function get_sns_icon(sns_type) {
    const icons = {
      twitter: '🐦',
      twilog: '🐦',
      bluesky: '☁️',
      mastodon: '🐘'
    }
    return icons[sns_type] || '📱'
  }
</script>

<div class="sns-selector">
  <div class="selector-header">
    <h3>インポートするSNSを選択</h3>
    {#if show_auto_detect}
      <p class="help-text">
        SNSを選択すると、インポート手順が表示されます。
      </p>
    {/if}
  </div>

  <div class="sns-options">
    <select
      class="sns-select"
      bind:value={selected_sns}
      on:change={handle_sns_change}
    >
      <option value="">-- SNSを選択してください --</option>
      {#each supported_sns as sns}
        <option value={sns.type}>
          {get_sns_icon(sns.type)} {sns.display_name}
        </option>
      {/each}
    </select>
  </div>


</div>

<style>
  .sns-selector {
    margin-bottom: 1.5rem;
  }

  .selector-header h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.125rem;
    color: #1f2937;
  }

  .help-text {
    margin: 0;
    font-size: 0.875rem;
    color: #6b7280;
  }

  .sns-options {
    margin: 1.5rem 0;
  }

  .sns-select {
    width: 100%;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    border: 2px solid #e5e7eb;
    border-radius: 6px;
    background: white;
    color: #374151;
    cursor: pointer;
    transition: border-color 0.2s;
  }

  .sns-select:hover {
    border-color: #d1d5db;
  }

  .sns-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

</style>
