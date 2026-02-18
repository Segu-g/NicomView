# NicomView

ニコニコ生放送のコメントをリアルタイムに取得し、OBS のブラウザソースに表示するデスクトップアプリ。メインウィンドウでもコメントを確認できる。

## 仕組み

```
[ニコニコ生放送] → [nicomget] → [CommentManager] → [WebSocket :3940] → [OBS オーバーレイプラグイン]
                                                   → [Express :3939]  → プラグイン静的配信
                                                   → [IPC]           → レンダラープラグイン
[設定 UI (React)] ←→ [IPC] ←→ [Electron メインプロセス] ←→ [PluginManager]
```

1. アプリを起動し、放送 ID（例: `lv123456789`）を入力して「接続」
2. メインウィンドウの MD3 コメントリストにコメントが表示される
3. OBS のブラウザソースに `http://localhost:3939` を設定するとニコニコ風スクロール表示

## プラグインシステム

表示方式をプラグインで差し替え可能。レンダラー（メインウィンドウ）とオーバーレイ（OBS）それぞれ独立に選択できる。

### ビルトインプラグイン

| プラグイン | 種別 | 説明 |
|---|---|---|
| MD3 コメントリスト | レンダラー | MUI リスト形式でコメント表示（自動スクロール・200件上限） |
| ニコニコ風スクロール | オーバーレイ | 右から左に流れるニコニコ風コメント（OBS 用） |

### イベントフィルタ

表示するイベント種別を設定で選択可能:

- コメント / ギフト / エモーション / 通知 / 運営コメント

### 外部プラグイン

`userData/plugins/` にプラグインディレクトリを配置すると自動で読み込まれる。

```
my-plugin/
├── plugin.json      # マニフェスト（必須）
├── renderer.js      # レンダラーエントリ（renderer: true の場合）
└── overlay/         # オーバーレイファイル（overlay: true の場合）
    └── index.html
```

**plugin.json の例:**

```json
{
  "id": "my-plugin",
  "name": "マイプラグイン",
  "version": "1.0.0",
  "description": "カスタム表示プラグイン",
  "renderer": true,
  "overlay": false
}
```

## 技術スタック

| 役割 | 技術 |
|---|---|
| デスクトップ | Electron 33 + electron-vite 5 |
| 設定 UI | React 18 + MUI 7 (Material Design 3) |
| OBS 配信 | Express (HTTP :3939) + ws (WebSocket :3940) |
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
        ├── App.tsx               # メイン UI
        ├── main.tsx              # React エントリーポイント
        ├── components/
        │   ├── PluginHost.tsx     # プラグインマウント・ライフサイクル管理
        │   ├── PluginSelector.tsx # プラグイン選択 UI
        │   └── EventFilter.tsx   # イベントフィルタ UI
        └── plugins/
            └── md3-comment-list/
                └── renderer.tsx  # MD3 コメントリストプラグイン

resources/plugins/
├── md3-comment-list/
│   └── plugin.json
└── nico-scroll/
    ├── plugin.json
    └── overlay/
        ├── index.html            # OBS ブラウザソース用画面
        └── overlay.js            # WebSocket 受信・コメント描画
```

## OBS の設定

1. ソースの追加 → **ブラウザ** を選択
2. URL に `http://localhost:3939` を入力
3. 幅・高さを配信解像度に合わせる（例: 1920x1080）
4. **カスタム CSS** は空のままで OK（背景は自動で透過）

### コメントのカスタマイズ

`resources/plugins/nico-scroll/overlay/index.html` の CSS カスタムプロパティで調整可能:

```css
:root {
  --comment-size: 32px;       /* フォントサイズ */
  --comment-color: #ffffff;   /* 文字色 */
  --comment-speed: 5s;        /* 流れる速度 */
  --comment-font: 'Yu Gothic', 'Hiragino Sans', sans-serif;
}
```

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
