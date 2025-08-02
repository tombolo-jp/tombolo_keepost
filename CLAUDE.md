# KeePost

## プロジェクト概要

KeePostは、複数のSNS（Twitter、Bluesky、Mastodon）のエクスポートデータをローカルブラウザで統合管理・閲覧・検索できるプライバシーファーストなWebアプリケーションです。

### 主な特徴

- **マルチSNS対応**: Twitter、Bluesky、Mastodonのデータを統一管理
- **完全ローカル動作**: すべてのデータはIndexedDBに保存され、外部サーバーとの通信は一切ありません
- **KEEP機能**: 気に入ったポストを保存・管理し、後で見返すことができます
- **大容量対応**: 10万件以上のポストでも快適に動作
- **フィルタリング**: 年月、SNS種別、メディアでの絞り込み
- **プライバシー保護**: データはブラウザ内で完結し、外部に送信されません

## 開発方針

### コーディングスタイル

- **命名規則**: snake_case（JavaScriptの慣例とは異なりますが、プロジェクト全体で統一）
- **コメント**: 最小限に留め、コードの自己文書化を重視
- **モジュール設計**: 単一責任の原則に基づく小さなモジュール

### アーキテクチャ

- **フロントエンド**: Svelte（リアクティブフレームワーク）
- **データ層**: IndexedDB（ブラウザ内データベース）
- **ビルドツール**: Vite（高速な開発環境）

## 主要機能

### マルチSNSデータインポート
- **Twitter**: `data/tweets.js`ファイル（JavaScript形式 `window.YTD.tweets.part0 = [...]`）
- **Bluesky**: `.car`ファイル（CARファイル形式）
- **Mastodon**: `outbox.json`ファイル（ActivityPub形式）
- SNS種別の自動判定とファイル形式別インポート処理
- プログレス表示とメモリ管理による安定したインポート
- 利用規約同意チェック機能

### 統一ポスト管理・検索・フィルタリング
- 複数SNSのポストを統一スキーマで管理
- 全文検索（日本語対応、SNS横断検索）
- SNS別フィルタリングによる表示切り替え
- 年月、SNS種別、メディアでのフィルタリング
- リアルタイムでの検索結果更新

### KEEP機能
- ポストの保存・管理機能

### データ管理
- IndexedDBによる永続化
- 統一ポストスキーマでのマルチSNSデータ管理
- インポート履歴の管理（SNS別）
- データのエクスポート・削除機能

## 技術的な課題と解決策

### 1. マルチSNS対応
**課題**: 異なるSNSの多様なデータ形式を統一的に管理
**解決策**:
- 統一ポストスキーマの設計と実装
- SNS別インポーターのプラグイン型アーキテクチャ
- 各SNS固有データの適切な変換とマッピング

### 2. 大容量ファイルの処理
**課題**: ブラウザのメモリ制限により、大きなファイル（1GB以上）の処理が困難
**解決策**:
- ファイル形式の最適化（Bluesky CARファイル等への対応）
- バッチ処理による段階的なデータ保存
- メモリ使用量の監視と警告機能

### 3. パフォーマンス
**課題**: 10万件以上のマルチSNSポストでの検索・表示速度
**解決策**:
- SNS別フィルタリングによる検索対象の絞り込み
- 仮想スクロールによる表示効率化
- 複合インデックスの活用

### 4. ユーザビリティ
**課題**: 複雑なマルチSNS機能の直感的な操作
**解決策**:
- フィルタリングによる明確なデータ絞り込み
- SNS種別の視覚的な識別（アイコン、色分け）
- KEEP機能の統合による使いやすさの向上

## 開発時の注意事項

- **メモリ制限**: ブラウザの制限を常に意識した実装
- **プライバシー**: 外部通信を行わないことを厳守
- **互換性**: 各SNSの最新エクスポート形式への対応
- **テスト**: 大量データでの動作確認を必須とする
- **拡張性**: 新しいSNSプラットフォームへの対応を考慮した設計

## 技術仕様詳細

### プロジェクト構造

