import{j as e,L as s,c as n}from"./style.js";function i(){return e.jsxs(s,{title:"プラグイン開発",children:[e.jsx("h1",{children:"プラグイン開発"}),e.jsxs("section",{children:[e.jsx("h2",{children:"概要"}),e.jsx("p",{children:"NicomView のすべての表示形式はプラグインとして提供されます。各プラグインは HTTP 経由で配信され、OBS ブラウザソースや通常のブラウザで表示できます。"}),e.jsxs("p",{children:["外部プラグインを作成して ",e.jsx("code",{children:"userData/plugins/"})," ","に配置すれば、自動で読み込まれます。"]})]}),e.jsxs("section",{children:[e.jsx("h2",{children:"ディレクトリ構成"}),e.jsx("pre",{children:e.jsx("code",{children:`my-plugin/
├── plugin.json      # マニフェスト（必須）
├── overlay/         # オーバーレイファイル
│   └── index.html
└── settings/        # 設定画面（任意）
    └── index.html`})})]}),e.jsxs("section",{children:[e.jsx("h2",{children:"plugin.json リファレンス"}),e.jsx("pre",{children:e.jsx("code",{children:`{
  "id": "my-plugin",
  "name": "マイプラグイン",
  "version": "1.0.0",
  "description": "カスタム表示プラグイン",
  "overlay": true,
  "settings": true
}`})}),e.jsxs("table",{children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"フィールド"}),e.jsx("th",{children:"型"}),e.jsx("th",{children:"必須"}),e.jsx("th",{children:"説明"})]})}),e.jsxs("tbody",{children:[e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("code",{children:"id"})}),e.jsx("td",{children:"string"}),e.jsx("td",{children:"✓"}),e.jsx("td",{children:"プラグインの一意な識別子"})]}),e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("code",{children:"name"})}),e.jsx("td",{children:"string"}),e.jsx("td",{children:"✓"}),e.jsx("td",{children:"表示名"})]}),e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("code",{children:"version"})}),e.jsx("td",{children:"string"}),e.jsx("td",{children:"✓"}),e.jsx("td",{children:"バージョン（semver 推奨）"})]}),e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("code",{children:"description"})}),e.jsx("td",{children:"string"}),e.jsx("td",{}),e.jsx("td",{children:"プラグインの説明"})]}),e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("code",{children:"overlay"})}),e.jsx("td",{children:"boolean"}),e.jsx("td",{children:"✓"}),e.jsx("td",{children:"オーバーレイを提供するかどうか"})]}),e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("code",{children:"defaultFontSize"})}),e.jsx("td",{children:"number"}),e.jsx("td",{}),e.jsx("td",{children:"デフォルトのフォントサイズ (px)"})]}),e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("code",{children:"settings"})}),e.jsx("td",{children:"boolean"}),e.jsx("td",{}),e.jsx("td",{children:"設定画面を提供するかどうか"})]})]})]})]}),e.jsxs("section",{children:[e.jsx("h2",{children:"WebSocket プロトコル"}),e.jsxs("p",{children:["オーバーレイは ",e.jsx("code",{children:"ws://localhost:3940"})," に接続し、JSON メッセージを受信してコメントを描画します。"]}),e.jsx("h3",{children:"メッセージ形式"}),e.jsx("pre",{children:e.jsx("code",{children:`{
  "event": "comment" | "gift" | "emotion" | "notification" | "operatorComment",
  "data": { ... }
}`})}),e.jsx("h3",{children:"イベント型とデータスキーマ"}),e.jsx("h4",{children:"comment"}),e.jsx("pre",{children:e.jsx("code",{children:`{
  "event": "comment",
  "data": {
    "content": "コメントテキスト",
    "userName": "ユーザー名",
    "userIconUrl": "https://..."
  }
}`})}),e.jsx("h4",{children:"gift"}),e.jsx("pre",{children:e.jsx("code",{children:`{
  "event": "gift",
  "data": {
    "content": "ギフトメッセージ",
    "userName": "ユーザー名",
    "userIconUrl": "https://...",
    "itemName": "ギフト名",
    "itemCount": 1
  }
}`})}),e.jsx("h4",{children:"emotion"}),e.jsx("pre",{children:e.jsx("code",{children:`{
  "event": "emotion",
  "data": { "content": "エモーション名" }
}`})}),e.jsx("h4",{children:"notification"}),e.jsx("pre",{children:e.jsx("code",{children:`{
  "event": "notification",
  "data": { "message": "通知メッセージ" }
}`})}),e.jsx("h4",{children:"operatorComment"}),e.jsx("pre",{children:e.jsx("code",{children:`{
  "event": "operatorComment",
  "data": {
    "content": "運営コメントテキスト",
    "userName": "運営"
  }
}`})}),e.jsx("h3",{children:"接続の実装例"}),e.jsx("pre",{children:e.jsx("code",{children:`const ws = new WebSocket('ws://localhost:3940')

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
})`})})]}),e.jsxs("section",{children:[e.jsx("h2",{children:"設定画面の postMessage プロトコル"}),e.jsxs("p",{children:[e.jsx("code",{children:'"settings": true'})," を指定すると、設定 UI に歯車アイコンが表示され ",e.jsx("code",{children:"settings/index.html"})," が iframe で読み込まれます。"]}),e.jsx("h3",{children:"通信フロー"}),e.jsxs("ol",{className:"steps",children:[e.jsxs("li",{children:[e.jsx("strong",{children:"iframe が ready を送信"}),e.jsx("pre",{children:e.jsx("code",{children:`window.parent.postMessage({
  type: 'nicomview:ready',
  pluginId: 'my-plugin'
}, '*')`})})]}),e.jsxs("li",{children:[e.jsx("strong",{children:"親が保存済み設定を返す"}),e.jsx("pre",{children:e.jsx("code",{children:`// 受信メッセージ
{
  type: 'nicomview:settings-init',
  settings: { fontSize: 28, theme: 'dark' }
}`})})]}),e.jsxs("li",{children:[e.jsx("strong",{children:"フォーム変更ごとに update を送信"}),e.jsx("pre",{children:e.jsx("code",{children:`window.parent.postMessage({
  type: 'nicomview:settings-update',
  pluginId: 'my-plugin',
  settings: { fontSize: 24, theme: 'light' }
}, '*')`})})]})]}),e.jsxs("div",{className:"note",children:[e.jsx("strong",{children:"注意:"})," 設定値は URL パラメータとしてプラグイン URL に自動反映されます（例:"," ",e.jsx("code",{children:"?fontSize=24&theme=light"}),"）。オーバーレイ側では URL パラメータから設定を読み取ります。"]})]}),e.jsxs("section",{children:[e.jsx("h2",{children:"外部プラグインのインストール"}),e.jsxs("ol",{children:[e.jsxs("li",{children:["プラグインディレクトリを ",e.jsx("code",{children:"userData/plugins/"})," に配置します"]}),e.jsx("li",{children:"アプリを再起動すると自動で読み込まれます"}),e.jsx("li",{children:"設定 UI のプラグインセクションに表示されます"})]}),e.jsxs("div",{className:"note",children:[e.jsx("strong",{children:"ヒント:"})," ",e.jsx("code",{children:"userData"})," のパスは OS によって異なります。",e.jsxs("ul",{children:[e.jsxs("li",{children:["Windows: ",e.jsx("code",{children:"%APPDATA%/nicomview/"})]}),e.jsxs("li",{children:["macOS: ",e.jsx("code",{children:"~/Library/Application Support/nicomview/"})]}),e.jsxs("li",{children:["Linux: ",e.jsx("code",{children:"~/.config/nicomview/"})]})]})]})]})]})}n.createRoot(document.getElementById("root")).render(e.jsx(i,{}));
