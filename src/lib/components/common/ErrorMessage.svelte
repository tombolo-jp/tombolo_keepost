<script>
  import { createEventDispatcher } from 'svelte'
  
  const dispatch = createEventDispatcher()
  
  export let error = ''
  export let title = 'エラーが発生しました'
  export let type = 'error' // 'error' | 'warning' | 'info'
  export let dismissible = false
  export let action = null // { label: string, handler: Function }
  
  function handle_dismiss() {
    dispatch('dismiss')
  }
  
  function handle_action() {
    if (action && action.handler) {
      action.handler()
    }
  }
  
  $: icon = get_icon(type)
  
  function get_icon(type) {
    switch (type) {
      case 'warning':
        return 'fas fa-exclamation-triangle'
      case 'info':
        return 'fas fa-info-circle'
      default:
        return 'fas fa-times-circle'
    }
  }
</script>

<div class="error-container" class:warning={type === 'warning'} class:info={type === 'info'}>
  <div class="error-icon"><i class="{icon}"></i></div>
  <div class="error-content">
    <h3 class="error-title">{title}</h3>
    <p class="error-message">{error}</p>
    
    {#if action}
      <button 
        class="action-button"
        on:click={handle_action}
      >
        {action.label}
      </button>
    {/if}
  </div>
  
  {#if dismissible}
    <button 
      class="dismiss-button"
      on:click={handle_dismiss}
      aria-label="エラーを閉じる"
    >
      <i class="fas fa-times"></i>
    </button>
  {/if}
</div>

<style>
  .error-container {
    display: flex;
    gap: 1rem;
    padding: 1.5rem;
    background-color: #fed7d7;
    border: 1px solid #fc8181;
    border-radius: 8px;
    position: relative;
  }
  
  .error-container.warning {
    background-color: #fefcbf;
    border-color: #f6e05e;
  }
  
  .error-container.info {
    background-color: #bee3f8;
    border-color: #63b3ed;
  }
  
  .error-icon {
    font-size: 2rem;
    flex-shrink: 0;
  }
  
  .error-content {
    flex: 1;
  }
  
  .error-title {
    margin: 0 0 0.5rem;
    font-size: 1.125rem;
    font-weight: 600;
    color: #c53030;
  }
  
  .error-container.warning .error-title {
    color: #744210;
  }
  
  .error-container.info .error-title {
    color: #2b6cb0;
  }
  
  .error-message {
    margin: 0 0 1rem;
    color: #c53030;
    font-size: 0.875rem;
    line-height: 1.5;
  }
  
  .error-container.warning .error-message {
    color: #744210;
  }
  
  .error-container.info .error-message {
    color: #2b6cb0;
  }
  
  .action-button {
    padding: 0.5rem 1rem;
    background-color: #e53e3e;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  
  .error-container.warning .action-button {
    background-color: #d69e2e;
  }
  
  .error-container.info .action-button {
    background-color: #3182ce;
  }
  
  .action-button:hover {
    filter: brightness(0.9);
  }
  
  .dismiss-button {
    position: absolute;
    top: 1rem;
    right: 1rem;
    padding: 0.25rem;
    background: none;
    border: none;
    font-size: 1.25rem;
    color: #c53030;
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.2s ease;
  }
  
  .error-container.warning .dismiss-button {
    color: #744210;
  }
  
  .error-container.info .dismiss-button {
    color: #2b6cb0;
  }
  
  .dismiss-button:hover {
    opacity: 1;
  }
  
  @media (max-width: 640px) {
    .error-container {
      flex-direction: column;
      text-align: center;
    }
    
    .error-icon {
      margin: 0 auto;
    }
  }
</style>