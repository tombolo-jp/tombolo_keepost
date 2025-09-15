<script>
  import { with_base_path } from '../../utils/base_path.js'
</script>

<div class="promotion-banner">
  <a href="{with_base_path('news')}">
    🌟  Twilog インポートに対応しました！ (2025年9月14日)
  </a>
</div>

<style>
  .promotion-banner {
    background-color: #fffacd; /* 薄い黄色 */
    padding: 8px;
    text-align: center;
    font-size: 14px;
    border-bottom: 1px solid #e5e7eb;

  }

  .promotion-banner a {
    color: inherit;
    text-decoration: none;
    font-weight: 500;
    color: #098929;
    text-decoration: underline;
    text-decoration-color: #c4d8a2;
  }

  .promotion-banner a:hover {
    text-decoration: none;
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .promotion-banner {
      font-size: 13px;
      padding: 10px 8px;
    }
  }
</style>
