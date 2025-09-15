import pako from 'pako'
import { post_repository } from '../repositories/post_repository.js'
import { keep_repository } from '../repositories/keep_repository.js'
import { db } from '../db/database.js'

export class ExportService {
  constructor() {
    this.CHUNK_SIZE = 1000
    this.VERSION = 1
    this.DB_VERSION = 9
  }

  async export_all_data(progress_callback = null) {
    try {
      await post_repository.ensure_initialized()
      
      this.report_progress(progress_callback, 'preparing', 0, 'エクスポートの準備中...')
      
      const metadata = await this.create_metadata()
      
      this.report_progress(progress_callback, 'fetching', 10, 'データを取得中...')
      
      const ndjson_lines = []
      ndjson_lines.push(JSON.stringify(metadata))
      
      let total_items = metadata.counts.posts + 
                       metadata.counts.keep_items + 
                       metadata.counts.settings
      let processed_items = 0
      
      for await (const line of this.generate_ndjson_stream(progress_callback)) {
        ndjson_lines.push(line)
        processed_items++
        
        if (processed_items % 100 === 0) {
          const progress = 10 + (processed_items / total_items) * 70
          this.report_progress(progress_callback, 'fetching', progress, 
            `データを取得中... (${processed_items}/${total_items})`)
        }
      }
      
      this.report_progress(progress_callback, 'compressing', 80, '圧縮中...')
      
      const ndjson_data = ndjson_lines.join('\n')
      const compressed_data = await this.compress_data(ndjson_data)
      
      this.report_progress(progress_callback, 'downloading', 95, 'ファイルを準備中...')
      
      this.download_file(compressed_data, this.generate_filename())
      
      this.report_progress(progress_callback, 'completed', 100, 'エクスポートが完了しました')
      
      return {
        success: true,
        message: 'エクスポートが完了しました'
      }
    } catch (error) {
      console.error('[ExportService] Export failed:', error)
      throw new Error('エクスポートに失敗しました: ' + error.message)
    }
  }

  async create_metadata() {
    const counts = await this.get_data_counts()
    
    return {
      type: 'metadata',
      version: this.VERSION,
      db_version: this.DB_VERSION,
      export_date: new Date().toISOString(),
      app_version: '1.0.0',
      counts: counts
    }
  }

  async get_data_counts() {
    const post_count = await db.posts.count()
    const keep_count = await db.keep_items.count()
    const settings_count = await db.settings.count()
    
    return {
      posts: post_count,
      keep_items: keep_count,
      settings: settings_count
    }
  }

  async* generate_ndjson_stream(progress_callback) {
    yield* this.fetch_posts_stream()
    yield* this.fetch_keep_items_stream()
    yield* this.fetch_settings_stream()
  }

  async* fetch_posts_stream() {
    const table = db.posts
    let offset = 0
    let has_more = true
    
    while (has_more) {
      const items = await table
        .offset(offset)
        .limit(this.CHUNK_SIZE)
        .toArray()
      
      if (items.length === 0) {
        has_more = false
        break
      }
      
      for (const item of items) {
        yield JSON.stringify({
          type: 'post',
          data: item
        })
      }
      
      offset += this.CHUNK_SIZE
      has_more = items.length === this.CHUNK_SIZE
      
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  }

  async* fetch_keep_items_stream() {
    const table = db.keep_items
    let offset = 0
    let has_more = true
    
    while (has_more) {
      const items = await table
        .offset(offset)
        .limit(this.CHUNK_SIZE)
        .toArray()
      
      if (items.length === 0) {
        has_more = false
        break
      }
      
      for (const item of items) {
        yield JSON.stringify({
          type: 'keep_item',
          data: item
        })
      }
      
      offset += this.CHUNK_SIZE
      has_more = items.length === this.CHUNK_SIZE
      
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  }

  async* fetch_settings_stream() {
    const table = db.settings
    let offset = 0
    let has_more = true
    
    while (has_more) {
      const items = await table
        .offset(offset)
        .limit(this.CHUNK_SIZE)
        .toArray()
      
      if (items.length === 0) {
        has_more = false
        break
      }
      
      for (const item of items) {
        yield JSON.stringify({
          type: 'setting',
          data: item
        })
      }
      
      offset += this.CHUNK_SIZE
      has_more = items.length === this.CHUNK_SIZE
      
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  }

  async compress_data(data) {
    try {
      const encoder = new TextEncoder()
      const uint8_array = encoder.encode(data)
      const compressed = pako.gzip(uint8_array)
      return new Blob([compressed], { type: 'application/gzip' })
    } catch (error) {
      console.error('[ExportService] Compression failed:', error)
      console.warn('[ExportService] Falling back to uncompressed export')
      return new Blob([data], { type: 'application/x-ndjson' })
    }
  }

  download_file(blob, filename) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  generate_filename() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hour = String(now.getHours()).padStart(2, '0')
    const minute = String(now.getMinutes()).padStart(2, '0')
    const second = String(now.getSeconds()).padStart(2, '0')
    
    return `keepost_backup_${year}${month}${day}_${hour}${minute}${second}.ndjson.gz`
  }

  report_progress(callback, step, progress, message, current = null, total = null) {
    if (callback && typeof callback === 'function') {
      callback({
        step: step,
        progress: progress,
        message: message,
        current: current,
        total: total
      })
    }
  }
}

export const export_service = new ExportService()