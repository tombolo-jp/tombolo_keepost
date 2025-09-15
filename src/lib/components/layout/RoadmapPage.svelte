<style>
    .roadmap-container {
        padding: 0 1rem;
        max-width: 800px;
        margin: 0 auto;
    }

    h1 {
        font-size: 2rem;
        font-weight: bold;
        margin-bottom: 2rem;
        text-align: center;
        color: #333;
    }

    .section {
        margin-bottom: 3rem;
    }

    h2 {
        font-size: 1.5rem;
        font-weight: bold;
        margin-bottom: 1rem;
        color: #555;
        border-bottom: 2px solid #e0e0e0;
        padding-bottom: 0.5rem;
    }

    .feature-list {
        list-style: none;
        padding: 0;
    }

    .feature-item {
        padding: 1rem;
        margin-bottom: 1rem;
        background: #f8f9fa;
        border-radius: 8px;
        border-left: 4px solid #3B806B;
    }

    .feature-title {
        font-weight: bold;
        margin-bottom: 0.5rem;
        color: #333;
    }

    .feature-description {
        color: #666;
        line-height: 1.6;
    }

    .status-badge {
        display: inline-block;
        padding: 0.2rem 0.6rem;
        border-radius: 4px;
        font-size: 0.85rem;
        font-weight: bold;
        margin-left: 0.5rem;
    }

    .status-development {
        background: #cbf1d0;
        color: #097b1a;
    }

    .status-planned {
        background: #e3f2fd;
        color: #1976d2;
    }

    .status-consideration {
        background: #ffecd9;
        color: #f65e23;
    }

</style>

<div class="roadmap-container">
    <h1>開発ロードマップ</h1>

    <div class="section">
        <ul class="feature-list">

            <li class="feature-item">
                <div class="feature-title">
                    オープンソース化
                    <span class="status-badge status-planned">計画中</span>
                </div>
                <div class="feature-description">
                    利用者ご自身の環境でKeePostを利用できるように、オープンソース化の予定です。
                </div>
            </li>

            <li class="feature-item">
                <div class="feature-title">
                    ダークモード対応
                    <span class="status-badge status-planned">計画中</span>
                </div>
            </li>

            <li class="feature-item">
                <div class="feature-title">
                    対応SNSの追加
                    <span class="status-badge status-consideration">検討中</span>
                </div>
                <div class="feature-description">
                    Misskey、Threadsへの対応を検討しています。
                </div>
            </li>

        </ul>
    </div>
</div>
