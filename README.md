# KeePost

KeePostは、SNSのエクスポートデータをローカルで閲覧・検索できるWebアプリケーションです。データはすべてブラウザのIndexedDBに保存されるため、ポータビリティとプライバシー保護に優れています。

## 主な機能

- **マルチSNS対応**: Twitter、Bluesky、Mastodonのエクスポートデータをインポートできます。
- **ローカルで動作**: すべてのデータはブラウザ内に保存されます。外部サーバーとの通信はありません。
- **高速検索**: 日本語対応の全文検索で、大量のポストも快適に検索。
- **KEEP機能**: お気に入りのポストを保存し、あとで見返すことが可能です。
- **高度なフィルタリング**: SNSの種類、年月など、複数条件での絞り込み表示ができます。

## 動作環境

- モダンブラウザ（Chrome、Firefox、Safari、Edge）
- Node.js 22以上（開発環境の構築時に利用）
- 十分なディスク容量（インポートするデータサイズに依存）

## セットアップ手順

### 開発環境での起動（npm run dev）

#### 1. Node.jsのインストール

1. Node.js最新のLTS版をダウンロード
2. インストーラーを実行してインストール
3. ターミナル（コマンドプロンプト）でバージョンを確認：
   ```bash
   node --version  # v22以上であることを確認
   npm --version   # npmが利用できることを確認
   ```

#### 2. プロジェクトのセットアップ

```bash
# リポジトリをクローン
git clone https://github.com/tombolo-jp/tombolo_keepost.git
cd tombolo_keepost

# 依存パッケージをインストール
npm install
```

#### 3. 開発サーバーの起動

```bash
# 開発サーバーを起動（ポート8080）
npm run dev
```

ブラウザが自動的に開き、`http://localhost:8080`でアプリケーションが起動します。

### 本番環境へのデプロイ（npm run build）

#### 1. Node.jsのインストール（ビルド環境）

上記「開発環境での起動」のNode.jsインストール手順と同じです。

#### 2. プロジェクトのセットアップとビルド

```bash
# リポジトリをクローン
git clone https://github.com/tombolo-jp/tombolo_keepost.git
cd tombolo_keepost

# 依存パッケージをインストール
npm install

# 本番用ビルドを実行
npm run build
```

ビルドが完了すると、`dist`ディレクトリに本番環境用ファイルが生成されます。
ご自身のサーバーに設置してKeePostを利用可能となります。

### デプロイ後に画面が表示されない場合

1. ブラウザの開発者ツール（F12）でコンソールエラーを確認
2. ネットワークタブで404エラーが出ていないか確認
3. `vite.config.js`のbaseパス設定が正しいか確認

## ライセンス

GPL v3 - 詳細は[LICENSE](LICENSE)ファイルを参照してください。

## お問い合わせ

バグ報告や機能要望は[Issues](https://github.com/tombolo-jp/tombolo_keepost/issues)にお願いします。
