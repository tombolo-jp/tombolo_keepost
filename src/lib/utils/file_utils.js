import { memory_monitor } from './memory_monitor.js'

/**
 * ファイル処理ユーティリティ
 * tweets.jsファイルの読み込みを管理
 */
export class FileProcessor {
  constructor() {
    this.TWEETS_FILE_MAX_SIZE = 500 * 1024 * 1024  // 500MB
  }

  /**
   * tweets.jsファイルを処理
   * @param {File} js_file - tweets.jsファイル
   * @param {Function} progress_callback - 進捗コールバック
   * @returns {Promise<string>} ファイル内容
   */
  async process_tweets_file(js_file, progress_callback = null) {
    try {
      // メモリチェック
      const memory_check = memory_monitor.check_memory_availability(js_file.size)
      if (!memory_check) {
        throw new Error('メモリ不足: ファイルサイズが大きすぎます。他のアプリケーションを閉じてから再試行してください。')
      }

      if (progress_callback) {
        progress_callback({ 
          step: 'reading', 
          progress: 0, 
          message: 'ファイルを読み込んでいます...' 
        })
      }

      // FileReaderで読み込み
      return await this.read_file_as_text(js_file, progress_callback)
      
    } catch (error) {

      throw new Error(`ファイルの読み込みに失敗しました: ${error.message}`)
    }
  }

  /**
   * ファイルをテキストとして読み込み
   * @param {File} file - ファイル
   * @param {Function} progress_callback - 進捗コールバック
   * @returns {Promise<string>} ファイル内容
   */
  read_file_as_text(file, progress_callback) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (event) => {
        if (progress_callback) {
          progress_callback({ 
            step: 'read', 
            progress: 100, 
            message: 'ファイルの読み込みが完了しました' 
          })
        }
        resolve(event.target.result)
      }
      
      reader.onerror = () => {
        reject(new Error('ファイルの読み込みに失敗しました'))
      }
      
      reader.onprogress = (event) => {
        if (event.lengthComputable && progress_callback) {
          const progress = Math.round((event.loaded / event.total) * 100)
          progress_callback({ 
            step: 'reading', 
            progress: progress, 
            message: `ファイルを読み込んでいます... ${progress}%` 
          })
        }
      }
      
      reader.readAsText(file)
    })
  }
}

// シングルトンインスタンスをエクスポート
export const file_processor = new FileProcessor()