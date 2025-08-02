<script>
  import { onMount } from 'svelte'
  import Swal from 'sweetalert2'
  import 'sweetalert2/dist/sweetalert2.min.css'
  import SnsSelector from '../import/SnsSelector.svelte'
  import FileUpload from '../import/FileUpload.svelte'
  import ImportProgress from '../import/ImportProgress.svelte'
  import ImportGuide from '../import/ImportGuide.svelte'
  import { ui_store, is_importing } from '../../stores/ui_store.js'
  import { filter_store } from '../../stores/filter_store.js'
  import { storage_service } from '../../services/storage_service.js'
  import { error_handler } from '../../utils/error_handler.js'
  import { router } from '../../services/router_service.js'

  let selected_file = null
  let selected_sns = ''
  let import_progress = {}

  $: importing = $is_importing

  function get_sns_display_name(sns_type) {
    const names = {
      twitter: 'Twitter',
      bluesky: 'Bluesky',
      mastodon: 'Mastodon'
    }
    return names[sns_type] || sns_type
  }

  function handle_sns_change(event) {
    selected_sns = event.detail.sns_type
    ui_store.set_selected_sns(selected_sns)
  }

  function handle_sns_detected(event) {
    selected_sns = event.detail.sns_type
    ui_store.set_selected_sns(selected_sns)
  }

  async function handle_file_selected(event) {
    selected_file = event.detail.file
    const sns_type = event.detail.sns_type || selected_sns

    if (!sns_type) {
      ui_store.add_notification({
        type: 'error',
        message: 'SNSを選択してください',
        duration: 3000
      })
      return
    }

    await start_import(sns_type)
  }

  async function start_import(sns_type) {
    if (!selected_file) return

    ui_store.start_import()

    try {
      const result = await storage_service.import_and_save(
        sns_type,
        selected_file,
        (progress) => {
          import_progress = progress
          ui_store.update_import_progress(progress)
        }
      )

      // インポート成功
      const import_count = result.post_count
      const skipped_count = result.skipped_count || 0

      // データをリロード
      await filter_store.load_stats()

      // SweetAlert2で成功メッセージを表示
      await Swal.fire({
        title: import_count === 0 && skipped_count > 0 ? 'ポスト全件が重複しています' : 'インポート完了！',
        html: `
          <div style="text-align: center;">
            ${import_count > 0 ? `
              <p style="font-size: 1.1rem; margin-bottom: 1rem;">
                <strong>${import_count.toLocaleString()}</strong>件の${get_sns_display_name(sns_type)}ポストをインポートしました！
              </p>
            ` : ''}
            ${skipped_count > 0 ? `
              <p style="${import_count === 0 ? 'font-size: 1.1rem;' : 'color: #6b7280; font-size: 0.95rem;'}">
                <i class="fas fa-info-circle"></i>
                ${import_count === 0 ? `全${skipped_count.toLocaleString()}件がすでにインポート済みのため<br>スキップされました` : `${skipped_count.toLocaleString()}件の重複ポストをスキップしました`}
              </p>
            ` : ''}
            ${import_count === 0 && skipped_count === 0 ? `
              <p style="font-size: 1.1rem;">
                インポート可能なポストが見つかりませんでした
              </p>
            ` : ''}
          </div>
        `,
        icon: import_count === 0 && skipped_count > 0 ? 'info' : 'success',
        confirmButtonText: '閉じる',
        confirmButtonColor: '#3b82f6'
      })

      // ポスト一覧ページへ移動
      router.navigate('posts')

      // ファイル選択をクリア
      selected_file = null
      selected_sns = ''

    } catch (error) {
      ui_store.import_error(error.message)
      error_handler.handle_error(error)

      // エラーメッセージを表示
      await Swal.fire({
        title: 'インポートエラー',
        text: error.message,
        icon: 'error',
        confirmButtonText: '閉じる',
        confirmButtonColor: '#ef4444'
      })
    } finally {
      setTimeout(() => {
        ui_store.reset_import()
      }, 1000)
    }
  }

</script>

<div class="import-page">
  {#if importing}
    <div class="import-progress-container">
      <ImportProgress
        progress={import_progress.progress || 0}
        step={import_progress.step || ''}
        message={import_progress.message || ''}
        processed={import_progress.processed || 0}
        total={import_progress.total || 0}
      />
    </div>
  {:else}
    <div class="import-section">

      <div class="import-content">
        <div class="import-card">
          <SnsSelector
            bind:selected_sns
            show_auto_detect={true}
            on:change={handle_sns_change}
          />

          <FileUpload
            {selected_sns}
            auto_detect_sns={true}
            require_agreement={true}
            on:file-selected={handle_file_selected}
            on:sns-detected={handle_sns_detected}
          />
        </div>

        <div class="info-section">
          <ImportGuide {selected_sns} />
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .import-page {
    background: #f9fafb;
  }

  .import-progress-container {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .import-section {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .import-header {
    margin-bottom: 2rem;
  }

  .back-button {
    padding: 0.5rem 1rem;
    background: transparent;
    color: #3b82f6;
    border: 1px solid #3b82f6;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 1rem;
  }

  .back-button:hover {
    background: #3b82f6;
    color: white;
  }

  .import-header h1 {
    margin: 0;
    color: #1f2937;
    font-size: 2.5rem;
  }

  .import-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }

  .import-card {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .info-section {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .info-section h3 {
    margin: 0 0 1rem 0;
    color: #1f2937;
    font-size: 1.25rem;
  }

  .info-section ul {
    margin: 0 0 2rem 0;
    padding-left: 1.5rem;
  }

  .info-section li {
    margin: 0.5rem 0;
    color: #4b5563;
    line-height: 1.6;
  }

  .info-section p {
    margin: 0;
    color: #4b5563;
    line-height: 1.6;
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .import-section {
      padding: 1rem;
    }

    .import-header h1 {
      font-size: 2rem;
    }

    .import-content {
      grid-template-columns: 1fr;
    }

    .import-card,
    .info-section {
      padding: 1.5rem;
    }
  }
</style>
