import { format, parseISO, isValid } from 'date-fns'
import { ja } from 'date-fns/locale'

/**
 * 日付処理ユーティリティ
 * Twitter形式の日付処理と変換を提供
 */
export class DateUtils {
  /**
   * Twitter形式の日付をパース
   * @param {string} twitter_date - "Wed Oct 10 20:19:24 +0000 2018" 形式
   * @returns {Date} Dateオブジェクト
   */
  static parse_twitter_date(twitter_date) {
    try {
      const date = new Date(twitter_date)
      if (isValid(date)) {
        return date
      }
      // フォールバック: 現在時刻
      return new Date()
    } catch (error) {

      return new Date()
    }
  }

  /**
   * ISO形式の日付をパース
   * @param {string} iso_date - ISO形式の日付文字列
   * @returns {Date} Dateオブジェクト
   */
  static parse_iso_date(iso_date) {
    try {
      return parseISO(iso_date)
    } catch (error) {

      return new Date()
    }
  }

  /**
   * 日付を日本語形式でフォーマット
   * @param {Date|string} date - 日付
   * @param {string} format_string - フォーマット文字列
   * @returns {string} フォーマット済み日付
   */
  static format_ja(date, format_string = 'yyyy年MM月dd日 HH:mm') {
    try {
      const date_obj = typeof date === 'string' ? this.parse_iso_date(date) : date
      return format(date_obj, format_string, { locale: ja })
    } catch (error) {

      return ''
    }
  }

  /**
   * 相対時間を取得（例: 3時間前）
   * @param {Date|string} date - 日付
   * @returns {string} 相対時間
   */
  static get_relative_time(date) {
    try {
      const date_obj = typeof date === 'string' ? this.parse_iso_date(date) : date
      const now = new Date()
      const diff = now - date_obj
      
      const seconds = Math.floor(diff / 1000)
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)
      const days = Math.floor(hours / 24)
      const months = Math.floor(days / 30)
      const years = Math.floor(days / 365)
      
      if (years > 0) {
        return `${years}年前`
      } else if (months > 0) {
        return `${months}ヶ月前`
      } else if (days > 0) {
        return `${days}日前`
      } else if (hours > 0) {
        return `${hours}時間前`
      } else if (minutes > 0) {
        return `${minutes}分前`
      } else {
        return 'たった今'
      }
    } catch (error) {

      return ''
    }
  }

  /**
   * 年月文字列を生成（YYYY-MM形式）
   * @param {Date|string} date - 日付
   * @returns {string} 年月文字列
   */
  static get_year_month(date) {
    try {
      const date_obj = typeof date === 'string' ? this.parse_iso_date(date) : date
      return format(date_obj, 'yyyy-MM')
    } catch (error) {

      return ''
    }
  }

  /**
   * 日付範囲を生成
   * @param {Date} start_date - 開始日
   * @param {Date} end_date - 終了日
   * @returns {Object} 日付範囲情報
   */
  static get_date_range_info(start_date, end_date) {
    const diff = end_date - start_date
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const months = Math.floor(days / 30)
    const years = Math.floor(days / 365)
    
    let duration_text = ''
    if (years > 0) {
      duration_text = `${years}年${months % 12}ヶ月`
    } else if (months > 0) {
      duration_text = `${months}ヶ月`
    } else {
      duration_text = `${days}日`
    }
    
    return {
      start: start_date,
      end: end_date,
      days: days,
      months: months,
      years: years,
      duration_text: duration_text
    }
  }

  /**
   * 月の日本語名を取得
   * @param {number} month - 月（1-12）
   * @returns {string} 月の日本語名
   */
  static get_month_name_ja(month) {
    const month_names = [
      '1月', '2月', '3月', '4月', '5月', '6月',
      '7月', '8月', '9月', '10月', '11月', '12月'
    ]
    return month_names[month - 1] || ''
  }

  /**
   * 曜日の日本語名を取得
   * @param {Date} date - 日付
   * @returns {string} 曜日の日本語名
   */
  static get_weekday_ja(date) {
    const weekdays = ['日', '月', '火', '水', '木', '金', '土']
    return weekdays[date.getDay()] || ''
  }

  /**
   * 時間帯を判定
   * @param {Date} date - 日付
   * @returns {string} 時間帯（朝、昼、夕、夜、深夜）
   */
  static get_time_period(date) {
    const hour = date.getHours()
    
    if (hour >= 5 && hour < 9) {
      return '朝'
    } else if (hour >= 9 && hour < 12) {
      return '午前'
    } else if (hour >= 12 && hour < 17) {
      return '午後'
    } else if (hour >= 17 && hour < 21) {
      return '夕方'
    } else if (hour >= 21 || hour < 2) {
      return '夜'
    } else {
      return '深夜'
    }
  }

  /**
   * ツイートの投稿時間統計を生成
   * @param {Date[]} dates - 日付の配列
   * @returns {Object} 時間帯別統計
   */
  static get_time_statistics(dates) {
    const stats = {
      朝: 0,
      午前: 0,
      午後: 0,
      夕方: 0,
      夜: 0,
      深夜: 0
    }
    
    dates.forEach(date => {
      const period = this.get_time_period(date)
      stats[period]++
    })
    
    return stats
  }

  /**
   * 曜日別統計を生成
   * @param {Date[]} dates - 日付の配列
   * @returns {Object} 曜日別統計
   */
  static get_weekday_statistics(dates) {
    const stats = {
      日: 0,
      月: 0,
      火: 0,
      水: 0,
      木: 0,
      金: 0,
      土: 0
    }
    
    dates.forEach(date => {
      const weekday = this.get_weekday_ja(date)
      stats[weekday]++
    })
    
    return stats
  }
}

// 便利な関数をエクスポート
export const {
  parse_twitter_date,
  parse_iso_date,
  format_ja,
  get_relative_time,
  get_year_month,
  get_date_range_info,
  get_month_name_ja,
  get_weekday_ja,
  get_time_period,
  get_time_statistics,
  get_weekday_statistics
} = DateUtils