# NicomView

ニコニコ生放送のコメントをリアルタイムに取得し、OBS のブラウザソースやブラウザで表示するデスクトップアプリ。プラグインで表示形式を追加できる。

## 仕組み

```
[ニコニコ生放送] → [nicomget] → [CommentManager] → [WebSocket :3940] → [プラグインオーバーレイ]
                                                   → [Express :3939]  → プラグイン静的配信
[設定 UI (React)] ←→ [IPC] ←→ [Electron メインプロセス] ←→ [PluginManager]
```

1. アプリを起動し、放送 ID（例: `lv123456789`）を入力して「接続」
2. メインウィンドウに表示されるプラグイン URL を OBS ブラウザソースやブラウザで開く
3. コメントがリアルタイムに表示される

## プラグインシステム

すべての表示形式はプラグインとして提供される。各プラグインは HTTP 経由で配信され、OBS ブラウザソースや通常のブラウザで表示できる。

### ビルトインプラグイン

| プラグイン | URL | 説明 |
|---|---|---|
| コメントリスト | `http://localhost:3939/plugins/comment-list/overlay/` | リスト形式（自動スクロール・200件上限） |
| 通知カード | `http://localhost:3939/plugins/comment-cards/overlay/` | 通知ポップアップ風のカード表示（右からスライドイン・自動退場） |

プラグイン一覧は `http://localhost:3939/` でも確認できる。

### イベントフィルタ

表示するイベント種別を設定で選択可能:

- コメント / ギフト / エモーション / 通知 / 運営コメント

### 外部プラグイン

`userData/plugins/` にプラグインディレクトリを配置すると自動で読み込まれる。

```
my-plugin/
├── plugin.json      # マニフェスト（必須）
├── overlay/         # オーバーレイファイル
│   └── index.html
└── settings/        # 設定画面（任意）
    └── index.html
```

**plugin.json の例:**

```json
{
  "id": "my-plugin",
  "name": "マイプラグイン",
  "version": "1.0.0",
  "description": "カスタム表示プラグイン",
  "overlay": true,
  "settings": true
}
```

`"settings": true` を指定すると、設定 UI に歯車アイコンが表示され `settings/index.html` が iframe で読み込まれる。設定画面は `postMessage` で親ウィンドウと通信する:

1. iframe が `{ type: 'nicomview:ready', pluginId }` を送信
2. 親が `{ type: 'nicomview:settings-init', settings }` で保存済み設定を返す
3. フォーム変更ごとに `{ type: 'nicomview:settings-update', pluginId, settings }` を送信

オーバーレイは WebSocket (`ws://localhost:3940`) に接続し、JSON メッセージ `{ "event": "comment", "data": { ... } }` を受信してコメントを描画する。

## 技術スタック

| 役割 | 技術 |
|---|---|
| デスクトップ | Electron 33 + electron-vite 5 |
| 設定 UI | React 18 + MUI 7 (Material Design 3) |
| プラグイン配信 | Express (HTTP :3939) + ws (WebSocket :3940) |
| コメント取得 | [nicomget](https://github.com/Segu-g/nicomget) |
| テスト | Vitest + Testing Library + Playwright (E2E) |
| ビルド | electron-builder |

## セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev
```

## スクリプト

```bash
npm run dev            # 開発モードで起動
npm run build          # プロダクションビルド
npm test               # テスト実行
npm run test:watch     # テスト (ウォッチモード)
npm run test:coverage  # カバレッジ付きテスト
npm run test:e2e       # E2E テスト
npm run package:win    # Windows 向けパッケージ (.exe)
npm run package:mac    # macOS 向けパッケージ (.dmg)
npm run package:linux  # Linux 向けパッケージ (.AppImage)
```

## プロジェクト構成

```
src/
├── shared/
│   └── types.ts                  # 共有型定義
├── main/
│   ├── index.ts                  # Electron メインプロセス
│   ├── server.ts                 # Express + WebSocket サーバー
│   ├── commentManager.ts         # nicomget 接続管理
│   └── pluginManager.ts          # プラグイン探索・設定管理
├── preload/
│   └── index.ts                  # contextBridge (IPC ブリッジ)
└── renderer/
    └── src/
        ├── App.tsx               # 設定 UI（接続・プラグインURL・イベントフィルタ）
        ├── main.tsx              # React エントリーポイント
        └── components/
            └── EventFilter.tsx   # イベントフィルタ UI

src/plugins/
├── hooks/                        # プラグイン共通フック
├── comment-list/
│   ├── main.tsx                  # オーバーレイエントリ
│   ├── CommentList.tsx           # コメントリスト表示
│   └── settings/                 # 設定画面（iframe で表示）
│       ├── index.html
│       ├── main.tsx
│       └── Settings.tsx
└── comment-cards/
    ├── main.tsx
    ├── CommentCards.tsx
    └── settings/
        ├── index.html
        ├── main.tsx
        └── Settings.tsx
```

## OBS の設定

1. ソースの追加 → **ブラウザ** を選択
2. URL にプラグインの URL を入力（例: `http://localhost:3939/plugins/comment-list/overlay/`）
3. 幅・高さを配信解像度に合わせる（例: 1920x1080）
4. **カスタム CSS** は空のままで OK（背景は自動で透過）

複数プラグインを同時に使用可能（例: コメントリスト + 通知カード）。

### プラグイン設定

各プラグインの歯車アイコンをクリックすると、プラグイン固有の設定画面が展開される。設定は `userData/plugin-settings.json` に永続化され、アプリ再起動後も保持される。

| 設定項目 | 対象 | デフォルト | 説明 |
|---|---|---|---|
| フォントサイズ (px) | 両方 | 28 | コメントの文字サイズ |
| テーマ | 両方 | ダーク | `dark` / `light` |
| 表示時間 (秒) | 通知カードのみ | 60 | カードが自動退場するまでの時間 |

設定値は URL パラメータとしてプラグイン URL に自動反映される（例: `?fontSize=24&theme=light`）。URL をコピーして OBS に貼れば設定済みの状態で表示される。

## リリース

`v*` タグをプッシュすると GitHub Actions が自動でビルド・リリースを作成する。

```bash
git tag v1.0.0
git push --tags
```

## 動作要件

- Node.js >= 18
- ポート 3939, 3940 が未使用であること

## ライセンス

MIT
