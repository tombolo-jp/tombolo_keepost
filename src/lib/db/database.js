import Dexie from 'dexie';

/**
 * KeePost データベースクラス
 * Dexie.jsを使用したIndexedDBラッパー
 */
export class KeePostDatabase extends Dexie {
  constructor() {
    super('KEEPOST_DB');
    
    // バージョン6のスキーマ定義
    this.version(6).stores({
      // ポストテーブル
      posts: 'id, sns_type, created_at, year_month, is_kept, [sns_type+created_at], [sns_type+year_month]',
      
      // KEEPアイテムテーブル
      keep_items: 'post_id, kept_at, sns_type',
      
      // SNSアカウントテーブル
      sns_accounts: 'id, sns_type, username',
      
      // 設定テーブル
      settings: 'key'
    });
    
    // テーブルの定義
    this.posts = this.table('posts');
    this.keep_items = this.table('keep_items');
    this.sns_accounts = this.table('sns_accounts');
    this.settings = this.table('settings');
  }
  
  /**
   * データベースの初期化
   */
  async initialize() {
    try {
      await this.open();

    } catch (error) {

      throw error;
    }
  }
}

// シングルトンインスタンス
export const db = new KeePostDatabase();