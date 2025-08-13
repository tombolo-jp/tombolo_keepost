<div class="manual-page">
  <div class="page-header">
    <h1>操作方法</h1>
    <p class="subtitle">KeePostの基本的な使い方</p>
  </div>

  <div class="manual-content">
    <nav class="toc">
      <h2>目次</h2>
      <ul>
        <li><a href="#introduction">はじめに</a></li>
        <li><a href="#import-data">1. SNSデータのインポート</a></li>
        <li><a href="#browse-posts">2. ポストの閲覧</a></li>
        <li><a href="#keep-feature">3. KEEP機能</a></li>
        <li><a href="#data-management">4. データ管理</a></li>
        <li><a href="#faq">よくある質問</a></li>
        <li><a href="#contact">お問い合わせ</a></li>
      </ul>
    </nav>

    <section id="introduction" class="manual-section">
      <h2>はじめに</h2>
      <p><strong>KeePost</strong>は、Twitter (X) / Bluesky / Mastodon などのSNSから出力したポストデータを、ブラウザ上で閲覧できるWebアプリです。<br>すべてのデータは、ご利用のブラウザ内 (IndexedDB / localStorage) に保存されます。サーバーへの送信は一切行いません。</p>
    </section>

    <section id="import-data" class="manual-section">
      <h2>1. SNSデータのインポート</h2>

      <div class="step">
        <h3>ステップ 1: SNSデータをダウンロード</h3>
        <p>各SNSの設定画面から、あなたのデータをダウンロードしてください。</p>
        <ul>
          <li><strong>Twitter</strong>: 「設定」→「アカウント」→「データのアーカイブをダウンロード」</li>
          <li><strong>Bluesky</strong>: 「設定」→「アカウント」→「私のデータをエクスポートする」</li>
          <li><strong>Mastodon</strong>: 「ユーザー設定」→「インポート・エクスポート」→「データのエクスポート」</li>
        </ul>
      </div>

      <div class="step">
        <h3>ステップ 2: データをインポート</h3>
        <ol>
          <li><a href="./import" target="_blank">SNSインポート</a> ページを開く</li>
          <li>インポートするSNSを選択</li>
          <li>「ファイルを選択」ボタンをクリック</li>
          <li>ダウンロードしたファイルを選択
            <ul>
              <li>Twitter: <code>data/tweets.js</code></li>
              <li>Bluesky: <code>*.car</code></li>
              <li>Mastodon: <code>outbox.json</code></li>
            </ul>
          </li>
          <li>利用規約を読み、「利用規約に同意する」にチェックを入れる</li>
          <li>「インポート開始」をクリック</li>
        </ol>
      </div>
    </section>

    <section id="browse-posts" class="manual-section">
      <h2>2. ポストの閲覧</h2>

      <div class="feature">
        <h3>フィルタリング</h3>
        <p>上部のプルダウンで、以下の条件でポストを絞り込めます。</p>
        <ul>
          <li><strong>SNS</strong>: 特定のSNSのポストを表示</li>
          <li><strong>年月</strong>: 特定の年月のポストを表示</li>
          <li><strong>メディア</strong>: 画像や動画を含むポストを表示</li>
        </ul>
      </div>

      <div class="feature">
        <h3>検索機能</h3>
        <p>「ポストを検索」にキーワードを入力して、ポストの本文を検索できます。</p>
      </div>

    </section>

    <section id="keep-feature" class="manual-section">
      <h2>3. KEEP機能</h2>

      <div class="feature">
        <h3>KEEPとは？</h3>
        <p>各ポストの右上にある「KEEP」ボタンをクリックすると、そのポストは自分のお気に入りとして保存できます。</p>
      </div>

      <div class="feature">
        <h3>KEEPしたポストの一覧表示</h3>
        <p>ポスト一覧ページにて、フィルター機能の「KEEPのみ表示」で一覧表示できます。</p>
      </div>

      <div class="feature">
        <h3>KEEPの解除</h3>
        <p>ポストの右上にある「KEEP」ボタンをクリックすると、KEEPが解除されます。</p>
      </div>

    </section>

    <section id="data-management" class="manual-section">
      <h2>4. データ管理</h2>

      <div class="feature">
        <h3>KeePostデータのエクスポート/インポート</h3>
        <p>設定ページから、以下の操作が可能です。</p>
        <ul>
          <li>すべてのポストデータ・KEEPデータをエクスポート</li>
          <li>エクスポートしたファイルをインポートして復元</li>
        </ul>
      </div>

      <div class="feature">
        <h3>データの削除</h3>
        <p>設定ページから、以下の操作が可能です。</p>
        <ul>
          <li>すべてのポストデータを削除</li>
          <li><del>特定のSNSのデータのみを削除</del> (開発予定)</li>
        </ul>
      </div>

      <div class="feature">
        <h3>データの追加インポート</h3>
        <p>既存のデータを削除せずに、新しいデータを追加でインポートすることも可能です。<br>既存のポストと重複データはスキップされ、差分ポストのみがインポートされます。</p>
      </div>
    </section>

    <section id="faq" class="manual-section">
      <h2>よくある質問</h2>

      <div class="faq">
        <h3>Q. データはどこに保存されますか？</h3>
        <p>A. すべてのデータはお使いのブラウザのIndexedDBに保存されます。外部サーバーへの送信は一切行いません。</p>
      </div>

      <div class="faq">
        <h3>Q. 複数のブラウザでデータを共有できますか？</h3>
        <p>A. データはブラウザごとに独立して保存されるため、直接の共有はできません。KeePostデータのエクスポート/インポート機能 (開発予定) によって、共有可能とする予定です。</p>
      </div>
    </section>

    <section id="contact" class="manual-section">
      <h2>お問い合わせ</h2>
      <p>ご不明な点がございましたら <a href="https://tombolo.jp/" target="_blank">TOMBOLO</a> までお問い合わせください。</p>
    </section>

  </div>
