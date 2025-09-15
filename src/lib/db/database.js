import Dexie from 'dexie';

/**
 * KeePost データベースクラス
 * Dexie.jsを使用したIndexedDBラッパー
 */
export class KeePostDatabase extends Dexie {
  constructor() {
    super('KEEPOST_DB');
    
    // バージョン6のスキーマ定義（互換性のため残す）
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
    
    // バージョン7: 統合マイグレーション
    // - KEEPデータの移行（is_kept → keep_items）
    // - Mastodon ID形式の変換
    // - スキーマ最適化（is_kept/kept_at削除、sns_accounts削除）
    this.version(7).stores({
      // ポストテーブル（is_keptインデックスを削除）
      posts: 'id, sns_type, created_at, year_month, [sns_type+created_at], [sns_type+year_month]',
      
      // KEEPアイテムテーブル
      keep_items: 'post_id, kept_at, sns_type',
      
      // 設定テーブル
      settings: 'key'
      // sns_accountsテーブルを削除
    }).upgrade(async trans => {
      console.log('[Migration] Version 7 integrated migration started');
      
      try {
        // ステップ1: KEEPデータの移行
        console.log('[Migration] Step 1: Migrating KEEP data from posts to keep_items');
        
        // is_kept=trueのポストを取得
        const kept_posts = await trans.posts
          .filter(post => post.is_kept === true)
          .toArray();
        
        console.log(`[Migration] Found ${kept_posts.length} kept posts to migrate`);
        
        // keep_itemsテーブルに移行
        for (const post of kept_posts) {
          // 既存のkeep_itemsがなければ追加
          const existing_keep = await trans.keep_items.get(post.id);
          if (!existing_keep) {
            const keep_item = {
              post_id: post.id,
              sns_type: post.sns_type,
              kept_at: post.kept_at || new Date().toISOString()
            };
            await trans.keep_items.put(keep_item);
            console.log(`[Migration] Migrated KEEP data for post: ${post.id}`);
          }
        }
        
        // ステップ2: Mastodon ID形式の変換
        console.log('[Migration] Step 2: Converting Mastodon ID format');
        
        const mastodon_posts = await trans.posts
          .where('sns_type')
          .equals('mastodon')
          .toArray();
        
        let converted_count = 0;
        
        for (const post of mastodon_posts) {
          // 古い形式のIDかチェック（URLを含む長いID）
          if (post.id && post.id.includes('statuses/')) {
            const id_match = post.id.match(/statuses\/(\d+)/);
            if (id_match) {
              const old_id = post.id;
              const new_id = `mastodon_${id_match[1]}`;
              
              // KEEPアイテムを先に移行
              const keep_item = await trans.keep_items.get(old_id);
              if (keep_item) {
                await trans.keep_items.delete(old_id);
                keep_item.post_id = new_id;
                await trans.keep_items.add(keep_item);
              }
              
              // ポストのID変換
              await trans.posts.delete(old_id);
              post.id = new_id;
              post.original_id = id_match[1];
              await trans.posts.add(post);
              
              converted_count++;
              console.log(`[Migration] Converted Mastodon ID: ${old_id} -> ${new_id}`);
            }
          }
        }
        
        console.log(`[Migration] Converted ${converted_count} Mastodon IDs`);
        
        // ステップ3: postsテーブルからis_kept/kept_atフィールドを削除
        console.log('[Migration] Step 3: Cleaning up posts table fields');
        
        await trans.posts.toCollection().modify(post => {
          delete post.is_kept;
          delete post.kept_at;
        });
        
        // ステップ4: データ整合性チェック
        console.log('[Migration] Step 4: Validating KEEP items');
        
        // 存在しないpost_idを持つkeep_itemsを削除
        const posts = await trans.posts.toArray();
        const keep_items = await trans.keep_items.toArray();
        
        const post_ids = new Set(posts.map(p => p.id));
        let deleted_count = 0;
        
        for (const keep of keep_items) {
          if (!post_ids.has(keep.post_id)) {
            await trans.keep_items.delete(keep.post_id);
            deleted_count++;
            console.log(`[Migration] Removed orphaned KEEP item: ${keep.post_id}`);
          }
        }
        
        console.log(`[Migration] Removed ${deleted_count} orphaned KEEP items`);
        console.log('[Migration] Version 7 integrated migration completed successfully');
        
      } catch (error) {
        console.error('[Migration] Version 7 migration failed:', error);
        throw error; // トランザクションをロールバック
      }
    });
    
    // テーブルの定義
    this.posts = this.table('posts');
    this.keep_items = this.table('keep_items');
    this.settings = this.table('settings');
  }
  
  /**
   * 実際のDBバージョンを取得（マイグレーション前）
   */
  async get_actual_version() {
    try {
      // 一時的にDBを開いて現在のバージョンを確認
      const temp_db = new Dexie('KEEPOST_DB');
      await temp_db.open();
      const actual_version = temp_db.verno;
      temp_db.close();
      return actual_version;
    } catch (error) {
      console.error('Failed to get actual DB version:', error);
      return null;
    }
  }

  /**
   * データベースの初期化
   */
  async initialize() {
    try {
      // マイグレーション前のバージョンを記録
      const version_before = await this.get_actual_version();
      console.log('[Database] Current DB version before migration:', version_before);
      
      // DBを開く（必要に応じてマイグレーションが自動実行される）
      await this.open();
      
      // マイグレーション後のバージョンを記録
      const version_after = this.verno;
      console.log('[Database] DB version after migration:', version_after);
      
      // マイグレーションが実行された場合のログ出力
      if (version_before !== version_after) {
        console.log('[Database] Migration executed from version', version_before, 'to', version_after);
      }
      
      return {
        migrated: version_before !== version_after,
        from_version: version_before,
        to_version: version_after
      };
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }
}

// シングルトンインスタンス
export const db = new KeePostDatabase();