```
tombolo_keepost/
├── src/
│   ├── main.js                 # エントリーポイント
│   ├── App.svelte              # ルートコンポーネント
│   └── lib/
│       ├── components/         # UIコンポーネント
│       │   ├── common/        # 共通コンポーネント
│       │   ├── filter/        # フィルター関連
│       │   ├── import/        # インポート関連
│       │   ├── layout/        # レイアウト関連
│       │   ├── pages/         # ページコンポーネント
│       │   └── post/          # ポスト表示関連
│       ├── db/                # データベース層
│       │   ├── database.js    # IndexedDB接続管理
│       │   └── migrations.js  # マイグレーション処理
│       ├── models/            # データモデル
│       │   └── post.js        # 統一ポストモデル
│       ├── repositories/      # データアクセス層
│       │   ├── post_repository.js
│       │   └── keep_repository.js
│       ├── services/          # ビジネスロジック層
│       │   ├── importers/     # SNS別インポーター
│       │   │   ├── base_importer.js
│       │   │   ├── twitter_importer.js
│       │   │   ├── bluesky_importer.js
│       │   │   └── mastodon_importer.js
│       │   ├── post_service.js
│       │   ├── search_service.js
│       │   ├── import_service.js
│       │   ├── keep_service.js
│       │   ├── router_service.js
│       │   └── storage_service.js
│       ├── stores/            # 状態管理（Svelte Store）
│       │   ├── post_store.js
│       │   ├── filter_store.js
│       │   ├── keep_store.js
│       │   ├── sns_store.js
│       │   └── ui_store.js
│       └── utils/             # ユーティリティ
│           ├── date_utils.js
│           ├── memory_monitor.js
│           ├── error_handler.js
│           └── debug.js
├── css/                       # スタイルシート
├── dist/                      # ビルド出力
├── index.html                 # HTMLエントリーポイント
├── vite.config.js            # Vite設定
└── package.json              # プロジェクト設定
```

### データベース仕様（IndexedDB）

#### データベース名: `KEEPOST_DB`
#### バージョン: 6

#### テーブル構成

##### 1. posts（ポストテーブル）
- **インデックス**: 
  - `id` (主キー)
  - `sns_type`
  - `created_at`
  - `year_month`
  - `is_kept`
  - `[sns_type+created_at]` (複合インデックス)
  - `[sns_type+year_month]` (複合インデックス)

##### 2. keep_items（KEEPアイテムテーブル）
- **インデックス**:
  - `post_id` (主キー)
  - `kept_at`
  - `sns_type`

##### 3. sns_accounts（SNSアカウントテーブル）
- **インデックス**:
  - `id` (主キー)
  - `sns_type`
  - `username`

##### 4. settings（設定テーブル）
- **インデックス**:
  - `key` (主キー)

### 統一ポストスキーマ（PostModel）

```javascript
{
  id: String,              // ユニークID（SNS_type + original_id）
  sns_type: String,        // 'twitter' | 'bluesky' | 'mastodon'
  original_id: String,     // 元のSNSでのID
  text: String,           // ポスト本文
  created_at: Date,       // 作成日時
  year_month: String,     // YYYY-MM形式
  username: String,       // ユーザー名
  display_name: String,   // 表示名
  user_id: String,        // ユーザーID
  url: String,           // 元のURL
  is_reply: Boolean,      // リプライフラグ
  is_retweet: Boolean,    // リツイート/ブーストフラグ
  is_kept: Boolean,       // KEEP済みフラグ
  media: Array,          // メディア情報配列
  hashtags: Array,       // ハッシュタグ配列
  mentions: Array,       // メンション配列
  retweet_count: Number, // リツイート数
  favorite_count: Number, // いいね数
  reply_count: Number,   // リプライ数
  language: String,      // 言語コード
  raw_data: Object      // 元データ（参照用）
}
```

### SNS別インポーター実装

#### 基底クラス（BaseImporter）
- **主要メソッド**:
  - `import_data()`: データインポートのエントリーポイント
  - `import_data_with_diff()`: 差分インポート処理
  - `validate_file()`: ファイル検証
  - `transform_to_unified_schema()`: 統一スキーマへの変換（抽象メソッド）
  - `process_posts_in_batches()`: バッチ処理によるメモリ効率化
  - `filter_duplicates()`: 重複チェック
  - `check_memory_safety()`: メモリ使用量監視

#### TwitterImporter
- **対応形式**: 
  - JavaScript形式（`window.YTD.tweets.part0 = [...]`）
  - JSON形式
- **特徴**:
  - ツイートオブジェクトの`tweet`プロパティ内にデータが格納
  - 日付形式の独自パース処理
  - リツイート判定（`retweeted_status`フィールド）

