<script>
  import { onMount } from 'svelte'
  import { storage_service } from '../../services/storage_service.js'
  import { post_repository } from '../../repositories/post_repository.js'
  import { ui_store } from '../../stores/ui_store.js'
  import { export_service } from '../../services/export_service.js'
  import { import_service } from '../../services/import_service.js'
  import Swal from 'sweetalert2'

  let storage_info = null
  let import_history = []
  let is_loading = true
  let show_clear_confirm = false

  onMount(async () => {
    await load_data()
  })

  async function load_data() {
    try {
      is_loading = true
      await post_repository.ensure_initialized()
      storage_info = await storage_service.get_storage_info()
      import_history = await post_repository.get_setting('import_histories') || []
    } catch (error) {

    } finally {
      is_loading = false
    }
  }

  function format_bytes(bytes) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
  }

  function format_date(date_string) {
    try {
      const date = new Date(date_string)
      return date.toLocaleString('ja-JP')
    } catch {
      return ''
    }
  }

  async function handle_clear_data() {
    if (!show_clear_confirm) {
      show_clear_confirm = true
      return
    }

    try {
      await storage_service.clear_all_data()
      ui_store.add_notification({
        type: 'success',
        message: 'すべてのデータを削除しました',
        duration: 5000
      })
      await load_data()
      show_clear_confirm = false
    } catch (error) {
      ui_store.add_notification({
        type: 'error',
        message: 'データの削除に失敗しました',
        duration: 0
      })
    }
  }

  function cancel_clear() {
    show_clear_confirm = false
  }

  async function handle_export() {
    try {
      const result = await Swal.fire({
        title: 'データをエクスポート',
        text: 'すべてのデータをバックアップファイルとしてエクスポートします',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'エクスポート開始',
        cancelButtonText: 'キャンセル',
        confirmButtonColor: '#4a5568'
      })

      if (!result.isConfirmed) return

      await Swal.fire({
        title: 'エクスポート中...',
        html: '<div id="export-progress">準備中...</div>',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: async () => {
          Swal.showLoading()

          try {
            await export_service.export_all_data((progress_info) => {
              const el = document.getElementById('export-progress')
              if (el) {
                el.textContent = progress_info.message || '処理中...'
              }
            })

            await Swal.fire({
              title: '完了',
              text: 'バックアップファイルをダウンロードしました',
              icon: 'success',
              confirmButtonColor: '#4a5568'
            })
          } catch (error) {
            await Swal.fire({
              title: 'エラー',
              text: error.message || 'エクスポートに失敗しました',
              icon: 'error',
              confirmButtonColor: '#4a5568'
            })
          }
        }
      })
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  async function handle_import() {
    try {
      const { value: file } = await Swal.fire({
        title: 'バックアップファイルを選択',
        input: 'file',
        inputAttributes: {
          accept: '.ndjson.gz,.ndjson,.gz',
          'aria-label': 'バックアップファイルを選択'
        },
        showCancelButton: true,
        confirmButtonText: '次へ',
        cancelButtonText: 'キャンセル',
        confirmButtonColor: '#4a5568'
      })

      if (!file) return

      const result = await Swal.fire({
        title: '確認',
        html: '既存のデータは<strong>すべて削除</strong>されます。<br>この操作は取り消せません。',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'インポート開始',
        cancelButtonText: 'キャンセル',
        confirmButtonColor: '#e53e3e'
      })

      if (!result.isConfirmed) return

      await Swal.fire({
        title: 'インポート中...',
        html: '<div id="import-progress">準備中...</div>',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: async () => {
          Swal.showLoading()

          try {
            const import_result = await import_service.import_with_auto_detect(file, (progress_info) => {
              const el = document.getElementById('import-progress')
              if (el) {
                el.textContent = progress_info.message || '処理中...'
              }
            })

            await Swal.fire({
              title: '完了',
              text: import_result.message || 'データの復元が完了しました',
              icon: 'success',
              confirmButtonColor: '#4a5568'
            })

            await load_data()
          } catch (error) {
            await Swal.fire({
              title: 'エラー',
              text: error.message || 'インポートに失敗しました',
              icon: 'error',
              confirmButtonColor: '#4a5568'
            })
          }
        }
      })
    } catch (error) {
      console.error('Import error:', error)
    }
  }
</script>

<div class="import-settings">
  {#if is_loading}
    <div class="loading">読み込み中...</div>
  {:else}

    <div class="backup-section">
      <h4>KeePostデータをエクスポート / インポート</h4>
      <div class="backup-buttons">
        <button
          class="button primary"
          on:click={handle_export}
        >
          <i class="fas fa-upload"></i>
          全データをエクスポート
        </button>
        <button
          class="button primary"
          on:click={handle_import}
        >
          <i class="fas fa-download"></i>
          全データをインポートして復元
        </button>
      </div>
      <p class="backup-note">
        エクスポート: すべてのデータをバックアップファイルとして保存<br>
        インポート: バックアップファイルからデータを復元（既存データは削除されます）
      </p>
    </div>

    <div class="storage-info">
      <h4>ストレージ使用状況</h4>
      {#if storage_info}
        <div class="info-grid">
          <div class="info-item">
            <span class="label">ポスト数:</span>
            <span class="value">{(storage_info.post_count || 0).toLocaleString()} 件</span>
          </div>
          <div class="info-item">
            <span class="label">使用容量:</span>
            <span class="value">{format_bytes(storage_info.usage || 0)}</span>
          </div>
        </div>

      {/if}
    </div>

    <div class="import-history">
      <h4>インポート履歴</h4>
      {#if import_history.length === 0}
        <p class="no-history">インポート履歴はありません</p>
      {:else}
        <ul class="history-list">
          {#each import_history as history}
            <li class="history-item">
              <div class="history-date">{format_date(history.imported_at)}</div>
              <div class="history-info">
                <span class="filename">{history.file_name}</span>
                <span class="count">{(history.post_count || 0).toLocaleString()} 件</span>
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <div class="danger-zone">
      <h4>危険な操作</h4>
      {#if show_clear_confirm}
        <div class="confirm-dialog">
          <p>本当にすべてのデータを削除しますか？この操作は取り消せません。</p>
          <div class="confirm-buttons">
            <button
              class="button danger"
              on:click={handle_clear_data}
            >
              削除する
            </button>
            <button
              class="button"
              on:click={cancel_clear}
            >
              キャンセル
            </button>
          </div>
        </div>
      {:else}
        <button
          class="button danger"
          on:click={handle_clear_data}
        >
          すべてのデータを削除
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .import-settings {
    max-width: 800px;
    margin: 0 auto;
  }

  h3 {
    margin: 0 0 2rem;
    color: #2d3748;
    font-size: 1.5rem;
  }

  h4 {
    margin: 0 0 1rem;
    color: #4a5568;
    font-size: 1.125rem;
  }

  .loading {
    text-align: center;
    color: #718096;
    padding: 2rem;
  }

  .storage-info,
  .import-history,
  .backup-section,
  .danger-zone {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    column-gap: 2rem;
    row-gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .info-item {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 1rem;
  }

  .label {
    color: #718096;
    font-size: 0.875rem;
  }

  .value {
    color: #2d3748;
    font-weight: 600;
  }


  .no-history {
    color: #718096;
    text-align: center;
    padding: 2rem 0;
    margin: 0;
  }

  .history-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .history-item {
    padding: 0.75rem 0;
    border-bottom: 1px solid #e2e8f0;
  }

  .history-item:last-child {
    border-bottom: none;
  }

  .history-date {
    font-size: 0.75rem;
    color: #718096;
    margin-bottom: 0.25rem;
  }

  .history-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .filename {
    color: #2d3748;
    font-size: 0.875rem;
  }

  .count {
    color: #4a5568;
    font-size: 0.875rem;
  }

  .danger-zone {
    border-color: #feb2b2;
    background-color: #fff5f5;
  }

  .button {
    padding: 0.75rem 1.5rem;
    background-color: #4a5568;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .button:hover {
    background-color: #2d3748;
  }

  .button.danger {
    background-color: #e53e3e;
  }

  .button.danger:hover {
    background-color: #c53030;
  }

  .button.primary {
    background-color: #3182ce;
  }

  .button.primary:hover {
    background-color: #2c5282;
  }

  .backup-section {
    background-color: #f7fafc;
  }

  .backup-buttons {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .backup-note {
    font-size: 0.875rem;
    color: #718096;
    margin: 1rem 0 0;
    line-height: 1.5;
  }

  .button i {
    margin-right: 0.5rem;
  }

  .confirm-dialog {
    background-color: white;
    border: 1px solid #fc8181;
    border-radius: 4px;
    padding: 1rem;
  }

  .confirm-dialog p {
    margin: 0 0 1rem;
    color: #c53030;
    font-size: 0.875rem;
  }

  .confirm-buttons {
    display: flex;
    gap: 0.75rem;
  }

  @media (max-width: 640px) {
    .info-grid {
      grid-template-columns: 1fr;
    }

    .confirm-buttons {
      flex-direction: column;
    }

    .button {
      width: 100%;
    }
  }
</style>
