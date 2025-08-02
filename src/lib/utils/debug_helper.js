import { db } from '../db/database.js'

/**
 * デバッグヘルパー関数
 * 開発時のデータベース状態確認用
 */
export const debug_helper = {
  /**
   * データベース内のポスト数を確認
   */
  async check_post_count() {
    try {
      await db.open()
      const count = await db.posts.count()


      // SNS別の数を確認
      const twitter_count = await db.posts.where('sns_type').equals('twitter').count()
      const bluesky_count = await db.posts.where('sns_type').equals('bluesky').count()
      const mastodon_count = await db.posts.where('sns_type').equals('mastodon').count()



      // サンプルデータを表示
      if (count > 0) {
        const sample = await db.posts.limit(1).toArray()

      }
      
      return {
        total: count,
        twitter: twitter_count,
        bluesky: bluesky_count,
        mastodon: mastodon_count
      }
    } catch (error) {

      return null
    }
  },
  
  /**
   * IndexedDBの全データベースを表示
   */
  async list_all_databases() {
    if ('databases' in indexedDB) {
      const databases = await indexedDB.databases()

      databases.forEach(db => {

      })
      return databases
    } else {

      return []
    }
  },
  
  /**
   * データベースの詳細情報を表示
   */
  async show_db_info() {
    try {
      await db.open()




      db.tables.forEach(table => {

      })
      
      // 各テーブルの件数を表示
      for (const table of db.tables) {
        const count = await table.count()

      }
    } catch (error) {

    }
  },
  
  /**
   * データベースをリセット（開発用）
   * 注意: すべてのデータが削除されます
   */
  async reset_database() {
    const confirm = window.confirm('すべてのデータを削除しますか？この操作は取り消せません。')
    if (!confirm) {

      return
    }
    
    try {
      await db.delete()
      await db.open()

    } catch (error) {

    }
  },
  
  /**
   * テストデータを挿入（開発用）
   */
  async insert_test_data() {
    try {
      await db.open()
      
      const test_post = {
        id: 'test_' + Date.now(),
        original_id: 'test_original_' + Date.now(),
        sns_type: 'twitter',
        created_at: new Date().toISOString(),
        content: 'これはテストポストです',
        author: {
          name: 'テストユーザー',
          username: 'test_user',
          avatar_url: null
        },
        metrics: {
          likes: 10,
          shares: 5,
          replies: 3,
          views: 100
        },
        language: 'ja',
        year_month: new Date().toISOString().slice(0, 7),
        media: [],
        urls: [],
        hashtags: ['test'],
        mentions: [],
        sns_specific: {},
        is_kept: false,
        kept_at: null,
        original_url: 'https://example.com/test',
        imported_at: new Date().toISOString(),
        version: 4
      }
      
      await db.posts.add(test_post)

      // 確認
      await this.check_post_count()
    } catch (error) {

    }
  }
}

// グローバルに公開（開発用）
if (typeof window !== 'undefined') {
  window.debug_helper = debug_helper






}