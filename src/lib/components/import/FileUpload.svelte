<script>
  import { createEventDispatcher } from 'svelte'
  import Swal from 'sweetalert2'
  import { security_validator } from '../../utils/validation.js'
  import { sns_account_validator } from '../../utils/sns_account_validator.js'
  import { import_service } from '../../services/import_service.js'
  import { terms_service } from '../../services/terms_service.js'
  import TermsModal from '../common/TermsModal.svelte'

  export let selected_sns = ''
  export let require_agreement = false
  export let auto_detect_sns = false

  const dispatch = createEventDispatcher()

  let file_input
  let is_dragging = false
  let error_message = ''
  let selected_file = null
  let agreed_to_terms = false
  let show_terms_modal = false
  let twilog_username = ''
  let twitter_username = ''
  let mastodon_account = ''
  let bluesky_account = ''

  // サポートされているSNS情報を取得
  $: sns_info = selected_sns
    ? import_service.get_supported_sns_list().find(sns => sns.type === selected_sns)
    : null

  // 対応ファイル形式を取得
  $: file_accept = sns_info
    ? sns_info.supported_formats.map(ext => `.${ext}`).join(',')
    : '.js,.json,.car' // 全SNS対応形式

  function handle_file_select(event) {
    const files = event.target.files
    if (files && files.length > 0) {
      process_file(files[0])
    }
  }

  function handle_drop(event) {
    event.preventDefault()
    is_dragging = false

    const files = event.dataTransfer.files
    if (files && files.length > 0) {
      process_file(files[0])
    }
  }

  function handle_drag_over(event) {
    event.preventDefault()
    is_dragging = true
  }

  function handle_drag_leave() {
    is_dragging = false
  }

  async function process_file(file) {
    error_message = ''

    // 基本的なファイル検証
    const validation = security_validator.validate_file(file)
    if (!validation.valid) {
      error_message = validation.message
      selected_file = null
      return
    }

    // 自動SNS検出が有効な場合
    if (auto_detect_sns && !selected_sns) {
      const detected_sns = import_service.detect_sns_type(file)
      if (detected_sns) {
        dispatch('sns-detected', { sns_type: detected_sns })
      }
    }

    // SNS別のファイル形式検証
    if (selected_sns && sns_info) {
      const file_extension = file.name.split('.').pop().toLowerCase()
      if (!sns_info.supported_formats.includes(file_extension)) {
        error_message = `${sns_info.display_name}は.${file_extension}ファイルに対応していません。対応形式: ${sns_info.supported_formats.map(f => `.${f}`).join(', ')}`
        selected_file = null
        return
      }
    }

    // 利用規約同意チェック - エラーではなくファイルを保持
    if (require_agreement && !agreed_to_terms) {
      error_message = ''
      selected_file = file
      return
    }

    selected_file = file
  }

  function clear_selection() {
    selected_file = null
    error_message = ''
    if (file_input) {
      file_input.value = ''
    }
    dispatch('file-cleared')
  }

  function handle_terms_click() {
    show_terms_modal = true
  }

  function handle_terms_agree() {
    agreed_to_terms = true
    show_terms_modal = false
  }

  function handle_drop_zone_click() {
    if (!selected_file) {
      file_input.click()
    }
  }

  async function start_import() {
    if (!selected_file) return

    // Twilogの場合はユーザー名が必須
    if (selected_sns === 'twilog') {
      if (!twilog_username.trim()) {
        await Swal.fire({
          title: 'アカウント名の入力に誤りがあります',
          text: 'Twitterのユーザー名を入力してください',
          icon: 'error',
          confirmButtonText: '閉じる',
          confirmButtonColor: '#ef4444'
        })
        return
      }
      const result = sns_account_validator.validate('twilog', twilog_username)
      if (!result.valid) {
        await Swal.fire({
          title: 'アカウント名の入力に誤りがあります',
          text: result.error,
          icon: 'error',
          confirmButtonText: '閉じる',
          confirmButtonColor: '#ef4444'
        })
        return
      }
    }

    // Twitterの場合もユーザー名が必須
    if (selected_sns === 'twitter') {
      if (!twitter_username.trim()) {
        await Swal.fire({
          title: 'アカウント名の入力に誤りがあります',
          text: 'Twitterのユーザー名を入力してください',
          icon: 'error',
          confirmButtonText: '閉じる',
          confirmButtonColor: '#ef4444'
        })
        return
      }
      const result = sns_account_validator.validate('twitter', twitter_username)
      if (!result.valid) {
        await Swal.fire({
          title: 'アカウント名の入力に誤りがあります',
          text: result.error,
          icon: 'error',
          confirmButtonText: '閉じる',
          confirmButtonColor: '#ef4444'
        })
        return
      }
    }

    // Mastodonの場合もアカウント名が必須
    if (selected_sns === 'mastodon') {
      if (!mastodon_account.trim()) {
        await Swal.fire({
          title: 'アカウント名の入力に誤りがあります',
          text: 'Mastodonのアカウント名@インスタンス名を入力してください',
          icon: 'error',
          confirmButtonText: '閉じる',
          confirmButtonColor: '#ef4444'
        })
        return
      }
      const result = sns_account_validator.validate('mastodon', mastodon_account)
      if (!result.valid) {
        await Swal.fire({
          title: 'アカウント名の入力に誤りがあります',
          text: result.error,
          icon: 'error',
          confirmButtonText: '閉じる',
          confirmButtonColor: '#ef4444'
        })
        return
      }
    }

    // Blueskyの場合もアカウント名が必須
    if (selected_sns === 'bluesky') {
      if (!bluesky_account.trim()) {
        await Swal.fire({
          title: 'アカウント名の入力に誤りがあります',
          text: 'Blueskyのアカウント名を入力してください',
          icon: 'error',
          confirmButtonText: '閉じる',
          confirmButtonColor: '#ef4444'
        })
        return
      }
      const result = sns_account_validator.validate('bluesky', bluesky_account)
      if (!result.valid) {
        await Swal.fire({
          title: 'アカウント名の入力に誤りがあります',
          text: result.error,
          icon: 'error',
          confirmButtonText: '閉じる',
          confirmButtonColor: '#ef4444'
        })
        return
      }
    }

    dispatch('file-selected', {
      file: selected_file,
      sns_type: selected_sns,
      twilog_username: selected_sns === 'twilog' ? sns_account_validator.normalize('twilog', twilog_username) : null,
      twitter_username: selected_sns === 'twitter' ? sns_account_validator.normalize('twitter', twitter_username) : null,
      mastodon_account: selected_sns === 'mastodon' ? sns_account_validator.normalize('mastodon', mastodon_account) : null,
      bluesky_account: selected_sns === 'bluesky' ? sns_account_validator.normalize('bluesky', bluesky_account) : null
    })
  }

  function format_file_size(bytes) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
  }
