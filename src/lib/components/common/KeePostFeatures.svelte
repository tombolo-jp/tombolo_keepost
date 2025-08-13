<script>
</script>

<div class="keepost-features">
  <div class="guide-section">
    <h3 class="guide-title">
      <i class="guide-icon fas fa-lock"></i>
      KeePostとは？
    </h3>
    <div class="guide-content">
      <p class="guide-text">
        Twitter / Bluesky / Mastodon のポストデータを一元管理できるアプリです。SNSの種類・年月・キーワードなどで検索したり、自分がお気に入りのポストを保存することができます。
      </p>
    </div>
  </div>
  <div class="guide-section">
    <h3 class="guide-title">
      <i class="guide-icon fas fa-lock"></i>
      特長
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

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .guide-section {
      margin-bottom: 1.5rem;
    }

    .guide-title {
      font-size: 1rem;
    }
  }
</style>
