<script>
  const news_items = [
    {
      id: 2,
      title: "Twilogインポートに対応しました",
      date: "2025年9月14日",
      content: "<p>KeePostのバージョン2.0をリリースしました。更新内容は以下のとおりです。</p><ul><li>TwilogのCSVファイル (UTF-8形式) をインポート可能になりました。<ul><li>詳細な手順は <a href='/keepost/import'>SNSインポート</a> ページをご確認ください。</li><li>Twilogインポートでは「いいね」と「リツイート」の数が取得できません。可能なかぎりTwitter公式のエクスポートデータをご利用ください。</li></ul></li><li>SNSアカウント名を表示可能になりました。<ul><li>SNSインポート時に手動でご入力ください。</li><li>すでにインポート済の場合、いったん個別SNSデータを削除し、再インポートすれば、SNSアカウント名が表示されます。</li></ul></li><li>個別のSNSデータを削除可能になりました。<ul><li>KEEPデータは削除されません。SNSデータを再インポートすればKEEPは復活します。</li></ul></li><li>IndexedDBのスキーマを変更しました。<ul><li>マイグレーションは自動的に行われます。</li><li>万が一データ表示に不具合がある際には、お手数ですがデータ削除と再インポートをお試しください。</li></ul></li></ul>"
    },
    {
      id: 1,
      title: "KeePostをリリースしました",
      date: "2025年8月13日",
      content: "<p>KeePostのバージョン1.0をリリースしました。Twitter / Bluesky / Mastodon の投稿データを一元管理できます。</p>"
    }
  ]
</script>

<div class="news-page">
  <div class="container">
    <h1 class="page-title">お知らせ</h1>

    <div class="news-list">
      {#each news_items as article}
        <article class="news-item">
          <div class="news-header">
            <h2 class="news-title">{article.title}</h2>
            <time class="news-date">{article.date}</time>
          </div>
          <div class="news-content">
          {@html article.content}
          </div>
        </article>
      {/each}
    </div>
  </div>
</div>

<style>
  .news-page {
    background: #f9fafb;
    padding: 2rem 1rem;
    min-height: calc(100vh - 200px);
  }

  .container {
    max-width: 800px;
    margin: 0 auto;
  }

  .page-title {
    font-size: 2rem;
    font-weight: bold;
    color: #333;
    text-align: center;
    margin-bottom: 3rem;
  }

  .news-list {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .news-item {
    background: white;
    border-radius: 8px;
    padding: 2rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: box-shadow 0.2s;
  }

  .news-item:hover {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .news-header {
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .news-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .news-date {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .news-content {
    color: #4b5563;
    line-height: 1.7;
  }

  .news-content :global(a) {
    color: #3B806B;
    text-decoration: underline;
    transition: color 0.2s;
  }

  .news-content :global(a:hover) {
    color: #2a5d4e;
  }

  .news-content :global(ul) {
    display: flex;
    flex-direction: column;
    row-gap: 0.25rem;
    list-style-position: outside;
    list-style-type: disc;
    padding-left: 1rem;
  }

  .news-content :global(ul ul) {
    list-style-type: circle;
    margin-top: 0.25rem;
  }

  @media (max-width: 768px) {
    .news-page {
      padding: 1.5rem 1rem;
    }

    .page-title {
      font-size: 1.75rem;
      margin-bottom: 2rem;
    }

    .news-item {
      padding: 1.5rem;
    }

    .news-title {
      font-size: 1.125rem;
    }

    .news-content {
      font-size: 0.9375rem;
    }
  }

  @media (max-width: 480px) {
    .news-item {
      padding: 1.25rem;
    }

    .news-title {
      font-size: 1rem;
    }

    .news-date {
      font-size: 0.8125rem;
    }

    .news-content {
      font-size: 0.875rem;
    }
  }
</style>