</script>

<div class="file-upload">
  {#if selected_sns}
    <div
      class="drop-zone"
      class:dragging={is_dragging}
      class:has-file={selected_file}
      on:drop={handle_drop}
      on:dragover={handle_drag_over}
      on:dragleave={handle_drag_leave}
      on:click={handle_drop_zone_click}
      role="button"
      tabindex="0"
      aria-label="ファイルをドロップまたはクリックして選択"
    >
    {#if selected_file}
      <div class="file-info">
        <div class="file-icon"><i class="fas fa-file"></i></div>
        <div class="file-details">
          <h3>{selected_file.name}</h3>
          <p>{format_file_size(selected_file.size)}</p>
        </div>
        <button
          class="clear-button"
          on:click={clear_selection}
          aria-label="ファイル選択をクリア"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
    {:else}
      <div class="upload-prompt">
        <div class="upload-icon"><i class="fas fa-folder-open"></i></div>
        <h3>ファイルをドロップまたはクリックして選択</h3>
        {#if selected_sns && sns_info}
          <p>{sns_info.display_name}のデータファイル</p>
        {:else}
          <p>SNSのエクスポートデータファイル</p>
        {/if}
        <button
          class="select-button"
          on:click|stopPropagation={() => file_input.click()}
        >
          ファイルを選択
        </button>
      </div>
    {/if}

    <input
      bind:this={file_input}
      type="file"
      accept={file_accept}
      on:change={handle_file_select}
      on:click|stopPropagation
      class="hidden-input"
    />
    </div>

      {#if error_message}
      <div class="error-message">
        <i class="error-icon fas fa-exclamation-triangle"></i>
        {error_message}
      </div>
    {/if}



  {#if selected_sns === 'twilog'}
    <div class="twilog-username-section">
      <label class="username-label">
        <span>Twitterユーザー名 <span class="required">(必須)</span></span>
        <input
          type="text"
          bind:value={twilog_username}
          placeholder="例: tombolo_jp"
          class="username-input"
          on:input={(e) => {
            twilog_username = sns_account_validator.normalize('twilog', e.target.value)
            error_message = ''
          }}
        />
      </label>
      <p class="username-hint">
        @を除いたユーザー名を入力してください。
      </p>
    </div>
  {/if}

  {#if selected_sns === 'twitter'}
    <div class="twitter-username-section">
      <label class="username-label">
        <span>Twitterユーザー名 <span class="required">(必須)</span></span>
        <input
          type="text"
          bind:value={twitter_username}
          placeholder="例: tombolo_jp"
          class="username-input"
          on:input={(e) => {
            twitter_username = sns_account_validator.normalize('twitter', e.target.value)
            error_message = ''
          }}
        />
      </label>
      <p class="username-hint">
        @を除いたユーザー名を入力してください。
      </p>
    </div>
  {/if}

  {#if selected_sns === 'mastodon'}
    <div class="mastodon-account-section">
      <label class="username-label">
        <span>Mastodonアカウント名 <span class="required">(必須)</span></span>
        <input
          type="text"
          bind:value={mastodon_account}
          placeholder="例: example@example.com"
          class="username-input"
          on:input={(e) => {
            mastodon_account = sns_account_validator.normalize('mastodon', e.target.value)
            error_message = ''
          }}
        />
      </label>
      <p class="username-hint">
        アカウント名@インスタンス名の形式で入力してください。
      </p>
    </div>
  {/if}

  {#if selected_sns === 'bluesky'}
    <div class="bluesky-account-section">
      <label class="username-label">
        <span>Blueskyアカウント名 <span class="required">(必須)</span></span>
        <input
          type="text"
          bind:value={bluesky_account}
          placeholder="例: username.bsky.social"
          class="username-input"
          on:input={(e) => {
            bluesky_account = sns_account_validator.normalize('bluesky', e.target.value)
            error_message = ''
          }}
        />
      </label>
      <p class="username-hint">
        アカウント名（例: username.bsky.social）を入力してください。
      </p>
    </div>
  {/if}

  {#if require_agreement}
    <div class="agreement-section">
      <label class="agreement-checkbox">
        <input
          type="checkbox"
          bind:checked={agreed_to_terms}
        />
        <span>
          利用規約に同意する
          <button
            class="terms-link"
            on:click={handle_terms_click}
            type="button"
          >
            利用規約を見る
          </button>
        </span>
      </label>
    </div>
    {/if}

    <div class="import-button-section">
      <button
        class="import-button"
        class:disabled={!selected_file || !agreed_to_terms || (selected_sns === 'twilog' && !twilog_username.trim()) || (selected_sns === 'twitter' && !twitter_username.trim()) || (selected_sns === 'mastodon' && !mastodon_account.trim()) || (selected_sns === 'bluesky' && !bluesky_account.trim())}
        on:click={start_import}
        disabled={!selected_file || !agreed_to_terms || (selected_sns === 'twilog' && !twilog_username.trim()) || (selected_sns === 'twitter' && !twitter_username.trim()) || (selected_sns === 'mastodon' && !mastodon_account.trim()) || (selected_sns === 'bluesky' && !bluesky_account.trim())}
      >
        インポート開始
      </button>
    </div>
  {/if}
</div>

<style>
  .file-upload {
    max-width: 600px;
    margin: 0 auto;
  }

  .drop-zone {
    border: 2px dashed #cbd5e0;
    border-radius: 12px;
    padding: 3rem;
    text-align: center;
    background-color: #f7fafc;
    transition: all 0.2s ease;
    cursor: pointer;
    position: relative;
  }

  .drop-zone:hover {
    border-color: #4299e1;
    background-color: #ebf8ff;
  }

  .drop-zone.dragging {
    border-color: #3182ce;
    background-color: #e6f4ff;
    transform: scale(1.02);
  }

  .drop-zone.has-file {
    border-color: #48bb78;
    background-color: #f0fff4;
  }

  .hidden-input {
    display: none;
  }

  .upload-prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .upload-icon {
    font-size: 4rem;
    opacity: 0.5;
  }

  .upload-prompt h3 {
    margin: 0;
    color: #2d3748;
    font-size: 1.25rem;
  }

  .upload-prompt p {
    margin: 0;
    color: #718096;
    font-size: 0.875rem;
  }

  .select-button {
    padding: 0.75rem 1.5rem;
    background-color: #4299e1;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .select-button:hover {
    background-color: #3182ce;
  }

  .file-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .file-icon {
    font-size: 2.5rem;
  }

  .file-details {
    flex: 1;
    text-align: left;
  }

  .file-details h3 {
    margin: 0;
    font-size: 1rem;
    color: #2d3748;
    word-break: break-all;
  }

  .file-details p {
    margin: 0.25rem 0 0;
    font-size: 0.875rem;
    color: #718096;
  }

  .clear-button {
    padding: 0.5rem;
    background: none;
    border: none;
    font-size: 1.25rem;
    color: #e53e3e;
    cursor: pointer;
    border-radius: 4px;
    transition: background-color 0.2s ease;
  }

  .clear-button:hover {
    background-color: #fed7d7;
  }

  .error-message {
    margin-top: 1rem;
    padding: 0.75rem 1rem;
    background-color: #fed7d7;
    color: #c53030;
    border-radius: 6px;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }

  .error-icon {
    font-size: 1.25rem;
  }


  @media (max-width: 768px) {
    .drop-zone {
      padding: 2rem;
    }

    .upload-icon {
      font-size: 3rem;
    }

    .upload-prompt h3 {
      font-size: 1.125rem;
    }

    .select-button {
      font-size: 0.875rem;
      padding: 0.625rem 1.25rem;
    }
  }

  /* Twilogユーザー名入力セクション */
  .twilog-username-section {
    margin-top: 1rem;
    padding: 1rem;
    background-color: #e0f2fe;
    border: 1px solid #0ea5e9;
    border-radius: 6px;
  }

  /* Twitterユーザー名入力セクション */
  .twitter-username-section {
    margin-top: 1rem;
    padding: 1rem;
    background-color: #e0f2fe;
    border: 1px solid #0ea5e9;
    border-radius: 6px;
  }

  /* Mastodonアカウント入力セクション */
  .mastodon-account-section {
    margin-top: 1rem;
    padding: 1rem;
    background-color: #e0f2fe;
    border: 1px solid #0ea5e9;
    border-radius: 6px;
  }

  /* Blueskyアカウント入力セクション */
  .bluesky-account-section {
    margin-top: 1rem;
    padding: 1rem;
    background-color: #e0f2fe;
    border: 1px solid #0ea5e9;
    border-radius: 6px;
  }

  .username-label {
    display: block;
  }

  .username-label span {
    display: block;
    margin-bottom: 0.5rem;
    color: #374151;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .username-label .required {
    display: inline;
    color: #ef4444;
    margin-left: 0.25rem;
  }

  .username-input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 1rem;
    transition: border-color 0.2s;
    box-sizing: border-box;
  }

  .username-input:focus {
    outline: none;
    border-color: #f59e0b;
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
  }

  .username-hint {
    margin: 0.5rem 0 0;
    font-size: 0.75rem;
    color: #6b7280;
    line-height: 1.4;
  }

  /* 同意セクション */
  .agreement-section {
    margin-top: 1rem;
    padding: 1rem;
    background-color: #f0f9ff;
    border: 1px solid #3b82f6;
    border-radius: 6px;
  }

  .agreement-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .agreement-checkbox input[type="checkbox"] {
    width: 1.125rem;
    height: 1.125rem;
    cursor: pointer;
  }

  .agreement-checkbox input[type="checkbox"]:disabled {
    cursor: default;
  }

  .agreement-checkbox span {
    color: #374151;
    font-size: 0.875rem;
  }

  .terms-link {
    background: none;
    border: none;
    color: #3b82f6;
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
    font-size: inherit;
    font-family: inherit;
  }

  .terms-link:hover {
    color: #2563eb;
  }

  /* インポートボタン */
  .import-button-section {
    margin-top: 1.5rem;
    text-align: center;
  }

  .import-button {
    padding: 1rem 2rem;
    background-color: #059669;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1.125rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .import-button:hover {
    background-color: #059669;
  }

  .import-button:active:not(:disabled) {
    transform: translateY(1px);
  }

  .import-button.disabled,
  .import-button:disabled {
    background-color: #9ca3af;
    cursor: not-allowed;
  }

  .import-button.disabled:hover,
  .import-button:disabled:hover {
    background-color: #9ca3af;
  }
</style>

{#if show_terms_modal}
  <TermsModal
    bind:show={show_terms_modal}
    require_agreement={true}
    on:agree={handle_terms_agree}
  />
{/if}
