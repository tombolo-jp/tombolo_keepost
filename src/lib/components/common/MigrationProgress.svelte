<script>
  import { migration_progress } from '../../stores/migration_store.js'
  import { onMount, onDestroy } from 'svelte'
  
  export let onComplete = () => {}
  export let onError = (error) => {}
  
  let progress_percentage = 0
  let current_step = ''
  let estimated_time = ''
  let processed_count = 0
  let total_count = 0
  
  // プログレス更新の購読
  const unsubscribe = migration_progress.subscribe(state => {
    progress_percentage = state.percentage
    current_step = state.current_step
    estimated_time = state.estimated_time
    processed_count = state.processed_count
    total_count = state.total_count
    
    // 完了時のコールバック
    if (state.percentage === 100 && !state.is_migrating) {
      onComplete()
    }
    
    // エラー時のコールバック
    if (state.error) {
      onError(state.error)
    }
  })
  
  onDestroy(() => {
    unsubscribe()
  })
</script>

<div class="migration-overlay">
  <div class="migration-modal">
    <h2>データベースを更新中...</h2>
    <div class="progress-bar">
      <div class="progress-fill" style="width: {progress_percentage}%"></div>
    </div>
    <p class="progress-text">{progress_percentage.toFixed(1)}%</p>
    <p class="step-info">{current_step}</p>
    {#if total_count > 0}
      <p class="count-info">{processed_count.toLocaleString()} / {total_count.toLocaleString()} 件</p>
    {/if}
    {#if estimated_time}
      <p class="time-info">推定残り時間: {estimated_time}</p>
    {/if}
  </div>
</div>

<style>
  .migration-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  }

  .migration-modal {
    background: white;
    border-radius: 12px;
    padding: 32px;
    min-width: 400px;
    max-width: 500px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  }

  .migration-modal h2 {
    margin: 0 0 20px 0;
    font-size: 24px;
    text-align: center;
    color: #333;
  }

  .progress-bar {
    width: 100%;
    height: 24px;
    background: #f0f0f0;
    border-radius: 12px;
    overflow: hidden;
    margin: 20px 0;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #4a90e2, #357abd);
    transition: width 0.3s ease;
    border-radius: 12px;
  }

  .progress-text {
    font-size: 24px;
    font-weight: bold;
    text-align: center;
    color: #333;
    margin: 10px 0;
  }

  .step-info {
    text-align: center;
    color: #666;
    margin: 10px 0;
    font-size: 14px;
  }

  .count-info, .time-info {
    text-align: center;
    color: #888;
    font-size: 14px;
    margin: 5px 0;
  }
</style>