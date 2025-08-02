<script>
  import { with_base_path } from '../../utils/base_path.js'
  const current_year = new Date().getFullYear()
</script>

<footer class="app-footer">
  <div class="footer-content">
    <div class="footer-nav">
      <a href="{with_base_path('rules')}" class="footer-link">
        利用規約
      </a>
      <span class="separator">｜</span>
      <a href="{with_base_path('roadmap')}" class="footer-link">
        開発ロードマップ
      </a>
    </div>

    <div class="footer-copyright">
      © {current_year} <a href="https://tombolo.jp" target="_blank" rel="noopener noreferrer">Tombolo Inc.</a>
    </div>
  </div>
</footer>

<style>
  .app-footer {
    background: #1f2937;
    color: #e5e7eb;
    margin-top: auto;
    padding: 1.5rem 0;
  }

  .footer-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .footer-nav {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .footer-link {
    color: #9ca3af;
    font-size: 0.875rem;
    transition: color 0.2s;
    text-decoration: none;
  }

  .footer-link:hover {
    color: #e5e7eb;
    text-decoration: underline;
  }

  .separator {
    color: #6b7280;
    font-size: 0.875rem;
  }

  .footer-copyright {
    font-size: 0.875rem;
    color: #9ca3af;
  }

  .footer-copyright a {
    color: #e5e7eb;
    text-decoration: none;
    transition: color 0.2s;
  }

  .footer-copyright a:hover {
    color: white;
    text-decoration: underline;
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .footer-content {
      padding: 0 1rem;
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }

    .footer-nav {
      order: 2;
    }

    .footer-copyright {
      order: 1;
    }
  }
</style>
