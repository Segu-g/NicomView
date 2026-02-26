# NicomView

ニコニコ生放送のコメントをリアルタイムに取得し、OBS のブラウザソースやブラウザで表示するデスクトップアプリ。プラグインで表示形式を追加できる。

## 仕組み

```
[ニコニコ生放送] → [nicomget] → [CommentManager] → [WebSocket :3940] → [プラグインオーバーレイ]
                                                   → [Express :3939]  → プラグイン静的配信
                                                   → [TtsManager]     → 音声読み上げ
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
| 通知カード | `http://localhost:3939/plugins/comment-cards/overlay/` | カード表示（コメント・ギフト・通知・エモーション・運営コメント対応、右からスライドイン・自動退場） |
| PSD アバター | `http://localhost:3939/plugins/psd-avatar/overlay/` | PSD ファイルを使った 2D アバター（目パチ・口パク・VOICEVOX リップシンク・OBSTool 命名規則対応） |

プラグイン一覧は `http://localhost:3939/` でも確認できる。

### イベントフィルタ

表示するイベント種別を設定で選択可能:

- コメント / ギフト / エモーション / 通知 / 運営コメント

### PSD アバタープラグイン

`http://localhost:3939/plugins/psd-avatar/settings/` で設定する。PSD ファイルを指定し、読み込んだレイヤーツリーで各レイヤーに役割（目フレーム 0〜4、口レベル 0〜4）を割り当てる。1 つのフレームに複数のレイヤーを同時割当可能。

**OBSTool 互換の命名規則**

PSD のレイヤー名・グループ名に以下のプレフィックス／サフィックスを付けると特殊な挙動になる:

| 記号 | 対象 | 効果 |
|---|---|---|
| `!名前` | レイヤー / グループ | **常時表示** — 設定 UI で非表示にできない |
| `*名前` | レイヤー / グループ | **ラジオボタン** — 同一親グループ内で 1 つのみ選択可 |
| `名前:flipx` | レイヤー / グループ | 左右反転が有効なときのみ表示（通常版を置き換え） |
| `名前:flipy` | レイヤー / グループ | 上下反転が有効なときのみ表示 |
| `名前:flipxy` | レイヤー / グループ | 両方向反転が有効なときのみ表示 |

`:flipx` レイヤーが有効な場合、対応するベースレイヤー（サフィックスなし）は自動で非表示になる。反転設定は設定 UI の「反転設定」セクションで切り替える。

**VOICEVOX リップシンク**

VOICEVOX が起動している状態でコメントが来ると自動で読み上げ、音声に合わせて口パクする。目パチは設定した間隔で自動発生する。

### 外部プラグイン

`userData/plugins/` にプラグインディレクトリを配置すると自動で読み込まれる。ビルトインプラグインも起動時に同フォルダへコピーされるため、「プラグインフォルダを開く」ボタンで一箇所から管理できる。

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

## 読み上げ (TTS)

コメントやギフトなどのイベントを音声で読み上げる機能。設定 UI の「読み上げ設定」で有効化・設定できる。

### 対応エンジン

| エンジン | 接続先 | 備考 |
|---|---|---|
| VOICEVOX | `http://localhost:50021` | キャラクター選択・イベント別キャラ上書き対応 |
| 棒読みちゃん | `http://localhost:50080` | RemoteTalk HTTP API 経由 |

### 設定項目

- **エンジン設定** — 読み上げエンジンの選択とエンジン固有パラメータ（キャラクターなど）
- **イベント設定** — 読み上げ対象イベントの選択、テンプレート編集、イベント別キャラクター上書き
- **音声調整** — 速度（0.5–2.0）・音量（0–2.0）

テンプレートではプレースホルダーが使用可能（例: `{userName}さん、{content}`）。設定は `userData/tts-settings.json` に永続化される。

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

# プラグインのビルド（初回必須）
npm run build:plugins

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
│   ├── pluginManager.ts          # プラグイン探索・設定管理
│   └── tts/
│       ├── ttsManager.ts         # TTS オーケストレーター・設定管理
│       ├── queue.ts              # 読み上げキュー（逐次再生・上限 30）
│       ├── formatter.ts          # イベント → テキスト変換
│       ├── types.ts              # TtsAdapter インターフェース
│       └── adapters/
│           ├── voicevox.ts       # VOICEVOX アダプター
│           └── bouyomichan.ts    # 棒読みちゃんアダプター
├── preload/
│   └── index.ts                  # contextBridge (IPC ブリッジ)
└── renderer/
    └── src/
        ├── App.tsx               # 設定 UI（接続・プラグインURL・イベントフィルタ・TTS）
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
├── comment-cards/
│   ├── main.tsx
│   ├── CommentCards.tsx
│   └── settings/
│       ├── index.html
│       ├── main.tsx
│       └── Settings.tsx
└── psd-avatar/
    ├── main.tsx                  # オーバーレイエントリ
    ├── PsdAvatar.tsx             # アバター描画（Canvas）
    ├── psdLoader.ts              # ag-psd による PSD パース
    ├── lipSync.ts                # 発話検出 + 開口/閉口アニメーション
    ├── ttsQueue.ts               # VOICEVOX 読み上げキュー
    ├── voicevoxClient.ts         # VOICEVOX REST API クライアント
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
git tag v1.3.0
git push --tags
```

## 動作要件

- Node.js >= 18
- ポート 3939, 3940 が未使用であること
- TTS を使う場合: VOICEVOX または棒読みちゃんが起動していること
- PSD アバタープラグインを使う場合: VOICEVOX が起動していること

## ライセンス

MIT
