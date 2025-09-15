import { writable } from 'svelte/store'

function create_migration_store() {
  const { subscribe, set, update } = writable({
    is_migrating: false,
    percentage: 0,
    current_step: '',
    estimated_time: '',
    processed_count: 0,
    total_count: 0,
    error: null
  })
  
  return {
    subscribe,
    start: () => update(state => ({ ...state, is_migrating: true })),
    complete: () => update(state => ({ ...state, is_migrating: false, percentage: 100 })),
    update: (progress) => update(state => ({ ...state, ...progress })),
    reset: () => set({
      is_migrating: false,
      percentage: 0,
      current_step: '',
      estimated_time: '',
      processed_count: 0,
      total_count: 0,
      error: null
    })
  }
}

export const migration_progress = create_migration_store()