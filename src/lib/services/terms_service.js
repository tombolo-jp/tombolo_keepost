/**
 * 利用規約サービス
 * 利用規約の内容と同意状態を管理
 */
export class TermsService {
  constructor() {
    this.STORAGE_KEY = 'keepost_terms_agreed'
    this.TERMS_VERSION = '1.0'
  }

  /**
   * 利用規約の内容を取得
   * @returns {Object} 利用規約情報
   */
  get_terms() {
    return {
      version: this.TERMS_VERSION,
      updated_at: '2025-08-04',
      content: this.get_terms_content(),
      sections: this.get_terms_sections()
    }
  }

  /**
   * 利用規約の本文を取得（HTML形式）
   * @returns {string} 利用規約の本文（HTML）
   */
  get_terms_content() {
    return `
      <h3>1. はじめに</h3>
      <p>KeePost（以下「本サービス」）は、ユーザーのSNSデータをローカルブラウザ内で管理するためのWebアプリケーションです。本利用規約（以下「本規約」）は、本サービスの利用条件を定めるものです。</p>
      <h3>2. サービスの提供</h3>
      <p>本サービスは、いかなる保証も行いません。本サービスの利用は、利用者自身の責任において行ってください。</p>
      <h3>3. データの取り扱い</h3>
      <ul>
        <li>本サービスは完全にローカルで動作し、ユーザーのデータを外部サーバーに送信することはありません。</li>
        <li>投稿データはユーザーのブラウザ内（IndexedDB）に保存されます。</li>
        <li>設定情報や利用規約への同意状態はlocalStorageに保存されます。</li>
        <li>データのバックアップは利用者自身の責任で行ってください。</li>
      </ul>
      <h3>4. プライバシー</h3>
      <ul>
        <li>本サービスは個人情報を収集しません。</li>
        <li>インポートされたSNSデータは、ユーザーのブラウザ内でのみ処理されます。</li>
        <li>アクセス解析等の外部サービスも使用していません。</li>
      </ul>
      <h3>5. 免責事項</h3>
      <ul>
        <li>本サービスの利用により生じたいかなる損害についても、開発者は責任を負いません。</li>
        <li>データの消失、破損等について、開発者は一切の責任を負いません。</li>
        <li>各SNSの利用規約に違反する形での本サービスの利用は禁止します。</li>
      </ul>
      <h3>6. 知的財産権</h3>
      <ul>
        <li>インポートされたSNSデータの著作権は、元の投稿者に帰属します。</li>
        <li>本サービスのソースコードの著作権は株式会社トンボロに帰属します。</li>
      </ul>
      <h3>7. 利用制限</h3>
      <ul>
        <li>本サービスを違法な目的で使用することを禁止します。</li>
        <li>他者の権利を侵害する形での利用を禁止します。</li>
      </ul>
      <h3>8. 規約の変更</h3>
      <p>本規約は予告なく変更される場合があります。変更後の規約は、本サービス上で公開された時点で効力を生じます。</p>
      <h3>9. 準拠法</h3>
      <p>本規約は日本法に準拠し、日本法に従って解釈されます。</p>
      <h3>10. お問い合わせ</h3>
      <p>本サービスに関するお問い合わせは、開発元（株式会社トンボロ）までご連絡ください。</p>
      <p>株式会社トンボロ<br>
      <a href="https://tombolo.jp/contact" target="_blank" rel="noopener noreferrer">https://tombolo.jp/contact</a></p>
    `
  }

  /**
   * 利用規約のセクション別情報を取得
   * @returns {Array} セクション情報の配列
   */
  get_terms_sections() {
    return [
      {
        id: 'introduction',
        title: '1. はじめに',
        summary: '本サービスの概要と利用規約の位置づけ'
      },
      {
        id: 'service',
        title: '2. サービスの提供',
        summary: '無保証での提供、自己責任での利用'
      },
      {
        id: 'data',
        title: '3. データの取り扱い',
        summary: '完全ローカル動作、データの保存場所'
      },
      {
        id: 'privacy',
        title: '4. プライバシー',
        summary: '個人情報非収集、ローカル処理'
      },
      {
        id: 'disclaimer',
        title: '5. 免責事項',
        summary: '損害・データ消失の免責'
      },
      {
        id: 'ip',
        title: '6. 知的財産権',
        summary: '投稿者の著作権、ソースコードの著作権'
      },
      {
        id: 'restrictions',
        title: '7. 利用制限',
        summary: '違法利用・権利侵害の禁止'
      },
      {
        id: 'changes',
        title: '8. 規約の変更',
        summary: '予告なしの変更可能性'
      },
      {
        id: 'law',
        title: '9. 準拠法',
        summary: '日本法準拠'
      },
      {
        id: 'contact',
        title: '10. お問い合わせ',
        summary: '株式会社トンボロへの連絡'
      }
    ]
  }

  /**
   * 利用規約への同意状態を確認
   * @returns {boolean} 同意している場合true
   */
  is_agreed() {
    const agreed_data = localStorage.getItem(this.STORAGE_KEY)

    if (!agreed_data) {
      return false
    }

    try {
      const data = JSON.parse(agreed_data)

      // バージョンが異なる場合は再同意が必要
      if (data.version !== this.TERMS_VERSION) {
        return false
      }

      return data.agreed === true
    } catch (error) {
      return false
    }
  }

  /**
   * 利用規約に同意
   * @returns {void}
   */
  agree() {
    const agreed_data = {
      agreed: true,
      version: this.TERMS_VERSION,
      agreed_at: new Date().toISOString()
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(agreed_data))
  }

  /**
   * 利用規約の同意を取り消し
   * @returns {void}
   */
  revoke_agreement() {
    localStorage.removeItem(this.STORAGE_KEY)
  }

  /**
   * 同意情報を取得
   * @returns {Object|null} 同意情報
   */
  get_agreement_info() {
    const agreed_data = localStorage.getItem(this.STORAGE_KEY)

    if (!agreed_data) {
      return null
    }

    try {
      return JSON.parse(agreed_data)
    } catch (error) {
      return null
    }
  }

  /**
   * 利用規約の要約を取得
   * @returns {string} 要約文
   */
  get_summary() {
    return ``
  }

  /**
   * 重要なポイントを取得
   * @returns {Array} 重要ポイントの配列
   */
  get_key_points() {
    return [
      'このアプリは完全にローカルで動作します。投稿データはブラウザ内のIndexedDBに、設定情報はlocalStorageに保存され、外部には送信されません。データはいつでも削除できます。',
      'このアプリは無保証です。ご自身の責任においてご利用ください。',
      'SMSデータのバックアップはご自身で行ってください。'
    ]
  }

  /**
   * 利用規約モーダル用のデータを取得
   * @returns {Object} モーダル用データ
   */
  get_modal_data() {
    return {
      title: 'KeePost 利用規約',
      content: this.get_terms_content(),
      summary: this.get_summary(),
      key_points: this.get_key_points(),
      sections: this.get_terms_sections(),
      version: this.TERMS_VERSION,
      updated_at: '2025年8月4日'
    }
  }
}

// シングルトンインスタンスをエクスポート
export const terms_service = new TermsService()
