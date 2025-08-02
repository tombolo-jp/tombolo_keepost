<script>
  import { terms_service } from '../../services/terms_service.js'

  const terms_data = terms_service.get_modal_data()
</script>

<div class="terms-page">
  <div class="container">
    <!-- ヘッダー -->
    <div class="terms-header">
      <h1>{terms_data.title}</h1>
      <div class="version-info">
        <span>バージョン: {terms_data.version}</span>
        <span class="separator">|</span>
        <span>最終更新日: {terms_data.updated_at}</span>
      </div>
    </div>

    <!-- 重要ポイント -->
    <section class="key-points-section">
      <h2>概要</h2>
      <div class="key-points-content">
        <ul class="key-points-list">
          {#each terms_data.key_points as point}
            <li>{point}</li>
          {/each}
        </ul>
      </div>
    </section>

    <!-- 利用規約全文 -->
    <section class="terms-full-section">
      <h2>利用規約全文</h2>
      <div class="terms-content-wrapper">
        <div class="terms-content">
          {@html terms_data.content}
        </div>
      </div>
    </section>

  </div>
</div>

<style>
  .terms-page {
    background: #f9fafb;
    padding: 2rem 1rem;
  }

  .container {
    max-width: 800px;
    margin: 0 auto;
  }

  /* ヘッダー */
  .terms-header {
    text-align: center;
    margin-bottom: 3rem;
  }

  .terms-header h1 {
    margin: 0 0 1rem 0;
    font-size: 2.5rem;
    font-weight: 700;
    color: #1f2937;
  }

  .version-info {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    color: #6b7280;
    font-size: 0.875rem;
  }

  .separator {
    color: #d1d5db;
  }

  /* セクション共通 */
  section {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  }

  section h2 {
    margin: 0 0 1.5rem 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #374151;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  /* サマリー */
  .summary-content {
    background: #f0f9ff;
    padding: 1.5rem;
    border-radius: 8px;
    border: 1px solid #dbeafe;
  }

  .summary-content p {
    margin: 0;
    color: #1e40af;
    line-height: 1.7;
  }

  /* 重要ポイント */
  .key-points-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .key-points-list li {
    position: relative;
    padding: 0.75rem 0 0.75rem 2rem;
    border-bottom: 1px solid #f3f4f6;
    color: #4b5563;
    line-height: 1.6;
  }

  .key-points-list li:last-child {
    border-bottom: none;
  }

  .key-points-list li::before {
    content: '✓';
    position: absolute;
    left: 0;
    color: #10b981;
    font-weight: bold;
  }

  /* 利用規約全文 */
  .terms-content-wrapper {
    background: #f9fafb;
    padding: 1.5rem;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }

  .terms-content {
    font-size: 0.875rem;
    line-height: 1.7;
    color: #374151;
  }

  .terms-content :global(h2) {
    margin: 0 0 1rem 0;
    font-size: 1.375rem;
    font-weight: 600;
    color: #1f2937;
  }

  .terms-content :global(h3) {
    margin: 1.5rem 0 0.75rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #374151;
  }

  .terms-content :global(p) {
    margin: 0 0 0.5rem 0;
  }

  .terms-content :global(ul) {
    margin: 0.5rem 0 0.5rem 1.5rem;
    padding: 0;
    list-style: disc;
  }

  .terms-content :global(li) {
    margin: 0.25rem 0;
  }

  .terms-content :global(a) {
    color: #3b82f6;
    text-decoration: none;
  }

  .terms-content :global(a:hover) {
    text-decoration: underline;
  }

  /* 関連情報 */
  .related-content {
    display: grid;
    gap: 1.5rem;
  }

  .info-card {
    padding: 1.5rem;
    background: #f9fafb;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
  }

  .info-card h3 {
    margin: 0 0 0.75rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #374151;
  }

  .info-card p {
    margin: 0;
    color: #4b5563;
    line-height: 1.6;
  }

  .info-card a {
    color: #3b82f6;
    text-decoration: none;
    font-weight: 500;
  }

  .info-card a:hover {
    text-decoration: underline;
  }

  /* お問い合わせ */
  .contact-content p {
    margin: 0 0 1rem 0;
    color: #4b5563;
    line-height: 1.6;
  }

  .contact-content ul {
    margin: 0;
    padding-left: 1.5rem;
    list-style: disc;
  }

  .contact-content li {
    margin: 0.5rem 0;
    color: #4b5563;
  }

  .contact-content a {
    color: #3b82f6;
    text-decoration: none;
    font-weight: 500;
  }

  .contact-content a:hover {
    text-decoration: underline;
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .terms-page {
      padding: 1rem 0.5rem;
    }

    .terms-header h1 {
      font-size: 2rem;
    }

    section {
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    section h2 {
      font-size: 1.25rem;
    }

    .summary-content,
    .terms-content-wrapper,
    .info-card {
      padding: 1rem;
    }
  }

  /* プリント対応 */
  @media print {
    .terms-page {
      background: white;
    }

    section {
      box-shadow: none;
      border: 1px solid #e5e7eb;
      page-break-inside: avoid;
    }
  }
</style>
