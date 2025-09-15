import { db } from '../db/database.js';

/**
 * KEEP機能専用リポジトリ
 * ユーザーが保存したポストの管理を行う
 * Dexie.jsを使用した実装
 */
export class KeepRepository {
  constructor() {
    // Dexie.jsを使用するため、ストア名は不要
  }

  /**
   * KEEPアイテムを追加
   * @param {string} post_id - ポストID
   * @param {string} sns_type - SNS種別
   * @returns {Promise<void>}
   */
  async add_keep_item(post_id, sns_type) {
    try {
      const keep_item = {
        post_id,
        sns_type,
        kept_at: new Date().toISOString()
      };

      await db.keep_items.put(keep_item);

    } catch (error) {

      throw new Error('KEEPアイテムの追加に失敗しました');
    }
  }

  /**
   * KEEPアイテムを削除
   * @param {string} post_id - ポストID
   * @returns {Promise<void>}
   */
  async remove_keep_item(post_id) {
    try {
      await db.keep_items.delete(post_id);

    } catch (error) {

      throw new Error('KEEPアイテムの削除に失敗しました');
    }
  }

  /**
   * KEEPアイテムが存在するか確認
   * @param {string} post_id - ポストID
   * @returns {Promise<boolean>} 存在する場合true
   */
  async is_kept(post_id) {
    try {
      const item = await db.keep_items.get(post_id);
      return !!item;
    } catch (error) {

      throw new Error('KEEPアイテムの確認に失敗しました');
    }
  }

  /**
   * KEEP一覧を取得（ページネーション対応）
   * @param {Object} options - クエリオプション
   * @returns {Promise<Array>} KEEPアイテムと投稿データの配列
   */
  async get_keep_list(options = {}) {
    const {
      limit = 20,
      offset = 0,
      sort = 'desc',
      sns_type = null
    } = options;

    try {
      let query = db.keep_items;

      // SNS種別でフィルタリング
      if (sns_type) {
        query = query.where('sns_type').equals(sns_type);
      }

      // ソート
      query = query.orderBy('kept_at');
      if (sort === 'desc') {
        query = query.reverse();
      }

      // ページネーション
      const keep_items = await query
        .offset(offset)
        .limit(limit)
        .toArray();

      // 対応する投稿データを取得
      const keep_list = [];
      for (const keep_item of keep_items) {
        const post = await db.posts.get(keep_item.post_id);
        if (post) {
          keep_list.push({
            ...post,
            kept_at: keep_item.kept_at
          });
        } else {
          // ポストが見つからない場合は最小限の情報で構成
          keep_list.push({
            id: keep_item.post_id,
            sns_type: keep_item.sns_type,
            kept_at: keep_item.kept_at
          });
        }
      }

      return keep_list;
    } catch (error) {

      return [];
    }
  }

  /**
   * KEEP統計情報を取得
   * @returns {Promise<Object>} 統計情報
   */
  async get_keep_stats() {
    try {
      const total_count = await db.keep_items.count();

      // SNS別の集計
      const by_sns_type = {};
      const sns_types = ['twitter', 'bluesky', 'mastodon'];

      for (const sns_type of sns_types) {
        by_sns_type[sns_type] = await db.keep_items
          .where('sns_type')
          .equals(sns_type)
          .count();
      }

      // 最近のKEEPを取得
      const recent_keeps = await db.keep_items
        .orderBy('kept_at')
        .reverse()
        .limit(5)
        .toArray();

      // 月別集計（将来の拡張用）
      const by_month = {};

      return {
        total_count,
        by_sns_type,
        by_month,
        recent_keeps
      };
    } catch (error) {

      return {
        total_count: 0,
        by_sns_type: {},
        by_month: {},
        recent_keeps: []
      };
    }
  }

  /**
   * KEEPアイテムの総数を取得
   * @param {Object} filter - フィルター条件
   * @returns {Promise<number>} KEEP数
   */
  async get_keep_count(filter = {}) {
    try {
      if (filter.sns_type) {
        return await db.keep_items
          .where('sns_type')
          .equals(filter.sns_type)
          .count();
      } else {
        return await db.keep_items.count();
      }
    } catch (error) {

      return 0;
    }
  }

  /**
   * バッチでKEEPアイテムを追加
   * @param {Array<{post_id: string, sns_type: string}>} items - KEEPアイテムの配列
   * @returns {Promise<void>}
   */
  async add_keep_items_batch(items) {
    try {
      const kept_at = new Date().toISOString();
      const keep_items = items.map(item => ({
        post_id: item.post_id,
        sns_type: item.sns_type,
        kept_at
      }));

      await db.transaction('rw', db.keep_items, async () => {
        await db.keep_items.bulkPut(keep_items);
      });

    } catch (error) {

      throw new Error('KEEPアイテムの一括追加に失敗しました');
    }
  }

  /**
   * 指定期間のKEEPアイテムを取得
   * @param {Date} start_date - 開始日
   * @param {Date} end_date - 終了日
   * @returns {Promise<Array>} KEEPアイテムの配列
   */
  async get_keeps_by_date_range(start_date, end_date) {
    try {
      return await db.keep_items
        .where('kept_at')
        .between(start_date.toISOString(), end_date.toISOString())
        .toArray();
    } catch (error) {

      throw new Error('期間指定でのKEEP取得に失敗しました');
    }
  }

  /**
   * すべてのKEEPアイテムをクリア
   * @returns {Promise<void>}
   */
  async clear_all_keeps() {
    try {
      await db.keep_items.clear();

    } catch (error) {

      throw new Error('KEEPアイテムのクリアに失敗しました');
    }
  }

  /**
   * データベースを閉じる
   */
  close() {
    // Dexie.jsのdbインスタンスは共有されているため、ここでは閉じない

  }
}

// シングルトンインスタンスをエクスポート
export const keep_repository = new KeepRepository();