</div>

<style>
  .manual-page {
    max-width: 800px;
    margin: 0 auto;
  }

  .page-header {
    margin-bottom: 3rem;
    text-align: center;
  }

  .page-header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    font-size: 1.125rem;
    color: #6b7280;
  }

  .manual-content {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .toc {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .toc h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin-top: 0;
    margin-bottom: 1rem;
  }

  .toc ul {
    list-style-position: inside;
    margin: 0;
    padding: 0;
  }

  .toc li {
    color: #4b5563;
    line-height: 1.8;
    margin-bottom: 0.5rem;
  }

  .toc li:last-child {
    margin-bottom: 0;
  }

  .toc a {
    color: #3B806B;
    text-decoration: none;
    font-weight: 500;
  }

  .toc a:hover {
    text-decoration: underline;
  }

  .manual-section {
    margin-bottom: 3rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .manual-section:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }

  .manual-section h2 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 1.5rem;
  }

  .manual-section h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.75rem;
  }

  .manual-section p {
    color: #4b5563;
    line-height: 1.7;
    margin-top: 1rem;
  }

  .manual-section p {
    color: #4b5563;
    line-height: 1.7;
    margin-top: 1rem;
  }

  .manual-section *:last-child {
    margin-bottom: 0;
  }

  .manual-section ul,
  .manual-section ol {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-left: 1rem;
    margin-top: 0.5rem;
    margin-bottom: 0;
    padding-left: 0;
    list-style-position: inside;
  }

  .manual-section li ul,
  .manual-section li ol {
    margin-left: 1rem;
    margin-top: 0.5rem;
    padding-left: 0;
  }

  .manual-section li {
    color: #4b5563;
    line-height: 1.7;
  }

  .manual-section strong {
    font-weight: 600;
    color: #374151;
  }

  .manual-section code {
    background: #f3f4f6;
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.875rem;
    color: #374151;
  }

  .step,
  .feature,
  .faq {
    background: #f9fafb;
    border-left: 4px solid #3B806B;
    padding: 1rem 1.5rem;
    margin-bottom: 1.5rem;
    border-radius: 4px;
  }

  .step h3,
  .feature h3,
  .faq h3 {
    margin-top: 0;
  }

  .manual-section a {
    color: #3B806B;
    text-decoration: underline;
    font-weight: 500;
  }

  .manual-section a:hover {
    text-decoration: underline;
  }

  @media (max-width: 768px) {
    .manual-content {
      padding: 1.5rem;
    }

    .page-header h1 {
      font-size: 2rem;
    }

    .manual-section h2 {
      font-size: 1.25rem;
    }

    .step,
    .feature,
    .faq {
      padding: 0.75rem 1rem;
    }

    .toc {
      padding: 1rem;
    }

    .toc h2 {
      font-size: 1.125rem;
    }
  }
</style>
