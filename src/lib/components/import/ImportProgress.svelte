<script>
  export let progress = 0
  export let step = ''
  export let message = ''
  export let processed = 0
  export let total = 0
  export let is_complete = false
  export let error = null
  
  $: progress_percentage = Math.min(100, Math.max(0, progress))
  
  function get_step_label(step) {
    const labels = {
      'zip_loading': 'Zipファイル読み込み中',
      'zip_loaded': 'Zipファイル読み込み完了',
      'extracting': 'ファイル展開中',
      'extracted': 'ファイル展開完了',
      'reading': 'ファイル読み込み中',
      'read': 'ファイル読み込み完了',
      'parsing': 'データ解析中',
      'parsed': 'データ解析完了',
      'transforming': 'データ変換中',
      'processing': 'データ処理中',
      'saving': 'データ保存中',
      'completed': '完了'
    }
    return labels[step] || step
  }
  
  function get_step_icon(step) {
    const icons = {
      'zip_loading': 'fas fa-folder-open',
      'zip_loaded': 'fas fa-check-circle',
      'extracting': 'fas fa-box-open',
      'extracted': 'fas fa-check-circle',
      'reading': 'fas fa-file-alt',
      'read': 'fas fa-check-circle',
      'parsing': 'fas fa-search',
      'parsed': 'fas fa-check-circle',
      'processing': 'fas fa-cog',
      'saving': 'fas fa-save',
      'completed': 'fas fa-trophy'
    }
    return icons[step] || 'fas fa-hourglass-half'
  }
</script>

<div class="import-progress">
  {#if error}
    <div class="error-container">
      <div class="error-icon"><i class="fas fa-times-circle"></i></div>
      <h3>エラーが発生しました</h3>
      <p class="error-message">{error}</p>
    </div>
  {:else if is_complete}
    <div class="complete-container">
      <div class="complete-icon"><i class="fas fa-check-circle"></i></div>
      <h3>インポート完了</h3>
      <p class="complete-message">{message}</p>
    </div>
  {:else}
    <div class="progress-container">
      <div class="progress-header">
        <span class="step-icon"><i class="{get_step_icon(step)}"></i></span>
        <h3>{get_step_label(step)}</h3>
      </div>
      
      <div class="progress-bar">
        <div 
          class="progress-fill"
          style="width: {progress_percentage}%"
        ></div>
      </div>
      
      <div class="progress-info">
        <p class="progress-message">{message}</p>
        {#if processed > 0 && total > 0}
          <p class="progress-count">
            {processed.toLocaleString()} / {total.toLocaleString()} 件
          </p>
        {/if}
        <p class="progress-percentage">{progress_percentage}%</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .import-progress {
    max-width: 600px;
    margin: 2rem auto;
    background: white;
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .progress-container {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .progress-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    justify-content: center;
  }
  
  .step-icon {
    font-size: 2rem;
    animation: pulse 2s ease-in-out infinite;
  }
  
  .progress-header h3 {
    margin: 0;
    color: #2d3748;
    font-size: 1.25rem;
  }
  
  .progress-bar {
    width: 100%;
    height: 20px;
    background-color: #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
    position: relative;
  }
  
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #4299e1 0%, #3182ce 100%);
    transition: width 0.3s ease;
    position: relative;
    overflow: hidden;
  }
  
  .progress-fill::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.3) 50%,
      transparent 100%
    );
    animation: shimmer 1.5s infinite;
  }
  
  .progress-info {
    text-align: center;
  }
  
  .progress-message {
    margin: 0 0 0.5rem;
    color: #4a5568;
    font-size: 0.875rem;
  }
  
  .progress-count {
    margin: 0 0 0.5rem;
    color: #718096;
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  .progress-percentage {
    margin: 0;
    color: #2d3748;
    font-size: 1.5rem;
    font-weight: 700;
  }
  
  .error-container,
  .complete-container {
    text-align: center;
    padding: 1rem;
  }
  
  .error-icon,
  .complete-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }
  
  .error-container h3,
  .complete-container h3 {
    margin: 0 0 1rem;
    font-size: 1.5rem;
  }
  
  .error-container h3 {
    color: #e53e3e;
  }
  
  .complete-container h3 {
    color: #38a169;
  }
  
  .error-message {
    color: #c53030;
    font-size: 0.875rem;
    margin: 0;
    word-break: break-word;
  }
  
  .complete-message {
    color: #2f855a;
    font-size: 1rem;
    margin: 0;
  }
  
  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.05);
      opacity: 0.8;
    }
  }
  
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
  
  @media (max-width: 768px) {
    .import-progress {
      padding: 1.5rem;
    }
    
    .step-icon {
      font-size: 1.5rem;
    }
    
    .progress-header h3 {
      font-size: 1.125rem;
    }
    
    .progress-bar {
      height: 16px;
    }
    
    .progress-percentage {
      font-size: 1.25rem;
    }
  }
</style>