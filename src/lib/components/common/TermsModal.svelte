<script>
  import { createEventDispatcher } from 'svelte'
  import { fade, fly } from 'svelte/transition'
  import { terms_service } from '../../services/terms_service.js'

  export let show = false
  export let require_agreement = false

  const dispatch = createEventDispatcher()

  let agreed = false
  let scroll_container

  const terms_data = terms_service.get_modal_data()

  function handle_close() {
    if (require_agreement && !agreed) {
      // 同意が必要な場合はキャンセルイベントを発行
      show = false
      dispatch('cancel')
      return
    }

    show = false
    dispatch('close')
  }

  function handle_agree() {
    if (!agreed) return

    show = false
    dispatch('agree')
  }

  function handle_overlay_click(event) {
    if (event.target === event.currentTarget && !require_agreement) {
      handle_close()
    }
  }

  // ESCキーでモーダルを閉じる
  function handle_keydown(event) {
    if (event.key === 'Escape' && !require_agreement) {
      handle_close()
    }
  }
</script>

{#if show}
  <div
    class="modal-overlay"
    on:click={handle_overlay_click}
    on:keydown={handle_keydown}
    transition:fade={{ duration: 200 }}
  >
    <div
      class="modal-container"
      transition:fly={{ y: 20, duration: 300 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div class="modal-header">
        <h2 id="modal-title">{terms_data.title}</h2>
        <button
          class="close-button"
          on:click={handle_close}
          aria-label="閉じる"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-content" bind:this={scroll_container}>
        <!-- サマリー -->
        <div class="summary-section">
          <h3><i class="fas fa-clipboard-list"></i> 概要</h3>
          <p class="summary-text">{terms_data.summary}</p>
        </div>

        <!-- 重要ポイント -->
        <div class="key-points-section">
          <h3><i class="fas fa-key"></i> 重要なポイント</h3>
          <ul class="key-points-list">
            {#each terms_data.key_points as point}
              <li>{point}</li>
            {/each}
          </ul>
        </div>

        <!-- 利用規約本文 -->
        <div class="terms-content">
          <h3><i class="fas fa-file-alt"></i> 利用規約全文</h3>
          <div class="terms-text">
            {@html terms_data.content}
          </div>
        </div>

        <!-- バージョン情報 -->
        <div class="version-info">
          <small>
            バージョン: {terms_data.version} |
            最終更新日: {terms_data.updated_at}
          </small>
        </div>
      </div>

      <div class="modal-footer">
        {#if require_agreement}
          <label class="agreement-checkbox">
            <input
              type="checkbox"
              bind:checked={agreed}
            />
            <span>利用規約に同意します</span>
          </label>

          <div class="button-group">
            <button
              class="button button-secondary"
              on:click={handle_close}
            >
              閉じる
            </button>
            <button
              class="button button-primary"
              on:click={handle_agree}
              disabled={!agreed}
            >
              同意して続ける
            </button>
          </div>
        {:else}
          <div class="button-group">
            <button
              class="button button-secondary"
              on:click={handle_close}
            >
              閉じる
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-container {
    background: white;
    border-radius: 12px;
    max-width: 800px;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: #1f2937;
  }

  .close-button {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: #6b7280;
    cursor: pointer;
    padding: 0.25rem;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .close-button:hover {
    background: #f3f4f6;
    color: #1f2937;
  }

  .modal-content {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }

  .summary-section,
  .key-points-section,
  .terms-content {
    margin-bottom: 2rem;
  }

  .summary-section h3,
  .key-points-section h3,
  .terms-content h3 {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
    color: #374151;
  }

  .summary-text {
    color: #4b5563;
    line-height: 1.6;
    margin: 0;
  }

  .key-points-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .key-points-list li {
    padding: 0.5rem 0;
    color: #4b5563;
    line-height: 1.5;
  }

  .terms-text {
    background: #f9fafb;
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    font-size: 0.875rem;
    line-height: 1.6;
    color: #374151;
  }

  .terms-text :global(h2) {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
  }

  .terms-text :global(h3) {
    margin: 1.5rem 0 0.75rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
  }

  .terms-text :global(p) {
    margin: 0 0 0.5rem 0;
  }

  .terms-text :global(ul) {
    margin: 0.5rem 0 0.5rem 1.5rem;
    padding: 0;
  }

  .terms-text :global(li) {
    margin: 0.25rem 0;
  }

  .terms-text :global(a) {
    color: #3b82f6;
    text-decoration: none;
  }

  .terms-text :global(a:hover) {
    text-decoration: underline;
  }

  .version-info {
    text-align: center;
    color: #9ca3af;
    margin-top: 1rem;
  }

  .modal-footer {
    padding: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .agreement-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    cursor: pointer;
  }

  .agreement-checkbox input[type="checkbox"] {
    width: 1.25rem;
    height: 1.25rem;
    cursor: pointer;
  }

  .agreement-checkbox span {
    color: #374151;
    font-weight: 500;
  }

  .button-group {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  .button {
    padding: 0.625rem 1.25rem;
    border-radius: 6px;
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid transparent;
  }

  .button-primary {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .button-primary:hover:not(:disabled) {
    background: #2563eb;
    border-color: #2563eb;
  }

  .button-primary:disabled {
    background: #9ca3af;
    border-color: #9ca3af;
    cursor: not-allowed;
  }

  .button-secondary {
    background: white;
    color: #374151;
    border-color: #d1d5db;
  }

  .button-secondary:hover {
    background: #f3f4f6;
    border-color: #9ca3af;
  }

  /* スクロールバーのスタイリング */
  .modal-content::-webkit-scrollbar {
    width: 8px;
  }

  .modal-content::-webkit-scrollbar-track {
    background: #f3f4f6;
    border-radius: 4px;
  }

  .modal-content::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 4px;
  }

  .modal-content::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .modal-container {
      border-radius: 0;
    }

    .modal-overlay {
      padding: 0;
    }

    .modal-header h2 {
      font-size: 1.25rem;
    }

    .modal-content {
      padding: 1rem;
    }

    .modal-footer {
      padding: 1rem;
    }
  }
</style>
