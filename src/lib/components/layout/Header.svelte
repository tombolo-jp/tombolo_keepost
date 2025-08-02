<script>
  import { createEventDispatcher } from 'svelte'
  import { get_path_from_page } from '../../services/router_service.js'
  import { with_base_path } from '../../utils/base_path.js'

  export let title = 'KeePost'
  export let active_page = 'posts'

  const dispatch = createEventDispatcher()

  const nav_items = [
    { id: 'posts', label: 'ポスト一覧', icon: 'fas fa-list-ul' },
    { id: 'import', label: 'SNSインポート', icon: 'fas fa-download' },
    { id: 'settings', label: '設定', icon: 'fas fa-cog' },
    { id: 'manual', label: '利用方法', icon: 'fas fa-question-circle' },
  ]
</script>

<header class="header">
  <div class="header-content">
    <div class="header-brand">
      <a href="{with_base_path('')}" class="header-logo-link">
        <h1 class="header-title">{title}</h1>
      </a>
    </div>
    <nav class="header-nav">
      <ul class="nav-list">
        {#each nav_items as item}
          <li class="nav-item">
            <a
              href={get_path_from_page(item.id)}
              class="nav-link"
              class:active={active_page === item.id}
              aria-label={item.label}
            >
              <i class="nav-icon {item.icon}"></i>
              <span class="nav-label">{item.label}</span>
            </a>
          </li>
        {/each}
      </ul>
    </nav>
  </div>
</header>

<style>
  .header {
    background-color: #3B806B;
    color: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0.75rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-brand {
    display: flex;
    align-items: center;
  }

  .header-logo-link {
    text-decoration: none;
    color: inherit;
    display: inline-block;
  }

  .header-logo-link:hover .header-title {
    opacity: 0.9;
  }

  .header-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    font-family: 'Open Sans', sans-serif;
    letter-spacing: -0.5px;
    transition: opacity 0.2s ease;
  }

  .header-nav {
    display: flex;
    align-items: center;
  }

  .nav-list {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    gap: 0.5rem;
  }

  .nav-item {
    flex: 0 0 auto;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 1rem;
    background: none;
    border: none;
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    text-decoration: none;
  }

  .nav-link:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .nav-link.active {
    background-color: rgba(255, 255, 255, 0.2);
    color: white;
  }

  .nav-icon {
    font-size: 1rem;
  }

  @media (max-width: 768px) {
    .header-content {
      padding: 0.75rem 1rem;
      gap: 0.75rem;
    }

    .header-title {
      font-size: 1.25rem;
    }

    .nav-list {
      justify-content: center;
    }

    .nav-link {
      padding: 0.5rem 0.75rem;
      font-size: 0.813rem;
    }

    .nav-label {
      display: none;
    }

    .nav-icon {
      font-size: 1.125rem;
    }
  }
</style>