#### BlueskyImporter
- **対応形式**:
  - CARファイル（IPLD CAR形式）
  - JSONファイル
- **特徴**:
  - AT Protocol準拠のデータ構造
  - facets（リンク、メンション等）の解析
  - embed（引用、画像等）の処理
  - CID（Content Identifier）による重複管理

#### MastodonImporter
- **対応形式**:
  - ActivityPub形式（`outbox.json`）
- **特徴**:
  - Activity/Object構造の解析
  - HTMLコンテンツのプレーンテキスト変換
  - ブースト（Announce）の処理
  - actor URLからのユーザー名抽出

### 状態管理（Svelte Store）

#### post_store
- **役割**: ポスト一覧の管理
- **主要機能**:
  - ページネーション管理
  - 検索結果の保持
  - フィルタリング状態の反映
  - リアルタイム更新

#### filter_store
- **役割**: フィルター条件の管理
- **管理項目**:
  - SNS種別フィルター
  - 年月フィルター
  - メディアフィルター
  - KEEP済みフィルター
  - 言語フィルター
- **統計情報**:
  - SNS別ポスト数
  - 月別ポスト数
  - 総ポスト数

#### keep_store
- **役割**: KEEP機能の管理
- **主要機能**:
  - KEEPアイテムの追加/削除
  - KEEP統計の管理
  - KEEPフィルタリング

#### ui_store
- **役割**: UI状態の管理
- **管理項目**:
  - アクティブタブ
  - ローディング状態
  - 通知メッセージ
  - モーダル表示
  - メモリ警告

#### sns_store
- **役割**: SNSアカウント情報の管理
- **管理項目**:
  - インポート済みSNSアカウント
  - 各SNSの最終インポート日時

### サービス層

#### PostService
- **責務**: ポストデータのCRUD操作
- **主要機能**:
  - ポスト検索（全文検索、フィルタリング）
  - 統計情報の集計
  - インポート履歴管理
  - データ削除

#### SearchService
- **責務**: 高度な検索機能の提供
- **主要機能**:
  - 全文検索（日本語対応）
  - 高度な検索（AND/OR/NOT）
  - 検索結果のキャッシング
  - サジェスト機能
  - ソート処理

#### ImportService
- **責務**: データインポートの統括
- **主要機能**:
  - SNS種別の自動判定
  - インポーター選択
  - プログレス管理
  - エラーハンドリング

#### RouterService
- **責務**: SPAルーティング
- **主要機能**:
  - History API管理
  - ページ遷移処理
  - URLパス管理
  - ベースパス対応（`/keepost/`）

#### StorageService
- **責務**: ストレージ管理
- **主要機能**:
  - IndexedDB容量監視
  - データエクスポート
  - バックアップ/リストア

### パフォーマンス最適化

#### メモリ管理
- **バッチ処理**: 1000件単位でのデータ処理
- **メモリ監視**: `memory_monitor`による使用量追跡
- **警告表示**: メモリ使用率70%で警告

#### 検索最適化
- **インデックス活用**: 複合インデックスによる高速検索
- **キャッシング**: 検索結果の5分間キャッシュ
- **遅延ローディング**: スクロールに応じた段階的読み込み

#### レンダリング最適化
- **仮想スクロール**: 大量ポストの効率的表示
- **Svelteリアクティビティ**: 必要最小限の再描画
- **バッチ更新**: 複数更新のまとめ処理

### ビルド設定（Vite）

- **フレームワーク**: Svelte 4.2.0
- **ビルドツール**: Vite 5.0.0
- **CSS処理**: Sass対応
- **本番環境パス**: `/keepost/`
- **開発サーバー**: ポート8080

### 依存ライブラリ

- **@ipld/car**: Bluesky CARファイル処理
- **@ipld/dag-cbor**: IPLD CBOR形式のデコード
- **date-fns**: 日付処理ユーティリティ
- **dexie**: IndexedDBラッパー
- **svelte**: リアクティブUIフレームワーク
- **sweetalert2**: モーダル/アラート表示

### セキュリティ考慮事項

- **CSP対応**: 外部リソース読み込み制限
- **XSS対策**: HTMLサニタイズ処理
- **ローカル完結**: 外部サーバーとの通信なし
- **データ検証**: インポート時の厳格な検証
