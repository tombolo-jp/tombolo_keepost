<script>
  import { createEventDispatcher } from 'svelte'
  import { PostModel } from '../../models/post.js'

  export let post = {}

  const dispatch = createEventDispatcher()

  // PostModelインスタンスを作成
  const post_model = new PostModel(post)

  // SNS種別に応じたスタイルクラス
  const sns_class = `sns-${post.sns_type}`

  // 日付フォーマット
  const formatted_date = post_model.get_formatted_date('date')

  // KEEPトグル処理
  function handle_keep_toggle() {
    dispatch('keep-toggle', {
      post_id: post.id,
      is_kept: post.is_kept
    })
  }

  // 外部リンクを開く
  function open_original() {
    const url = post_model.generate_url()
    if (url && url !== '#' && url !== null) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  // 画像クリックで元の投稿を開く（Bluesky以外）
  function handle_media_click() {
    // Blueskyの場合はクリック無効
    if (post.sns_type === 'bluesky') {
      return
    }

    if (post.original_url) {
      window.open(post.original_url, '_blank', 'noopener,noreferrer')
    } else {
      open_original()
    }
  }

  // メディアタイプの判定
  $: has_media = post.media && post.media.length > 0
  $: media_type = has_media ? post_model.get_media_type() : null
  $: can_open_original = post.sns_type !== 'bluesky'

  // 画像リンクのラベルを生成
  function get_media_label(media_count) {
    // デバッグ用：実際の枚数を確認

    if (post.sns_type === 'bluesky') {
      return `画像 ${media_count}枚`
    } else {
      return `画像 ${media_count}枚 (クリックで表示)`
    }
  }

  // SNSアイコンのクラスを取得
  function get_sns_icon_class(sns_type) {
    switch(sns_type) {
      case 'twitter':
        return 'fa-brands fa-twitter'
      case 'bluesky':
        return 'fa-brands fa-bluesky'
      case 'mastodon':
        return 'fa-brands fa-mastodon'
      default:
        return 'fa-solid fa-share-nodes'
    }
  }

  // SNS表示名を取得
  function get_sns_display_name(sns_type) {
    switch(sns_type) {
      case 'twitter':
        return 'Twitter'
      case 'bluesky':
        return 'Bluesky'
      case 'mastodon':
        return 'Mastodon'
      default:
        return sns_type
    }
  }

  // 表示する著者名を取得
  function get_display_author_name() {
    // Blueskyのリポストで元の投稿者が分かっている場合
    if (post.sns_type === 'bluesky' && post.is_repost && post.sns_specific?.original_author) {
      return post.sns_specific.original_author
    }

    // Twitterの手動RTで元の投稿者が分かっている場合
    if (post.sns_type === 'twitter' && post.is_repost && post.sns_specific?.original_author) {
      return post.sns_specific.original_author
    }

    // authorオブジェクトから名前を取得
    if (post.author) {
      // nameが有効な値ならそれを使用
      if (post.author.name && post.author.name !== 'unknown' && post.author.name !== 'Twitter User') {
        return post.author.name
      }
      // usernameが有効な値ならそれを使用
      if (post.author.username && post.author.username !== 'unknown' && post.author.username !== 'twitter_user') {
        return post.author.username
      }
    }

    // フォールバック
    return 'unknown'
  }
</script>

<article class="post-item {sns_class}">
  <div class="post-header">
    <div class="post-meta">
      {#if post.is_repost}
        <span class="repost-indicator" title="リポスト">
          <i class="fas fa-retweet"></i>
        </span>
      {/if}
      <span class="author-name">
        <span class="sns-icon-wrapper">
          <i class="{get_sns_icon_class(post.sns_type)} sns-icon"></i>
          <span class="sns-name">{get_sns_display_name(post.sns_type)}</span>
        </span>
        {get_display_author_name()}
      </span>
      <span class="post-date">{formatted_date}</span>
    </div>

    <div class="post-metrics">
      {#if post.metrics.likes > 0}
        <span class="metric metric-likes">
          <i class="metric-icon fas fa-heart"></i>
          <span class="metric-value">{post.metrics.likes.toLocaleString()}</span>
        </span>
      {/if}

      {#if post.metrics.shares > 0}
        <span class="metric">
          <i class="metric-icon fas fa-retweet"></i>
          <span class="metric-value">{post.metrics.shares.toLocaleString()}</span>
        </span>
      {/if}

      {#if post.metrics.replies > 0}
        <span class="metric">
          <i class="metric-icon fas fa-comment"></i>
          <span class="metric-value">{post.metrics.replies.toLocaleString()}</span>
        </span>
      {/if}
    </div>

    {#if can_open_original}
      <div class="original-link-wrapper">
        <button
          class="original-link"
          on:click={open_original}
          title="元の投稿を見る"
        >
          <i class="link-icon fas fa-link"></i>
        </button>
      </div><!-- /.original-link-wrapper -->
    {/if}

    <div class="post-actions">
      <button
        class="keep-button"
        class:is-kept={post.is_kept}
        on:click={handle_keep_toggle}
        title={post.is_kept ? 'KEEPから削除' : 'KEEPに追加'}
        aria-label={post.is_kept ? 'KEEPから削除' : 'KEEPに追加'}
      >
        <i class="{post.is_kept ? 'fas' : 'far'} fa-star"></i>
      </button>
    </div>
  </div>

  <div class="post-content">
    <p class="post-text">{post.content}</p>

    {#if has_media}
      <div class="post-media">
        {#if media_type === 'photo'}
          <button
            class="media-indicator photo {post.sns_type === 'bluesky' ? 'disabled' : ''}"
            on:click={handle_media_click}
            title={post.sns_type === 'bluesky' ? '' : '画像を見る'}
            disabled={post.sns_type === 'bluesky'}
          >
            <i class="fas fa-image"></i> {get_media_label(post.media.length)}
          </button>
        {:else if media_type === 'video'}
          <button
            class="media-indicator video {post.sns_type === 'bluesky' ? 'disabled' : ''}"
            on:click={handle_media_click}
            title={post.sns_type === 'bluesky' ? '' : '動画を見る'}
            disabled={post.sns_type === 'bluesky'}
          >
            <i class="fas fa-video"></i> 動画 {post.sns_type === 'bluesky' ? '(リンクなし)' : '(クリックで表示)'}
          </button>
        {:else}
          <button
            class="media-indicator {post.sns_type === 'bluesky' ? 'disabled' : ''}"
            on:click={handle_media_click}
            title={post.sns_type === 'bluesky' ? '' : 'メディアを見る'}
            disabled={post.sns_type === 'bluesky'}
          >
            <i class="fas fa-paperclip"></i> メディア {post.sns_type === 'bluesky' ? '(リンクなし)' : '(クリックで表示)'}
          </button>
        {/if}
      </div>
    {/if}

    {#if post.urls && post.urls.length > 0}
      <div class="post-urls">
        {#each post.urls as url}
          <a
            href={url.expanded_url || url.url}
            target="_blank"
            rel="noopener noreferrer"
            class="post-link"
          >
            <i class="fas fa-link"></i> {url.display_url || url.expanded_url || url.url}
          </a>
        {/each}
      </div>
    {/if}

    {#if post.hashtags && post.hashtags.length > 0}
      <div class="post-hashtags">
        {#each post.hashtags as hashtag}
          <span class="hashtag">#{hashtag}</span>
        {/each}
      </div>
    {/if}
  </div>

</article>

<style>
  .post-item {
    border-bottom: 1px solid #e5e7eb;
    padding: 1.25rem;
    transition: background-color 0.2s;
    background-color: #fff;
  }

  /* SNS種別によるアクセントカラー */
  .post-item.sns-twitter {
    border-left: 3px solid #3B806B;
  }

  .post-item.sns-bluesky {
    border-left: 3px solid #00a8ff;
  }

  .post-item.sns-mastodon {
    border-left: 3px solid #6364ff;
  }

  .post-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 0.75rem;
    column-gap: 0.75rem;
  }

  .post-meta {
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
    color: #6b7280;
    font-size: 0.875rem;
  }

  .author-name {
    display: flex;
    flex-direction: column;
    font-weight: 600;
    color: #374151;
  }

  .sns-icon-wrapper {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-weight: normal;
    font-size: 0.75rem;
  }

  .sns-icon {
    font-size: 0.75rem;
    opacity: 0.5;
  }

  .sns-name {
    font-size: 0.75rem;
    opacity: 0.7;
  }

  /* SNS種別によるアイコンとテキストカラー */
  .sns-twitter .sns-icon,
  .sns-twitter .sns-name {
    color: #3B806B;
  }

  .sns-bluesky .sns-icon,
  .sns-bluesky .sns-name {
    color: #00a8ff;
  }

  .sns-mastodon .sns-icon,
  .sns-mastodon .sns-name {
    color: #6364ff;
  }

  .post-date {
    color: #9ca3af;
  }

  .repost-indicator {
    color: #10b981;
    font-size: 1.25rem;
    margin-right: 0.25rem;
    transform: translateY(-0.2rem);
  }

  .post-actions {
    display: flex;
    gap: 0.5rem;
  }

  .keep-button {
    position: relative;
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0;
    transition: transform 0.2s;
    color: #d1d5db;
    transform: translateY(-12px);
  }

  .keep-button::after {
    content: 'KEEP';
    position: absolute;
    display: table;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    line-height: 1;
    font-size: 10px;
    color: #d1d5db;
  }

  .keep-button:hover {
    transform: translateY(-12px)  scale(1.2);
  }

  .keep-button.is-kept {
    color: #f59e0b;
  }

  .keep-button.is-kept::after {
    color: #f59e0b;
  }

  .post-content {
    margin-bottom: 0.75rem;
  }

  .post-text {
    margin: 0 0 0.75rem 0;
    color: #1f2937;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .post-media {
    margin: 0.75rem 0;
  }

  .media-indicator {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.75rem;
    background: #f3f4f6;
    border: 1px solid transparent;
    border-radius: 4px;
    font-size: 0.875rem;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.2s;
  }

  .media-indicator:hover:not(.disabled) {
    border-color: #d1d5db;
    transform: translateY(-1px);
  }

  .media-indicator.disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .media-indicator.disabled:hover {
    transform: none;
    border-color: transparent;
  }

  .media-indicator.photo {
    background: #fef3c7;
    color: #92400e;
  }

  .media-indicator.video {
    background: #dbeafe;
    color: #1e40af;
  }

  .post-urls {
    margin: 0.75rem 0;
  }

  .post-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: #3b82f6;
    text-decoration: none;
    font-size: 0.875rem;
    margin-right: 1rem;
    word-break: break-all;
  }

  .post-link:hover {
    text-decoration: underline;
  }

  .post-hashtags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0.75rem 0;
  }

  .hashtag {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    background: #e0e7ff;
    color: #4338ca;
    border-radius: 4px;
    font-size: 0.875rem;
  }

  .post-metrics {
    display: flex;
    gap: 1rem;
  }

  .metric {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: #6b7280;
    font-size: 0.875rem;
  }

  @media (max-width: 768px) {
    .metric {
      font-size: 0.8125rem;
    }
  }

  .metric-icon {
    font-size: 1rem;
  }

  .metric-likes .metric-icon {
    color: #ffc0cb; /* 薄いピンク色 */
  }

  .original-link-wrapper {
    width: 100%;
  }

  .original-link {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.35rem;
    background: none;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    color: #6b7280;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .original-link:hover {
    background: #f3f4f6;
    border-color: #d1d5db;
    color: #374151;
  }

  .link-icon {
    font-size: 0.875rem;
  }

  /* レスポンシブ対応 */
  @media (max-width: 768px) {
    .post-item {
      padding: 1rem;
    }

    .post-meta {
      font-size: 0.8125rem;
    }

    .post-text {
      font-size: 0.9375rem;
    }

    .post-metrics {
      justify-content: space-between;
    }
  }
</style>
