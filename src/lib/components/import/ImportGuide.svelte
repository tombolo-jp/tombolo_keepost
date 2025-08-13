<script>
  export let selected_sns = ''

  // SNS別ガイド情報
  const sns_guides = {
    twitter: {
      file_format: 'tweets.js (JavaScriptファイル)',
      import_steps: [
        'Twitterの「設定」→「アカウント」→「データのアーカイブをダウンロード」を選択',
        'アーカイブが準備できたらメールで通知が届きます',
        'ダウンロードしたZIPファイルを解凍',
        'data/tweets.jsファイルをインポート'
      ],
      notes: [
        '件数が多いときには、インポート処理に時間がかかる場合があります',
        'インポート後も元のファイルは保管することをお勧めします'
      ]
    },
    bluesky: {
      file_format: '.car (CARファイル)',
      import_steps: [
        'Blueskyの「設定」→「アカウント」→「私のデータをエクスポートする」を選択',
        '「CARファイルをダウンロード」を選択',
        'ダウンロードした .car ファイルをインポート'
      ],
      notes: [
        '件数が多いときには、インポート処理に時間がかかる場合があります',
        'インポート後も元のファイルは保管することをお勧めします'
      ]
    },
    mastodon: {
      file_format: 'outbox.json (JSONファイル)',
      import_steps: [
        'Mastodonの「ユーザー設定」→「インポート・エクスポート」→「データのエクスポート」を選択',
        'アーカイブが準備できたらメールで通知が届きます',
        'ダウンロードしたファイルを解凍',
        'outbox.jsonファイルを選択してインポート'
      ],
      notes: [
        '件数が多いときには、インポート処理に時間がかかる場合があります',
        'インポート後も元のファイルは保管することをお勧めします',
        'インスタンスによってエクスポート形式が異なる場合があります'
      ]
    }
  }

  $: current_guide = selected_sns && sns_guides[selected_sns] ? sns_guides[selected_sns] : null
</script>

<div class="import-guide">
  {#if !current_guide}
    <!-- SNS未選択時の表示 -->
    <div class="guide-section">
      <h3 class="guide-title">
        <i class="guide-icon fas fa-lock"></i>
        KeePostの特長
      </h3>
      <div class="guide-content">
        <p class="guide-text">
          KeePostは、プライバシーとポータビリティに配慮したアプリです。
        </p>
        <ul class="guide-list">
          <li>すべてのデータはブラウザ内で処理されます</li>
          <li>データはブラウザ内に保存されます (IndexedDB, localStorage)</li>
          <li>サーバーへの送信は一切ありません</li>
          <li>データをご自身でバックアップ可能です</li>
          <li>オープンソース化を予定しています (2025年9月予定)</li>
        </ul>
      </div>
    </div>
  {:else}
    <!-- SNS選択時の表示 -->
    <div class="guide-section">
      <h3 class="guide-title">
        <i class="guide-icon fas fa-folder"></i>
        対応ファイル形式
      </h3>
      <div class="guide-content">
        <p class="guide-format">{current_guide.file_format}</p>
      </div>
    </div>

    <div class="guide-section">
      <h3 class="guide-title">
        <i class="guide-icon fas fa-clipboard-list"></i>
        インポート手順
      </h3>
      <div class="guide-content">
        <ol class="guide-steps">
          {#each current_guide.import_steps as step, index}
            <li class="guide-step">
              <span class="step-number">{index + 1}</span>
              <span class="step-text">{step}</span>
            </li>
          {/each}
        </ol>
      </div>
    </div>

    <div class="guide-section">
      <h3 class="guide-title">
        <i class="guide-icon fas fa-exclamation-triangle"></i>
        注意事項
      </h3>
      <div class="guide-content">
        <ul class="guide-notes">
          {#each current_guide.notes as note}
            <li class="guide-note-item">{note}</li>
          {/each}
        </ul>
      </div>
    </div>

    <div class="guide-section">
      <h3 class="guide-title">
        <i class="guide-icon fas fa-lock"></i>
        プライバシー保護
      </h3>
      <div class="guide-content">
        <p class="guide-text">
          すべてのデータはブラウザ内に保存されます。サーバーには送信されません。
        </p>
      </div>
    </div>
  {/if}
</div>

<style>
  .guide-section {
    margin-bottom: 2rem;
  }

  .guide-section:last-child {
    margin-bottom: 0;
  }

  .guide-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #1f2937;
  }

  .guide-icon {
    font-size: 1.25rem;
  }

  .guide-content {
    color: #4b5563;
    line-height: 1.6;
  }

  .guide-text {
    margin: 0 0 0.75rem 0;
  }

  .guide-format {
    margin: 0;
    padding: 0.75rem;
    background: #f3f4f6;
    border-radius: 6px;
    font-family: monospace;
    font-size: 0.875rem;
    color: #374151;
  }

  .guide-list {
    margin: 0;
    padding-left: 0;
    list-style: none;
  }

  .guide-list li {
    position: relative;
    padding-left: 1.25rem;
    margin-bottom: 0.5rem;
  }

  .guide-list li::before {
    content: '✓';
    position: absolute;
    left: 0;
    color: #10b981;
    font-weight: bold;
  }

  .guide-steps {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .guide-step {
    display: flex;
    align-items: flex-start;
    gap: 0.35rem;
  }

  .step-number {
    flex-shrink: 0;
    width: 1.4rem;
    height: 1.4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #3b806b;
    color: white;
    border-radius: 50%;
    font-size: 0.875rem;
    font-weight: bold;
  }

  .step-text {
    flex: 1;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .guide-notes {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .guide-note-item {
    position: relative;
    padding-left: 1.5rem;
    margin-bottom: 0.75rem;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .guide-note-item::before {
    content: '•';
    position: absolute;
    left: 0.5rem;
    color: #f59e0b;
    font-weight: bold;
  }

  .guide-note {
    margin: 1rem 0 0 0;
    padding: 0.75rem;
    background: #eff6ff;
    border-left: 3px solid #3b82f6;
    border-radius: 4px;
    font-size: 0.875rem;
    color: #1e40af;
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .guide-section {
      margin-bottom: 1.5rem;
    }

    .guide-title {
      font-size: 1rem;
    }

    .guide-step {
      padding: 0.5rem;
    }

    .step-number {
      width: 1.5rem;
      height: 1.5rem;
      font-size: 0.75rem;
    }
  }
</style>
