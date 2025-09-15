// TwilogImporterの単体テスト
import { TwilogImporter } from './twilog_importer.js'

// テスト用のCSVデータ
const test_csv_data = `"ID","URL","日時","本文","1"
"1234567890","https://twitter.com/testuser/status/1234567890","2024/01/15 12:34:56","これはテストツイートです #test @mention","1"
"9876543210","https://twitter.com/testuser/status/9876543210","2024/01/14 10:20:30","テスト2 https://t.co/abc123","1"`

// テスト用のShift-JISデータ（実際にはバイナリ）
const test_sjis_data = new Uint8Array([0x83, 0x65, 0x83, 0x58, 0x83, 0x67]) // "テスト" in Shift-JIS

describe('TwilogImporter', () => {
  let importer
  
  beforeEach(() => {
    importer = new TwilogImporter()
  })
  
  describe('CSV解析', () => {
    it('CSV行を正しく解析できること', () => {
      const line = '"123","https://example.com","2024/01/15","テキスト","1"'
      const result = importer.parse_csv_line(line)
      
      expect(result).toEqual([
        '123',
        'https://example.com',
        '2024/01/15',
        'テキスト',
        '1'
      ])
    })
    
    it('エスケープされたダブルクォートを処理できること', () => {
      const line = '"123","text with ""quotes""","2024/01/15","normal","1"'
      const result = importer.parse_csv_line(line)
      
      expect(result[1]).toBe('text with "quotes"')
    })
    
    it('カンマを含むテキストを処理できること', () => {
      const line = '"123","text, with, commas","2024/01/15","normal","1"'
      const result = importer.parse_csv_line(line)
      
      expect(result[1]).toBe('text, with, commas')
    })
  })
  
  describe('parse_csv_content', () => {
    it('CSVコンテンツを正しく解析できること', async () => {
      const posts = await importer.parse_csv_content(test_csv_data)
      
      expect(posts).toHaveLength(2)
      expect(posts[0]).toEqual({
        id: '1234567890',
        url: 'https://twitter.com/testuser/status/1234567890',
        created_at: '2024/01/15 12:34:56',
        text: 'これはテストツイートです #test @mention'
      })
    })
    
    it('ヘッダー行をスキップすること', async () => {
      const posts = await importer.parse_csv_content(test_csv_data)
      
      // ヘッダー行がスキップされて、データ行のみが返される
      expect(posts.every(post => post.id !== 'ID')).toBe(true)
    })
  })
  
  describe('日付解析', () => {
    it('Twilog形式の日付を正しく解析できること', () => {
      const date = importer.parse_twilog_date('2024/01/15 12:34:56')
      
      expect(date instanceof Date).toBe(true)
      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(0) // 0-indexed
      expect(date.getDate()).toBe(15)
    })
    
    it('不正な日付の場合は現在日時を返すこと', () => {
      const date = importer.parse_twilog_date('invalid date')
      
      expect(date instanceof Date).toBe(true)
      // 現在日時に近い値であることを確認
      expect(Math.abs(date.getTime() - Date.now())).toBeLessThan(1000)
    })
  })
  
  describe('URL解析', () => {
    it('URLからユーザー名を抽出できること', () => {
      const username = importer.extract_username_from_url(
        'https://twitter.com/testuser/status/1234567890'
      )
      
      expect(username).toBe('testuser')
    })
    
    it('不正なURLの場合はnullを返すこと', () => {
      const username = importer.extract_username_from_url('https://example.com')
      
      expect(username).toBeNull()
    })
  })
  
  describe('テキスト解析', () => {
    it('ハッシュタグを抽出できること', () => {
      const hashtags = importer.extract_hashtags_from_text(
        'これは #test と #example のツイートです'
      )
      
      expect(hashtags).toHaveLength(2)
      expect(hashtags[0].text).toBe('test')
      expect(hashtags[1].text).toBe('example')
    })
    
    it('メンションを抽出できること', () => {
      const mentions = importer.extract_mentions_from_text(
        '@user1 と @user2 にメンション'
      )
      
      expect(mentions).toHaveLength(2)
      expect(mentions[0].screen_name).toBe('user1')
      expect(mentions[1].screen_name).toBe('user2')
    })
    
    it('URLを抽出できること', () => {
      const urls = importer.extract_urls_from_text(
        'リンク: https://example.com と http://test.org'
      )
      
      expect(urls).toHaveLength(2)
      expect(urls[0].url).toBe('https://example.com')
      expect(urls[1].url).toBe('http://test.org')
    })
  })
  
  describe('文字コード検証', () => {
    it('UTF-8ファイルを受け入れること', async () => {
      const file = new File([test_csv_data], 'test.csv', { type: 'text/csv' })
      const result = await importer.validate_charset(file)
      
      expect(result.is_valid).toBe(true)
    })
    
    it('Shift-JISファイルを拒否すること', async () => {
      const file = new File([test_sjis_data], 'test.csv', { type: 'text/csv' })
      const result = await importer.validate_charset(file)
      
      expect(result.is_valid).toBe(false)
      expect(result.error).toContain('UTF8')
    })
  })
  
  describe('ファイル検証', () => {
    it('CSVファイルを受け入れること', async () => {
      const file = new File(['test'], 'test.csv', { type: 'text/csv' })
      const result = await importer.validate_file(file)
      
      expect(result.is_valid).toBe(true)
    })
    
    it('CSV以外のファイルを拒否すること', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' })
      const result = await importer.validate_file(file)
      
      expect(result.is_valid).toBe(false)
      expect(result.error).toContain('CSV')
    })
    
    it('500MB以上のファイルを拒否すること', async () => {
      // 大きなファイルサイズをシミュレート
      const file = new File([''], 'test.csv', { type: 'text/csv' })
      Object.defineProperty(file, 'size', { value: 600 * 1024 * 1024 })
      
      const result = await importer.validate_file(file)
      
      expect(result.is_valid).toBe(false)
      expect(result.error).toContain('500MB')
    })
  })
  
  describe('統一スキーマ変換', () => {
    it('Twilogデータを統一スキーマに変換できること', () => {
      const raw_post = {
        id: '1234567890',
        url: 'https://twitter.com/testuser/status/1234567890',
        created_at: '2024/01/15 12:34:56',
        text: 'テストツイート #test @mention'
      }
      
      const result = importer.transform_to_unified_schema(raw_post)
      
      expect(result.id).toBe('twitter_1234567890')
      expect(result.sns_type).toBe('twitter')
      expect(result.content).toContain('テストツイート')
      expect(result.author.username).toBe('testuser')
      expect(result.sns_specific.import_source).toBe('twilog')
    })
    
    it('エラー時でも最小限のデータを返すこと', () => {
      const raw_post = {} // 不完全なデータ
      
      const result = importer.transform_to_unified_schema(raw_post)
      
      expect(result.sns_type).toBe('twitter')
      expect(result.sns_specific.import_source).toBe('twilog')
    })
  })
})