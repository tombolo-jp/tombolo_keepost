<script>
  export let message = '読み込み中...'
  export let size = 'medium' // 'small' | 'medium' | 'large'
  export let fullscreen = false
</script>

<div class="loading-container" class:fullscreen class:small={size === 'small'} class:large={size === 'large'}>
  <div class="loading-content">
    <div class="spinner"></div>
    {#if message}
      <p class="loading-message">{message}</p>
    {/if}
  </div>
</div>

<style>
  .loading-container {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }
  
  .loading-container.fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.95);
    z-index: 9999;
  }
  
  .loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
  
  .spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #e2e8f0;
    border-top-color: #3182ce;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  
  .loading-container.small .spinner {
    width: 24px;
    height: 24px;
    border-width: 3px;
  }
  
  .loading-container.large .spinner {
    width: 64px;
    height: 64px;
    border-width: 5px;
  }
  
  .loading-message {
    margin: 0;
    color: #718096;
    font-size: 0.875rem;
    text-align: center;
  }
  
  .loading-container.small .loading-message {
    font-size: 0.75rem;
  }
  
  .loading-container.large .loading-message {
    font-size: 1rem;
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>