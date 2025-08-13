import pako from 'pako'
import { BaseImporter } from './base_importer.js'
import { db } from '../../db/database.js'
import { post_repository } from '../../repositories/post_repository.js'
import { keep_repository } from '../../repositories/keep_repository.js'

export class BackupImporter extends BaseImporter {
  constructor() {
    super('backup')
    this.SUPPORTED_VERSION = 1
    this.SUPPORTED_DB_VERSION = 6
  }

  async import_data(file, progress_callback = null) {
    try {
      this.report_progress(progress_callback, 'validating', 0, 'ファイルを検証中...')
      
      if (!this.validate_file(file)) {
        return this.create_error_result('バックアップファイルの形式が正しくありません')
      }
      
      this.report_progress(progress_callback, 'decompressing', 10, '解凍中...')
      
      const decompressed_data = await this.decompress_file(file)
      
      this.report_progress(progress_callback, 'parsing', 20, 'データを解析中...')
      
      const data_items = await this.parse_ndjson_data(decompressed_data, progress_callback)
      
      if (!data_items || data_items.length === 0) {
        return this.create_error_result('バックアップファイルにデータが含まれていません')
      }
      
      const metadata = data_items[0]
      if (metadata.type !== 'metadata') {
        return this.create_error_result('バックアップファイルのメタデータが見つかりません')
      }
      
      const validation_result = this.validate_metadata(metadata)
      if (!validation_result.valid) {
        return this.create_error_result(validation_result.message)
      }
      
      const compatibility_result = this.check_version_compatibility(metadata.db_version)
      if (!compatibility_result.compatible && !compatibility_result.can_proceed) {
        return this.create_error_result(compatibility_result.message)
      }
      
      this.report_progress(progress_callback, 'clearing', 30, '既存データをクリア中...')
      
      await this.clear_existing_data()
      
      this.report_progress(progress_callback, 'restoring', 40, 'データを復元中...')
      
      const restore_result = await this.restore_data(data_items.slice(1), progress_callback)
      
      this.report_progress(progress_callback, 'completed', 100, '復元が完了しました')
      
      return {
        success: true,
        post_count: restore_result.post_count,
        message: 'データの復元が完了しました',
        stats: restore_result.stats,
        sns_type: this.sns_type,
        imported_at: new Date().toISOString()
      }
    } catch (error) {
      console.error('[BackupImporter] Import failed:', error)
      return this.create_error_result('インポート中にエラーが発生しました: ' + error.message)
    }
  }

  validate_file(file) {
    const filename = file.name.toLowerCase()
    return filename.endsWith('.ndjson.gz') || filename.endsWith('.ndjson')
  }

  async decompress_file(file) {
    try {
      const array_buffer = await file.arrayBuffer()
      const uint8_array = new Uint8Array(array_buffer)
      
      if (file.name.endsWith('.gz')) {
        const decompressed = pako.ungzip(uint8_array)
        const decoder = new TextDecoder()
        return decoder.decode(decompressed)
      } else {
        const decoder = new TextDecoder()
        return decoder.decode(uint8_array)
      }
    } catch (error) {
      console.error('[BackupImporter] Decompression failed:', error)
      throw new Error('ファイルの解凍に失敗しました')
    }
  }

  async parse_ndjson_data(text_data, progress_callback) {
    const lines = text_data.trim().split('\n')
    const data_items = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      
      try {
        const item = JSON.parse(line)
        data_items.push(item)
        
        if (i % 100 === 0 && i > 0) {
          const progress = 20 + (i / lines.length) * 10
          this.report_progress(progress_callback, 'parsing', progress, 
            `データを解析中... (${i}/${lines.length})`)
        }
      } catch (error) {
        console.warn(`[BackupImporter] Failed to parse line ${i + 1}:`, error)
      }
    }
    
    return data_items
  }

  validate_metadata(metadata) {
    if (!metadata.version) {
      return { valid: false, message: 'バックアップファイルのバージョン情報がありません' }
    }
    
    if (!metadata.db_version) {
      return { valid: false, message: 'データベースバージョン情報がありません' }
    }
    
    if (!metadata.counts) {
      return { valid: false, message: 'データカウント情報がありません' }
    }
    
    return { valid: true }
  }

  check_version_compatibility(db_version) {
    if (db_version === this.SUPPORTED_DB_VERSION) {
      return { compatible: true }
    }
    
    if (db_version < this.SUPPORTED_DB_VERSION) {
      return { 
        compatible: false, 
        can_proceed: true,
        message: '古いバージョンのバックアップファイルです。互換性の問題が発生する可能性があります。'
      }
    }
    
    return { 
      compatible: false, 
      can_proceed: false,
      message: 'このバックアップファイルは新しいバージョンで作成されています。アプリケーションを更新してください。'
    }
  }

  async clear_existing_data() {
    try {
      await db.transaction('rw', db.posts, db.keep_items, db.sns_accounts, db.settings, async () => {
        await db.posts.clear()
        await db.keep_items.clear()
        await db.sns_accounts.clear()
        await db.settings.clear()
      })
    } catch (error) {
      console.error('[BackupImporter] Failed to clear existing data:', error)
      throw new Error('既存データのクリアに失敗しました')
    }
  }

  async restore_data(data_items, progress_callback) {
    const stats = {
      posts: 0,
      keep_items: 0,
      sns_accounts: 0,
      settings: 0
    }
    
    const total_items = data_items.length
    const batch_size = 100
    const batches = []
    
    for (let i = 0; i < data_items.length; i += batch_size) {
      batches.push(data_items.slice(i, i + batch_size))
    }
    
    let processed_items = 0
    
    for (const batch of batches) {
      await this.restore_batch(batch, stats)
      
      processed_items += batch.length
      const progress = 40 + (processed_items / total_items) * 50
      this.report_progress(progress_callback, 'restoring', progress, 
        `データを復元中... (${processed_items}/${total_items})`)
    }
    
    return {
      post_count: stats.posts,
      stats: stats
    }
  }

  async restore_batch(batch_items, stats) {
    await db.transaction('rw', db.posts, db.keep_items, db.sns_accounts, db.settings, async () => {
      for (const item of batch_items) {
        if (!item.type || !item.data) continue
        
        try {
          switch (item.type) {
            case 'post':
              await db.posts.add(item.data)
              stats.posts++
              break
            case 'keep_item':
              await db.keep_items.add(item.data)
              stats.keep_items++
              break
            case 'sns_account':
              await db.sns_accounts.add(item.data)
              stats.sns_accounts++
              break
            case 'setting':
              await db.settings.add(item.data)
              stats.settings++
              break
            default:
              console.warn('[BackupImporter] Unknown data type:', item.type)
          }
        } catch (error) {
          console.error('[BackupImporter] Failed to restore item:', error, item)
        }
      }
    })
  }

  transform_to_unified_schema(raw_data) {
    return raw_data
  }

  get_valid_extensions() {
    return ['.ndjson.gz', '.ndjson']
  }

  get_import_instructions() {
    return {
      title: 'KeePostバックアップのインポート',
      steps: [
        'エクスポートしたバックアップファイル（.ndjson.gz）を選択してください',
        '既存のデータは全て削除されます',
        'インポートを開始すると元に戻すことはできません'
      ]
    }
  }
}

export const backup_importer = new BackupImporter()