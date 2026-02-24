import { Layout } from '../components/Layout'

export function PluginDevPage() {
  return (
    <Layout title="プラグイン開発">
      <h1>プラグイン開発</h1>

      <section>
        <h2>概要</h2>
        <p>
          NicomView
          のすべての表示形式はプラグインとして提供されます。各プラグインは HTTP
          経由で配信され、OBS
          ブラウザソースや通常のブラウザで表示できます。
        </p>
        <p>
          外部プラグインを作成して <code>userData/plugins/</code>{' '}
          に配置すれば、自動で読み込まれます。
        </p>
      </section>

      <section>
        <h2>ディレクトリ構成</h2>
        <pre>
          <code>{`my-plugin/
├── plugin.json      # マニフェスト（必須）
├── overlay/         # オーバーレイファイル
│   └── index.html
└── settings/        # 設定画面（任意）
    └── index.html`}</code>
        </pre>
      </section>

      <section>
        <h2>plugin.json リファレンス</h2>
        <pre>
          <code>{`{
  "id": "my-plugin",
  "name": "マイプラグイン",
  "version": "1.0.0",
  "description": "カスタム表示プラグイン",
  "overlay": true,
  "settings": true
}`}</code>
        </pre>

        <table>
          <thead>
            <tr><th>フィールド</th><th>型</th><th>必須</th><th>説明</th></tr>
          </thead>
          <tbody>
            <tr><td><code>id</code></td><td>string</td><td>&#10003;</td><td>プラグインの一意な識別子</td></tr>
            <tr><td><code>name</code></td><td>string</td><td>&#10003;</td><td>表示名</td></tr>
            <tr><td><code>version</code></td><td>string</td><td>&#10003;</td><td>バージョン（semver 推奨）</td></tr>
            <tr><td><code>description</code></td><td>string</td><td></td><td>プラグインの説明</td></tr>
            <tr><td><code>overlay</code></td><td>boolean</td><td>&#10003;</td><td>オーバーレイを提供するかどうか</td></tr>
            <tr><td><code>defaultFontSize</code></td><td>number</td><td></td><td>デフォルトのフォントサイズ (px)</td></tr>
            <tr><td><code>settings</code></td><td>boolean</td><td></td><td>設定画面を提供するかどうか</td></tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>WebSocket プロトコル</h2>
        <p>
          オーバーレイは <code>ws://localhost:3940</code> に接続し、JSON
          メッセージを受信してコメントを描画します。
        </p>

        <h3>メッセージ形式</h3>
        <pre>
          <code>{`{
  "event": "comment" | "gift" | "emotion" | "notification" | "operatorComment",
  "data": { ... }
}`}</code>
        </pre>

        <h3>イベント型とデータスキーマ</h3>

        <h4>comment</h4>
        <pre>
          <code>{`{
  "event": "comment",
  "data": {
    "content": "コメントテキスト",
    "userName": "ユーザー名",
    "userIconUrl": "https://..."
  }
}`}</code>
        </pre>

        <h4>gift</h4>
        <pre>
          <code>{`{
  "event": "gift",
  "data": {
    "content": "ギフトメッセージ",
    "userName": "ユーザー名",
    "userIconUrl": "https://...",
    "itemName": "ギフト名",
    "itemCount": 1
  }
}`}</code>
        </pre>

        <h4>emotion</h4>
        <pre>
          <code>{`{
  "event": "emotion",
  "data": { "content": "エモーション名" }
}`}</code>
        </pre>

        <h4>notification</h4>
        <pre>
          <code>{`{
  "event": "notification",
  "data": { "message": "通知メッセージ" }
}`}</code>
        </pre>

        <h4>operatorComment</h4>
        <pre>
          <code>{`{
  "event": "operatorComment",
  "data": {
    "content": "運営コメントテキスト",
    "userName": "運営"
  }
}`}</code>
        </pre>

        <h3>接続の実装例</h3>
        <pre>
          <code>{`const ws = new WebSocket('ws://localhost:3940')

ws.addEventListener('message', (event) => {
  const { event: type, data } = JSON.parse(event.data)

  switch (type) {
    case 'comment':
      // data.content, data.userName, data.userIconUrl
      break
    case 'gift':
      // data.content, data.userName, data.itemName, data.itemCount
      break
    case 'notification':
      // data.message
      break
    // ...
  }
})`}</code>
        </pre>
      </section>

      <section>
        <h2>設定画面の postMessage プロトコル</h2>
        <p>
          <code>"settings": true</code> を指定すると、設定 UI
          に歯車アイコンが表示され <code>settings/index.html</code> が iframe
          で読み込まれます。
        </p>

        <h3>通信フロー</h3>
        <ol className="steps">
          <li>
            <strong>iframe が ready を送信</strong>
            <pre>
              <code>{`window.parent.postMessage({
  type: 'nicomview:ready',
  pluginId: 'my-plugin'
}, '*')`}</code>
            </pre>
          </li>
          <li>
            <strong>親が保存済み設定を返す</strong>
            <pre>
              <code>{`// 受信メッセージ
{
  type: 'nicomview:settings-init',
  settings: { fontSize: 28, theme: 'dark' }
}`}</code>
            </pre>
          </li>
          <li>
            <strong>フォーム変更ごとに update を送信</strong>
            <pre>
              <code>{`window.parent.postMessage({
  type: 'nicomview:settings-update',
  pluginId: 'my-plugin',
  settings: { fontSize: 24, theme: 'light' }
}, '*')`}</code>
            </pre>
          </li>
        </ol>

        <div className="note">
          <strong>注意:</strong> 設定値は URL
          パラメータとしてプラグイン URL に自動反映されます（例:{' '}
          <code>?fontSize=24&amp;theme=light</code>
          ）。オーバーレイ側では URL パラメータから設定を読み取ります。
        </div>
      </section>

      <section>
        <h2>外部プラグインのインストール</h2>
        <ol>
          <li>
            プラグインディレクトリを <code>userData/plugins/</code> に配置します
          </li>
          <li>アプリを再起動すると自動で読み込まれます</li>
          <li>設定 UI のプラグインセクションに表示されます</li>
        </ol>
        <div className="note">
          <strong>ヒント:</strong> <code>userData</code> のパスは OS
          によって異なります。
          <ul>
            <li>Windows: <code>%APPDATA%/nicomview/</code></li>
            <li>macOS: <code>~/Library/Application Support/nicomview/</code></li>
            <li>Linux: <code>~/.config/nicomview/</code></li>
          </ul>
        </div>
      </section>
    </Layout>
  )
}
